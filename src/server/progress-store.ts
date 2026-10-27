import "server-only";
import { eq } from "drizzle-orm";
import { islandProgress } from "@/db/schema";
import { mergeProgress, stationOrder } from "@/game/progress";
import type { Question } from "@/game/questions";
import { emptyProgress, type IslandProgress } from "@/game/types";
import { getDb } from "@/lib/db";
import { clampClientProgress, gradeAttempt, type GradeResult } from "@/server/grade";

function rowToProgress(questions: Question[], raw: unknown): IslandProgress {
  return mergeProgress(stationOrder(questions), [emptyProgress(), raw as IslandProgress]);
}

export async function readSharedProgress(questions: Question[]): Promise<IslandProgress | null> {
  const db = getDb();
  if (!db) return null;
  const rows = await db.select().from(islandProgress).where(eq(islandProgress.id, 1)).limit(1);
  if (!rows[0]) return emptyProgress();
  return rowToProgress(questions, rows[0]);
}

export async function gradeAndPersist(input: {
  questions: Question[];
  stationId: string;
  choice: number;
  playerId: string;
  playerName: string;
  clientProgress: IslandProgress;
}): Promise<GradeResult & { persisted: boolean }> {
  const db = getDb();
  if (!db) {
    return {
      ...gradeAttempt({ ...input, progress: clampClientProgress(input.clientProgress) }),
      persisted: false,
    };
  }

  return db.transaction(async (tx) => {
    const rows = await tx.select().from(islandProgress).where(eq(islandProgress.id, 1)).limit(1);
    const current = rows[0] ? rowToProgress(input.questions, rows[0]) : emptyProgress();
    const clientPets = mergeProgress(stationOrder(input.questions), [emptyProgress(), input.clientProgress]).pets;
    current.pets = mergeProgress(stationOrder(input.questions), [current, { ...emptyProgress(), pets: clientPets }]).pets;
    const graded = gradeAttempt({ ...input, progress: current });
    if (!graded.correct) return { ...graded, persisted: true };
    const next = graded.progress;
    await tx
      .insert(islandProgress)
      .values({
        id: 1,
        solved: next.solved,
        scores: next.scores,
        names: next.names,
        pets: next.pets,
      })
      .onConflictDoUpdate({
        target: islandProgress.id,
        set: {
          solved: next.solved,
          scores: next.scores,
          names: next.names,
          pets: next.pets,
          updatedAt: new Date(),
        },
      });
    return { ...graded, persisted: true };
  });
}
