export interface LevelTier {
    name: string;
    minLevel: number;
    maxLevel: number;
}
export declare const LEVEL_TIERS: readonly LevelTier[];
/**
 * Cumulative XP needed to reach a given level.
 * Level 1 = 10, Level 2 = 40, Level n = 10 * n^2.
 */
export declare function xpForLevel(level: number): number;
/**
 * Determine level from total accumulated XP.
 */
export declare function levelFromXp(totalXp: number): number;
/**
 * Level title based on current level.
 * Derived from LEVEL_TIERS to keep a single source of truth.
 */
export declare function getLevelTitle(level: number): string;
/**
 * Current XP multiplier based on cumulative daily focus minutes.
 * Hour N → Nx, capped at 5x.
 */
export declare function getCurrentMultiplier(dailyMinutes: number): number;
/**
 * Calculate XP gained for a completed session.
 * Walks through each 10-min block, applying the hourly multiplier
 * based on cumulative daily focus at that point.
 */
export declare function calculateXpGain(durationMinutes: number, dailyMinutesBefore: number): number;
/**
 * Calculate new tomatoes earned from a session.
 * 1 tomato per 30 minutes of cumulative daily focus.
 */
export declare function calculateNewTomatoes(durationMinutes: number, dailyMinutesBefore: number): number;
