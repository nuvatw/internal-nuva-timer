import { Router, Request, Response } from "express";
import { supabase } from "../supabase.js";
import { validateIdParam, asyncHandler } from "../middleware/validate.js";

const router = Router();
const isProduction = process.env.NODE_ENV === "production";

function dbError(res: Response, error: { message: string }) {
  const message = isProduction ? "Database operation failed" : error.message;
  res.status(500).json({ error: { code: "SERVER_ERROR", message } });
}

// GET /api/projects
router.get("/", asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const includeArchived = req.query.include_archived === "true";

  let query = supabase
    .from("projects")
    .select("id, code, name, is_archived, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (!includeArchived) {
    query = query.eq("is_archived", false);
  }

  const { data, error } = await query;

  if (error) { dbError(res, error); return; }

  res.json(data);
}));

// POST /api/projects
router.post("/", asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { code, name } = req.body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "name is required" } });
    return;
  }
  if (name.trim().length > 100) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "name must be 100 characters or less" } });
    return;
  }
  if (code && typeof code === "string" && code.trim().length > 20) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "code must be 20 characters or less" } });
    return;
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: name.trim(),
      code: code?.trim() || null,
    })
    .select("id, code, name")
    .single();

  if (error) { dbError(res, error); return; }

  res.status(201).json(data);
}));

// PATCH /api/projects/:id
router.patch("/:id", validateIdParam, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { code, name } = req.body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "name cannot be empty" } });
      return;
    }
    updates.name = name.trim();
  }
  if (code !== undefined) updates.code = code?.trim() || null;

  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, code, name")
    .single();

  if (error) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found" } });
    return;
  }

  res.json(data);
}));

// POST /api/projects/:id/archive
router.post("/:id/archive", validateIdParam, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { is_archived } = req.body;

  if (typeof is_archived !== "boolean") {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "is_archived must be a boolean" } });
    return;
  }

  const { data, error } = await supabase
    .from("projects")
    .update({ is_archived, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, is_archived")
    .single();

  if (error) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found" } });
    return;
  }

  res.json(data);
}));

export default router;
