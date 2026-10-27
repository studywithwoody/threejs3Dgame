export * from "./auth-schema";

import { integer, jsonb, pgTable, timestamp } from "drizzle-orm/pg-core";
import type { EggState, PetState } from "@/game/types";

/** Shared classroom progress. Only server routes read and write this row. */
export const islandProgress = pgTable("island_progress", {
  id: integer("id").primaryKey(),
  solved: jsonb("solved").$type<string[]>().notNull(),
  scores: jsonb("scores").$type<Record<string, number>>().notNull(),
  names: jsonb("names").$type<Record<string, string>>().notNull(),
  pets: jsonb("pets").$type<Record<string, PetState[]>>().notNull(),
  eggs: jsonb("eggs").$type<Record<string, EggState[]>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
