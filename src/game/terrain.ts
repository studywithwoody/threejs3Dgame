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
  const theta = Math.atan2(z, x);
  const edge = islandRadius(theta);
  const r = Math.hypot(x, z);
  if (onDock(x, z) && r > edge - 1.1) return 0.46;
  const u = edge === 0 ? 0 : r / edge;
  const dune = Math.cos(Math.min(u, 1) * Math.PI * 0.5) ** 1.35 * 2.05;
  const hill = Math.exp(-(x * x + (z - 8.2) * (z - 8.2)) / 62) * 3.55;
  const knoll = Math.exp(-((x - 7.2) ** 2 + (z - 16.4) ** 2) / 34) * 1.7;
  const west = Math.exp(-((x + 12.5) ** 2 + (z + 0.6) ** 2) / 30) * 0.85;
  return dune + hill + knoll + west;
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
