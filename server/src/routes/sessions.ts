import { Router, Request, Response } from "express";
import { supabase } from "../supabase.js";
import { validateIdParam, validateDateParams, asyncHandler } from "../middleware/validate.js";
import { dbError } from "../middleware/errors.js";
import { awardSessionCompletion } from "../lib/gamification.js";

const router = Router();

/** Fetch a session owned by the user, or send 404 and return null. */
async function findSession(req: Request, res: Response) {
  const id = req.params.id as string;
  const userId = req.userId!;
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!data) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found" } });
  }
  return data;
}

// POST /api/sessions/start
router.post("/start", asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { department_id, project_id, duration_minutes, planned_title } = req.body;

  // Validate duration (integer 5–60)
  if (!Number.isInteger(duration_minutes) || duration_minutes < 5 || duration_minutes > 60) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "duration_minutes must be an integer between 5 and 60" } });
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

// GET /api/sessions/active — find a running or paused session for the current user
router.get("/active", asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  const { data, error } = await supabase
    .from("sessions")
    .select("*, departments(name), projects(code, name)")
    .eq("user_id", userId)
    .in("status", ["running", "paused"])
    .limit(1)
    .maybeSingle();

  if (error) {
    res.json(null);
    return;
  }

  res.json(data ?? null);
}));

// POST /api/sessions/manual — add a past session manually
router.post("/manual", asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { department_id, project_id, planned_title, started_at, ended_at, completed, actual_title, notes } = req.body;

  // Validate required fields
  if (!planned_title || typeof planned_title !== "string" || planned_title.trim().length === 0) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "planned_title is required" } });
    return;
  }
  if (planned_title.length > 200) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "planned_title must be 200 characters or less" } });
    return;
  }
  if (typeof completed !== "boolean") {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "completed must be a boolean" } });
    return;
  }
  if (!completed && (!actual_title || typeof actual_title !== "string" || actual_title.trim().length === 0)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "actual_title is required when goal not completed" } });
    return;
  }

  // Validate timestamps
  const startDate = new Date(started_at);
  const endDate = new Date(ended_at);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid date format for started_at or ended_at" } });
    return;
  }
  if (endDate <= startDate) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "ended_at must be after started_at" } });
    return;
  }
  if (startDate.getTime() > Date.now()) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "started_at cannot be in the future" } });
    return;
  }

  const elapsedSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
  const durationMinutes = Math.round(elapsedSeconds / 60);

  if (durationMinutes < 5 || durationMinutes > 480) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Session duration must be between 5 minutes and 8 hours" } });
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

  const completionStatus = completed ? "completed_yes" : "completed_no";

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      department_id,
      project_id,
      duration_minutes: durationMinutes,
      planned_title: planned_title.trim(),
      actual_title: actual_title?.trim() || null,
      notes: notes?.trim() || null,
      status: completionStatus,
      started_at: startDate.toISOString(),
      ended_at: endDate.toISOString(),
      elapsed_seconds: elapsedSeconds,
      paused_total_seconds: 0,
    })
    .select("*, departments(name), projects(code, name)")
    .single();

  if (error) { dbError(res, error); return; }

  // Award XP (non-fatal on failure)
  let gamification = null;
  try {
    gamification = await awardSessionCompletion(userId, durationMinutes);
  } catch {
    // Gamification failure should not block manual entry
  }

  res.status(201).json({ ...data, gamification });
}));

// POST /api/sessions/:id/pause
router.post("/:id/pause", validateIdParam, asyncHandler(async (req: Request, res: Response) => {
  const session = await findSession(req, res);
  if (!session) return;

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
    .eq("id", session.id)
    .select("id, status, paused_total_seconds")
    .single();

  if (error) { dbError(res, error); return; }

  res.json(data);
}));

// POST /api/sessions/:id/resume
router.post("/:id/resume", validateIdParam, asyncHandler(async (req: Request, res: Response) => {
  const session = await findSession(req, res);
  if (!session) return;

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
    .eq("id", session.id)
    .select("id, status, paused_total_seconds")
    .single();

  if (error) { dbError(res, error); return; }

  res.json(data);
}));

