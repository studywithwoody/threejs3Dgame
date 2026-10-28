export * from "./auth-schema";

import { boolean, index, integer, pgTable, primaryKey, real, text, timestamp } from "drizzle-orm/pg-core";
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

export const sceneObjects = pgTable("scene_object", {
  sceneId: text("scene_id").notNull().default("main-island"),
  objectId: text("object_id").notNull(),
  assetId: text("asset_id").notNull(),
  category: text("category").notNull(),
  region: text("region").notNull(),
  positionX: real("position_x").notNull(),
  positionY: real("position_y").notNull(),
  positionZ: real("position_z").notNull(),
  rotationX: real("rotation_x").notNull(),
  rotationY: real("rotation_y").notNull(),
  rotationZ: real("rotation_z").notNull(),
  scaleX: real("scale_x").notNull(),
  scaleY: real("scale_y").notNull(),
  scaleZ: real("scale_z").notNull(),
  visible: boolean("visible").notNull().default(true),
  collectible: boolean("collectible").notNull().default(false),
  autoAnchor: boolean("auto_anchor").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
}, (table) => [
  primaryKey({ columns: [table.sceneId, table.objectId] }),
  index("scene_object_scene_id_idx").on(table.sceneId),
]);

export const furnitureInventory = pgTable("furniture_inventory", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  assetId: text("asset_id").notNull(),
  quantity: integer("quantity").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.assetId] })]);

export const roomFurniture = pgTable("room_furniture", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  objectId: text("object_id").notNull(),
  assetId: text("asset_id").notNull(),
  positionX: real("position_x").notNull(),
  positionY: real("position_y").notNull(),
  positionZ: real("position_z").notNull(),
  rotationX: real("rotation_x").notNull(),
  rotationY: real("rotation_y").notNull(),
  rotationZ: real("rotation_z").notNull(),
  scaleX: real("scale_x").notNull(),
  scaleY: real("scale_y").notNull(),
  scaleZ: real("scale_z").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.objectId] })]);
