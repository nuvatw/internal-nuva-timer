"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_js_1 = require("../supabase.js");
const validate_js_1 = require("../middleware/validate.js");
const errors_js_1 = require("../middleware/errors.js");
const router = (0, express_1.Router)();
// GET /api/reports/summary?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/summary", validate_js_1.validateDateParams, (0, validate_js_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { start, end } = req.query;
    if (!start || !end) {
        res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "start and end query params are required (YYYY-MM-DD)" },
        });
        return;
    }
    const { department_id, project_id, status: statusFilter, q, duration_minutes } = req.query;
    // Fetch all non-canceled sessions in range (Asia/Taipei boundaries)
    let query = supabase_js_1.supabase
        .from("sessions")
        .select("duration_minutes, department_id, status, departments(name)")
        .eq("user_id", userId)
        .gte("started_at", `${start}T00:00:00+08:00`)
        .lte("started_at", `${end}T23:59:59+08:00`);
    // Apply optional filters
    if (department_id)
        query = query.eq("department_id", department_id);
    if (project_id)
        query = query.eq("project_id", project_id);
    if (statusFilter) {
        query = query.eq("status", statusFilter);
    }
    else {
        query = query.in("status", ["completed_yes", "completed_no"]);
    }
    if (duration_minutes)
        query = query.eq("duration_minutes", Number(duration_minutes));
    if (q) {
        const keyword = `%${q.slice(0, 100)}%`;
        query = query.or(`planned_title.ilike.${keyword},actual_title.ilike.${keyword},notes.ilike.${keyword}`);
    }
    const { data: sessions, error } = await query;
    if (error) {
        (0, errors_js_1.dbError)(res, error);
        return;
    }
    let totalMinutes = 0;
    const byDeptMap = new Map();
    for (const s of sessions ?? []) {
        totalMinutes += s.duration_minutes;
        const deptId = s.department_id;
        const deptName = s.departments?.name ?? "Unknown";
        const existing = byDeptMap.get(deptId);
        if (existing) {
            existing.total_minutes += s.duration_minutes;
            existing.count += 1;
        }
        else {
            byDeptMap.set(deptId, {
                department_id: deptId,
                name: deptName,
                total_minutes: s.duration_minutes,
                count: 1,
            });
        }
    }
    const byDepartment = Array.from(byDeptMap.values()).sort((a, b) => b.total_minutes - a.total_minutes);
    res.json({
        total_minutes: totalMinutes,
        session_count: sessions?.length ?? 0,
        by_department: byDepartment,
    });
}));
exports.default = router;
