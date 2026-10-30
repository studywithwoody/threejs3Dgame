import { GAME_ASSET_BY_ID } from "@/game/platformerKit/registry";
import type { SceneObjectRecord, SceneRegion } from "@/game/platformerKit/sceneConfig";

export const SCENE_REGIONS: SceneRegion[] = ["forest", "snow-mountain", "snow-valley", "highland", "floating"];
export const SCENE_CATEGORIES = new Set([
  "terrain", "snow", "cliff", "platform", "tree", "rock", "fence", "ladder",
  "decoration", "collectible", "interactive", "character",
]);

export function parseSceneObjects(value: unknown): SceneObjectRecord[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 1000) return null;
  const ids = new Set<string>();
  const objects: SceneObjectRecord[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const record = item as Partial<SceneObjectRecord>;
    if (typeof record.id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(record.id) || ids.has(record.id)) return null;
    if (typeof record.assetId !== "string" || !GAME_ASSET_BY_ID.has(record.assetId)) return null;
    if (typeof record.category !== "string" || !SCENE_CATEGORIES.has(record.category)) return null;
    if (typeof record.region !== "string" || !SCENE_REGIONS.includes(record.region as SceneRegion)) return null;
    if (!isVector(record.position) || !isVector(record.rotation) || !isScale(record.scale)) return null;
    if (typeof record.visible !== "boolean" || typeof record.collectible !== "boolean" || typeof record.autoAnchor !== "boolean") return null;
    ids.add(record.id);
    objects.push({
      id: record.id,
      assetId: record.assetId,
      category: record.category as SceneObjectRecord["category"],
      region: record.region as SceneRegion,
      position: record.position,
      rotation: record.rotation,
      scale: record.scale,
      visible: record.visible,
      collectible: record.collectible,
      autoAnchor: record.autoAnchor,
    });
  }
  return objects;
}

function isVector(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === "number" && Number.isFinite(item) && Math.abs(item) <= 1000);
}

function isScale(value: unknown): value is [number, number, number] {
  return isVector(value) && value.every((item) => item > 0.001);
}
