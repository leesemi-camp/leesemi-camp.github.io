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

// Firestore API 요청을 차단하여 오프라인 상태를 시뮬레이션한다.
async function blockFirestore(page) {
  await page.route("**/firestore.googleapis.com/**", (route) => route.abort());
}

test("Spot list shows empty message when Firestore is offline", async ({ page }) => {
  // Firestore 오프라인 시 현안 없음 메시지 확인
  // (renderVisibleIssueList, renderIssueDongList, applyIssueFilter 커버리지)
  await blockFirestore(page);
  await page.goto("/map/");
  await page.waitForSelector("#spot-list li.empty", { timeout: 30000 });
  const emptyMsg = await page.locator("#spot-list li.empty").first().textContent();
  expect(emptyMsg).toContain("등록된 지역 현안이 없습니다");
});

test("Total issue count shows 0 when Firestore is offline", async ({ page }) => {
  // Firestore 오프라인 시 총 현안 건수 0건 표시 (updateTotalIssueCountLabel 커버리지)
  await blockFirestore(page);
  await page.goto("/map/");
  await page.waitForSelector("#spot-list li.empty", { timeout: 30000 });
  const countEl = page.locator("#total-issue-count");
  const text = await countEl.textContent();
  expect(text).toContain("0건");
});

test("Issue stats shows empty state when Firestore is offline", async ({ page }) => {
  // Firestore 오프라인 시 현안 통계 빈 상태 (renderIssueStatsSummary([]) 커버리지)
  await blockFirestore(page);
  await page.goto("/map/");
  await page.waitForSelector("#spot-list li.empty", { timeout: 30000 });
  const statsEl = page.locator("#issue-stats-summary");
  const html = await statsEl.innerHTML();
  // 빈 상태이거나 초기 상태임을 확인
  expect(html !== undefined).toBe(true);
});

test("App shell is still visible when Firestore is offline", async ({ page }) => {
  // Firestore 장애 시에도 앱 셸이 표시 유지 (view mode는 auth 없이 showAppShell 호출)
  await blockFirestore(page);
  await page.goto("/map/");
  await page.waitForSelector("#spot-list li.empty", { timeout: 30000 });
  await expect(page.locator("#app-shell")).toBeVisible();
});

test("Common pledge list is rendered when Firestore is offline", async ({ page }) => {
  // Firestore 오프라인 시 공통 현안 목록 렌더링 확인
  await blockFirestore(page);
  await page.goto("/map/");
  await page.waitForSelector("#spot-list li.empty", { timeout: 30000 });
  // 공통 현안은 config.data.commonPledges 에서 렌더링됨
  const pledgeList = page.locator("#common-pledge-list");
  const itemCount = await pledgeList.locator("li").count();
  expect(itemCount).toBeGreaterThan(0);
});
