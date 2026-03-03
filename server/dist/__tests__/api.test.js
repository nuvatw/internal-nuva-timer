"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_js_1 = __importDefault(require("../app.js"));
// Mock the supabase module
vitest_1.vi.mock("../supabase.js", () => {
    const mockFrom = vitest_1.vi.fn();
    return {
        supabase: {
            from: mockFrom,
            auth: {
                getUser: vitest_1.vi.fn(),
            },
            rpc: vitest_1.vi.fn(),
        },
    };
});
// Import after mock
const supabase_js_1 = require("../supabase.js");
const mockAuth = supabase_js_1.supabase.auth.getUser;
const mockFrom = supabase_js_1.supabase.from;
function mockAuthSuccess(userId = "user-123") {
    mockAuth.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
    });
}
function mockAuthFailure() {
    mockAuth.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token" },
    });
}
// Helper to build a chainable Supabase query mock
function mockQuery(data = null, error = null) {
    const chain = {};
    const methods = ["select", "insert", "update", "eq", "gte", "lte", "in", "or", "order", "single", "limit"];
    for (const method of methods) {
        chain[method] = vitest_1.vi.fn().mockReturnValue(chain);
    }
    // Terminal — return data
    chain.single = vitest_1.vi.fn().mockResolvedValue({ data, error });
    chain.then = undefined; // Make it thenable via the last call
    // Override to return Promise-like for final resolution
    const finalChain = new Proxy(chain, {
        get(target, prop) {
            if (prop === "then" || prop === "catch" || prop === "finally") {
                return Promise.resolve({ data, error })[prop];
            }
            return target[prop];
        },
    });
    return finalChain;
}
(0, vitest_1.beforeEach)(() => {
    vitest_1.vi.clearAllMocks();
});
// ─── Health Check ───────────────────────────
(0, vitest_1.describe)("GET /api/health", () => {
    (0, vitest_1.it)("returns ok without auth", async () => {
        mockFrom.mockReturnValue(mockQuery([{ id: "1" }]));
        const res = await (0, supertest_1.default)(app_js_1.default).get("/api/health");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.status).toBe("ok");
    });
});
// ─── Auth Middleware ─────────────────────────
(0, vitest_1.describe)("Auth Middleware", () => {
    (0, vitest_1.it)("returns 401 without Authorization header", async () => {
        const res = await (0, supertest_1.default)(app_js_1.default).get("/api/me");
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.error.code).toBe("UNAUTHORIZED");
    });
    (0, vitest_1.it)("returns 401 with invalid Bearer token", async () => {
        mockAuthFailure();
        const res = await (0, supertest_1.default)(app_js_1.default)
            .get("/api/me")
            .set("Authorization", "Bearer invalid-token");
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.error.code).toBe("UNAUTHORIZED");
    });
    (0, vitest_1.it)("returns 401 with non-Bearer auth", async () => {
        const res = await (0, supertest_1.default)(app_js_1.default)
            .get("/api/me")
            .set("Authorization", "Basic dXNlcjpwYXNz");
        (0, vitest_1.expect)(res.status).toBe(401);
    });
});
// ─── Sessions Validation ────────────────────
(0, vitest_1.describe)("POST /api/sessions/start", () => {
    (0, vitest_1.it)("rejects invalid duration", async () => {
        mockAuthSuccess();
        const res = await (0, supertest_1.default)(app_js_1.default)
            .post("/api/sessions/start")
            .set("Authorization", "Bearer valid-token")
            .send({
            department_id: "dept-1",
            project_id: "proj-1",
            duration_minutes: 3, // invalid, must be 5–120
            planned_title: "Test",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error.code).toBe("VALIDATION_ERROR");
        (0, vitest_1.expect)(res.body.error.message).toContain("duration_minutes");
    });
    (0, vitest_1.it)("rejects empty planned_title", async () => {
        mockAuthSuccess();
        const res = await (0, supertest_1.default)(app_js_1.default)
            .post("/api/sessions/start")
            .set("Authorization", "Bearer valid-token")
            .send({
            department_id: "dept-1",
            project_id: "proj-1",
            duration_minutes: 30,
            planned_title: "",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error.code).toBe("VALIDATION_ERROR");
        (0, vitest_1.expect)(res.body.error.message).toContain("planned_title");
    });
    (0, vitest_1.it)("rejects planned_title over 200 characters", async () => {
        mockAuthSuccess();
        const res = await (0, supertest_1.default)(app_js_1.default)
            .post("/api/sessions/start")
            .set("Authorization", "Bearer valid-token")
            .send({
            department_id: "dept-1",
            project_id: "proj-1",
            duration_minutes: 30,
            planned_title: "x".repeat(201),
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error.message).toContain("200 characters");
    });
});
// ─── Complete Session Validation ────────────
(0, vitest_1.describe)("POST /api/sessions/:id/complete", () => {
    (0, vitest_1.it)("rejects non-boolean completed", async () => {
        mockAuthSuccess();
        const res = await (0, supertest_1.default)(app_js_1.default)
            .post("/api/sessions/00000000-0000-0000-0000-000000000001/complete")
            .set("Authorization", "Bearer valid-token")
            .send({ completed: "yes" });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error.message).toContain("boolean");
    });
    (0, vitest_1.it)("rejects completed=false without actual_title", async () => {
        mockAuthSuccess();
        const res = await (0, supertest_1.default)(app_js_1.default)
            .post("/api/sessions/00000000-0000-0000-0000-000000000001/complete")
            .set("Authorization", "Bearer valid-token")
            .send({ completed: false });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error.message).toContain("actual_title");
    });
    (0, vitest_1.it)("rejects actual_title over 200 chars", async () => {
        mockAuthSuccess();
        const res = await (0, supertest_1.default)(app_js_1.default)
            .post("/api/sessions/00000000-0000-0000-0000-000000000001/complete")
            .set("Authorization", "Bearer valid-token")
            .send({
            completed: false,
            actual_title: "x".repeat(201),
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error.message).toContain("200 characters");
    });
});
// ─── Reports Validation ─────────────────────
(0, vitest_1.describe)("GET /api/reports/summary", () => {
    (0, vitest_1.it)("requires start and end params", async () => {
        mockAuthSuccess();
        const res = await (0, supertest_1.default)(app_js_1.default)
            .get("/api/reports/summary")
            .set("Authorization", "Bearer valid-token");
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error.message).toContain("start and end");
    });
});
// ─── Departments Validation ─────────────────
(0, vitest_1.describe)("POST /api/departments", () => {
    (0, vitest_1.it)("rejects empty name", async () => {
        mockAuthSuccess();
        const res = await (0, supertest_1.default)(app_js_1.default)
            .post("/api/departments")
            .set("Authorization", "Bearer valid-token")
            .send({ name: "" });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error.code).toBe("VALIDATION_ERROR");
    });
    (0, vitest_1.it)("rejects name over 100 characters", async () => {
        mockAuthSuccess();
        const res = await (0, supertest_1.default)(app_js_1.default)
            .post("/api/departments")
            .set("Authorization", "Bearer valid-token")
            .send({ name: "x".repeat(101) });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error.message).toContain("100 characters");
    });
});
// ─── Projects Validation ────────────────────
(0, vitest_1.describe)("POST /api/projects", () => {
    (0, vitest_1.it)("rejects empty name", async () => {
        mockAuthSuccess();
        const res = await (0, supertest_1.default)(app_js_1.default)
            .post("/api/projects")
            .set("Authorization", "Bearer valid-token")
            .send({ name: "" });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error.code).toBe("VALIDATION_ERROR");
    });
    (0, vitest_1.it)("rejects code over 20 characters", async () => {
        mockAuthSuccess();
        const res = await (0, supertest_1.default)(app_js_1.default)
            .post("/api/projects")
            .set("Authorization", "Bearer valid-token")
            .send({ name: "Valid", code: "x".repeat(21) });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error.message).toContain("20 characters");
    });
});
// ─── Exports Validation ─────────────────────
(0, vitest_1.describe)("GET /api/exports/sessions.csv", () => {
    (0, vitest_1.it)("requires start and end params", async () => {
        mockAuthSuccess();
        const res = await (0, supertest_1.default)(app_js_1.default)
            .get("/api/exports/sessions.csv")
            .set("Authorization", "Bearer valid-token");
        (0, vitest_1.expect)(res.status).toBe(400);
    });
});
(0, vitest_1.describe)("GET /api/exports/summary.md", () => {
    (0, vitest_1.it)("requires start and end params", async () => {
        mockAuthSuccess();
        const res = await (0, supertest_1.default)(app_js_1.default)
            .get("/api/exports/summary.md")
            .set("Authorization", "Bearer valid-token");
        (0, vitest_1.expect)(res.status).toBe(400);
    });
});
// ─── Profile Validation ─────────────────────
(0, vitest_1.describe)("PATCH /api/me", () => {
    (0, vitest_1.it)("rejects empty update body", async () => {
        mockAuthSuccess();
        const res = await (0, supertest_1.default)(app_js_1.default)
            .patch("/api/me")
            .set("Authorization", "Bearer valid-token")
            .send({});
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error.message).toContain("No fields");
    });
    (0, vitest_1.it)("rejects display_name over 50 chars", async () => {
        mockAuthSuccess();
        const res = await (0, supertest_1.default)(app_js_1.default)
            .patch("/api/me")
            .set("Authorization", "Bearer valid-token")
            .send({ display_name: "x".repeat(51) });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error.message).toContain("50 characters");
    });
});
