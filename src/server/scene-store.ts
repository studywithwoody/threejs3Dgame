import "server-only";

import { eq } from "drizzle-orm";
import legacyOverrides from "@/game/platformerKit/scene-editor-overrides.json";
import { defaultSceneObjects as sceneDefaults, SCENE_DEFINITIONS, SCENE_DEFINITION_BY_ID, type SceneDefinition, type SceneId } from "@/game/scenes";
import { type SceneObjectRecord, type SceneRegion } from "@/game/platformerKit/sceneConfig";
import type { PlatformerKitCategory } from "@/game/platformerKit/registry";
import { getDb } from "@/lib/db";
import { homepageSceneSettings, sceneLayoutDrafts, sceneObjects } from "@/db/schema";

export const MAIN_SCENE_ID = "main-island";

type SceneRow = typeof sceneObjects.$inferSelect;

export function defaultSceneObjects(sceneId: SceneId = MAIN_SCENE_ID): SceneObjectRecord[] {
  return sceneDefaults(sceneId).map((object) => {
    if (sceneId !== MAIN_SCENE_ID) return object;
    const override = (legacyOverrides as Record<string, {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
    }>)[object.id];
    return {
      ...object,
      collectible: Boolean(object.collectible),
      visible: true,
      autoAnchor: !override,
      position: override?.position ?? object.position,
      rotation: override?.rotation ?? object.rotation,
      scale: override?.scale ?? object.scale,
    };
  });
}

export async function readScene(sceneId = MAIN_SCENE_ID): Promise<SceneObjectRecord[]> {
  const db = getDb();
  if (!db) return defaultSceneObjects(asSceneId(sceneId));

  try {
    const rows = await db.select().from(sceneObjects).where(eq(sceneObjects.sceneId, sceneId));
    if (rows.length === 0) return defaultSceneObjects(asSceneId(sceneId));
    return rows.sort((a, b) => a.sortOrder - b.sortOrder).map(sceneRowToObject);
  } catch (error) {
    console.error("[scene-store] read failed", error);
    return defaultSceneObjects(asSceneId(sceneId));
  }
}

export async function readSceneDefinitions(): Promise<SceneDefinition[]> {
  return SCENE_DEFINITIONS;
}

export async function replaceScene(
  objects: SceneObjectRecord[],
  updatedBy: string,
  sceneId: SceneId = MAIN_SCENE_ID,
) {
  const db = getDb();
  if (!db) return false;

  await db.transaction(async (tx) => {
    await writeSceneObjects(tx, objects, updatedBy, sceneId);
  });
  return true;
}

export async function readSceneDraft(sceneId: SceneId) {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db.select().from(sceneLayoutDrafts).where(eq(sceneLayoutDrafts.sceneId, sceneId)).limit(1);
    return rows[0]?.objects ?? null;
  } catch (error) {
    console.error("[scene-store] draft read failed", error);
    return null;
  }
}

export async function saveSceneDraft(sceneId: SceneId, objects: SceneObjectRecord[], updatedBy: string) {
  const db = getDb();
  if (!db) return false;
  await db.insert(sceneLayoutDrafts).values({ sceneId, objects, updatedBy, updatedAt: new Date() }).onConflictDoUpdate({
    target: sceneLayoutDrafts.sceneId,
    set: { objects, updatedBy, updatedAt: new Date() },
  });
  return true;
}

export async function readHomepageSceneSetting() {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db.select().from(homepageSceneSettings).where(eq(homepageSceneSettings.id, 1)).limit(1);
    return rows[0]?.sceneId ?? null;
  } catch (error) {
    console.error("[scene-store] homepage setting read failed", error);
    return null;
  }
}

export async function publishHomepageScene(sceneId: SceneId, objects: SceneObjectRecord[], updatedBy: string) {
  const db = getDb();
  if (!db) return false;
  await db.transaction(async (tx) => {
    await writeSceneObjects(tx, objects, updatedBy, sceneId);
    await tx.insert(homepageSceneSettings).values({ id: 1, sceneId, updatedBy, updatedAt: new Date() }).onConflictDoUpdate({
      target: homepageSceneSettings.id,
      set: { sceneId, updatedBy, updatedAt: new Date() },
    });
  });
  return true;
}

export async function clearHomepageSceneSetting(updatedBy: string) {
  const db = getDb();
  if (!db) return false;
  await db.insert(homepageSceneSettings).values({ id: 1, sceneId: null, updatedBy, updatedAt: new Date() }).onConflictDoUpdate({
    target: homepageSceneSettings.id,
    set: { sceneId: null, updatedBy, updatedAt: new Date() },
  });
  return true;
}

type SceneWriter = {
  insert: (...args: any[]) => any;
  delete: (...args: any[]) => any;
};

async function writeSceneObjects(tx: SceneWriter, objects: SceneObjectRecord[], updatedBy: string, sceneId: SceneId) {
  await tx.delete(sceneObjects).where(eq(sceneObjects.sceneId, sceneId));
  if (objects.length === 0) return;
  await tx.insert(sceneObjects).values(objects.map((object, index) => ({
    sceneId,
    objectId: object.id,
    assetId: object.assetId,
    category: object.category,
    region: object.region,
    positionX: object.position[0],
    positionY: object.position[1],
    positionZ: object.position[2],
    rotationX: object.rotation[0],
    rotationY: object.rotation[1],
    rotationZ: object.rotation[2],
    scaleX: object.scale[0],
    scaleY: object.scale[1],
    scaleZ: object.scale[2],
    visible: object.visible,
    collectible: object.collectible,
    autoAnchor: object.autoAnchor,
    sortOrder: index,
    updatedBy,
    updatedAt: new Date(),
  })));
}

function sceneRowToObject(row: SceneRow): SceneObjectRecord {
  return {
    id: row.objectId,
    assetId: row.assetId,
    category: row.category as PlatformerKitCategory,
    region: row.region as SceneRegion,
    position: [row.positionX, row.positionY, row.positionZ],
    rotation: [row.rotationX, row.rotationY, row.rotationZ],
    scale: [row.scaleX, row.scaleY, row.scaleZ],
    collectible: row.collectible,
    visible: row.visible,
    autoAnchor: row.autoAnchor,
  };
}

function asSceneId(sceneId: string): SceneId {
  return SCENE_DEFINITION_BY_ID.has(sceneId as SceneId) ? sceneId as SceneId : MAIN_SCENE_ID;
}
