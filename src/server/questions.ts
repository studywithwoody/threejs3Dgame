import "server-only";
import raw from "../../data/questions.json";
import { parseQuestions, type PublicQuestion, type Question } from "@/game/questions";

export function loadQuestions(): Question[] {
  return parseQuestions(raw);
}

export function toPublicQuestions(questions: Question[]): PublicQuestion[] {
  return questions.map(({ answer: _answer, ...question }) => question);
}
