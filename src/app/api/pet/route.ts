import { buyEgg, discardPet, feedPet, hatchEgg, normalizeProgress } from "@/game/progress";
import { type IslandProgress, type PetSpecies } from "@/game/types";
import { getAuth, isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { loadQuestions } from "@/server/questions";
import { readUserProgressForTransaction, recordScoreTransaction, syncUserPetData, syncUserScore } from "@/server/progress-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = { action?: unknown; playerId?: unknown; progress?: unknown; petId?: unknown; eggId?: unknown; species?: unknown };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }
  const actions = ["feed", "buyEgg", "hatch", "discard"];
  if (!actions.includes(String(body.action))) return Response.json({ error: "bad_request" }, { status: 400 });

  const auth = getAuth();
  const session = auth ? await auth.api.getSession({ headers: request.headers }) : null;
  if (isAuthConfigured() && !session?.user) return Response.json({ error: "sign_in_required" }, { status: 401 });
  const playerId = session?.user?.id ?? (typeof body.playerId === "string" ? body.playerId.slice(0, 80) : "");
  if (!playerId) return Response.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  if (!db) {
    const local = normalizeProgress(body.progress);
    const next = applyAction(local, body, playerId);
    return next ? Response.json({ progress: next, persisted: false }) : Response.json({ error: "pet_action_unavailable" }, { status: 409 });
  }

  const questions = loadQuestions();
  return db.transaction(async (tx) => {
    const { progress: current } = await readUserProgressForTransaction(tx, playerId, questions);
    const next = applyAction(current, body, playerId);
    if (!next) return Response.json({ error: "pet_action_unavailable" }, { status: 409 });
    await syncUserScore(tx, playerId, next.scores[playerId] ?? 0);
    const scoreDelta = (next.scores[playerId] ?? 0) - (current.scores[playerId] ?? 0);
    if (scoreDelta !== 0) await recordScoreTransaction(tx, playerId, scoreDelta, body.action === "feed" ? "feed_pet" : "buy_egg", typeof body.petId === "string" ? body.petId : typeof body.eggId === "string" ? body.eggId : undefined);
    await syncUserPetData(tx, playerId, next);
    return Response.json({ progress: next, persisted: true });
  });
}

function applyAction(progress: IslandProgress, body: Body, playerId: string) {
  if (body.action === "feed" && typeof body.petId === "string") return feedPet(progress, playerId, body.petId);
  if (body.action === "buyEgg") return buyEgg(progress, playerId);
  if (body.action === "hatch" && typeof body.eggId === "string" && isPetSpecies(body.species)) {
    return hatchEgg(progress, playerId, body.eggId, body.species);
  }
  if (body.action === "discard" && typeof body.petId === "string") return discardPet(progress, playerId, body.petId);
  return null;
}

function isPetSpecies(value: unknown): value is PetSpecies {
  return value === "cat" || value === "dog" || value === "chicken";
}
