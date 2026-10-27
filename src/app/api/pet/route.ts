import { eq } from "drizzle-orm";
import { adoptPet, feedPet, mergeProgress, normalizeProgress, stationOrder } from "@/game/progress";
import { emptyProgress, type IslandProgress } from "@/game/types";
import { islandProgress } from "@/db/schema";
import { getAuth, isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { loadQuestions } from "@/server/questions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = { action?: unknown; playerId?: unknown; progress?: unknown };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }
  if (body.action !== "feed" && body.action !== "adopt") return Response.json({ error: "bad_request" }, { status: 400 });

  const auth = getAuth();
  const session = auth ? await auth.api.getSession({ headers: request.headers }) : null;
  if (isAuthConfigured() && !session?.user) return Response.json({ error: "sign_in_required" }, { status: 401 });
  const playerId = session?.user?.id ?? (typeof body.playerId === "string" ? body.playerId.slice(0, 80) : "");
  if (!playerId) return Response.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  if (!db) {
    const local = normalizeProgress(body.progress);
    const next = body.action === "adopt" ? adoptPet(local, playerId) : feedPet(local, playerId);
    return next ? Response.json({ progress: next, persisted: false }) : Response.json({ error: "cannot_feed" }, { status: 409 });
  }

  const questions = loadQuestions();
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(islandProgress).where(eq(islandProgress.id, 1)).limit(1);
    const current: IslandProgress = rows[0]
      ? mergeProgress(stationOrder(questions), [emptyProgress(), rows[0]])
      : emptyProgress();
    const clientPets = mergeProgress(stationOrder(questions), [emptyProgress(), normalizeProgress(body.progress)]).pets;
    current.pets = mergeProgress(stationOrder(questions), [current, { ...emptyProgress(), pets: clientPets }]).pets;
    const next = body.action === "adopt" ? adoptPet(current, playerId) : feedPet(current, playerId);
    if (!next) return Response.json({ error: "cannot_feed" }, { status: 409 });
    await tx
      .insert(islandProgress)
      .values({ id: 1, solved: next.solved, scores: next.scores, names: next.names, pets: next.pets })
      .onConflictDoUpdate({
        target: islandProgress.id,
        set: { solved: next.solved, scores: next.scores, names: next.names, pets: next.pets, updatedAt: new Date() },
      });
    return Response.json({ progress: next, persisted: true });
  });
}
