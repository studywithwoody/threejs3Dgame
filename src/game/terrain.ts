import { PLATFORMER_SCENE_OBJECTS } from "@/game/platformerKit/sceneConfig";

export type Place = {
  id: string;
  x: number;
  z: number;
  label: string;
};

export const PLACES: Place[] = [
  { id: "dock", x: 0, z: -20.4, label: "碼頭" },
  { id: "slope", x: -11.1, z: -3.5, label: "斜坡" },
  { id: "observatory", x: 2.7, z: 6.4, label: "觀測台" },
  { id: "greenhouse", x: 11.3, z: -0.4, label: "溫室" },
  { id: "lighthouse", x: 4.8, z: 14.2, label: "燈塔" },
];

export const SPAWN = { x: 4, z: -10.5 };

export type PlatformSurface = {
  x: number;
  z: number;
  width: number;
  depth: number;
  top: number;
};

export type SurfaceAnchor = {
  x: number;
  z: number;
  top: number;
};

// Derive collision surfaces from the same scene configuration that loads the
// visible Kenney models, so a block's visual top and landing height cannot drift.
export const PLATFORM_SURFACES: PlatformSurface[] = PLATFORMER_SCENE_OBJECTS
  .filter((item) => item.category === "terrain" || item.category === "snow" || item.category === "platform")
  .filter((item) => item.assetId.startsWith("block-") || item.assetId === "platform")
  .map((item) => {
    const block = item.assetId.startsWith("block-");
    const width = (block ? 2.08 : 1) * item.scale[0];
    const depth = (block ? 2.08 : 1) * item.scale[2];
    const height = block ? item.scale[1] : 0.195 * item.scale[1];
    return {
      x: item.position[0],
      z: item.position[2],
      width,
      depth,
      top: item.position[1] + height,
    };
  });

// Return a point on the nearest visible Kenney platform. Objects use this
// instead of relying on hand-tuned Y values, which keeps every decoration,
// tree, collectible and prop supported when the level layout changes.
export function nearestPlatformAnchor(x: number, z: number): SurfaceAnchor {
  let best: SurfaceAnchor | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const platform of PLATFORM_SURFACES) {
    const dx = Math.max(Math.abs(x - platform.x) - platform.width * 0.5, 0);
    const dz = Math.max(Math.abs(z - platform.z) - platform.depth * 0.5, 0);
    const distance = dx * dx + dz * dz;
    if (distance >= bestDistance) continue;

    bestDistance = distance;
    best = {
      x: Math.min(Math.max(x, platform.x - platform.width * 0.5), platform.x + platform.width * 0.5),
      z: Math.min(Math.max(z, platform.z - platform.depth * 0.5), platform.z + platform.depth * 0.5),
      top: platform.top,
    };
  }

  return best ?? { x, z, top: groundY(x, z) };
}

export const BLOCKERS = [
  { x: 0.2, z: 10.4, r: 1.85 },
  { x: 14.4, z: 2.1, r: 2.15 },
  { x: 7.6, z: 17.2, r: 1.25 },
  { x: -14.3, z: -0.2, r: 1.2 },
];

export function islandRadius(theta: number) {
  return (
    23.5 +
    3.1 * Math.sin(3 * theta) +
    1.7 * Math.cos(5 * theta + 0.6) +
    1.05 * Math.sin(7 * theta + 0.4)
  );
}

export function onDock(x: number, z: number) {
  return x >= -3.15 && x <= 3.15 && z <= -16.2 && z >= -31.2;
}

export function groundY(x: number, z: number) {
  void x;
  void z;
  // The visible floor is assembled from Kenney Platformer Kit blocks at y=0.
  return 1;
}

export function surfaceY(x: number, z: number): number | null {
  let surface: number | null = null;
  for (const platform of PLATFORM_SURFACES) {
    if (
      Math.abs(x - platform.x) <= platform.width * 0.5 &&
      Math.abs(z - platform.z) <= platform.depth * 0.5
    ) surface = surface === null ? platform.top : Math.max(surface, platform.top);
  }
  return surface;
}

function blocked(x: number, z: number) {
  for (const blocker of BLOCKERS) {
    const dx = x - blocker.x;
    const dz = z - blocker.z;
    if (dx * dx + dz * dz < blocker.r * blocker.r) return true;
  }
  return false;
}

export function isWalkable(x: number, z: number) {
  if (blocked(x, z)) return false;
  if (onDock(x, z)) return true;
  const theta = Math.atan2(z, x);
  return Math.hypot(x, z) <= islandRadius(theta) - 0.75;
}
