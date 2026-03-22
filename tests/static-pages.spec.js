const { test, expect } = require("@playwright/test");

async function disableAutoLogin(page) {
  await page.addInitScript(() => {
    try {
      window.sessionStorage.setItem("system_auto_login_attempted_v1", "1");
    } catch (error) {
      // Ignore storage errors for hardened environments.
    }
  });
}

test("party dialer shell loads", async ({ page }) => {
  await disableAutoLogin(page);
  await page.goto("/party-dialer/");
  await expect(page).toHaveURL(/\/system\/$/);
  await expect(page.locator("#launcher-error")).toBeVisible();
});

test("sponsor dialer shell loads", async ({ page }) => {
  await disableAutoLogin(page);
  await page.goto("/sponsor-dialer/");
  await expect(page).toHaveURL(/\/system\/$/);
  await expect(page.locator("#launcher-error")).toBeVisible();
});
