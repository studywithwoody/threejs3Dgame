export type FurnitureItem = {
  id: string;
  name: string;
  icon: string;
  price: number;
  path: string;
  defaultScale: number;
};

export type RoomFurniture = {
  id: string;
  assetId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

const furniturePath = (id: string) => `/assets/furniture-kit/Models/GLB%20format/${id}.glb`;

export const FURNITURE_CATALOG: FurnitureItem[] = [
  { id: "beddouble", name: "雙人床", icon: "🛏️", price: 30, path: furniturePath("beddouble"), defaultScale: 0.9 },
  { id: "loungechairrelax", name: "休閒沙發椅", icon: "🛋️", price: 25, path: furniturePath("loungechairrelax"), defaultScale: 0.8 },
  { id: "benchcushion", name: "柔軟長椅", icon: "🪑", price: 18, path: furniturePath("benchcushion"), defaultScale: 0.8 },
  { id: "tablecoffeesquare", name: "方形茶几", icon: "▣", price: 15, path: furniturePath("tablecoffeesquare"), defaultScale: 0.8 },
  { id: "bookcaseopen", name: "開放書櫃", icon: "📚", price: 22, path: furniturePath("bookcaseopen"), defaultScale: 0.75 },
  { id: "desk", name: "工作桌", icon: "🖥️", price: 24, path: furniturePath("desk"), defaultScale: 0.75 },
  { id: "lampsquarefloor", name: "落地燈", icon: "🛋", price: 12, path: furniturePath("lampsquarefloor"), defaultScale: 0.7 },
  { id: "plantsmall1", name: "小盆栽", icon: "🪴", price: 10, path: furniturePath("plantsmall1"), defaultScale: 0.75 },
  { id: "rugrounded", name: "圓形地毯", icon: "🟠", price: 14, path: furniturePath("rugrounded"), defaultScale: 0.8 },
  { id: "televisionvintage", name: "復古電視", icon: "📺", price: 20, path: furniturePath("televisionvintage"), defaultScale: 0.7 },
];

export const FURNITURE_BY_ID = new Map(FURNITURE_CATALOG.map((item) => [item.id, item]));

export function defaultFurniture(assetId: string, index: number): RoomFurniture | null {
  const item = FURNITURE_BY_ID.get(assetId);
  if (!item) return null;
  const angle = (index % 6) * 0.8;
  return {
    id: `room-${assetId}-${Date.now()}-${index}`,
    assetId,
    position: [Math.cos(angle) * 1.8, 0, Math.sin(angle) * 1.2],
    rotation: [0, index % 2 ? Math.PI / 2 : 0, 0],
    scale: [item.defaultScale, item.defaultScale, item.defaultScale],
  };
}
