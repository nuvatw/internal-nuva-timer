"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateIdParam = validateIdParam;
exports.validateDateParams = validateDateParams;
exports.asyncHandler = asyncHandler;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/**
 * Validates that `req.params.id` is a valid UUID.
 */
function validateIdParam(req, res, next) {
    const id = req.params.id;
    if (!id || !UUID_RE.test(id)) {
        res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Invalid ID format" },
        });
        return;
    }
    next();
}
/**
 * Validates that `start` and `end` query parameters (if present) are YYYY-MM-DD.
 */
function validateDateParams(req, res, next) {
    const { start, end } = req.query;
    if (start && !DATE_RE.test(start)) {
        res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Invalid start date format, expected YYYY-MM-DD" },
        });
        return;
    }
    if (end && !DATE_RE.test(end)) {
        res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Invalid end date format, expected YYYY-MM-DD" },
        });
        return;
    }
    next();
}
/**
 * Wraps an async route handler so unhandled rejections are forwarded to
 * the global error handler instead of crashing the process.
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}
