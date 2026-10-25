import { PLACES } from "@/game/terrain";

export type Question = {
  id: string;
  stage: number;
  title: string;
  badge: string;
  prompt: string;
  choices: string[];
  answer: number;
  explain: string;
};

const KNOWN = new Set(PLACES.map((place) => place.id));

export function parseQuestions(raw: unknown): Question[] {
  const stations = (raw as { stations?: unknown })?.stations;
  if (!Array.isArray(stations)) return [];
  const questions: Question[] = [];
  for (const item of stations) {
    if (!item || typeof item !== "object") continue;
    const q = item as Partial<Question>;
    if (typeof q.id !== "string" || !KNOWN.has(q.id)) continue;
    if (typeof q.prompt !== "string" || typeof q.explain !== "string" || typeof q.title !== "string") continue;
    if (!Array.isArray(q.choices) || q.choices.length < 2) continue;
    if (typeof q.answer !== "number" || q.answer < 0 || q.answer >= q.choices.length) continue;
    questions.push({
      id: q.id,
      stage: typeof q.stage === "number" ? q.stage : 99,
      title: q.title,
      badge: typeof q.badge === "string" ? q.badge : q.title,
      prompt: q.prompt,
      choices: q.choices.map((choice) => String(choice)),
      answer: q.answer,
      explain: q.explain,
    });
  }
  return questions;
}