// POST /api/sessions/:id/cancel
router.post("/:id/cancel", validateIdParam, asyncHandler(async (req: Request, res: Response) => {
  const session = await findSession(req, res);
  if (!session) return;

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
    .eq("id", session.id)
    .select("id, status, canceled_at, elapsed_seconds")
    .single();

  if (error) { dbError(res, error); return; }

  res.json(data);
}));

// POST /api/sessions/:id/complete
router.post("/:id/complete", validateIdParam, asyncHandler(async (req: Request, res: Response) => {
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

  const session = await findSession(req, res);
  if (!session) return;

  if (session.status !== "running") {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Session is not running" } });
    return;
  }

  const completionStatus = completed ? "completed_yes" : "completed_no";

  // Calculate ended_at from planned duration only (started_at + duration_minutes)
  const startedMs = new Date(session.started_at).getTime();
  const endedAt = new Date(startedMs + session.duration_minutes * 60 * 1000).toISOString();
  const elapsedSeconds = session.duration_minutes * 60;

  const { data, error } = await supabase
    .from("sessions")
    .update({
      status: completionStatus,
      actual_title: actual_title?.trim() || null,
      notes: notes?.trim() || null,
      ended_at: endedAt,
      elapsed_seconds: elapsedSeconds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .select()
    .single();

  if (error) { dbError(res, error); return; }

  // Award XP, tomatoes, and update streak (non-fatal on failure)
  let gamification = null;
  try {
    gamification = await awardSessionCompletion(req.userId!, session.duration_minutes as number);
  } catch {
    // Gamification failure should not block session completion
  }

  res.json({ ...data, gamification });
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

// PATCH /api/sessions/:id — edit completed session fields
router.patch("/:id", validateIdParam, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { notes, actual_title, department_id, project_id, started_at, ended_at, duration_minutes } = req.body;

  const session = await findSession(req, res);
  if (!session) return;

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

  // Department
  if (department_id !== undefined) {
    const { data: dept } = await supabase.from("departments").select("id").eq("id", department_id).eq("user_id", userId).single();
    if (!dept) { res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid department_id" } }); return; }
    updates.department_id = department_id;
  }

  // Project
  if (project_id !== undefined) {
    const { data: proj } = await supabase.from("projects").select("id").eq("id", project_id).eq("user_id", userId).single();
    if (!proj) { res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid project_id" } }); return; }
    updates.project_id = project_id;
  }

  // Duration
  if (duration_minutes !== undefined) {
    if (!Number.isInteger(duration_minutes) || duration_minutes < 5 || duration_minutes > 480) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "duration_minutes must be between 5 and 480" } }); return;
    }
    updates.duration_minutes = duration_minutes;
  }

  // Time range
  if (started_at !== undefined) {
    const d = new Date(started_at);
    if (isNaN(d.getTime())) { res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid started_at" } }); return; }
    updates.started_at = d.toISOString();
  }
  if (ended_at !== undefined) {
    const d = new Date(ended_at);
    if (isNaN(d.getTime())) { res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ended_at" } }); return; }
    updates.ended_at = d.toISOString();
  }

  // Recalculate elapsed_seconds if time fields changed
  const finalStart = updates.started_at ? new Date(updates.started_at as string) : new Date(session.started_at);
  const finalEnd = updates.ended_at ? new Date(updates.ended_at as string) : (session.ended_at ? new Date(session.ended_at) : null);
  if (finalEnd && (updates.started_at || updates.ended_at)) {
    if (finalEnd <= finalStart) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "ended_at must be after started_at" } }); return;
    }
    updates.elapsed_seconds = Math.floor((finalEnd.getTime() - finalStart.getTime()) / 1000);
  }

  const { data, error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", session.id)
    .select("*, departments(name), projects(code, name)")
    .single();

  if (error) { dbError(res, error); return; }

  res.json(data);
}));

// DELETE /api/sessions/:id
router.delete("/:id", validateIdParam, asyncHandler(async (req: Request, res: Response) => {
  const session = await findSession(req, res);
  if (!session) return;

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", session.id);

  if (error) { dbError(res, error); return; }

  res.status(204).end();
}));

// GET /api/sessions/:id
router.get("/:id", validateIdParam, asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { data, error } = await supabase
    .from("sessions")
    .select("*, departments(name), projects(code, name)")
    .eq("id", id)
    .eq("user_id", req.userId!)
    .single();

  if (error || !data) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found" } });
    return;
  }

  res.json(data);
}));

export default router;
