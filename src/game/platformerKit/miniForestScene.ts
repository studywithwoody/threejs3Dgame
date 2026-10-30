import type { SceneObjectRecord } from "./sceneConfig";

const object = (
  id: string,
  assetId: string,
  category: SceneObjectRecord["category"],
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
  rotation: [number, number, number] = [0, 0, 0],
  collectible = false,
): SceneObjectRecord => ({
  id,
  assetId,
  category,
  region: "forest",
  position,
  rotation,
  scale,
  collectible,
  visible: true,
  autoAnchor: true,
});

const objects: SceneObjectRecord[] = [];

// Platformer Kit blocks provide the collision-friendly walkable course.
for (const [index, position] of ([-12, -6, 0, 6, 12].flatMap((x) =>
  [-9, -3, 3, 9].map((z) => [x, 0, z] as [number, number, number]),
) as Array<[number, number, number]>).entries()) {
  objects.push(object(`mini-forest-ground-${index}`, "block-grass-large", "terrain", position, [1.45, 0.9, 1.45]));
}

for (const [index, position] of ([-6, 0, 6].map((x) => [x, 1.1, 9] as [number, number, number])).entries()) {
  objects.push(object(`mini-forest-platform-${index}`, "platform", "platform", position, [2.2, 0.9, 1.1]));
}

objects.push(
  object("mini-forest-bridge", "mini-forest-bridge", "platform", [0, 1.2, 3], [2.2, 1.1, 1.2]),
  object("mini-forest-tent", "mini-forest-tent", "decoration", [-7, 1.2, -5], [1.4, 1.4, 1.4]),
  object("mini-forest-building", "mini-forest-building-structure", "decoration", [7, 1.2, -5], [1.25, 1.25, 1.25]),
  object("mini-forest-roof", "mini-forest-building-roof", "decoration", [7, 2.6, -5], [1.25, 1.25, 1.25]),
  object("mini-forest-tree-a", "mini-forest-tree-high", "tree", [-10, 1.2, 7], [1.4, 1.4, 1.4]),
  object("mini-forest-tree-b", "mini-forest-tree-high", "tree", [10, 1.2, 7], [1.35, 1.35, 1.35]),
  object("mini-forest-tree-c", "mini-forest-tree", "tree", [-11, 1.2, -1], [1.2, 1.2, 1.2]),
  object("mini-forest-tree-d", "mini-forest-tree", "tree", [11, 1.2, -1], [1.2, 1.2, 1.2]),
  object("mini-forest-rocks", "mini-forest-rocks-high", "rock", [5, 1.2, 5], [1.1, 1.1, 1.1]),
  object("mini-forest-plants", "mini-forest-plant", "decoration", [-3, 1.2, -3], [1.1, 1.1, 1.1]),
  object("mini-forest-target", "mini-forest-target", "interactive", [4, 1.2, -5], [1.1, 1.1, 1.1]),
  object("mini-forest-flag", "mini-forest-flag", "decoration", [0, 2.2, 9], [1.2, 1.2, 1.2]),
  object("mini-forest-coin-a", "coin-gold", "collectible", [-6, 3.4, 3], [1.1, 1.1, 1.1], [0, 0, 0], true),
  object("mini-forest-coin-b", "coin-gold", "collectible", [6, 3.4, 3], [1.1, 1.1, 1.1], [0, 0, 0], true),
);

export const MINI_FOREST_SCENE_OBJECTS = objects;
