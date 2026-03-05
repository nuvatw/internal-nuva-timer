import "dotenv/config";
import app from "./app.js";

const isProduction = process.env.NODE_ENV === "production";

// ─── Environment Validation ──────────────────
const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

// ─── Start Server ────────────────────────────
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // ─── Keep-Alive Ping (prevents Render free-tier cold starts) ──
  if (isProduction) {
    const INTERVAL = 14 * 60 * 1000; // 14 minutes
    setInterval(() => {
      fetch(`http://localhost:${PORT}/api/health`).catch(() => {});
    }, INTERVAL);
    console.log("Keep-alive ping enabled (every 14 min)");
  }
});

// ─── Graceful Shutdown ───────────────────────
function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down gracefully`);
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
