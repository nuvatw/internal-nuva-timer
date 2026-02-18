import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";

// Mock the supabase module
vi.mock("../supabase.js", () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
      auth: {
        getUser: vi.fn(),
      },
      rpc: vi.fn(),
    },
  };
});

// Import after mock
import { supabase } from "../supabase.js";

const mockAuth = supabase.auth.getUser as ReturnType<typeof vi.fn>;
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

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
function mockQuery(data: unknown = null, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "insert", "update", "eq", "gte", "lte", "in", "or", "order", "single", "limit"];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  // Terminal — return data
  chain.single = vi.fn().mockResolvedValue({ data, error });
  chain.then = undefined; // Make it thenable via the last call
  // Override to return Promise-like for final resolution
  const finalChain = new Proxy(chain, {
    get(target, prop) {
      if (prop === "then" || prop === "catch" || prop === "finally") {
        return Promise.resolve({ data, error })[prop as keyof Promise<unknown>];
      }
      return target[prop as string];
    },
  });
  return finalChain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Health Check ───────────────────────────

describe("GET /api/health", () => {
  it("returns ok without auth", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

// ─── Auth Middleware ─────────────────────────

describe("Auth Middleware", () => {
  it("returns 401 without Authorization header", async () => {
    const res = await request(app).get("/api/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 with invalid Bearer token", async () => {
    mockAuthFailure();
    const res = await request(app)
      .get("/api/me")
      .set("Authorization", "Bearer invalid-token");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 with non-Bearer auth", async () => {
    const res = await request(app)
      .get("/api/me")
      .set("Authorization", "Basic dXNlcjpwYXNz");
    expect(res.status).toBe(401);
  });
});

// ─── Sessions Validation ────────────────────

describe("POST /api/sessions/start", () => {
  it("rejects invalid duration", async () => {
    mockAuthSuccess();
    const res = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", "Bearer valid-token")
      .send({
        department_id: "dept-1",
        project_id: "proj-1",
        duration_minutes: 45, // invalid, must be 30 or 60
        planned_title: "Test",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toContain("duration_minutes");
  });

  it("rejects empty planned_title", async () => {
    mockAuthSuccess();
    const res = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", "Bearer valid-token")
      .send({
        department_id: "dept-1",
        project_id: "proj-1",
        duration_minutes: 30,
        planned_title: "",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toContain("planned_title");
  });

  it("rejects planned_title over 200 characters", async () => {
    mockAuthSuccess();
    const res = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", "Bearer valid-token")
      .send({
        department_id: "dept-1",
        project_id: "proj-1",
        duration_minutes: 30,
        planned_title: "x".repeat(201),
      });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("200 characters");
  });
});

// ─── Complete Session Validation ────────────

describe("POST /api/sessions/:id/complete", () => {
  it("rejects non-boolean completed", async () => {
    mockAuthSuccess();
    const res = await request(app)
      .post("/api/sessions/session-1/complete")
      .set("Authorization", "Bearer valid-token")
      .send({ completed: "yes" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("boolean");
  });

  it("rejects completed=false without actual_title", async () => {
    mockAuthSuccess();
    const res = await request(app)
      .post("/api/sessions/session-1/complete")
      .set("Authorization", "Bearer valid-token")
      .send({ completed: false });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("actual_title");
  });

  it("rejects actual_title over 200 chars", async () => {
    mockAuthSuccess();
    const res = await request(app)
      .post("/api/sessions/session-1/complete")
      .set("Authorization", "Bearer valid-token")
      .send({
        completed: false,
        actual_title: "x".repeat(201),
      });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("200 characters");
  });
});

// ─── Reports Validation ─────────────────────

describe("GET /api/reports/summary", () => {
  it("requires start and end params", async () => {
    mockAuthSuccess();
    const res = await request(app)
      .get("/api/reports/summary")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("start and end");
  });
});

// ─── Departments Validation ─────────────────

describe("POST /api/departments", () => {
  it("rejects empty name", async () => {
    mockAuthSuccess();
    const res = await request(app)
      .post("/api/departments")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects name over 100 characters", async () => {
    mockAuthSuccess();
    const res = await request(app)
      .post("/api/departments")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "x".repeat(101) });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("100 characters");
  });
});

// ─── Projects Validation ────────────────────

describe("POST /api/projects", () => {
  it("rejects empty name", async () => {
    mockAuthSuccess();
    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects code over 20 characters", async () => {
    mockAuthSuccess();
    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "Valid", code: "x".repeat(21) });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("20 characters");
  });
});

// ─── Exports Validation ─────────────────────

describe("GET /api/exports/sessions.csv", () => {
  it("requires start and end params", async () => {
    mockAuthSuccess();
    const res = await request(app)
      .get("/api/exports/sessions.csv")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/exports/summary.md", () => {
  it("requires start and end params", async () => {
    mockAuthSuccess();
    const res = await request(app)
      .get("/api/exports/summary.md")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(400);
  });
});

// ─── Profile Validation ─────────────────────

describe("PATCH /api/me", () => {
  it("rejects empty update body", async () => {
    mockAuthSuccess();
    const res = await request(app)
      .patch("/api/me")
      .set("Authorization", "Bearer valid-token")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("No fields");
  });

  it("rejects display_name over 50 chars", async () => {
    mockAuthSuccess();
    const res = await request(app)
      .patch("/api/me")
      .set("Authorization", "Bearer valid-token")
      .send({ display_name: "x".repeat(51) });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("50 characters");
  });
});
