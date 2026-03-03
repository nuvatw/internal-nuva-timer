declare const router: import("express-serve-static-core").Router;
interface ProgressRow {
    user_id: string;
    total_xp: number;
    current_level: number;
    daily_focus_minutes: number;
    daily_tomatoes: number;
    daily_xp: number;
    daily_date: string;
    tomato_goal: number;
    current_streak: number;
    longest_streak: number;
    last_session_date: string | null;
    sessions_completed: number;
    total_focus_minutes: number;
}
/**
 * Fetch or create user_progress row. Resets daily counters if the date changed.
 */
export declare function getOrCreateProgress(userId: string): Promise<ProgressRow | null>;
export default router;
