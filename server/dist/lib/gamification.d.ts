export interface GamificationResult {
    xp_gained: number;
    new_tomatoes: number;
    total_xp: number;
    current_level: number;
    level_title: string;
    level_changed: {
        from: number;
        to: number;
    } | null;
}
/**
 * Award XP, tomatoes, and update streak after a session completion.
 * Returns null if progress couldn't be loaded (non-fatal).
 */
export declare function awardSessionCompletion(userId: string, durationMinutes: number): Promise<GamificationResult | null>;
