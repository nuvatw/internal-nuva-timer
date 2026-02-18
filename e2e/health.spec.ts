import { test, expect } from "@playwright/test";

test.describe("API Health Check", () => {
  test("GET /api/health returns ok", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe("ok");
  });

  test("protected API routes require auth", async ({ request }) => {
    const endpoints = [
      { method: "GET" as const, url: "/api/me" },
      { method: "GET" as const, url: "/api/departments" },
      { method: "GET" as const, url: "/api/projects" },
      { method: "GET" as const, url: "/api/sessions" },
    ];

    for (const ep of endpoints) {
      const response = await request[ep.method.toLowerCase() as "get"](ep.url);
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error.code).toBe("UNAUTHORIZED");
    }
  });
});
