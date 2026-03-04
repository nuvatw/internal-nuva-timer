"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_js_1 = require("../supabase.js");
const validate_js_1 = require("../middleware/validate.js");
const errors_js_1 = require("../middleware/errors.js");
const router = (0, express_1.Router)();
// GET /api/me — Get profile + onboarding status
router.get("/me", (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { data, error } = await supabase_js_1.supabase
        .from("profiles")
        .select("user_id, display_name, avatar_emoji, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    // Profile row may not exist yet for new users — create it
    if (!data) {
        const { data: created, error: createErr } = await supabase_js_1.supabase
            .from("profiles")
            .insert({ user_id: userId })
            .select("user_id, display_name, avatar_emoji, created_at, updated_at")
            .single();
        if (createErr) {
            (0, errors_js_1.dbError)(res, createErr);
            return;
        }
        res.json({ ...created, is_onboarded: false });
        return;
    }
    const isOnboarded = !!data.display_name;
    res.json({ ...data, is_onboarded: isOnboarded });
}));
// PATCH /api/me — Update profile
router.patch("/me", (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { display_name, avatar_emoji } = req.body;
    // Input validation
    if (display_name !== undefined && typeof display_name === "string" && display_name.trim().length > 50) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "display_name must be 50 characters or less" } });
        return;
    }
    if (avatar_emoji !== undefined && typeof avatar_emoji === "string" && avatar_emoji.length > 10) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "avatar_emoji is too long" } });
        return;
    }
    const updates = {};
    if (display_name !== undefined)
        updates.display_name = typeof display_name === "string" ? display_name.trim() : display_name;
    if (avatar_emoji !== undefined)
        updates.avatar_emoji = avatar_emoji;
    if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No fields to update" } });
        return;
    }
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase_js_1.supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", userId)
        .select("user_id, display_name, avatar_emoji")
        .single();
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    res.json(data);
}));
// POST /api/me/seed — Seed default departments & projects
router.post("/me/seed", (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    // Check if already seeded (has departments)
    const { count } = await supabase_js_1.supabase
        .from("departments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
    if (count && count > 0) {
        res.json({ ok: true, message: "Already seeded" });
        return;
    }
    const { error } = await supabase_js_1.supabase.rpc("seed_user_defaults", { p_user_id: userId });
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    res.json({ ok: true });
}));
exports.default = router;
