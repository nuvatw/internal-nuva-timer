"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateProgress = getOrCreateProgress;
const express_1 = require("express");
const supabase_js_1 = require("../supabase.js");
const validate_js_1 = require("../middleware/validate.js");
const errors_js_1 = require("../middleware/errors.js");
const game_1 = require("@nuva/shared/game");
const router = (0, express_1.Router)();
// ─── Helpers ───────────────────────────────────
function todayDateString() {
    return new Date().toISOString().slice(0, 10);
}
/**
 * Fetch or create user_progress row. Resets daily counters if the date changed.
 */
async function getOrCreateProgress(userId) {
    const { data, error } = await supabase_js_1.supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", userId)
        .single();
    if (error && error.code === "PGRST116") {
        // Row not found — create default
        const { data: created, error: createErr } = await supabase_js_1.supabase
            .from("user_progress")
            .insert({ user_id: userId })
            .select()
            .single();
        if (createErr)
            return null;
        return created;
    }
    if (error)
        return null;
    const row = data;
    const today = todayDateString();
    // Reset daily counters if date changed
    if (row.daily_date !== today) {
        const { data: updated, error: updateErr } = await supabase_js_1.supabase
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
        if (updateErr)
            return null;
        return updated;
    }
    return row;
}
// ─── GET /api/progress ─────────────────────────
// Returns user's gamification progress.
router.get("/", (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const progress = await getOrCreateProgress(userId);
    if (!progress) {
        res.status(500).json({ error: { code: "SERVER_ERROR", message: "Failed to load progress" } });
        return;
    }
    const level = progress.current_level;
    // Level 1 is the default starting level (0 XP), so its floor is 0
    const currentLevelXp = level <= 1 ? 0 : (0, game_1.xpForLevel)(level);
    const nextLevelXp = (0, game_1.xpForLevel)(Math.max(level, 1) + 1);
    res.json({
        total_xp: progress.total_xp,
        current_level: level,
        level_title: (0, game_1.getLevelTitle)(level),
        xp_current_level: currentLevelXp,
        xp_next_level: nextLevelXp,
        daily_focus_minutes: progress.daily_focus_minutes,
        daily_tomatoes: progress.daily_tomatoes,
        daily_xp: progress.daily_xp,
        tomato_goal: progress.tomato_goal,
        current_streak: progress.current_streak,
        longest_streak: progress.longest_streak,
        current_multiplier: (0, game_1.getCurrentMultiplier)(progress.daily_focus_minutes),
        sessions_completed: progress.sessions_completed,
        total_focus_minutes: progress.total_focus_minutes,
    });
}));
// ─── PATCH /api/progress/goal ──────────────────
// Update daily tomato goal (5-30).
router.patch("/goal", (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { tomato_goal } = req.body;
    if (!Number.isInteger(tomato_goal) || tomato_goal < 5 || tomato_goal > 30) {
        res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "tomato_goal must be an integer between 5 and 30" },
        });
        return;
    }
    // Ensure row exists
    await getOrCreateProgress(userId);
    const { data, error } = await supabase_js_1.supabase
        .from("user_progress")
        .update({ tomato_goal, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select("tomato_goal")
        .single();
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    res.json(data);
}));
exports.default = router;
