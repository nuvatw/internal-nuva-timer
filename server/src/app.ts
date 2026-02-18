import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { requestLogger } from "./middleware/logger.js";
import { authMiddleware } from "./middleware/auth.js";
import profileRoutes from "./routes/profile.js";
import departmentRoutes from "./routes/departments.js";
import projectRoutes from "./routes/projects.js";
import sessionRoutes from "./routes/sessions.js";
import reportRoutes from "./routes/reports.js";
import exportRoutes from "./routes/exports.js";

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "100kb" }));

// Request logging
app.use(requestLogger);

// Rate limiting for all API routes (100 req/min per IP)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT", message: "Too many requests, please try again later" } },
});
app.use("/api", apiLimiter);

// Stricter rate limit for auth-adjacent endpoints (20 req/min)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT", message: "Too many requests, please try again later" } },
});
app.use("/api/me", authLimiter);

// Health check (no auth)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Protected routes
app.use("/api", authMiddleware);
app.use("/api", profileRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/exports", exportRoutes);

export default app;
