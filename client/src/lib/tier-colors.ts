// ─── Level Tier Colors ──────────────────────
// Tailwind class pairs for level badges and bars (client-only).

export interface TierColors {
  text: string;
  bg: string;
  bar: string;
}

export function getLevelTierColors(level: number): TierColors {
  if (level <= 5) return { text: "text-text-tertiary", bg: "bg-text-tertiary/15", bar: "bg-text-tertiary" };
  if (level <= 10) return { text: "text-success", bg: "bg-success-muted", bar: "bg-success" };
  if (level <= 15) return { text: "text-accent", bg: "bg-accent-muted", bar: "bg-accent" };
  if (level <= 20) return { text: "text-purple-500", bg: "bg-purple-500/15", bar: "bg-purple-500" };
  if (level <= 30) return { text: "text-amber-500", bg: "bg-amber-500/15", bar: "bg-amber-500" };
  return { text: "text-cyan-400", bg: "bg-cyan-400/15", bar: "bg-cyan-400" };
}
