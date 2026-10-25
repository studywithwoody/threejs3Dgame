export * from "./auth-schema";

import { integer, jsonb, pgTable, timestamp } from "drizzle-orm/pg-core";

/** Shared classroom progress. Written by the browser with the Supabase publishable key. */
export const islandProgress = pgTable("island_progress", {
  id: integer("id").primaryKey(),
  solved: jsonb("solved").$type<string[]>().notNull(),
  scores: jsonb("scores").$type<Record<string, number>>().notNull(),
  names: jsonb("names").$type<Record<string, string>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
