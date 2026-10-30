import { MINI_FOREST_SCENE_OBJECTS } from "./platformerKit/miniForestScene";
import { PLATFORMER_SCENE_OBJECTS, type SceneObjectRecord } from "./platformerKit/sceneConfig";

export type SceneId = "main-island" | "mini-forest";

export type SceneDefinition = {
  id: SceneId;
  name: string;
  description: string;
  spawn: { x: number; z: number };
  rotationEligible: boolean;
  sortOrder: number;
};

export const SCENE_DEFINITIONS: SceneDefinition[] = [
  {
    id: "main-island",
    name: "曙島",
    description: "五座物理站的主島",
    spawn: { x: 4, z: -10.5 },
    rotationEligible: true,
    sortOrder: 0,
  },
  {
    id: "mini-forest",
    name: "迷你森林營地",
    description: "穿越森林營地，收集金幣並完成闖關",
    spawn: { x: 0, z: -9 },
    rotationEligible: true,
    sortOrder: 1,
  },
];

export const SCENE_DEFINITION_BY_ID = new Map(SCENE_DEFINITIONS.map((scene) => [scene.id, scene]));

export function defaultSceneObjects(sceneId: SceneId): SceneObjectRecord[] {
  const objects = sceneId === "mini-forest" ? MINI_FOREST_SCENE_OBJECTS : PLATFORMER_SCENE_OBJECTS;
  return objects.map((object) => ({
    ...object,
    collectible: Boolean(object.collectible),
    visible: true,
    autoAnchor: true,
  }));
}
