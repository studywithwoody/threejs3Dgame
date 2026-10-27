import { emptyProgress, POINTS_PER_STATION, type IslandProgress, type PetState, type PetStatus } from "@/game/types";

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
    .map((id) => `${id}:${state.pets[id].lastFedAt}:${state.pets[id].status}:${state.pets[id].feedings}`)
    .join(",");
  return `${state.solved.join("|")}#${scores}#${pets}`;
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
  const pets: Record<string, PetState> = {};
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
      if (!pet || typeof pet !== "object") continue;
      const candidate = normalizePet(pet);
      if (!candidate) continue;
      if (!pets[id] || candidate.lastFedAt >= pets[id].lastFedAt) pets[id] = candidate;
    }
  }
  return { solved, scores, names, pets };
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
  };
}

export function normalizeProgress(raw: unknown): IslandProgress {
  if (!raw || typeof raw !== "object") return emptyProgress();
  const value = raw as Partial<IslandProgress>;
  const solved = Array.isArray(value.solved) ? value.solved.filter((id) => typeof id === "string") : [];
  const scores: Record<string, number> = {};
  const names: Record<string, string> = {};
  const pets: Record<string, PetState> = {};
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
      const candidate = normalizePet(pet);
      if (candidate) pets[id] = candidate;
    }
  }
  return { solved, scores, names, pets };
}

export function petStatus(lastFedAt: number, now = Date.now()): PetStatus {
  const age = Math.max(0, now - lastFedAt);
  if (age >= 48 * 60 * 60 * 1000) return "dead";
  if (age >= 24 * 60 * 60 * 1000) return "sick";
  return "healthy";
}

export function freshPet(now = Date.now()): PetState {
  return { name: "小曙", species: "bunny", lastFedAt: now, status: "healthy", feedings: 0 };
}

export function refreshPet(pet: PetState, now = Date.now()): PetState {
  return { ...pet, status: petStatus(pet.lastFedAt, now) };
}

export function feedPet(state: IslandProgress, playerId: string, now = Date.now(), cost = 5): IslandProgress | null {
  const score = state.scores[playerId] ?? 0;
  const pet = state.pets[playerId];
  if (!pet || refreshPet(pet, now).status === "dead" || score < cost) return null;
  return {
    ...state,
    scores: { ...state.scores, [playerId]: score - cost },
    pets: {
      ...state.pets,
      [playerId]: { ...pet, lastFedAt: now, status: "healthy" as const, feedings: pet.feedings + 1 },
    },
  };
}

export function adoptPet(state: IslandProgress, playerId: string, now = Date.now(), cost = 10): IslandProgress | null {
  const score = state.scores[playerId] ?? 0;
  const pet = state.pets[playerId];
  if (!pet || refreshPet(pet, now).status !== "dead" || score < cost) return null;
  return {
    ...state,
    scores: { ...state.scores, [playerId]: score - cost },
    pets: { ...state.pets, [playerId]: freshPet(now) },
  };
}

function normalizePet(raw: unknown): PetState | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<PetState>;
  const lastFedAt = Number(value.lastFedAt);
  if (!Number.isFinite(lastFedAt) || lastFedAt <= 0) return null;
  const species = value.species === "cat" || value.species === "dog" ? value.species : "bunny";
  const name = typeof value.name === "string" && value.name.trim() ? value.name.trim().slice(0, 12) : "小曙";
  const feedings = Number.isFinite(Number(value.feedings)) ? Math.max(0, Number(value.feedings)) : 0;
  return { name, species, lastFedAt, status: petStatus(lastFedAt), feedings };
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
