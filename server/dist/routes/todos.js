"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_js_1 = require("../supabase.js");
const validate_js_1 = require("../middleware/validate.js");
const errors_js_1 = require("../middleware/errors.js");
const router = (0, express_1.Router)();
// GET /api/todos — list todos (active by default)
router.get("/", (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { department_id, include_completed } = req.query;
    let query = supabase_js_1.supabase
        .from("todos")
        .select("*")
        .eq("user_id", userId)
        .order("position", { ascending: true });
    if (department_id) {
        query = query.eq("department_id", department_id);
    }
    if (include_completed !== "true") {
        query = query.eq("is_completed", false);
    }
    const { data, error } = await query;
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    res.json(data);
}));
// POST /api/todos — create a todo
router.post("/", (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { department_id, title, due_date, urgency } = req.body;
    // Validate title
    if (!title || typeof title !== "string" || title.trim().length === 0) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "title is required" } });
        return;
    }
    if (title.length > 200) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "title must be 200 characters or less" } });
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
    // Validate urgency
    const urg = urgency ?? 1;
    if (!Number.isInteger(urg) || urg < 1 || urg > 3) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "urgency must be 1, 2, or 3" } });
        return;
    }
    // Validate due_date if provided
    if (due_date !== undefined && due_date !== null) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "due_date must be YYYY-MM-DD format" } });
            return;
        }
    }
    // Get max position for this department
    const { data: maxRow } = await supabase_js_1.supabase
        .from("todos")
        .select("position")
        .eq("user_id", userId)
        .eq("department_id", department_id)
        .eq("is_completed", false)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
    const nextPosition = (maxRow?.position ?? -1) + 1;
    const { data, error } = await supabase_js_1.supabase
        .from("todos")
        .insert({
        user_id: userId,
        department_id,
        title: title.trim(),
        due_date: due_date || null,
        urgency: urg,
        position: nextPosition,
    })
        .select()
        .single();
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    res.status(201).json(data);
}));
// PATCH /api/todos/:id — update a todo
router.patch("/:id", validate_js_1.validateIdParam, (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { title, due_date, urgency, is_completed } = req.body;
    // Find todo
    const { data: todo, error: findError } = await supabase_js_1.supabase
        .from("todos")
        .select("*")
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .single();
    if (findError || !todo) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Todo not found" } });
        return;
    }
    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) {
        if (typeof title !== "string" || title.trim().length === 0) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "title cannot be empty" } });
            return;
        }
        if (title.length > 200) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "title must be 200 characters or less" } });
            return;
        }
        updates.title = title.trim();
    }
    if (due_date !== undefined) {
        if (due_date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "due_date must be YYYY-MM-DD or null" } });
            return;
        }
        updates.due_date = due_date;
    }
    if (urgency !== undefined) {
        if (!Number.isInteger(urgency) || urgency < 1 || urgency > 3) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "urgency must be 1, 2, or 3" } });
            return;
        }
        updates.urgency = urgency;
    }
    if (is_completed !== undefined) {
        updates.is_completed = !!is_completed;
        updates.completed_at = is_completed ? new Date().toISOString() : null;
    }
    const { data, error } = await supabase_js_1.supabase
        .from("todos")
        .update(updates)
        .eq("id", todo.id)
        .select()
        .single();
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    res.json(data);
}));
// POST /api/todos/:id/complete — mark todo as completed
router.post("/:id/complete", validate_js_1.validateIdParam, (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { data: todo, error: findError } = await supabase_js_1.supabase
        .from("todos")
        .select("id")
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .single();
    if (findError || !todo) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Todo not found" } });
        return;
    }
    const { data, error } = await supabase_js_1.supabase
        .from("todos")
        .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    })
        .eq("id", todo.id)
        .select()
        .single();
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    res.json(data);
}));
// DELETE /api/todos/:id — delete a todo
router.delete("/:id", validate_js_1.validateIdParam, (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { data: todo, error: findError } = await supabase_js_1.supabase
        .from("todos")
        .select("id")
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .single();
    if (findError || !todo) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Todo not found" } });
        return;
    }
    const { error } = await supabase_js_1.supabase
        .from("todos")
        .delete()
        .eq("id", todo.id);
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    res.status(204).end();
}));
// POST /api/todos/reorder — batch update positions
router.post("/reorder", (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "items must be a non-empty array of {id, position}" } });
        return;
    }
    // Validate all items have id and position
    for (const item of items) {
        if (!item.id || typeof item.position !== "number") {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Each item must have id and position" } });
            return;
        }
    }
    // Update each todo's position
    const updates = items.map((item) => supabase_js_1.supabase
        .from("todos")
        .update({ position: item.position, updated_at: new Date().toISOString() })
        .eq("id", item.id)
        .eq("user_id", userId));
    await Promise.all(updates);
    res.json({ ok: true });
}));
// DELETE /api/todos/completed — clear all completed todos
router.delete("/completed/clear", (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { error } = await supabase_js_1.supabase
        .from("todos")
        .delete()
        .eq("user_id", userId)
        .eq("is_completed", true);
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    res.status(204).end();
}));
exports.default = router;
