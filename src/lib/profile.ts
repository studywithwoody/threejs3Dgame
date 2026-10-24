export const AVATAR_COLORS = [
  "#e07a5f",
  "#2f8f8a",
  "#e0b03a",
  "#6f9a55",
  "#d15b8b",
  "#4f6fd0",
  "#c4844a",
  "#6d5a99",
] as const;

export function colorFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function displayName(user: { name: string; nickname?: string | null }) {
  const nick = user.nickname?.trim();
  return nick || user.name || "同學";
}

export function cleanNickname(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 16);
}
