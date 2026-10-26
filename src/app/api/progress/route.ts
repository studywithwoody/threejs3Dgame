import { emptyProgress } from "@/game/types";
import { loadQuestions } from "@/server/questions";
import { readSharedProgress } from "@/server/progress-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const questions = loadQuestions();
  try {
    const progress = await readSharedProgress(questions);
    if (!progress) return Response.json({ progress: emptyProgress(), persisted: false });
    return Response.json({ progress, persisted: true });
  } catch (error) {
    console.error("[progress]", error);
    return Response.json({ error: "progress_unavailable" }, { status: 500 });
  }
}
