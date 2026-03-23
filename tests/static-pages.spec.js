const { test, expect } = require("@playwright/test");

async function disableAutoLogin(page) {
  // 자동 로그인 시도 플래그를 미리 세팅하여 리다이렉트 흐름을 제어한다.
  await page.addInitScript(() => {
    try {
      window.sessionStorage.setItem("system_auto_login_attempted_v1", "1");
    } catch (error) {
      // Ignore storage errors for hardened environments.
    }
  });
}

test("Party dialer redirects to login", async ({ page }) => {
  // 인증되지 않은 상태에서 시스템 로그인 화면으로 이동하는지 확인
  await disableAutoLogin(page);
  await page.goto("/party-dialer/");
  await expect(page).toHaveURL(/\/system\/$/);
  await expect(page.locator("#launcher-error")).toBeVisible();
});

test("Sponsor dialer redirects to login", async ({ page }) => {
  // 인증되지 않은 상태에서 시스템 로그인 화면으로 이동하는지 확인
  await disableAutoLogin(page);
  await page.goto("/sponsor-dialer/");
  await expect(page).toHaveURL(/\/system\/$/);
  await expect(page.locator("#launcher-error")).toBeVisible();
});
