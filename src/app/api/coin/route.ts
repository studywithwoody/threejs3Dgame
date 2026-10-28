import { getAuth, isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { loadQuestions } from "@/server/questions";
import { readUserProgressForTransaction, recordScoreTransaction, syncUserScore } from "@/server/progress-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { playerId?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }

  const auth = getAuth();
  const session = auth ? await auth.api.getSession({ headers: request.headers }) : null;
  if (isAuthConfigured() && !session?.user) return Response.json({ error: "sign_in_required" }, { status: 401 });

  const playerId = session?.user?.id ?? (typeof body.playerId === "string" ? body.playerId.slice(0, 80) : "");
  if (!playerId) return Response.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  if (!db) return Response.json({ persisted: false });

  const questions = loadQuestions();
  return db.transaction(async (tx) => {
    const { progress: current } = await readUserProgressForTransaction(tx, playerId, questions);
    const nextScore = (current.scores[playerId] ?? 0) + 10;
    await syncUserScore(tx, playerId, nextScore);
    await recordScoreTransaction(tx, playerId, 10, "collect_coin");
    const progress = {
      ...current,
      scores: { ...current.scores, [playerId]: nextScore },
    };
    return Response.json({ progress, persisted: true });
  });
}
