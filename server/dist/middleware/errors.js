"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbError = dbError;
const isProduction = process.env.NODE_ENV === "production";
/**
 * Send a standardized 500 error response for database failures.
 * In production, hides the raw error message.
 */
function dbError(res, error) {
    const message = isProduction ? "Database operation failed" : error.message;
    res.status(500).json({ error: { code: "SERVER_ERROR", message } });
}
