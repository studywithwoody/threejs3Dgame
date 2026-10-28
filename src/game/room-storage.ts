import type { RoomFurniture } from "@/game/furniture";

export const ROOM_STORAGE_KEY = "dawn-isle-room-v1";

export type RoomStorage = {
  furniture: RoomFurniture[];
  owned: Record<string, number>;
};

export function readRoomStorage(): RoomStorage {
  if (typeof window === "undefined") return { furniture: [], owned: {} };
  try {
    const value = JSON.parse(window.localStorage.getItem(ROOM_STORAGE_KEY) || "{}") as Partial<RoomStorage>;
    return {
      furniture: Array.isArray(value.furniture) ? value.furniture : [],
      owned: value.owned && typeof value.owned === "object" ? value.owned : {},
    };
  } catch {
    return { furniture: [], owned: {} };
  }
}

export function writeRoomStorage(value: RoomStorage) {
  if (typeof window !== "undefined") window.localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(value));
}
