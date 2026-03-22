const { test, expect } = require("@playwright/test");

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main.public-landing")).toBeVisible();
  await expect(page.locator(".public-link-map")).toBeVisible();
  await expect(page.locator(".public-system-link")).toBeVisible();
});

test("map view loads", async ({ page }) => {
  await page.goto("/map/");
  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator("#spot-list")).toBeVisible();
});

test("map edit shows login panel", async ({ page }) => {
  await page.goto("/map/edit/");
  await expect(page.locator("#login-panel")).toBeVisible();
  await expect(page.locator("#login-btn")).toBeVisible();
});

test("system launcher loads", async ({ page }) => {
  await page.goto("/system/");
  await expect(page.locator("#launcher-loading")).toBeVisible();
});
