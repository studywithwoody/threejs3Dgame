import { emptyProgress, POINTS_PER_STATION, type EggState, type IslandProgress, type PetSpecies, type PetState, type PetStatus } from "@/game/types";

export const MAX_PETS = 5;
export const EGG_COST = 10;

const STORAGE_KEY = "dawn-isle-progress-v1";

export function stationOrder(questions: { id: string; stage: number }[]) {
  return [...questions].sort((a, b) => a.stage - b.stage || a.id.localeCompare(b.id)).map((q) => q.id);
}

export function nextStation(order: string[], solved: string[]) {
  return order.find((id) => !solved.includes(id)) ?? null;
}

export function canSolve(order: string[], solved: string[], id: string) {
  return nextStation(order, solved) === id;
}

export function signature(state: IslandProgress) {
  const scores = Object.keys(state.scores)
    .sort()
    .map((id) => `${id}:${state.scores[id]}`)
    .join(",");
  const pets = Object.keys(state.pets ?? {})
    .sort()
    .map((id) => `${id}:${(state.pets[id] ?? []).map((pet) => `${pet.id}:${pet.lastFedAt}:${pet.status}:${pet.feedings}`).join(",")}`)
    .join(",");
  const eggs = Object.keys(state.eggs ?? {})
    .sort()
    .map((id) => `${id}:${(state.eggs[id] ?? []).map((egg) => `${egg.id}:${egg.createdAt}`).join(",")}`)
    .join(",");
  return `${state.solved.join("|")}#${scores}#${pets}#${eggs}`;
}

export function mergeProgress(order: string[], states: IslandProgress[]): IslandProgress {
  const have = new Set(states.flatMap((state) => state.solved));
  const solved: string[] = [];
  for (const id of order) {
    if (!have.has(id)) break;
    solved.push(id);
  }
  const scores: Record<string, number> = {};
  const names: Record<string, string> = {};
  const pets: Record<string, PetState[]> = {};
  const eggs: Record<string, EggState[]> = {};
  for (const state of states) {
    for (const [id, value] of Object.entries(state.scores ?? {})) {
      const points = Number(value);
      if (!Number.isFinite(points)) continue;
      scores[id] = Math.max(scores[id] ?? 0, points);
    }
    for (const [id, name] of Object.entries(state.names ?? {})) {
      if (typeof name === "string" && name.trim()) names[id] = name.trim().slice(0, 16);
    }
    for (const [id, pet] of Object.entries(state.pets ?? {})) {
      const candidates = normalizePets(pet);
      if (candidates.length > 0) pets[id] = candidates;
    }
    for (const [id, value] of Object.entries(state.eggs ?? {})) {
      const candidates = normalizeEggs(value);
      if (candidates.length > 0) eggs[id] = candidates;
    }
  }
  return { solved, scores, names, pets, eggs };
}

export function award(
  state: IslandProgress,
  order: string[],
  stationId: string,
  playerId: string,
  playerName: string,
) {
  if (!canSolve(order, state.solved, stationId)) return state;
  return {
    solved: [...state.solved, stationId],
    scores: { ...state.scores, [playerId]: (state.scores[playerId] ?? 0) + POINTS_PER_STATION },
    names: { ...state.names, [playerId]: playerName },
    pets: state.pets,
    eggs: state.eggs,
  };
}

export function normalizeProgress(raw: unknown): IslandProgress {
  if (!raw || typeof raw !== "object") return emptyProgress();
  const value = raw as Partial<IslandProgress>;
  const solved = Array.isArray(value.solved) ? value.solved.filter((id) => typeof id === "string") : [];
  const scores: Record<string, number> = {};
  const names: Record<string, string> = {};
  const pets: Record<string, PetState[]> = {};
  const eggs: Record<string, EggState[]> = {};
  if (value.scores && typeof value.scores === "object") {
    for (const [id, points] of Object.entries(value.scores)) {
      const n = Number(points);
      if (Number.isFinite(n)) scores[id] = n;
    }
  }
  if (value.names && typeof value.names === "object") {
    for (const [id, name] of Object.entries(value.names)) {
      if (typeof name === "string" && name.trim()) names[id] = name.trim().slice(0, 16);
    }
  }
  if (value.pets && typeof value.pets === "object") {
    for (const [id, pet] of Object.entries(value.pets)) {
      const candidates = normalizePets(pet);
      if (candidates.length > 0) pets[id] = candidates;
    }
  }
  if (value.eggs && typeof value.eggs === "object") {
    for (const [id, egg] of Object.entries(value.eggs)) {
      const candidates = normalizeEggs(egg);
      if (candidates.length > 0) eggs[id] = candidates;
    }
  }
  return { solved, scores, names, pets, eggs };
}

