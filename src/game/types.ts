export type Profile = {
  id: string;
  name: string;
  image?: string | null;
  color: string;
  avatarModel?: string;
};

export type IslandProgress = {
  solved: string[];
  scores: Record<string, number>;
  names: Record<string, string>;
  pets: Record<string, PetState>;
};

export type PetStatus = "healthy" | "sick" | "dead";

export type PetState = {
  name: string;
  species: "bunny" | "cat" | "dog";
  lastFedAt: number;
  status: PetStatus;
  feedings: number;
};

export type Pose = {
  id: string;
  x: number;
  z: number;
  ry: number;
};

export const POINTS_PER_STATION = 10;

export function emptyProgress(): IslandProgress {
  return { solved: [], scores: {}, names: {}, pets: {} };
}
