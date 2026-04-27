import { test, expect } from "@playwright/test";
import { addCoverageReport } from "monocart-reporter";

// Chromium에서만 V8 커버리지를 수집한다.
test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.project.use.browserName === "chromium") {
    await Promise.all([
      page.coverage.startJSCoverage({ resetOnNavigation: false }),
      page.coverage.startCSSCoverage({ resetOnNavigation: false })
    ]);
  }
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.project.use.browserName === "chromium") {
    const [jsCoverage, cssCoverage] = await Promise.all([
      page.coverage.stopJSCoverage(),
      page.coverage.stopCSSCoverage()
    ]);
    await addCoverageReport([...jsCoverage, ...cssCoverage], testInfo);
  }
});

// 자동 로그인 리다이렉트를 방지하는 헬퍼
async function disableAutoLogin(page) {
  await page.addInitScript(() => {
    try {
      window.sessionStorage.setItem("system_auto_login_attempted_v1", "1");
    } catch (_e) {
      // 무시
    }
  });
}

test("Launcher error section is visible on missing session", async ({ page }) => {
  // 세션 없을 때 에러 섹션이 표시됨
  await disableAutoLogin(page);
  await page.goto("/system/");
  await expect(page.locator("#launcher-error")).toBeVisible();
});

test("Launcher error message contains session failure text", async ({ page }) => {
  // 에러 메시지에 세션 안내 문구 포함 확인
  await disableAutoLogin(page);
  await page.goto("/system/");
  await expect(page.locator("#launcher-error")).toBeVisible();
  const messageText = await page.locator("#launcher-error-message").textContent();
  expect(messageText).toContain("로그인 세션을 확인하지 못했습니다");
});

test("Launcher login button is visible in error state", async ({ page }) => {
  // 에러 상태에서 로그인 버튼 표시 확인
  await disableAutoLogin(page);
  await page.goto("/system/");
  await expect(page.locator("#launcher-error")).toBeVisible();
  await expect(page.locator("#launcher-login-btn")).toBeVisible();
  await expect(page.locator("#launcher-login-btn")).toBeEnabled();
});

test("Launcher loading section is hidden in error state", async ({ page }) => {
  // 에러 상태에서 로딩 섹션이 숨겨짐 확인
  await disableAutoLogin(page);
  await page.goto("/system/");
  await expect(page.locator("#launcher-error")).toBeVisible();
  await expect(page.locator("#launcher-loading")).toBeHidden();
});

test("Launcher shell is hidden in error state", async ({ page }) => {
  // 에러 상태에서 서비스 셸이 숨겨짐 확인
  await disableAutoLogin(page);
  await page.goto("/system/");
  await expect(page.locator("#launcher-error")).toBeVisible();
  await expect(page.locator("#launcher-shell")).toBeHidden();
});

test("Launcher renders at least one service button", async ({ page }) => {
  // renderServiceButtons()가 실행되어 버튼이 렌더링됨 확인
  await disableAutoLogin(page);
  await page.goto("/system/");
  // 에러 상태가 될 때까지 기다린 후 서비스 버튼 확인
  await expect(page.locator("#launcher-error")).toBeVisible();
  const serviceButtonCount = await page.locator("#service-buttons .service-link").count();
  expect(serviceButtonCount).toBeGreaterThan(0);
});

test("Launcher error message mentions Authorized domains check", async ({ page }) => {
  // 에러 메시지에 Authorized domains 안내 포함 확인
  await disableAutoLogin(page);
  await page.goto("/system/");
  await expect(page.locator("#launcher-error")).toBeVisible();
  const messageText = await page.locator("#launcher-error-message").textContent();
  expect(messageText).toContain("Firebase Authentication Authorized domains");
});
