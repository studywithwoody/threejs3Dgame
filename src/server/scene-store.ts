import "server-only";

import { eq } from "drizzle-orm";
import legacyOverrides from "@/game/platformerKit/scene-editor-overrides.json";
import {
  PLATFORMER_SCENE_OBJECTS,
  type SceneObjectRecord,
  type SceneRegion,
} from "@/game/platformerKit/sceneConfig";
import type { PlatformerKitCategory } from "@/game/platformerKit/registry";
import { getDb } from "@/lib/db";
import { sceneObjects } from "@/db/schema";

export const MAIN_SCENE_ID = "main-island";

type SceneRow = typeof sceneObjects.$inferSelect;

export function defaultSceneObjects(): SceneObjectRecord[] {
  return PLATFORMER_SCENE_OBJECTS.map((object) => {
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
  if (!db) return defaultSceneObjects();

  try {
    const rows = await db.select().from(sceneObjects).where(eq(sceneObjects.sceneId, sceneId));
    if (rows.length === 0) return defaultSceneObjects();
    return rows.sort((a, b) => a.sortOrder - b.sortOrder).map(sceneRowToObject);
  } catch (error) {
    console.error("[scene-store] read failed", error);
    return defaultSceneObjects();
  }
}

export async function replaceScene(
  objects: SceneObjectRecord[],
  updatedBy: string,
  sceneId = MAIN_SCENE_ID,
) {
  const db = getDb();
  if (!db) return false;

  await db.transaction(async (tx) => {
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
  });
  return true;
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
