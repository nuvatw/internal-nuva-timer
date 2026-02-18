import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("shows login form with magic link and Google options", async ({ page }) => {
    await page.goto("/login");

    // Header
    await expect(page.locator("h1")).toHaveText("nuva");
    await expect(page.locator("text=Focus Timer")).toBeVisible();

    // Google button
    await expect(page.locator("text=Continue with Google")).toBeVisible();

    // Magic link form
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText("Send Magic Link");
  });

  test("email input is required and validates format", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute("required", "");
    await expect(emailInput).toHaveAttribute("type", "email");
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/timer");
    await page.waitForURL("**/login");
    await expect(page.locator("h1")).toHaveText("nuva");
  });

  test("all protected routes redirect to login", async ({ page }) => {
    for (const path of ["/timer", "/review", "/settings"]) {
      await page.goto(path);
      await page.waitForURL("**/login");
    }
  });
});
