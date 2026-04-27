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

// Firebase SDK 요청을 차단한다.
async function blockFirebaseSdk(page) {
  await page.route("**/firebase-*-compat.js", (route) => route.abort());
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

test("Launcher service buttons include tone classes and new tab link", async ({ page }) => {
  // 서비스 버튼에 톤 클래스와 새 탭 링크 속성이 반영됨
  await disableAutoLogin(page);
  await page.goto("/system/");
  await expect(page.locator("#launcher-error")).toBeVisible();

  await expect(page.locator("#service-buttons .tone-sage")).toHaveCount(1);
  await expect(page.locator("#service-buttons .tone-sand")).toHaveCount(1);

  const blogLink = page.locator("#service-buttons .service-link", { hasText: "블로그 글 작성 도우미" });
  await expect(blogLink).toHaveAttribute("target", "_blank");
  await expect(blogLink).toHaveAttribute("rel", /noopener/);
});

test("Launcher test hooks expose auth error messages", async ({ page }) => {
  // 로그인 에러 메시지 매핑 함수가 정상 동작함
  await disableAutoLogin(page);
  await page.goto("/system/");
  await page.waitForFunction(() => window.__launcherTestHooks);

  const messages = await page.evaluate(() => {
    const hooks = window.__launcherTestHooks;
    return {
      closed: hooks.toAuthErrorMessage({ code: "auth/popup-closed-by-user" }),
      blocked: hooks.toAuthErrorMessage({ code: "auth/popup-blocked" }),
      domain: hooks.toAuthErrorMessage({ code: "auth/unauthorized-domain" })
    };
  });

  expect(messages.closed).toContain("로그인 창이 닫혀");
  expect(messages.blocked).toContain("팝업");
  expect(messages.domain).toContain("Authorized domains");
});

test("Launcher test hooks read/write auto login flag", async ({ page }) => {
  // 자동 로그인 플래그 읽기/쓰기 동작 확인
  await disableAutoLogin(page);
  await page.goto("/system/");
  await page.waitForFunction(() => window.__launcherTestHooks);

  const result = await page.evaluate(() => {
    const hooks = window.__launcherTestHooks;
    hooks.writeAutoLoginAttemptFlag(true);
    const first = hooks.readAutoLoginAttemptFlag();
    hooks.writeAutoLoginAttemptFlag(false);
    const second = hooks.readAutoLoginAttemptFlag();
    return { first, second };
  });

  expect(result.first).toBe(true);
  expect(result.second).toBe(false);
});

test("Launcher shows init failure when Firebase SDK is blocked", async ({ page }) => {
  // Firebase SDK 로드 실패 시 초기화 실패 메시지가 표시됨
  await disableAutoLogin(page);
  await blockFirebaseSdk(page);
  await page.goto("/system/");

  await expect(page.locator("#launcher-error")).toBeVisible();
  const messageText = await page.locator("#launcher-error-message").textContent();
  expect(messageText).toContain("Firebase SDK 로드에 실패했습니다");
});
