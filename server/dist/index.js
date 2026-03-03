"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_js_1 = __importDefault(require("./app.js"));
// ─── Environment Validation ──────────────────
const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
}
// ─── Start Server ────────────────────────────
const PORT = process.env.PORT || 3001;
const server = app_js_1.default.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
// ─── Graceful Shutdown ───────────────────────
function shutdown(signal) {
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
