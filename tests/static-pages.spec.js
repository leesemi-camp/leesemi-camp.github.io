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

async function disableServiceShellRedirect(page) {
  // 서비스 셸 리다이렉트를 막아 테스트 훅 접근을 보장한다.
  await page.addInitScript(() => {
    window.__disableServiceShellRedirect = true;
  });
}

async function blockFirebaseSdk(page) {
  // Firebase SDK 요청을 차단한다.
  await page.route("**/firebase-*-compat.js", (route) => route.abort());
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

test("Service shell exposes staff claim helper", async ({ page }) => {
  // 서비스 셸 유틸 함수가 노출되고 리다이렉트 호출이 기록됨
  await disableServiceShellRedirect(page);
  await blockFirebaseSdk(page);
  await page.goto("/party-dialer/");

  await page.waitForFunction(() => window.__serviceShellTestHooks);
  const result = await page.evaluate(() => {
    const hooks = window.__serviceShellTestHooks;
    hooks.initOptionalAppCheck();
    return {
      claimTrue: hooks.hasStaffClaim({ staff: true }),
      claimString: hooks.hasStaffClaim({ staff: "true" }),
      claimNumber: hooks.hasStaffClaim({ staff: 1 }),
      claimFalse: hooks.hasStaffClaim({ staff: false }),
      redirectUrl: window.__serviceShellRedirectUrl || ""
    };
  });

  expect(result.claimTrue).toBe(true);
  expect(result.claimString).toBe(true);
  expect(result.claimNumber).toBe(true);
  expect(result.claimFalse).toBe(false);
  expect(result.redirectUrl).toBe("/system/");
});
