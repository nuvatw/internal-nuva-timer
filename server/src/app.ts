import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";
import { requestLogger } from "./middleware/logger.js";
import { authMiddleware } from "./middleware/auth.js";
import { supabase } from "./supabase.js";
import profileRoutes from "./routes/profile.js";
import departmentRoutes from "./routes/departments.js";
import projectRoutes from "./routes/projects.js";
import sessionRoutes from "./routes/sessions.js";
import reportRoutes from "./routes/reports.js";
import exportRoutes from "./routes/exports.js";
import progressRoutes from "./routes/progress.js";
import todoRoutes from "./routes/todos.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// ─── Security Headers ────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // Allow exact matches and Vercel preview deployments
      if (
        allowedOrigins.includes(origin) ||
        /^https:\/\/nuvatimer[a-z0-9-]*\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Timezone"],
    maxAge: 86400,
  }),
);

// ─── Compression ─────────────────────────────
app.use(compression());

// ─── Body Parsing ────────────────────────────
app.use(express.json({ limit: "100kb" }));

// ─── Request ID ──────────────────────────────
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.requestId = req.headers["x-request-id"] as string || crypto.randomUUID();
  next();
});

// ─── Request Logging ─────────────────────────
app.use(requestLogger);

// ─── Rate Limiting ───────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: "RATE_LIMIT", message: "Too many requests, please try again later" },
  },
});
app.use("/api", apiLimiter);

const authLimiter = rateLimit({
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
app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    const { error } = await supabase.from("departments").select("id").limit(1);
    if (error) throw error;
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(503).json({ status: "degraded", db: "unreachable" });
  }
});

// ─── Protected Routes ────────────────────────
app.use("/api", authMiddleware);
app.use("/api", profileRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/exports", exportRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/todos", todoRoutes);

// ─── 404 Handler ─────────────────────────────
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Endpoint not found" } });
});

// ─── Global Error Handler ────────────────────
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
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

export default app;
