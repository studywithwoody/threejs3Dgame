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

export const SPAWN = { x: 0.4, z: -14.2 };

export type PlatformSurface = {
  x: number;
  z: number;
  width: number;
  depth: number;
  top: number;
};

// These surfaces mirror the raised Kenney blocks in island.ts. They are used
// for landing only; the visible geometry still comes entirely from the kit.
export const PLATFORM_SURFACES: PlatformSurface[] = [
  { x: -6, z: -6, width: 4.8, depth: 4.8, top: 3.7 },
  { x: 0, z: -1, width: 4.8, depth: 4.8, top: 4.4 },
  { x: 6, z: 3, width: 5.2, depth: 5.2, top: 6.1 },
  { x: 3, z: 12, width: 6.8, depth: 3.4, top: 3.6 },
  { x: -8, z: 9, width: 4.8, depth: 4.8, top: 4.8 },
  { x: -12, z: -3, width: 3.8, depth: 3.8, top: 2.6 },
  { x: 11, z: -6, width: 4.2, depth: 4.2, top: 3.2 },
  { x: -12, z: 6, width: 4.4, depth: 4.4, top: 4.0 },
  { x: 12, z: 12, width: 4.8, depth: 4.8, top: 3.0 },
];

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
  return 0;
}

export function surfaceY(x: number, z: number) {
  let surface = 0;
  for (const platform of PLATFORM_SURFACES) {
    if (
      Math.abs(x - platform.x) <= platform.width * 0.5 &&
      Math.abs(z - platform.z) <= platform.depth * 0.5
    ) surface = Math.max(surface, platform.top);
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
