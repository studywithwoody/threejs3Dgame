import { emptyProgress, POINTS_PER_STATION, type IslandProgress } from "@/game/types";

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
  return `${state.solved.join("|")}#${scores}`;
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
  for (const state of states) {
    for (const [id, value] of Object.entries(state.scores ?? {})) {
      const points = Number(value);
      if (!Number.isFinite(points)) continue;
      scores[id] = Math.max(scores[id] ?? 0, points);
    }
    for (const [id, name] of Object.entries(state.names ?? {})) {
      if (typeof name === "string" && name.trim()) names[id] = name.trim().slice(0, 16);
    }
  }
  return { solved, scores, names };
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
  };
}

export function normalizeProgress(raw: unknown): IslandProgress {
  if (!raw || typeof raw !== "object") return emptyProgress();
  const value = raw as Partial<IslandProgress>;
  const solved = Array.isArray(value.solved) ? value.solved.filter((id) => typeof id === "string") : [];
  const scores: Record<string, number> = {};
  const names: Record<string, string> = {};
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
  return { solved, scores, names };
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
