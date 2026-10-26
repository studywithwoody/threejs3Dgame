import { loadQuestions, toPublicQuestions } from "@/server/questions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  const questions = toPublicQuestions(loadQuestions());
  return Response.json({ stations: questions });
}
