export const levelFromXp = (xp: number) => Math.max(1, Math.floor(Math.sqrt(xp / 50)) + 1);
export const xpForNextLevel = (level: number) => Math.pow(level, 2) * 50;
export const xpProgress = (xp: number) => {
  const lvl = levelFromXp(xp);
  const cur = Math.pow(lvl - 1, 2) * 50;
  const next = xpForNextLevel(lvl);
  return { lvl, cur, next, pct: Math.min(100, Math.round(((xp - cur) / (next - cur)) * 100)) };
};
