import { emptyProgress } from "@/game/types";
import { getAuth, isAuthConfigured } from "@/lib/auth";
import { loadQuestions } from "@/server/questions";
import { readUserProgress } from "@/server/progress-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const questions = loadQuestions();
  try {
    const auth = getAuth();
    const session = auth ? await auth.api.getSession({ headers: request.headers }) : null;
    if (isAuthConfigured() && !session?.user) return Response.json({ error: "sign_in_required" }, { status: 401 });
    if (!session?.user) return Response.json({ progress: emptyProgress(), persisted: false });
    const progress = await readUserProgress(session.user.id, questions);
    if (!progress) return Response.json({ progress: emptyProgress(), persisted: false });
    return Response.json({ progress, persisted: true });
  } catch (error) {
    console.error("[progress]", error);
    return Response.json({ error: "progress_unavailable" }, { status: 500 });
  }
}
