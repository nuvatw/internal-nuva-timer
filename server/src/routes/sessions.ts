import { Router, Request, Response } from "express";
import { supabase } from "../supabase.js";
import { validateIdParam, validateDateParams, asyncHandler } from "../middleware/validate.js";

const router = Router();
const isProduction = process.env.NODE_ENV === "production";

function dbError(res: Response, error: { message: string }) {
  const message = isProduction ? "Database operation failed" : error.message;
  res.status(500).json({ error: { code: "SERVER_ERROR", message } });
}

// POST /api/sessions/start
router.post("/start", asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { department_id, project_id, duration_minutes, planned_title } = req.body;

  // Validate duration
  if (![30, 60].includes(duration_minutes)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "duration_minutes must be 30 or 60" } });
    return;
  }

  // Validate planned_title
  if (!planned_title || typeof planned_title !== "string" || planned_title.trim().length === 0) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "planned_title is required" } });
    return;
  }
  if (planned_title.length > 200) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "planned_title must be 200 characters or less" } });
    return;
  }

  // Validate department belongs to user
  const { data: dept } = await supabase
    .from("departments")
    .select("id")
    .eq("id", department_id)
    .eq("user_id", userId)
    .single();

  if (!dept) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid department_id" } });
    return;
  }

  // Validate project belongs to user
  const { data: proj } = await supabase
    .from("projects")
    .select("id")
    .eq("id", project_id)
    .eq("user_id", userId)
    .single();

  if (!proj) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid project_id" } });
    return;
  }

  // Check no existing running/paused session
  const { data: existing } = await supabase
    .from("sessions")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["running", "paused"])
    .limit(1);

  if (existing && existing.length > 0) {
    res.status(409).json({ error: { code: "CONFLICT", message: "You already have an active session" } });
    return;
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      department_id,
      project_id,
      duration_minutes,
      planned_title: planned_title.trim(),
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) { dbError(res, error); return; }

  res.status(201).json(data);
}));

// POST /api/sessions/:id/pause
router.post("/:id/pause", validateIdParam, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!session) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found" } });
    return;
  }

  if (session.status !== "running") {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Session is not running" } });
    return;
  }

  const { data, error } = await supabase
    .from("sessions")
    .update({
      status: "paused",
      paused_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, status, paused_total_seconds")
    .single();

  if (error) { dbError(res, error); return; }

  res.json(data);
}));

// POST /api/sessions/:id/resume
router.post("/:id/resume", validateIdParam, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!session) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found" } });
    return;
  }

  if (session.status !== "paused") {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Session is not paused" } });
    return;
  }

  // Accumulate paused time
  const pausedAt = new Date(session.paused_at).getTime();
  const now = Date.now();
  const additionalPausedSeconds = Math.floor((now - pausedAt) / 1000);

  const { data, error } = await supabase
    .from("sessions")
    .update({
      status: "running",
      paused_at: null,
      paused_total_seconds: session.paused_total_seconds + additionalPausedSeconds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, status, paused_total_seconds")
    .single();

  if (error) { dbError(res, error); return; }

  res.json(data);
}));

// POST /api/sessions/:id/cancel
router.post("/:id/cancel", validateIdParam, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!session) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found" } });
    return;
  }

  if (!["running", "paused"].includes(session.status)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Session cannot be canceled" } });
    return;
  }

  const startedAt = new Date(session.started_at).getTime();
  const now = Date.now();
  let pausedTotal = session.paused_total_seconds;

  if (session.status === "paused" && session.paused_at) {
    const pausedAt = new Date(session.paused_at).getTime();
    pausedTotal += Math.floor((now - pausedAt) / 1000);
  }

  const elapsedSeconds = Math.floor((now - startedAt) / 1000) - pausedTotal;

  const { data, error } = await supabase
    .from("sessions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      elapsed_seconds: Math.max(0, elapsedSeconds),
      paused_total_seconds: pausedTotal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, status, canceled_at, elapsed_seconds")
    .single();

  if (error) { dbError(res, error); return; }

  res.json(data);
}));

// POST /api/sessions/:id/complete
router.post("/:id/complete", validateIdParam, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { completed, actual_title, notes } = req.body;

  if (typeof completed !== "boolean") {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "completed must be a boolean" } });
    return;
  }

  if (!completed) {
    if (!actual_title || typeof actual_title !== "string" || actual_title.trim().length === 0) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "actual_title is required when goal not completed" } });
      return;
    }
    if (actual_title.length > 200) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "actual_title must be 200 characters or less" } });
      return;
    }
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!session) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found" } });
    return;
  }

  if (session.status !== "running") {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Session is not running" } });
    return;
  }

  const status = completed ? "completed_yes" : "completed_no";

  const { data, error } = await supabase
    .from("sessions")
    .update({
      status,
      actual_title: actual_title?.trim() || null,
      notes: notes?.trim() || null,
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) { dbError(res, error); return; }

  res.json(data);
}));

// GET /api/sessions — with pagination (limit default 200, max 500)
router.get("/", validateDateParams, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { start, end, department_id, project_id, status, q, duration_minutes, limit: rawLimit, offset: rawOffset } = req.query;

  const limit = Math.min(Math.max(1, Number(rawLimit) || 200), 500);
  const offset = Math.max(0, Number(rawOffset) || 0);

  let query = supabase
    .from("sessions")
    .select("*, departments(name), projects(code, name)")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (start) query = query.gte("started_at", `${start}T00:00:00+08:00`);
  if (end) query = query.lte("started_at", `${end}T23:59:59+08:00`);
  if (department_id) query = query.eq("department_id", department_id as string);
  if (project_id) query = query.eq("project_id", project_id as string);
  if (status) query = query.eq("status", status as string);
  if (duration_minutes) query = query.eq("duration_minutes", Number(duration_minutes));
  if (q) {
    const keyword = `%${(q as string).slice(0, 100)}%`;
    query = query.or(`planned_title.ilike.${keyword},actual_title.ilike.${keyword},notes.ilike.${keyword}`);
  }

  const { data, error } = await query;

  if (error) { dbError(res, error); return; }

  res.json(data);
}));

// PATCH /api/sessions/:id — edit notes / actual_title on completed sessions
router.patch("/:id", validateIdParam, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { notes, actual_title } = req.body;

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!session) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found" } });
    return;
  }

  if (!["completed_yes", "completed_no", "canceled"].includes(session.status)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Only finished sessions can be edited" } });
    return;
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (notes !== undefined) {
    updates.notes = typeof notes === "string" && notes.trim() ? notes.trim() : null;
  }
  if (actual_title !== undefined) {
    if (typeof actual_title === "string" && actual_title.length > 200) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "actual_title must be 200 characters or less" } });
      return;
    }
    updates.actual_title = typeof actual_title === "string" && actual_title.trim() ? actual_title.trim() : null;
  }

  const { data, error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", id)
    .select("*, departments(name), projects(code, name)")
    .single();

  if (error) { dbError(res, error); return; }

  res.json(data);
}));

// DELETE /api/sessions/:id
router.delete("/:id", validateIdParam, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!session) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found" } });
    return;
  }

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", id);

  if (error) { dbError(res, error); return; }

  res.status(204).end();
}));

// GET /api/sessions/:id
router.get("/:id", validateIdParam, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  const { data, error } = await supabase
    .from("sessions")
    .select("*, departments(name), projects(code, name)")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found" } });
    return;
  }

  res.json(data);
}));

export default router;
