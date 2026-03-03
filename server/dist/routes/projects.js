"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_js_1 = require("../supabase.js");
const validate_js_1 = require("../middleware/validate.js");
const errors_js_1 = require("../middleware/errors.js");
const router = (0, express_1.Router)();
// GET /api/projects
router.get("/", (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const includeArchived = req.query.include_archived === "true";
    let query = supabase_js_1.supabase
        .from("projects")
        .select("id, code, name, is_archived, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
    if (!includeArchived) {
        query = query.eq("is_archived", false);
    }
    const { data, error } = await query;
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    res.json(data);
}));
// POST /api/projects
router.post("/", (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
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
    const { data, error } = await supabase_js_1.supabase
        .from("projects")
        .insert({
        user_id: userId,
        name: name.trim(),
        code: code?.trim() || null,
    })
        .select("id, code, name")
        .single();
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    res.status(201).json(data);
}));
// PATCH /api/projects/:id
router.patch("/:id", validate_js_1.validateIdParam, (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { id } = req.params;
    const { code, name } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) {
        if (typeof name !== "string" || name.trim().length === 0) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "name cannot be empty" } });
            return;
        }
        updates.name = name.trim();
    }
    if (code !== undefined)
        updates.code = code?.trim() || null;
    const { data, error } = await supabase_js_1.supabase
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
router.post("/:id/archive", validate_js_1.validateIdParam, (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { id } = req.params;
    const { is_archived } = req.body;
    if (typeof is_archived !== "boolean") {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "is_archived must be a boolean" } });
        return;
    }
    const { data, error } = await supabase_js_1.supabase
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
exports.default = router;
