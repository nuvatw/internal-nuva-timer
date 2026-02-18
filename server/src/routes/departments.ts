import { Router, Request, Response } from "express";
import { supabase } from "../supabase.js";

const router = Router();

// GET /api/departments
router.get("/", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const includeArchived = req.query.include_archived === "true";

  let query = supabase
    .from("departments")
    .select("id, name, is_archived, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (!includeArchived) {
    query = query.eq("is_archived", false);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: { code: "SERVER_ERROR", message: error.message } });
    return;
  }

  res.json(data);
});

// POST /api/departments
router.post("/", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { name } = req.body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "name is required" } });
    return;
  }
  if (name.trim().length > 100) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "name must be 100 characters or less" } });
    return;
  }

  const { data, error } = await supabase
    .from("departments")
    .insert({ user_id: userId, name: name.trim() })
    .select("id, name")
    .single();

  if (error) {
    res.status(500).json({ error: { code: "SERVER_ERROR", message: error.message } });
    return;
  }

  res.status(201).json(data);
});

// PATCH /api/departments/:id
router.patch("/:id", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { name } = req.body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "name is required" } });
    return;
  }

  const { data, error } = await supabase
    .from("departments")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, name")
    .single();

  if (error) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Department not found" } });
    return;
  }

  res.json(data);
});

// POST /api/departments/:id/archive
router.post("/:id/archive", async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { is_archived } = req.body;

  if (typeof is_archived !== "boolean") {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "is_archived must be a boolean" } });
    return;
  }

  const { data, error } = await supabase
    .from("departments")
    .update({ is_archived, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, is_archived")
    .single();

  if (error) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Department not found" } });
    return;
  }

  res.json(data);
});

export default router;
