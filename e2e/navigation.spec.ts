import { test, expect } from "@playwright/test";

test.describe("Navigation & Accessibility", () => {
  test("login page has correct meta tags", async ({ page }) => {
    await page.goto("/login");

    const title = await page.title();
    expect(title).toContain("nuva");

    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute("content", /width=device-width/);

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute("content", /.+/);
  });

  test("login page has no accessibility violations in structure", async ({ page }) => {
    await page.goto("/login");

    // Form has a labeled email input
    const emailInput = page.locator("#email");
    await expect(emailInput).toBeVisible();
    const label = page.locator('label[for="email"]');
    await expect(label).toBeVisible();

    // Submit button is accessible
    const submit = page.locator('button[type="submit"]');
    await expect(submit).toBeEnabled();
  });

  test("404 routes redirect to timer (then login)", async ({ page }) => {
    await page.goto("/nonexistent-page");
    // Should redirect: /nonexistent → /timer → /login (unauthenticated)
    await page.waitForURL("**/login");
    await expect(page.locator("h1")).toHaveText("nuva");
  });
});
