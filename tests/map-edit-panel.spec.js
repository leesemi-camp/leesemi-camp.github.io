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

test("Edit page shows login panel", async ({ page }) => {
  // 편집 페이지 접속 시 로그인 패널 표시 확인
  await page.goto("/map/edit/");
  await expect(page.locator("#login-panel")).toBeVisible();
});

test("Edit page login button is enabled", async ({ page }) => {
  // 편집 페이지 로그인 버튼 활성화 상태 확인
  await page.goto("/map/edit/");
  await expect(page.locator("#login-btn")).toBeVisible();
  await expect(page.locator("#login-btn")).toBeEnabled();
});

test("Edit page app shell is initially hidden", async ({ page }) => {
  // 비인증 상태에서 앱 셸이 숨겨짐 확인
  await page.goto("/map/edit/");
  await expect(page.locator("#login-panel")).toBeVisible();
  await expect(page.locator("#app-shell")).toBeHidden();
});

test("Edit page status text shows message after auth check", async ({ page }) => {
  // 인증 확인 후 상태 텍스트에 안내 메시지 표시 확인
  await page.goto("/map/edit/");
  await expect(page.locator("#login-panel")).toBeVisible();
  // onAuthStateChanged(null) 이후 로그인 필요 메시지가 status-text에 표시됨
  await expect(page.locator("#status-text")).not.toBeEmpty();
});

test("Edit page status text contains login prompt", async ({ page }) => {
  // 상태 텍스트에 로그인 안내 문구 포함 확인
  await page.goto("/map/edit/");
  await expect(page.locator("#login-panel")).toBeVisible();
  await page.waitForFunction(() => {
    const el = document.getElementById("status-text");
    return el && el.textContent.trim().length > 0 && el.textContent.trim() !== "초기화 중...";
  }, { timeout: 15000 });
  const statusText = await page.locator("#status-text").textContent();
  expect(statusText).toContain("로그인이 필요합니다");
});

test("Map read-only view shows app shell", async ({ page }) => {
  // 읽기 전용 지도 뷰는 인증 없이 앱 셸 표시
  await page.goto("/map/");
  await expect(page.locator("#app-shell")).toBeVisible();
  await expect(page.locator("#map")).toBeVisible();
});

test("Map read-only view has total issue count label", async ({ page }) => {
  // 총 현안 건수 레이블 존재 확인
  await page.goto("/map/");
  await expect(page.locator("#total-issue-count")).toBeAttached();
});

test("Map read-only view has spot list element", async ({ page }) => {
  // 현안 목록 요소 존재 확인
  await page.goto("/map/");
  await expect(page.locator("#spot-list")).toBeAttached();
});

test("Map read-only view has issue stats summary element", async ({ page }) => {
  // 현안 통계 요약 요소 존재 확인
  await page.goto("/map/");
  await expect(page.locator("#issue-stats-summary")).toBeAttached();
});
