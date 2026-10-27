import type { PlatformerKitCategory } from "./registry";
import overrides from "./scene-editor-overrides.json";

export type SceneRegion = "forest" | "snow-mountain" | "snow-valley" | "highland" | "floating";

export interface SceneObject {
  id: string;
  assetId: string;
  category: PlatformerKitCategory;
  region: SceneRegion;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  collectible?: boolean;
}

export type SceneObjectTransform = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

export const SCENE_EDITOR_OVERRIDES = overrides as Record<string, SceneObjectTransform>;

const object = (
  id: string,
  assetId: string,
  category: PlatformerKitCategory,
  region: SceneRegion,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
  rotation: [number, number, number] = [0, 0, 0],
  collectible = false,
): SceneObject => ({ id, assetId, category, region, position, rotation, scale, collectible });

const objects: SceneObject[] = [];

// A grounded green hill on the left. Blocks overlap horizontally so the side
// wall reads as one continuous low-poly landform instead of floating islands.
for (const [index, position] of ([
  [-17, 0, -4], [-11, 0, -4], [-5, 0, -4],
  [-17, 0, 3], [-11, 0, 3], [-5, 0, 3],
  [-17, 0, 10], [-11, 0, 10], [-5, 0, 10],
] as Array<[number, number, number]>).entries()) {
  objects.push(object(`forest-terrain-${index}`, "block-grass-large", "terrain", "forest", position, [1.85, 1.1, 1.85]));
}
for (const [index, position] of ([
  [-4, 1.1, -7], [-6, 2.2, -4], [-8, 3.3, -1], [-10, 4.4, 2],
  [-12, 5.5, 5], [-14, 6.6, 8], [-14, 7.7, 11], [-17, 7.7, 11],
] as Array<[number, number, number]>).entries()) {
  objects.push(object(`left-hill-step-${index}`, "block-grass-large", "terrain", "forest", position, [1.9, 1.1, 1.9]));
}
for (const [index, position] of ([
  [-18, 3.2, -7], [-13, 5.1, 5], [-7, 3.6, 12], [-3, 2.8, 5],
] as Array<[number, number, number]>).entries()) {
  objects.push(object(`forest-tree-${index}`, index % 2 ? "tree-pine-small" : "tree", "tree", "forest", position, [1.4, 1.4, 1.4]));
}
objects.push(
  object("forest-flowers", "flowers", "decoration", "forest", [-14, 2.4, 1], [1.2, 1.2, 1.2]),
  object("forest-mushrooms", "mushrooms", "decoration", "forest", [-8, 3.4, 10], [1.1, 1.1, 1.1]),
  object("forest-hedge", "hedge", "fence", "forest", [-18, 2.7, 8], [1.3, 1.3, 1.3]),
  object("forest-ladder", "ladder-long", "ladder", "forest", [-11, 2.1, 6], [1.4, 1.4, 1.4], [0, 0, Math.PI / 2]),
  object("forest-device", "button-round", "interactive", "forest", [-4, 3.3, 8], [1.2, 1.2, 1.2]),
  object("forest-coin", "coin-gold", "collectible", "forest", [-13, 5.8, 5], [1.1, 1.1, 1.1], [0, 0, 0], true),
);

// Snow mountain rising behind the valley.
for (const [index, position] of ([
  [-1, 0, 8], [5, 0, 8], [2, 1.1, 11], [8, 1.1, 10],
  [2, 2.2, 14], [8, 2.2, 14],
] as Array<[number, number, number]>).entries()) {
  objects.push(object(`snow-mountain-${index}`, "block-snow-large", "snow", "snow-mountain", position, [1.65, 1.2, 1.65]));
}
objects.push(
  object("snow-tree-a", "tree-pine-snow", "tree", "snow-mountain", [0, 3.3, 14], [1.8, 1.8, 1.8]),
  object("snow-tree-b", "tree-pine-snow-small", "tree", "snow-mountain", [6, 2.4, 14], [1.5, 1.5, 1.5]),
  object("snow-tree-c", "tree-snow", "tree", "snow-mountain", [4, 2.2, 10], [1.3, 1.3, 1.3]),
  object("snow-rocks", "rocks", "rock", "snow-mountain", [9, 2.2, 11], [1.2, 1.2, 1.2]),
  object("snow-barrel", "barrel", "decoration", "snow-mountain", [-1, 1.1, 10], [1.2, 1.2, 1.2]),
  object("snow-fence", "fence-straight", "fence", "snow-mountain", [7, 1.1, 8], [1.5, 1.5, 1.5], [0, Math.PI / 2, 0]),
);

