import "server-only";
import { award, canSolve, mergeProgress, stationOrder } from "@/game/progress";
import type { Question } from "@/game/questions";
import { emptyProgress, POINTS_PER_STATION, type IslandProgress } from "@/game/types";

/** Without a database the client supplies the prefix. Cap points so a forged score cannot grow. */
export function clampClientProgress(progress: IslandProgress): IslandProgress {
  const cap = progress.solved.length * POINTS_PER_STATION;
  const scores: Record<string, number> = {};
  for (const [id, points] of Object.entries(progress.scores)) {
    scores[id] = Math.min(Math.max(0, points), cap);
  }
  return { ...progress, scores, pets: progress.pets ?? {} };
}

export type GradeReason = "wrong" | "locked" | "solved" | "unknown";

export type GradeResult = {
  correct: boolean;
  reason?: GradeReason;
  explain?: string;
  progress: IslandProgress;
};

export function gradeAttempt(input: {
  questions: Question[];
  progress: IslandProgress;
  stationId: string;
  choice: number;
  playerId: string;
  playerName: string;
}): GradeResult {
  const order = stationOrder(input.questions);
  const question = input.questions.find((item) => item.id === input.stationId);
  const progress = mergeProgress(order, [emptyProgress(), input.progress]);
  if (!question) return { correct: false, reason: "unknown", progress };
  if (progress.solved.includes(question.id)) {
    return { correct: false, reason: "solved", explain: question.explain, progress };
  }
  if (!canSolve(order, progress.solved, question.id)) {
    return { correct: false, reason: "locked", progress };
  }
  if (input.choice !== question.answer) {
    return { correct: false, reason: "wrong", progress };
  }
  return {
    correct: true,
    explain: question.explain,
    progress: award(progress, order, question.id, input.playerId, input.playerName),
  };
}
