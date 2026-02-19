import { Router, Request, Response } from "express";
import { supabase } from "../supabase.js";
import { asyncHandler } from "../middleware/validate.js";

const router = Router();
const isProduction = process.env.NODE_ENV === "production";

function dbError(res: Response, error: { message: string }) {
  const message = isProduction ? "Database operation failed" : error.message;
  res.status(500).json({ error: { code: "SERVER_ERROR", message } });
}

// GET /api/me — Get profile + onboarding status
router.get("/me", asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_emoji, created_at, updated_at")
    .eq("user_id", userId)
    .single();

  if (error) { dbError(res, error); return; }

  const isOnboarded = !!data.display_name;

  res.json({ ...data, is_onboarded: isOnboarded });
}));

// PATCH /api/me — Update profile
router.patch("/me", asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
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

  const updates: Record<string, string> = {};
  if (display_name !== undefined) updates.display_name = typeof display_name === "string" ? display_name.trim() : display_name;
  if (avatar_emoji !== undefined) updates.avatar_emoji = avatar_emoji;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No fields to update" } });
    return;
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", userId)
    .select("user_id, display_name, avatar_emoji")
    .single();

  if (error) { dbError(res, error); return; }

  res.json(data);
}));

// POST /api/me/seed — Seed default departments & projects
router.post("/me/seed", asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  // Check if already seeded (has departments)
  const { count } = await supabase
    .from("departments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count && count > 0) {
    res.json({ ok: true, message: "Already seeded" });
    return;
  }

  const { error } = await supabase.rpc("seed_user_defaults", { p_user_id: userId });

  if (error) { dbError(res, error); return; }

  res.json({ ok: true });
}));

export default router;