// Snow valley in the foreground, with a kit platform used as a bridge.
for (const [index, position] of ([
  [-2, 0, -5], [4, 0, -5], [10, 0, -5],
  [-2, 0, -11], [4, 0, -11], [10, 0, -11],
  [1, 0.8, 1], [7, 1.5, 1], [13, 0.5, 1],
  [1, 2.2, 7], [7, 2.8, 7], [13, 1.8, 7],
] as Array<[number, number, number]>).entries()) {
  objects.push(object(`snow-valley-${index}`, "block-snow-large", "snow", "snow-valley", position, [1.7, 1, 1.7]));
}
objects.push(
  object("valley-bridge", "platform", "platform", "snow-valley", [5, 2.8, 4], [2.1, 0.65, 0.9], [0, 0, 0]),
  object("valley-fence", "fence-low-straight", "fence", "snow-valley", [9, 2.4, 5], [1.2, 1.2, 1.2], [0, Math.PI / 2, 0]),
  object("valley-crate", "crate", "decoration", "snow-valley", [0, 1.5, 3], [1.2, 1.2, 1.2]),
  object("valley-barrel", "barrel", "decoration", "snow-valley", [11, 1.7, 3], [1.1, 1.1, 1.1]),
  object("valley-ladder", "ladder", "ladder", "snow-valley", [13, 1.6, 7], [1.4, 1.4, 1.4], [0, 0, Math.PI / 2]),
  object("valley-spring", "spring", "platform", "snow-valley", [2, 3.9, 7], [1.3, 1.3, 1.3]),
  object("valley-coin", "coin-gold", "collectible", "snow-valley", [7, 5.8, 7], [1.1, 1.1, 1.1], [0, 0, 0], true),
);

// A second grounded green hill on the right, reached by a matching stair path.
for (const [index, position] of ([
  [12, 4.4, 2], [14, 5.5, 5], [16, 6.6, 8], [18, 7.7, 11],
  [21, 7.7, 11], [18, 7.7, 14],
] as Array<[number, number, number]>).entries()) {
  objects.push(object(`highland-terrain-${index}`, "block-grass-large", "terrain", "highland", position, [1.7, 1.1, 1.7]));
}
for (const [index, position] of ([
  [6, 1.1, -7], [8, 2.2, -4], [10, 3.3, -1], [12, 4.4, 2],
  [14, 5.5, 5], [16, 6.6, 8], [18, 7.7, 11], [21, 7.7, 11],
] as Array<[number, number, number]>).entries()) {
  objects.push(object(`right-hill-step-${index}`, "block-grass-large", "terrain", "highland", position, [1.9, 1.1, 1.9]));
}
objects.push(
  object("highland-tree-a", "tree", "tree", "highland", [15, 7.2, 7], [1.6, 1.6, 1.6]),
  object("highland-tree-b", "tree", "tree", "highland", [20, 7.2, 7], [1.7, 1.7, 1.7]),
  object("highland-tree-c", "tree-pine-small", "tree", "highland", [18, 9.3, 14], [1.5, 1.5, 1.5]),
  object("highland-rocks", "stones", "rock", "highland", [23, 7, 12], [1.3, 1.3, 1.3]),
  object("highland-flowers", "flowers-tall", "decoration", "highland", [13, 7, 12], [1.1, 1.1, 1.1]),
  object("highland-ladder", "ladder-long", "ladder", "highland", [14, 4.5, 5], [1.5, 1.5, 1.5], [0, 0, Math.PI / 2]),
  object("highland-coin", "coin-gold", "collectible", "highland", [18, 10.5, 15], [1.1, 1.1, 1.1], [0, 0, 0], true),
);

export const PLATFORMER_SCENE_OBJECTS = objects;

