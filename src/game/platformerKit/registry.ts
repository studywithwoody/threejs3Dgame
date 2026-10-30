export type PlatformerKitCategory = "terrain" | "snow" | "cliff" | "platform" | "tree" | "rock" | "fence" | "ladder" | "decoration" | "collectible" | "interactive" | "character";

export type PlatformerKitAsset = {
  id: string;
  path: string;
  category: PlatformerKitCategory;
  root?: string;
};

export const PLATFORMER_KIT_ASSETS: PlatformerKitAsset[] = [
  {
    "id": "arrow",
    "path": "/Models/GLB%20format/arrow.glb",
    "category": "decoration"
  },
  {
    "id": "arrows",
    "path": "/Models/GLB%20format/arrows.glb",
    "category": "decoration"
  },
  {
    "id": "barrel",
    "path": "/Models/GLB%20format/barrel.glb",
    "category": "decoration"
  },
  {
    "id": "block-grass-corner-low",
    "path": "/Models/GLB%20format/block-grass-corner-low.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-corner-overhang-low",
    "path": "/Models/GLB%20format/block-grass-corner-overhang-low.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-corner-overhang",
    "path": "/Models/GLB%20format/block-grass-corner-overhang.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-corner",
    "path": "/Models/GLB%20format/block-grass-corner.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-curve-half",
    "path": "/Models/GLB%20format/block-grass-curve-half.glb",
    "category": "terrain"
  },
  {
    "id": "block-grass-curve-low",
    "path": "/Models/GLB%20format/block-grass-curve-low.glb",
    "category": "terrain"
  },
  {
    "id": "block-grass-curve",
    "path": "/Models/GLB%20format/block-grass-curve.glb",
    "category": "terrain"
  },
  {
    "id": "block-grass-edge",
    "path": "/Models/GLB%20format/block-grass-edge.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-hexagon",
    "path": "/Models/GLB%20format/block-grass-hexagon.glb",
    "category": "terrain"
  },
  {
    "id": "block-grass-large-slope-narrow",
    "path": "/Models/GLB%20format/block-grass-large-slope-narrow.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-large-slope-steep-narrow",
    "path": "/Models/GLB%20format/block-grass-large-slope-steep-narrow.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-large-slope-steep",
    "path": "/Models/GLB%20format/block-grass-large-slope-steep.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-large-slope",
    "path": "/Models/GLB%20format/block-grass-large-slope.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-large-tall",
    "path": "/Models/GLB%20format/block-grass-large-tall.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-large",
    "path": "/Models/GLB%20format/block-grass-large.glb",
    "category": "terrain"
  },
  {
    "id": "block-grass-long",
    "path": "/Models/GLB%20format/block-grass-long.glb",
    "category": "terrain"
  },
  {
    "id": "block-grass-low-hexagon",
    "path": "/Models/GLB%20format/block-grass-low-hexagon.glb",
    "category": "terrain"
  },
  {
    "id": "block-grass-low-large",
    "path": "/Models/GLB%20format/block-grass-low-large.glb",
    "category": "terrain"
  },
  {
    "id": "block-grass-low-long",
    "path": "/Models/GLB%20format/block-grass-low-long.glb",
    "category": "terrain"
  },
  {
    "id": "block-grass-low-narrow",
    "path": "/Models/GLB%20format/block-grass-low-narrow.glb",
    "category": "terrain"
  },
  {
    "id": "block-grass-low",
    "path": "/Models/GLB%20format/block-grass-low.glb",
    "category": "terrain"
  },
  {
    "id": "block-grass-narrow",
    "path": "/Models/GLB%20format/block-grass-narrow.glb",
    "category": "terrain"
  },
  {
    "id": "block-grass-overhang-corner",
    "path": "/Models/GLB%20format/block-grass-overhang-corner.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-overhang-edge",
    "path": "/Models/GLB%20format/block-grass-overhang-edge.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-overhang-hexagon",
    "path": "/Models/GLB%20format/block-grass-overhang-hexagon.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-overhang-large-slope-narrow",
    "path": "/Models/GLB%20format/block-grass-overhang-large-slope-narrow.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-overhang-large-slope-steep-narrow",
    "path": "/Models/GLB%20format/block-grass-overhang-large-slope-steep-narrow.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-overhang-large-slope-steep",
    "path": "/Models/GLB%20format/block-grass-overhang-large-slope-steep.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-overhang-large-slope",
    "path": "/Models/GLB%20format/block-grass-overhang-large-slope.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-overhang-large-tall",
    "path": "/Models/GLB%20format/block-grass-overhang-large-tall.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-overhang-large",
    "path": "/Models/GLB%20format/block-grass-overhang-large.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-overhang-long",
    "path": "/Models/GLB%20format/block-grass-overhang-long.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-overhang-low-hexagon",
    "path": "/Models/GLB%20format/block-grass-overhang-low-hexagon.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-overhang-low-large",
    "path": "/Models/GLB%20format/block-grass-overhang-low-large.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-overhang-low-long",
    "path": "/Models/GLB%20format/block-grass-overhang-low-long.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-overhang-low-narrow",
    "path": "/Models/GLB%20format/block-grass-overhang-low-narrow.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-overhang-low",
    "path": "/Models/GLB%20format/block-grass-overhang-low.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass-overhang-narrow",
    "path": "/Models/GLB%20format/block-grass-overhang-narrow.glb",
    "category": "cliff"
  },
  {
    "id": "block-grass",
    "path": "/Models/GLB%20format/block-grass.glb",
    "category": "terrain"
  },
  {
    "id": "block-moving-blue",
    "path": "/Models/GLB%20format/block-moving-blue.glb",
    "category": "platform"
  },
  {
    "id": "block-moving-large",
    "path": "/Models/GLB%20format/block-moving-large.glb",
    "category": "platform"
  },
  {
    "id": "block-moving",
    "path": "/Models/GLB%20format/block-moving.glb",
    "category": "platform"
  },
  {
    "id": "block-snow-corner-low",
    "path": "/Models/GLB%20format/block-snow-corner-low.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-corner-overhang-low",
    "path": "/Models/GLB%20format/block-snow-corner-overhang-low.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-corner-overhang",
    "path": "/Models/GLB%20format/block-snow-corner-overhang.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-corner",
    "path": "/Models/GLB%20format/block-snow-corner.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-curve-half",
    "path": "/Models/GLB%20format/block-snow-curve-half.glb",
    "category": "snow"
  },
  {
    "id": "block-snow-curve-low",
    "path": "/Models/GLB%20format/block-snow-curve-low.glb",
    "category": "snow"
  },
  {
    "id": "block-snow-curve",
    "path": "/Models/GLB%20format/block-snow-curve.glb",
    "category": "snow"
  },
  {
    "id": "block-snow-edge",
    "path": "/Models/GLB%20format/block-snow-edge.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-hexagon",
    "path": "/Models/GLB%20format/block-snow-hexagon.glb",
    "category": "snow"
  },
  {
    "id": "block-snow-large-slope-narrow",
    "path": "/Models/GLB%20format/block-snow-large-slope-narrow.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-large-slope-steep-narrow",
    "path": "/Models/GLB%20format/block-snow-large-slope-steep-narrow.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-large-slope-steep",
    "path": "/Models/GLB%20format/block-snow-large-slope-steep.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-large-slope",
    "path": "/Models/GLB%20format/block-snow-large-slope.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-large-tall",
    "path": "/Models/GLB%20format/block-snow-large-tall.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-large",
    "path": "/Models/GLB%20format/block-snow-large.glb",
    "category": "snow"
  },
  {
    "id": "block-snow-long",
    "path": "/Models/GLB%20format/block-snow-long.glb",
    "category": "snow"
  },
  {
    "id": "block-snow-low-hexagon",
    "path": "/Models/GLB%20format/block-snow-low-hexagon.glb",
    "category": "snow"
  },
  {
    "id": "block-snow-low-large",
    "path": "/Models/GLB%20format/block-snow-low-large.glb",
    "category": "snow"
  },
  {
    "id": "block-snow-low-long",
    "path": "/Models/GLB%20format/block-snow-low-long.glb",
    "category": "snow"
  },
  {
    "id": "block-snow-low-narrow",
    "path": "/Models/GLB%20format/block-snow-low-narrow.glb",
    "category": "snow"
  },
  {
    "id": "block-snow-low",
    "path": "/Models/GLB%20format/block-snow-low.glb",
    "category": "snow"
  },
  {
    "id": "block-snow-narrow",
    "path": "/Models/GLB%20format/block-snow-narrow.glb",
    "category": "snow"
  },
  {
    "id": "block-snow-overhang-corner",
    "path": "/Models/GLB%20format/block-snow-overhang-corner.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-overhang-edge",
    "path": "/Models/GLB%20format/block-snow-overhang-edge.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-overhang-hexagon",
    "path": "/Models/GLB%20format/block-snow-overhang-hexagon.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-overhang-large-slope-narrow",
    "path": "/Models/GLB%20format/block-snow-overhang-large-slope-narrow.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-overhang-large-slope-steep-narrow",
    "path": "/Models/GLB%20format/block-snow-overhang-large-slope-steep-narrow.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-overhang-large-slope-steep",
    "path": "/Models/GLB%20format/block-snow-overhang-large-slope-steep.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-overhang-large-slope",
    "path": "/Models/GLB%20format/block-snow-overhang-large-slope.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-overhang-large-tall",
    "path": "/Models/GLB%20format/block-snow-overhang-large-tall.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-overhang-large",
    "path": "/Models/GLB%20format/block-snow-overhang-large.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-overhang-long",
    "path": "/Models/GLB%20format/block-snow-overhang-long.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-overhang-low-hexagon",
    "path": "/Models/GLB%20format/block-snow-overhang-low-hexagon.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-overhang-low-large",
    "path": "/Models/GLB%20format/block-snow-overhang-low-large.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-overhang-low-long",
    "path": "/Models/GLB%20format/block-snow-overhang-low-long.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-overhang-low-narrow",
    "path": "/Models/GLB%20format/block-snow-overhang-low-narrow.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-overhang-low",
    "path": "/Models/GLB%20format/block-snow-overhang-low.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow-overhang-narrow",
    "path": "/Models/GLB%20format/block-snow-overhang-narrow.glb",
    "category": "cliff"
  },
  {
    "id": "block-snow",
    "path": "/Models/GLB%20format/block-snow.glb",
    "category": "snow"
  },
  {
    "id": "bomb",
    "path": "/Models/GLB%20format/bomb.glb",
    "category": "interactive"
  },
  {
    "id": "brick",
    "path": "/Models/GLB%20format/brick.glb",
    "category": "decoration"
  },
  {
    "id": "button-round",
    "path": "/Models/GLB%20format/button-round.glb",
    "category": "interactive"
  },
  {
    "id": "button-square",
    "path": "/Models/GLB%20format/button-square.glb",
    "category": "interactive"
  },
  {
    "id": "character-oobi",
    "path": "/Models/GLB%20format/character-oobi.glb",
    "category": "character"
  },
  {
    "id": "character-oodi",
    "path": "/Models/GLB%20format/character-oodi.glb",
    "category": "character"
  },
  {
    "id": "character-ooli",
    "path": "/Models/GLB%20format/character-ooli.glb",
    "category": "character"
  },
  {
    "id": "character-oopi",
    "path": "/Models/GLB%20format/character-oopi.glb",
    "category": "character"
  },
  {
    "id": "character-oozi",
    "path": "/Models/GLB%20format/character-oozi.glb",
    "category": "character"
  },
  {
    "id": "chest",
    "path": "/Models/GLB%20format/chest.glb",
    "category": "decoration"
  },
  {
    "id": "coin-bronze",
    "path": "/Models/GLB%20format/coin-bronze.glb",
    "category": "decoration"
  },
  {
    "id": "coin-gold",
    "path": "/Models/GLB%20format/coin-gold.glb",
    "category": "decoration"
  },
  {
    "id": "coin-silver",
    "path": "/Models/GLB%20format/coin-silver.glb",
    "category": "decoration"
  },
  {
    "id": "conveyor-belt",
    "path": "/Models/GLB%20format/conveyor-belt.glb",
    "category": "interactive"
  },
  {
    "id": "crate-item-strong",
    "path": "/Models/GLB%20format/crate-item-strong.glb",
    "category": "decoration"
  },
  {
    "id": "crate-item",
    "path": "/Models/GLB%20format/crate-item.glb",
    "category": "decoration"
  },
  {
    "id": "crate-strong",
    "path": "/Models/GLB%20format/crate-strong.glb",
    "category": "decoration"
  },
  {
    "id": "crate",
    "path": "/Models/GLB%20format/crate.glb",
    "category": "decoration"
  },
  {
    "id": "door-large-open",
    "path": "/Models/GLB%20format/door-large-open.glb",
    "category": "interactive"
  },
  {
    "id": "door-open",
    "path": "/Models/GLB%20format/door-open.glb",
    "category": "interactive"
  },
  {
    "id": "door-rotate-large",
    "path": "/Models/GLB%20format/door-rotate-large.glb",
    "category": "interactive"
  },
  {
    "id": "door-rotate",
    "path": "/Models/GLB%20format/door-rotate.glb",
    "category": "interactive"
  },
  {
    "id": "fence-broken",
    "path": "/Models/GLB%20format/fence-broken.glb",
    "category": "fence"
  },
  {
    "id": "fence-corner-curved",
    "path": "/Models/GLB%20format/fence-corner-curved.glb",
    "category": "fence"
  },
  {
    "id": "fence-corner",
    "path": "/Models/GLB%20format/fence-corner.glb",
    "category": "fence"
  },
  {
    "id": "fence-low-broken",
    "path": "/Models/GLB%20format/fence-low-broken.glb",
    "category": "fence"
  },
  {
    "id": "fence-low-corner-curved",
    "path": "/Models/GLB%20format/fence-low-corner-curved.glb",
    "category": "fence"
  },
  {
    "id": "fence-low-corner",
    "path": "/Models/GLB%20format/fence-low-corner.glb",
    "category": "fence"
  },
  {
    "id": "fence-low-straight",
    "path": "/Models/GLB%20format/fence-low-straight.glb",
    "category": "fence"
  },
  {
    "id": "fence-rope",
    "path": "/Models/GLB%20format/fence-rope.glb",
    "category": "fence"
  },
  {
    "id": "fence-straight",
    "path": "/Models/GLB%20format/fence-straight.glb",
    "category": "fence"
  },
  {
    "id": "flag",
    "path": "/Models/GLB%20format/flag.glb",
    "category": "decoration"
  },
  {
    "id": "flowers-tall",
    "path": "/Models/GLB%20format/flowers-tall.glb",
    "category": "decoration"
  },
  {
    "id": "flowers",
    "path": "/Models/GLB%20format/flowers.glb",
    "category": "decoration"
  },
  {
    "id": "grass",
    "path": "/Models/GLB%20format/grass.glb",
    "category": "decoration"
  },
  {
    "id": "heart",
    "path": "/Models/GLB%20format/heart.glb",
    "category": "collectible"
  },
  {
    "id": "hedge-corner",
    "path": "/Models/GLB%20format/hedge-corner.glb",
    "category": "fence"
  },
  {
    "id": "hedge",
    "path": "/Models/GLB%20format/hedge.glb",
    "category": "fence"
  },
  {
    "id": "jewel",
    "path": "/Models/GLB%20format/jewel.glb",
    "category": "collectible"
  },
  {
    "id": "key",
    "path": "/Models/GLB%20format/key.glb",
    "category": "collectible"
  },
  {
    "id": "ladder-broken",
    "path": "/Models/GLB%20format/ladder-broken.glb",
    "category": "ladder"
  },
  {
    "id": "ladder-long",
    "path": "/Models/GLB%20format/ladder-long.glb",
    "category": "ladder"
  },
  {
    "id": "ladder",
    "path": "/Models/GLB%20format/ladder.glb",
    "category": "ladder"
  },
  {
    "id": "lever",
    "path": "/Models/GLB%20format/lever.glb",
    "category": "interactive"
  },
  {
    "id": "lock",
    "path": "/Models/GLB%20format/lock.glb",
    "category": "interactive"
  },
  {
    "id": "mushrooms",
    "path": "/Models/GLB%20format/mushrooms.glb",
    "category": "decoration"
  },
  {
    "id": "pipe",
    "path": "/Models/GLB%20format/pipe.glb",
    "category": "interactive"
  },
  {
    "id": "plant",
    "path": "/Models/GLB%20format/plant.glb",
    "category": "decoration"
  },
  {
    "id": "platform-fortified",
    "path": "/Models/GLB%20format/platform-fortified.glb",
    "category": "platform"
  },
  {
    "id": "platform-overhang",
    "path": "/Models/GLB%20format/platform-overhang.glb",
    "category": "platform"
  },
  {
    "id": "platform-ramp",
    "path": "/Models/GLB%20format/platform-ramp.glb",
    "category": "platform"
  },
  {
    "id": "platform",
    "path": "/Models/GLB%20format/platform.glb",
    "category": "platform"
  },
  {
    "id": "poles",
    "path": "/Models/GLB%20format/poles.glb",
    "category": "decoration"
  },
  {
    "id": "rocks",
    "path": "/Models/GLB%20format/rocks.glb",
    "category": "rock"
  },
  {
    "id": "saw",
    "path": "/Models/GLB%20format/saw.glb",
    "category": "interactive"
  },
  {
    "id": "sign",
    "path": "/Models/GLB%20format/sign.glb",
    "category": "decoration"
  },
  {
    "id": "spike-block-wide",
    "path": "/Models/GLB%20format/spike-block-wide.glb",
    "category": "interactive"
  },
  {
    "id": "spike-block",
    "path": "/Models/GLB%20format/spike-block.glb",
    "category": "interactive"
  },
  {
    "id": "spring",
    "path": "/Models/GLB%20format/spring.glb",
    "category": "platform"
  },
  {
    "id": "star",
    "path": "/Models/GLB%20format/star.glb",
    "category": "collectible"
  },
  {
    "id": "stones",
    "path": "/Models/GLB%20format/stones.glb",
    "category": "rock"
  },
  {
    "id": "trap-spikes-large",
    "path": "/Models/GLB%20format/trap-spikes-large.glb",
    "category": "interactive"
  },
  {
    "id": "trap-spikes",
    "path": "/Models/GLB%20format/trap-spikes.glb",
    "category": "interactive"
  },
  {
    "id": "tree-pine-small",
    "path": "/Models/GLB%20format/tree-pine-small.glb",
    "category": "tree"
  },
  {
    "id": "tree-pine-snow-small",
    "path": "/Models/GLB%20format/tree-pine-snow-small.glb",
    "category": "tree"
  },
  {
    "id": "tree-pine-snow",
    "path": "/Models/GLB%20format/tree-pine-snow.glb",
    "category": "tree"
  },
  {
    "id": "tree-pine",
    "path": "/Models/GLB%20format/tree-pine.glb",
    "category": "tree"
  },
  {
    "id": "tree-snow",
    "path": "/Models/GLB%20format/tree-snow.glb",
    "category": "tree"
  },
  {
    "id": "tree",
    "path": "/Models/GLB%20format/tree.glb",
    "category": "decoration"
  }
];

