"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
function requestLogger(req, res, next) {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        const log = {
            requestId: req.requestId ?? null,
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            duration_ms: duration,
            user_id: req.userId ?? null,
        };
        // Structured JSON log
        if (res.statusCode >= 400) {
            console.error(JSON.stringify(log));
        }
        else {
            console.log(JSON.stringify(log));
        }
    });
    next();
}
