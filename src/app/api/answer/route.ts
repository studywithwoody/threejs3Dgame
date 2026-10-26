import { getAuth, isAuthConfigured } from "@/lib/auth";
import { cleanNickname, displayName } from "@/lib/profile";
import { normalizeProgress } from "@/game/progress";
import { loadQuestions } from "@/server/questions";
import { gradeAndPersist } from "@/server/progress-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = {
  stationId?: unknown;
  choice?: unknown;
  playerId?: unknown;
  playerName?: unknown;
  progress?: unknown;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }

  const stationId = typeof body.stationId === "string" ? body.stationId : "";
  const choice = typeof body.choice === "number" && Number.isInteger(body.choice) ? body.choice : -1;
  if (!stationId || choice < 0) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const auth = getAuth();
  const session = auth ? await auth.api.getSession({ headers: request.headers }) : null;
  if (isAuthConfigured() && !session?.user) {
    return Response.json({ error: "sign_in_required" }, { status: 401 });
  }

  const playerId = session?.user
    ? session.user.id
    : typeof body.playerId === "string"
      ? body.playerId.slice(0, 80)
      : "";
  const playerName = session?.user
    ? displayName(session.user)
    : cleanNickname(typeof body.playerName === "string" ? body.playerName : "") || "訪客";
  if (!playerId) return Response.json({ error: "bad_request" }, { status: 400 });

  try {
    const result = await gradeAndPersist({
      questions: loadQuestions(),
      stationId,
      choice,
      playerId,
      playerName,
      clientProgress: normalizeProgress(body.progress),
    });
    return Response.json(result);
  } catch (error) {
    console.error("[answer]", error);
    return Response.json({ error: "answer_failed" }, { status: 500 });
  }
}
