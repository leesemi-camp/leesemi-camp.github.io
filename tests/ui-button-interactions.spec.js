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

test("Issue helper toggle collapses the bubble", async ({ page }) => {
  // 현안 안내 말풍선 토글 버튼 클릭 시 접힘 (issueHelperToggleButton 이벤트 핸들러)
  await page.goto("/map/");
  await page.waitForSelector("#issue-helper-toggle");
  const toggleBtn = page.locator("#issue-helper-toggle");
  await toggleBtn.click();
  // aria-expanded가 false가 되거나 클래스가 변경되어야 함
  const ariaExpanded = await toggleBtn.getAttribute("aria-expanded");
  expect(ariaExpanded).toBe("false");
});

test("Issue helper toggle re-expands the bubble", async ({ page }) => {
  // 현안 안내 말풍선을 접었다가 다시 펼침
  await page.goto("/map/");
  await page.waitForSelector("#issue-helper-toggle");
  const toggleBtn = page.locator("#issue-helper-toggle");
  await toggleBtn.click(); // 접기
  await toggleBtn.click(); // 펼치기
  const ariaExpanded = await toggleBtn.getAttribute("aria-expanded");
  expect(ariaExpanded).toBe("true");
});

test("Issue helper close button collapses the bubble", async ({ page }) => {
  // 현안 안내 말풍선 닫기 버튼 클릭 (issueHelperCloseButton 이벤트 핸들러)
  await page.goto("/map/");
  await page.waitForSelector("#issue-helper-close-btn");
  // 닫기 버튼 클릭
  await page.locator("#issue-helper-close-btn").click({ force: true });
  // 토글 버튼의 aria-expanded가 false가 됨
  const ariaExpanded = await page.locator("#issue-helper-toggle").getAttribute("aria-expanded");
  expect(ariaExpanded).toBe("false");
});

test("Issue helper collapsed class applied after close", async ({ page }) => {
  // 닫기 후 issue-helper-collapsed 클래스가 적용됨
  await page.goto("/map/");
  await page.waitForSelector("#issue-helper-close-btn");
  await page.locator("#issue-helper-close-btn").click({ force: true });
  const helper = page.locator(".issue-helper");
  await expect(helper).toHaveClass(/issue-helper-collapsed/);
});

test("Escape key when lightbox hidden does not error", async ({ page }) => {
  // 라이트박스가 닫혀 있을 때 Escape 키는 아무 동작 없음 (keydown 핸들러 early return 경로)
  await page.goto("/map/");
  await page.waitForSelector("#app-shell");
  await page.keyboard.press("Escape");
  // 앱이 정상 상태를 유지해야 함
  await expect(page.locator("#app-shell")).toBeVisible();
});
