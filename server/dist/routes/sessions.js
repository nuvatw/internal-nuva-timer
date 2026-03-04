"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_js_1 = require("../supabase.js");
const validate_js_1 = require("../middleware/validate.js");
const errors_js_1 = require("../middleware/errors.js");
const gamification_js_1 = require("../lib/gamification.js");
const timezone_js_1 = require("../lib/timezone.js");
const router = (0, express_1.Router)();
/** Fetch a session owned by the user, or send 404/500 and return null. */
async function findSession(req, res) {
    const id = req.params.id;
    const userId = req.userId;
    const { data, error } = await supabase_js_1.supabase
        .from("sessions")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single();
    if (error) {
        // PGRST116 = row not found
        if (error.code === "PGRST116") {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found" } });
        }
        else {
            (0, errors_js_1.dbError)(res, error);
        }
        return null;
    }
    if (!data) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found" } });
        return null;
    }
    return data;
}
// POST /api/sessions/start
router.post("/start", (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { department_id, project_id, duration_minutes, planned_title, todo_id } = req.body;
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
    const { data: dept } = await supabase_js_1.supabase
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
    const { data: proj } = await supabase_js_1.supabase
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
    const { data: existing } = await supabase_js_1.supabase
        .from("sessions")
        .select("id")
        .eq("user_id", userId)
        .in("status", ["running", "paused"])
        .limit(1);
    if (existing && existing.length > 0) {
        res.status(409).json({ error: { code: "CONFLICT", message: "You already have an active session" } });
        return;
    }
    const { data, error } = await supabase_js_1.supabase
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
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    // Link todo to session if todo_id provided
    if (todo_id && data) {
        await supabase_js_1.supabase
            .from("todos")
            .update({ linked_session_id: data.id, updated_at: new Date().toISOString() })
            .eq("id", todo_id)
            .eq("user_id", userId);
    }
    res.status(201).json(data);
}));
// GET /api/sessions/active — find a running or paused session for the current user
router.get("/active", (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { data, error } = await supabase_js_1.supabase
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
router.post("/manual", (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
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
    const { data: dept } = await supabase_js_1.supabase
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
    const { data: proj } = await supabase_js_1.supabase
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
    const { data, error } = await supabase_js_1.supabase
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
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    // Award XP (non-fatal on failure)
    let gamification = null;
    try {
        gamification = await (0, gamification_js_1.awardSessionCompletion)(userId, durationMinutes, (0, timezone_js_1.resolveTimezone)(req.timezone));
    }
    catch {
        // Gamification failure should not block manual entry
    }
    res.status(201).json({ ...data, gamification });
}));
// POST /api/sessions/:id/pause
router.post("/:id/pause", validate_js_1.validateIdParam, (0, validate_js_1.asyncHandler)(async (req, res) => {
    const session = await findSession(req, res);
    if (!session)
        return;
    if (session.status !== "running") {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Session is not running" } });
        return;
    }
    const { data, error } = await supabase_js_1.supabase
        .from("sessions")
        .update({
        status: "paused",
        paused_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    })
        .eq("id", session.id)
        .select("id, status, paused_total_seconds")
        .single();
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    res.json(data);
}));
// POST /api/sessions/:id/resume
router.post("/:id/resume", validate_js_1.validateIdParam, (0, validate_js_1.asyncHandler)(async (req, res) => {
    const session = await findSession(req, res);
    if (!session)
        return;
    if (session.status !== "paused") {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Session is not paused" } });
        return;
    }
    // Accumulate paused time
    const pausedAt = new Date(session.paused_at).getTime();
    const now = Date.now();
    const additionalPausedSeconds = Math.floor((now - pausedAt) / 1000);
    const { data, error } = await supabase_js_1.supabase
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
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    res.json(data);
}));
// POST /api/sessions/:id/cancel
router.post("/:id/cancel", validate_js_1.validateIdParam, (0, validate_js_1.asyncHandler)(async (req, res) => {
    const session = await findSession(req, res);
    if (!session)
        return;
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
    const { data, error } = await supabase_js_1.supabase
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
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    // Unlink any linked todo (don't mark it complete)
    await supabase_js_1.supabase
        .from("todos")
        .update({ linked_session_id: null, updated_at: new Date().toISOString() })
        .eq("linked_session_id", session.id)
        .eq("user_id", req.userId);
    res.json(data);
}));
// POST /api/sessions/:id/complete
router.post("/:id/complete", validate_js_1.validateIdParam, (0, validate_js_1.asyncHandler)(async (req, res) => {
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
    if (!session)
        return;
    if (session.status !== "running") {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Session is not running" } });
        return;
    }
    const completionStatus = completed ? "completed_yes" : "completed_no";
    // Calculate ended_at accounting for pause time
    const startedMs = new Date(session.started_at).getTime();
    const pausedMs = (session.paused_total_seconds ?? 0) * 1000;
    const endedAt = new Date(startedMs + session.duration_minutes * 60 * 1000 + pausedMs).toISOString();
    const elapsedSeconds = session.duration_minutes * 60;
    const { data, error } = await supabase_js_1.supabase
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
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    // Award XP, tomatoes, and update streak (non-fatal on failure)
    let gamification = null;
    try {
        gamification = await (0, gamification_js_1.awardSessionCompletion)(req.userId, session.duration_minutes, (0, timezone_js_1.resolveTimezone)(req.timezone));
    }
    catch {
        // Gamification failure should not block session completion
    }
    // Handle linked todo based on completion status
    let todoCompleted = false;
    if (completed) {
        // Auto-complete the linked todo
        const { data: linkedTodo } = await supabase_js_1.supabase
            .from("todos")
            .select("id")
            .eq("linked_session_id", session.id)
            .eq("user_id", req.userId)
            .eq("is_completed", false)
            .maybeSingle();
        if (linkedTodo) {
            await supabase_js_1.supabase
                .from("todos")
                .update({ is_completed: true, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq("id", linkedTodo.id);
            todoCompleted = true;
        }
    }
    else {
        // Goal not completed — unlink todo so it stays active
        await supabase_js_1.supabase
            .from("todos")
            .update({ linked_session_id: null, updated_at: new Date().toISOString() })
            .eq("linked_session_id", session.id)
            .eq("user_id", req.userId);
    }
    res.json({ ...data, gamification, todo_completed: todoCompleted });
}));
// GET /api/sessions — with pagination (limit default 200, max 500)
router.get("/", validate_js_1.validateDateParams, (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { start, end, department_id, project_id, status, q, duration_minutes, limit: rawLimit, offset: rawOffset, tz } = req.query;
    const timezone = (0, timezone_js_1.resolveTimezone)(tz || req.timezone);
    const limit = Math.min(Math.max(1, Number(rawLimit) || 200), 500);
    const offset = Math.max(0, Number(rawOffset) || 0);
    let query = supabase_js_1.supabase
        .from("sessions")
        .select("*, departments(name), projects(code, name)")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .range(offset, offset + limit - 1);
    if (start)
        query = query.gte("started_at", (0, timezone_js_1.dateBoundary)(start, "00:00:00", timezone));
    if (end)
        query = query.lte("started_at", (0, timezone_js_1.dateBoundary)(end, "23:59:59", timezone));
    if (department_id)
        query = query.eq("department_id", department_id);
    if (project_id)
        query = query.eq("project_id", project_id);
    if (status)
        query = query.eq("status", status);
    if (duration_minutes)
        query = query.eq("duration_minutes", Number(duration_minutes));
    if (q) {
        const raw = q.slice(0, 100).replace(/[%_\\]/g, "\\$&");
        const keyword = `%${raw}%`;
        query = query.or(`planned_title.ilike.${keyword},actual_title.ilike.${keyword},notes.ilike.${keyword}`);
    }
    const { data, error } = await query;
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    res.json(data);
}));
// PATCH /api/sessions/:id — edit completed session fields
router.patch("/:id", validate_js_1.validateIdParam, (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { notes, actual_title, department_id, project_id, started_at, ended_at, duration_minutes } = req.body;
    const session = await findSession(req, res);
    if (!session)
        return;
    if (!["completed_yes", "completed_no", "canceled"].includes(session.status)) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Only finished sessions can be edited" } });
        return;
    }
    const updates = { updated_at: new Date().toISOString() };
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
        const { data: dept } = await supabase_js_1.supabase.from("departments").select("id").eq("id", department_id).eq("user_id", userId).single();
        if (!dept) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid department_id" } });
            return;
        }
        updates.department_id = department_id;
    }
    // Project
    if (project_id !== undefined) {
        const { data: proj } = await supabase_js_1.supabase.from("projects").select("id").eq("id", project_id).eq("user_id", userId).single();
        if (!proj) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid project_id" } });
            return;
        }
        updates.project_id = project_id;
    }
    // Duration
    if (duration_minutes !== undefined) {
        if (!Number.isInteger(duration_minutes) || duration_minutes < 5 || duration_minutes > 480) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "duration_minutes must be between 5 and 480" } });
            return;
        }
        updates.duration_minutes = duration_minutes;
    }
    // Time range
    if (started_at !== undefined) {
        const d = new Date(started_at);
        if (isNaN(d.getTime())) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid started_at" } });
            return;
        }
        updates.started_at = d.toISOString();
    }
    if (ended_at !== undefined) {
        const d = new Date(ended_at);
        if (isNaN(d.getTime())) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ended_at" } });
            return;
        }
        updates.ended_at = d.toISOString();
    }
    // Recalculate elapsed_seconds if time fields changed
    const finalStart = updates.started_at ? new Date(updates.started_at) : new Date(session.started_at);
    const finalEnd = updates.ended_at ? new Date(updates.ended_at) : (session.ended_at ? new Date(session.ended_at) : null);
    if (finalEnd && (updates.started_at || updates.ended_at)) {
        if (finalEnd <= finalStart) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "ended_at must be after started_at" } });
            return;
        }
        updates.elapsed_seconds = Math.floor((finalEnd.getTime() - finalStart.getTime()) / 1000);
    }
    const { data, error } = await supabase_js_1.supabase
        .from("sessions")
        .update(updates)
        .eq("id", session.id)
        .select("*, departments(name), projects(code, name)")
        .single();
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    res.json(data);
}));
// DELETE /api/sessions/:id
router.delete("/:id", validate_js_1.validateIdParam, (0, validate_js_1.asyncHandler)(async (req, res) => {
    const session = await findSession(req, res);
    if (!session)
        return;
    const { error } = await supabase_js_1.supabase
        .from("sessions")
        .delete()
        .eq("id", session.id);
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    res.status(204).end();
}));
// GET /api/sessions/:id
router.get("/:id", validate_js_1.validateIdParam, (0, validate_js_1.asyncHandler)(async (req, res) => {
    const id = req.params.id;
    const { data, error } = await supabase_js_1.supabase
        .from("sessions")
        .select("*, departments(name), projects(code, name)")
        .eq("id", id)
        .eq("user_id", req.userId)
        .single();
    if (error || !data) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found" } });
        return;
    }
    res.json(data);
}));
exports.default = router;
