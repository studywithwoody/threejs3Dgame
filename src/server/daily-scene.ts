import { readHomepageSceneSetting, readSceneDefinitions } from "./scene-store";
import type { SceneDefinition, SceneId } from "@/game/scenes";

export async function resolveDailyScene(now = new Date()): Promise<{ scene: SceneDefinition; dateKey: string }> {
  const dateKey = taipeiDateKey(now);
  const scenes = (await readSceneDefinitions()).filter((scene) => scene.rotationEligible);
  const configuredSceneId = await readHomepageSceneSetting();
  const configuredScene = configuredSceneId ? scenes.find((scene) => scene.id === configuredSceneId) : undefined;
  if (configuredScene) return { scene: configuredScene, dateKey };
  const eligible = scenes.length > 0 ? scenes : [{
    id: "main-island" as SceneId,
    name: "曙島",
    description: "五座物理站的主島",
    spawn: { x: 4, z: -10.5 },
    rotationEligible: true,
    sortOrder: 0,
  }];
  const index = stableHash(dateKey) % eligible.length;
  return { scene: eligible[index], dateKey };
}

function taipeiDateKey(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
