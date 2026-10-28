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
  pets: Record<string, PetState[]>;
  eggs: Record<string, EggState[]>;
};

export type PetStatus = "healthy" | "sick" | "dead";
export type PetSpecies =
  | "bunny"
  | "cat"
  | "dog"
  | "chicken"
  | "beaver"
  | "cow"
  | "deer"
  | "fox"
  | "panda"
  | "penguin";

export type PetState = {
  id: string;
  name: string;
  species: PetSpecies;
  lastFedAt: number;
  status: PetStatus;
  feedings: number;
};

export type EggState = {
  id: string;
  createdAt: number;
};

export type Pose = {
  id: string;
  x: number;
  z: number;
  ry: number;
};

export const POINTS_PER_STATION = 10;

export function emptyProgress(): IslandProgress {
  return { solved: [], scores: {}, names: {}, pets: {}, eggs: {} };
}
