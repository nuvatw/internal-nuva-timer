import { Router, Request, Response } from "express";
import { supabase } from "../supabase.js";
import { asyncHandler } from "../middleware/validate.js";
import { dbError } from "../middleware/errors.js";
import { xpForLevel, levelFromXp, getLevelTitle, getCurrentMultiplier } from "@nuva/shared/game";
import { resolveTimezone, todayInTimezone } from "../lib/timezone.js";

const router = Router();

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
 * Uses the user's timezone (IANA name) to determine "today".
 */
export async function getOrCreateProgress(userId: string, timezone = "Asia/Taipei"): Promise<ProgressRow | null> {
  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    // Row not found — create default
    const { data: created, error: createErr } = await supabase
      .from("user_progress")
      .insert({ user_id: userId })
      .select()
      .single();

    if (createErr) return null;
    return created as ProgressRow;
  }

  if (error) return null;

  const row = data as ProgressRow;
  const today = todayInTimezone(timezone);

  // Reset daily counters if date changed
  if (row.daily_date !== today) {
    const { data: updated, error: updateErr } = await supabase
      .from("user_progress")
      .update({
        daily_focus_minutes: 0,
        daily_tomatoes: 0,
        daily_xp: 0,
        daily_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (updateErr) return null;
    return updated as ProgressRow;
  }

  return row;
}

// ─── GET /api/progress ─────────────────────────
// Returns user's gamification progress.

router.get("/", asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const timezone = resolveTimezone(req.timezone);
  const progress = await getOrCreateProgress(userId, timezone);

  if (!progress) {
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to load progress" } });
    return;
  }

  const level = progress.current_level;
  // Level 1 is the default starting level (0 XP), so its floor is 0
  const currentLevelXp = level <= 1 ? 0 : xpForLevel(level);
  const nextLevelXp = xpForLevel(Math.max(level, 1) + 1);

  res.json({
    total_xp: progress.total_xp,
    current_level: level,
    level_title: getLevelTitle(level),
    xp_current_level: currentLevelXp,
    xp_next_level: nextLevelXp,
    daily_focus_minutes: progress.daily_focus_minutes,
    daily_tomatoes: progress.daily_tomatoes,
    daily_xp: progress.daily_xp,
    tomato_goal: progress.tomato_goal,
    current_streak: progress.current_streak,
    longest_streak: progress.longest_streak,
    current_multiplier: getCurrentMultiplier(progress.daily_focus_minutes),
    sessions_completed: progress.sessions_completed,
    total_focus_minutes: progress.total_focus_minutes,
  });
}));

// ─── PATCH /api/progress/goal ──────────────────
// Update daily tomato goal (5-30).

router.patch("/goal", asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { tomato_goal } = req.body;

  if (!Number.isInteger(tomato_goal) || tomato_goal < 5 || tomato_goal > 30) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "tomato_goal must be an integer between 5 and 30" },
    });
    return;
  }

  // Ensure row exists
  const timezone = resolveTimezone(req.timezone);
  await getOrCreateProgress(userId, timezone);

  const { data, error } = await supabase
    .from("user_progress")
    .update({ tomato_goal, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select("tomato_goal")
    .single();

  if (error) { dbError(res, error); return; }

  res.json(data);
}));

export default router;
