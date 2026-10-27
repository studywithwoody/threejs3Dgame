import "server-only";

import { eq } from "drizzle-orm";
import { eggs, pets, scoreTransactions, userProgress, userQuestionProgress } from "@/db/schema";
import { award, stationOrder } from "@/game/progress";
import type { Question } from "@/game/questions";
import { POINTS_PER_STATION, type IslandProgress } from "@/game/types";
import { getDb } from "@/lib/db";
import { clampClientProgress, gradeAttempt, type GradeResult } from "@/server/grade";

type QueryClient = {
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
  delete: (...args: any[]) => any;
};

function progressFromRows(userId: string, questions: Question[], progressRow: { score: number } | undefined, questionRows: Array<{ questionId: string; solvedAt: Date | null }>, petRows: Array<{ id: string; name: string; species: string; lastFedAt: Date; feedings: number }>, eggRows: Array<{ id: string; createdAt: Date }>): IslandProgress {
  const order = stationOrder(questions);
  const solved = questionRows.filter((row) => row.solvedAt).map((row) => row.questionId);
  return {
    solved: order.filter((id) => solved.includes(id)),
    scores: { [userId]: progressRow?.score ?? 0 },
    names: {},
    pets: { [userId]: petRows.map((pet) => ({
      id: pet.id,
      name: pet.name,
      species: pet.species === "cat" || pet.species === "dog" || pet.species === "chicken" ? pet.species : "bunny",
      lastFedAt: pet.lastFedAt.getTime(),
      status: "healthy" as const,
      feedings: pet.feedings,
    })) },
    eggs: { [userId]: eggRows.map((egg) => ({ id: egg.id, createdAt: egg.createdAt.getTime() })) },
  };
}

async function readUserProgressFrom(client: QueryClient, userId: string, questions: Question[]) {
  const [progressRows, questionRows, petRows, eggRows] = await Promise.all([
    client.select().from(userProgress).where(eq(userProgress.userId, userId)).limit(1),
    client.select().from(userQuestionProgress).where(eq(userQuestionProgress.userId, userId)),
    client.select().from(pets).where(eq(pets.userId, userId)),
    client.select().from(eggs).where(eq(eggs.userId, userId)),
  ]);
  return { progress: progressFromRows(userId, questions, progressRows[0], questionRows, petRows, eggRows), questionRows };
}

export async function readUserProgress(userId: string, questions: Question[]): Promise<IslandProgress | null> {
  const db = getDb();
  if (!db) return null;
  const { progress } = await readUserProgressFrom(db, userId, questions);
  return progress;
}

export async function syncUserPetData(client: QueryClient, userId: string, state: IslandProgress) {
  await client.delete(pets).where(eq(pets.userId, userId));
  await client.delete(eggs).where(eq(eggs.userId, userId));
  const petRows = state.pets[userId] ?? [];
  const eggRows = state.eggs[userId] ?? [];
  if (petRows.length > 0) await client.insert(pets).values(petRows.map((pet) => ({
    id: pet.id, userId, name: pet.name, species: pet.species, lastFedAt: new Date(pet.lastFedAt), feedings: pet.feedings, updatedAt: new Date(),
  })));
  if (eggRows.length > 0) await client.insert(eggs).values(eggRows.map((egg) => ({ id: egg.id, userId, createdAt: new Date(egg.createdAt) })));
}

export async function syncUserScore(client: QueryClient, userId: string, score: number) {
  await client.insert(userProgress).values({ userId, score, updatedAt: new Date() }).onConflictDoUpdate({
    target: userProgress.userId,
    set: { score, updatedAt: new Date() },
  });
}

export async function recordScoreTransaction(client: QueryClient, userId: string, amount: number, reason: string, referenceId?: string) {
  await client.insert(scoreTransactions).values({
    id: `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    amount,
    reason,
    referenceId,
  });
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
    const { progress: current, questionRows } = await readUserProgressFrom(tx, input.playerId, input.questions);
    const graded = gradeAttempt({ ...input, progress: current });
    const existing = questionRows.find((row: { questionId: string; attempts: number }) => row.questionId === input.stationId);
    const attempts = (existing?.attempts ?? 0) + 1;
    if (graded.reason === "wrong") {
      await tx.insert(userQuestionProgress).values({ userId: input.playerId, questionId: input.stationId, attempts }).onConflictDoUpdate({
        target: [userQuestionProgress.userId, userQuestionProgress.questionId], set: { attempts },
      });
      return { ...graded, persisted: true };
    }
    if (!graded.correct) return { ...graded, persisted: true };
    const next = award(current, stationOrder(input.questions), input.stationId, input.playerId, input.playerName);
    await syncUserScore(tx, input.playerId, next.scores[input.playerId] ?? POINTS_PER_STATION);
    await recordScoreTransaction(tx, input.playerId, POINTS_PER_STATION, "answer_question", input.stationId);
    await tx.insert(userQuestionProgress).values({ userId: input.playerId, questionId: input.stationId, solvedAt: new Date(), attempts, earnedScore: POINTS_PER_STATION }).onConflictDoUpdate({
      target: [userQuestionProgress.userId, userQuestionProgress.questionId], set: { solvedAt: new Date(), attempts, earnedScore: POINTS_PER_STATION },
    });
    return { ...graded, progress: next, persisted: true };
  });
}

export async function readUserProgressForTransaction(client: QueryClient, userId: string, questions: Question[]) {
  return readUserProgressFrom(client, userId, questions);
}
