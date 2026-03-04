import { supabase } from "../supabase.js";
import { calculateXpGain, calculateNewTomatoes, levelFromXp, getLevelTitle } from "@nuva/shared/game";
import { getOrCreateProgress } from "../routes/progress.js";
import { todayInTimezone } from "./timezone.js";

export interface GamificationResult {
  xp_gained: number;
  new_tomatoes: number;
  total_xp: number;
  current_level: number;
  level_title: string;
  level_changed: { from: number; to: number } | null;
}

/**
 * Award XP, tomatoes, and update streak after a session completion.
 * Returns null if progress couldn't be loaded (non-fatal).
 */
export async function awardSessionCompletion(
  userId: string,
  durationMinutes: number,
  timezone = "Asia/Taipei",
): Promise<GamificationResult | null> {
  const progress = await getOrCreateProgress(userId, timezone);
  if (!progress) return null;

  const dailyMinBefore = progress.daily_focus_minutes;
  const xpGained = calculateXpGain(durationMinutes, dailyMinBefore);
  const newTomatoes = calculateNewTomatoes(durationMinutes, dailyMinBefore);

  const newTotalXp = progress.total_xp + xpGained;
  const oldLevel = progress.current_level;
  const newLevel = Math.max(oldLevel, levelFromXp(newTotalXp));

  // ─── Streak logic ──────────────────────
  const today = todayInTimezone(timezone);
  const lastDate = progress.last_session_date;
  let newStreak = progress.current_streak;

  if (lastDate !== today) {
    // Compute yesterday in the user's timezone
    const now = new Date();
    const yesterdayDate = new Date(now.getTime() - 86400000);
    const yesterday = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(yesterdayDate);
    newStreak = lastDate === yesterday ? progress.current_streak + 1 : 1;
  }

  const newLongest = Math.max(progress.longest_streak, newStreak);

  await supabase
    .from("user_progress")
    .update({
      total_xp: newTotalXp,
      current_level: newLevel,
      daily_focus_minutes: dailyMinBefore + durationMinutes,
      daily_tomatoes: progress.daily_tomatoes + newTomatoes,
      daily_xp: progress.daily_xp + xpGained,
      current_streak: newStreak,
      longest_streak: newLongest,
      last_session_date: today,
      sessions_completed: progress.sessions_completed + 1,
      total_focus_minutes: progress.total_focus_minutes + durationMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return {
    xp_gained: xpGained,
    new_tomatoes: newTomatoes,
    total_xp: newTotalXp,
    current_level: newLevel,
    level_title: getLevelTitle(newLevel),
    level_changed: xpGained > 0 && newLevel > oldLevel ? { from: oldLevel, to: newLevel } : null,
  };
}
