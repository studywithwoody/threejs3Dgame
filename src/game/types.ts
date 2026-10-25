export type Profile = {
  id: string;
  name: string;
  image?: string | null;
  color: string;
};

export type IslandProgress = {
  solved: string[];
  scores: Record<string, number>;
  names: Record<string, string>;
};

export type Pose = {
  id: string;
  x: number;
  z: number;
  ry: number;
};

export type ChatMessage = {
  id: string;
  name: string;
  text: string;
  t: number;
};

export const POINTS_PER_STATION = 10;

export function emptyProgress(): IslandProgress {
  return { solved: [], scores: {}, names: {} };
}
