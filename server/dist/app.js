"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const logger_js_1 = require("./middleware/logger.js");
const auth_js_1 = require("./middleware/auth.js");
const supabase_js_1 = require("./supabase.js");
const profile_js_1 = __importDefault(require("./routes/profile.js"));
const departments_js_1 = __importDefault(require("./routes/departments.js"));
const projects_js_1 = __importDefault(require("./routes/projects.js"));
const sessions_js_1 = __importDefault(require("./routes/sessions.js"));
const reports_js_1 = __importDefault(require("./routes/reports.js"));
const exports_js_1 = __importDefault(require("./routes/exports.js"));
const progress_js_1 = __importDefault(require("./routes/progress.js"));
const todos_js_1 = __importDefault(require("./routes/todos.js"));
const app = (0, express_1.default)();
const isProduction = process.env.NODE_ENV === "production";
// ─── Security Headers ────────────────────────
app.use((0, helmet_1.default)());
// ─── CORS ────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin)
            return callback(null, true);
        // Allow exact matches and Vercel preview deployments
        if (allowedOrigins.includes(origin) ||
            /^https:\/\/nuvatimer[a-z0-9-]*\.vercel\.app$/.test(origin)) {
            return callback(null, true);
        }
        callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Timezone"],
    maxAge: 86400,
}));
// ─── Compression ─────────────────────────────
app.use((0, compression_1.default)());
// ─── Body Parsing ────────────────────────────
app.use(express_1.default.json({ limit: "100kb" }));
// ─── Request ID ──────────────────────────────
app.use((req, _res, next) => {
    req.requestId = req.headers["x-request-id"] || node_crypto_1.default.randomUUID();
    next();
});
// ─── Request Logging ─────────────────────────
app.use(logger_js_1.requestLogger);
// ─── Rate Limiting ───────────────────────────
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: { code: "RATE_LIMIT", message: "Too many requests, please try again later" },
    },
});
app.use("/api", apiLimiter);
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: { code: "RATE_LIMIT", message: "Too many requests, please try again later" },
    },
});
app.use("/api/me", authLimiter);
// ─── Health Check (no auth) ──────────────────
app.get("/api/health", async (_req, res) => {
    try {
        const { error } = await supabase_js_1.supabase.from("departments").select("id").limit(1);
        if (error)
            throw error;
        res.json({ status: "ok", db: "connected" });
    }
    catch {
        res.status(503).json({ status: "degraded", db: "unreachable" });
    }
});
// ─── Protected Routes ────────────────────────
app.use("/api", auth_js_1.authMiddleware);
app.use("/api", profile_js_1.default);
app.use("/api/departments", departments_js_1.default);
app.use("/api/projects", projects_js_1.default);
app.use("/api/sessions", sessions_js_1.default);
app.use("/api/reports", reports_js_1.default);
app.use("/api/exports", exports_js_1.default);
app.use("/api/progress", progress_js_1.default);
app.use("/api/todos", todos_js_1.default);
// ─── 404 Handler ─────────────────────────────
app.use("/api", (_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Endpoint not found" } });
});
// ─── Global Error Handler ────────────────────
app.use((err, req, res, _next) => {
    const requestId = req.requestId || "unknown";
    console.error(JSON.stringify({
        level: "error",
        requestId,
        method: req.method,
        path: req.originalUrl,
        error: err.message,
        stack: isProduction ? undefined : err.stack,
    }));
    res.status(500).json({
        error: {
            code: "SERVER_ERROR",
            message: isProduction ? "An internal error occurred" : err.message,
            requestId,
        },
    });
});
exports.default = app;
