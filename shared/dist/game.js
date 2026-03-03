// ─── Game Constants & Utilities ─────────────
//
// Single source of truth for XP, levels, and gamification logic.
// Shared by both client and server.
//
// Base rate: 1 XP per 10 minutes of completed focus.
// Daily multiplier: hour N of daily focus awards Nx XP per 10-min block.
// Level formula: cumulative XP threshold = 10 * level^2.
export const LEVEL_TIERS = [
    { name: "Seedling", minLevel: 1, maxLevel: 5 },
    { name: "Sprout", minLevel: 6, maxLevel: 10 },
    { name: "Sapling", minLevel: 11, maxLevel: 15 },
    { name: "Tree", minLevel: 16, maxLevel: 20 },
    { name: "Grove", minLevel: 21, maxLevel: 30 },
    { name: "Forest", minLevel: 31, maxLevel: 40 },
    { name: "Ancient Forest", minLevel: 41, maxLevel: 50 },
    { name: "Mythic", minLevel: 51, maxLevel: 99 },
];
// ─── XP & Level Functions ───────────────────
/**
 * Cumulative XP needed to reach a given level.
 * Level 1 = 10, Level 2 = 40, Level n = 10 * n^2.
 */
export function xpForLevel(level) {
    return 10 * level * level;
}
/**
 * Determine level from total accumulated XP.
 */
export function levelFromXp(totalXp) {
    return Math.floor(Math.sqrt(totalXp / 10));
}
/**
 * Level title based on current level.
 * Derived from LEVEL_TIERS to keep a single source of truth.
 */
export function getLevelTitle(level) {
    const tier = LEVEL_TIERS.find((t) => level >= t.minLevel && level <= t.maxLevel);
    return tier?.name ?? LEVEL_TIERS[LEVEL_TIERS.length - 1].name;
}
// ─── XP Multiplier ──────────────────────────
/**
 * Current XP multiplier based on cumulative daily focus minutes.
 * Hour N → Nx, capped at 5x.
 */
export function getCurrentMultiplier(dailyMinutes) {
    return Math.min(Math.floor(dailyMinutes / 60) + 1, 5);
}
// ─── Session XP Calculation ─────────────────
/**
 * Calculate XP gained for a completed session.
 * Walks through each 10-min block, applying the hourly multiplier
 * based on cumulative daily focus at that point.
 */
export function calculateXpGain(durationMinutes, dailyMinutesBefore) {
    if (durationMinutes <= 0)
        return 0;
    let xp = 0;
    const blocks = Math.floor(durationMinutes / 10);
    for (let i = 0; i < blocks; i++) {
        const totalMinAtPoint = dailyMinutesBefore + i * 10;
        const hourMultiplier = Math.min(Math.floor(totalMinAtPoint / 60) + 1, 5);
        xp += hourMultiplier;
    }
    return xp;
}
/**
 * Calculate new tomatoes earned from a session.
 * 1 tomato per 30 minutes of cumulative daily focus.
 */
export function calculateNewTomatoes(durationMinutes, dailyMinutesBefore) {
    const tomatoesBefore = Math.floor(dailyMinutesBefore / 30);
    const tomatoesAfter = Math.floor((dailyMinutesBefore + durationMinutes) / 30);
    return tomatoesAfter - tomatoesBefore;
}
