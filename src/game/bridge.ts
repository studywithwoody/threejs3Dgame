import type { Pose } from "@/game/types";

/** Stable callbacks so the WebGL loop never waits on a React render. */
export const stationOrderRef = { ids: [] as string[] };

export const uiBridge = {
  typing: false,
  onNearby: (_id: string | null) => {},
  onPose: (_pose: Pose) => {},
  onCoinCollected: () => {},
  onInteract: () => {},
};
