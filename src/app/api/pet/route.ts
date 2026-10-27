import { eq } from "drizzle-orm";
import { buyEgg, discardPet, feedPet, hatchEgg, mergeProgress, normalizeProgress, stationOrder } from "@/game/progress";
import { emptyProgress, type IslandProgress, type PetSpecies } from "@/game/types";
import { islandProgress } from "@/db/schema";
import { getAuth, isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { loadQuestions } from "@/server/questions";

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
    const rows = await tx.select().from(islandProgress).where(eq(islandProgress.id, 1)).limit(1);
    const current: IslandProgress = rows[0]
      ? mergeProgress(stationOrder(questions), [emptyProgress(), rows[0]])
      : emptyProgress();
    const clientPets = mergeProgress(stationOrder(questions), [emptyProgress(), normalizeProgress(body.progress)]).pets;
    current.pets = mergeProgress(stationOrder(questions), [current, { ...emptyProgress(), pets: clientPets }]).pets;
    const next = applyAction(current, body, playerId);
    if (!next) return Response.json({ error: "pet_action_unavailable" }, { status: 409 });
    await tx
      .insert(islandProgress)
      .values({ id: 1, solved: next.solved, scores: next.scores, names: next.names, pets: next.pets, eggs: next.eggs })
      .onConflictDoUpdate({
        target: islandProgress.id,
        set: { solved: next.solved, scores: next.scores, names: next.names, pets: next.pets, eggs: next.eggs, updatedAt: new Date() },
      });
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
