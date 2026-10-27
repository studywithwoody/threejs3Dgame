export * from "./auth-schema";

import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

/** One private progress row per authenticated user. */
export const userProgress = pgTable("user_progress", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  score: integer("score").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** One row per solved question and user. */
export const userQuestionProgress = pgTable("user_question_progress", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  questionId: text("question_id").notNull(),
  solvedAt: timestamp("solved_at", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
  earnedScore: integer("earned_score").notNull().default(0),
}, (table) => [primaryKey({ columns: [table.userId, table.questionId] })]);

export const pets = pgTable("pet", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  species: text("species").notNull(),
  lastFedAt: timestamp("last_fed_at", { withTimezone: true }).notNull(),
  feedings: integer("feedings").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const eggs = pgTable("egg", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const scoreTransactions = pgTable("score_transaction", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  referenceId: text("reference_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