export const PLATFORMER_KIT_BY_ID = new Map(
  PLATFORMER_KIT_ASSETS.map((asset) => [asset.id, asset]),
);

export const MINI_FOREST_ASSETS: PlatformerKitAsset[] = [
  ["bridge", "platform"],
  ["building-platform", "platform"],
  ["building-roof", "decoration"],
  ["building-structure", "decoration"],
  ["fence", "fence"],
  ["flag", "decoration"],
  ["ladder", "ladder"],
  ["patch-dirt", "decoration"],
  ["patch-grass", "decoration"],
  ["plant", "decoration"],
  ["platform", "platform"],
  ["rocks-high", "rock"],
  ["rocks-low", "rock"],
  ["rocks-ramp", "platform"],
  ["stones", "rock"],
  ["target", "interactive"],
  ["tent", "decoration"],
  ["tree-high", "tree"],
  ["tree", "tree"],
  ["weapon-arrow", "decoration"],
  ["weapon-bow", "decoration"],
].map(([id, category]) => ({
  id: `mini-forest-${id}`,
  path: `/Models/GLB%20format/${id}.glb`,
  category: category as PlatformerKitCategory,
  root: "/assets/mini-forest",
}));

export const GAME_ASSETS = [...PLATFORMER_KIT_ASSETS, ...MINI_FOREST_ASSETS];
export const GAME_ASSET_BY_ID = new Map(GAME_ASSETS.map((asset) => [asset.id, asset]));

export function platformerKitPath(assetId: string) {
  const asset = GAME_ASSET_BY_ID.get(assetId);
  if (!asset) throw new Error("Unknown game asset: " + assetId);
  return `${asset.root ?? "/assets/platformer-kit"}${asset.path}`;
}