export function petStatus(lastFedAt: number, now = Date.now()): PetStatus {
  const age = Math.max(0, now - lastFedAt);
  if (age >= 48 * 60 * 60 * 1000) return "dead";
  if (age >= 24 * 60 * 60 * 1000) return "sick";
  return "healthy";
}

export function freshPet(now = Date.now(), species: PetSpecies = "bunny", id = `pet-${now}`): PetState {
  const names: Record<PetSpecies, string> = { bunny: "小曙", cat: "小貓", dog: "小狗", chicken: "小雞" };
  return { id, name: names[species], species, lastFedAt: now, status: "healthy", feedings: 0 };
}

export function refreshPet(pet: PetState, now = Date.now()): PetState {
  return { ...pet, status: petStatus(pet.lastFedAt, now) };
}

export function feedPet(state: IslandProgress, playerId: string, petId: string, now = Date.now(), cost = 5): IslandProgress | null {
  const score = state.scores[playerId] ?? 0;
  const pets = state.pets[playerId] ?? [];
  const pet = pets.find((candidate) => candidate.id === petId);
  if (!pet || refreshPet(pet, now).status === "dead" || score < cost) return null;
  return {
    ...state,
    scores: { ...state.scores, [playerId]: score - cost },
    pets: {
      ...state.pets,
      [playerId]: pets.map((candidate) => candidate.id === petId
        ? { ...candidate, lastFedAt: now, status: "healthy" as const, feedings: candidate.feedings + 1 }
        : candidate),
    },
  };
}

export function buyEgg(state: IslandProgress, playerId: string, now = Date.now(), cost = EGG_COST): IslandProgress | null {
  const score = state.scores[playerId] ?? 0;
  if (score < cost) return null;
  const eggs = state.eggs[playerId] ?? [];
  const egg = { id: `egg-${playerId}-${now}-${eggs.length}`, createdAt: now };
  return {
    ...state,
    scores: { ...state.scores, [playerId]: score - cost },
    eggs: { ...state.eggs, [playerId]: [...eggs, egg] },
  };
}

export function hatchEgg(state: IslandProgress, playerId: string, eggId: string, species: PetSpecies, now = Date.now()): IslandProgress | null {
  const pets = state.pets[playerId] ?? [];
  const eggs = state.eggs[playerId] ?? [];
  const egg = eggs.find((candidate) => candidate.id === eggId);
  if (!egg || pets.length >= MAX_PETS || !["cat", "dog", "chicken"].includes(species)) return null;
  return {
    ...state,
    pets: { ...state.pets, [playerId]: [...pets, freshPet(now, species, `pet-${egg.id}`)] },
    eggs: { ...state.eggs, [playerId]: eggs.filter((candidate) => candidate.id !== eggId) },
  };
}

export function discardPet(state: IslandProgress, playerId: string, petId: string): IslandProgress | null {
  const pets = state.pets[playerId] ?? [];
  if (!pets.some((pet) => pet.id === petId)) return null;
  return { ...state, pets: { ...state.pets, [playerId]: pets.filter((pet) => pet.id !== petId) } };
}

function normalizePet(raw: unknown, fallbackId: string): PetState | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<PetState>;
  const lastFedAt = Number(value.lastFedAt);
  if (!Number.isFinite(lastFedAt) || lastFedAt <= 0) return null;
  const species = value.species === "cat" || value.species === "dog" || value.species === "chicken" ? value.species : "bunny";
  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim().slice(0, 12) : "小曙";
  const feedings = Number.isFinite(Number(value.feedings)) ? Math.max(0, Number(value.feedings)) : 0;
  const id = typeof value.id === "string" && value.id.trim() ? value.id : fallbackId;
  return { id, name, species, lastFedAt, status: petStatus(lastFedAt), feedings };
}

function normalizePets(raw: unknown): PetState[] {
  if (Array.isArray(raw)) return raw.map((value, index) => normalizePet(value, `pet-legacy-${index}`)).filter((pet): pet is PetState => Boolean(pet)).slice(0, MAX_PETS);
  const legacy = normalizePet(raw, "pet-legacy");
  return legacy ? [legacy] : [];
}

function normalizeEggs(raw: unknown): EggState[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((value) => {
    if (!value || typeof value !== "object") return null;
    const item = value as Partial<EggState>;
    const createdAt = Number(item.createdAt);
    if (typeof item.id !== "string" || !item.id || !Number.isFinite(createdAt)) return null;
    return { id: item.id.slice(0, 100), createdAt };
  }).filter((egg): egg is EggState => Boolean(egg));
}

export function loadProgress() {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(state: IslandProgress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export { STORAGE_KEY };
