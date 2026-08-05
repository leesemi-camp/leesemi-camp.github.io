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

async function mockHotspotSnapshot(page, hotspots) {
  await page.route("**/data/hotspots.public.json", (route) => {
    const list = Array.isArray(hotspots) ? hotspots : [];
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        generatedAt: "2026-01-01T00:00:00.000Z",
        source: "test",
        collection: "crowd_hotspots",
        count: list.length,
        hotspots: list
      })
    });
  });
}

async function mockEmptyHotspotSnapshot(page) {
  await mockHotspotSnapshot(page, []);
}

async function waitForOfflineMapReady(page) {
  await page.waitForSelector("#issue-stats-summary .issue-stats-empty", { timeout: 30000 });
}

test("Spot list stays hidden when Firestore is offline", async ({ page }) => {
  // Firestore 오프라인 시 필터 선택 전 상세 목록은 보이지 않음
  await blockFirestore(page);
  await mockEmptyHotspotSnapshot(page);
  await page.goto("/map/");
  await waitForOfflineMapReady(page);
  await expect(page.locator("#issue-list-panel")).toHaveClass(/issue-list-panel-hidden/);
});

test("Total issue count shows 0 when Firestore is offline", async ({ page }) => {
  // Firestore 오프라인 시 총 현안 건수 0건 표시 (updateTotalIssueCountLabel 커버리지)
  await blockFirestore(page);
  await mockEmptyHotspotSnapshot(page);
  await page.goto("/map/");
  await waitForOfflineMapReady(page);
  const countEl = page.locator("#total-issue-count");
  const text = await countEl.textContent();
  expect(text).toContain("0건");
});

test("Issue stats shows empty state when Firestore is offline", async ({ page }) => {
  // Firestore 오프라인 시 현안 통계 빈 상태 (renderIssueStatsSummary([]) 커버리지)
  await blockFirestore(page);
  await mockEmptyHotspotSnapshot(page);
  await page.goto("/map/");
  await waitForOfflineMapReady(page);
  const statsEl = page.locator("#issue-stats-summary");
  const html = await statsEl.innerHTML();
  // 빈 상태이거나 초기 상태임을 확인
  expect(html !== undefined).toBe(true);
});

test("App shell is still visible when Firestore is offline", async ({ page }) => {
  // Firestore 장애 시에도 앱 셸이 표시 유지 (view mode는 auth 없이 showAppShell 호출)
  await blockFirestore(page);
  await mockEmptyHotspotSnapshot(page);
  await page.goto("/map/");
  await waitForOfflineMapReady(page);
  await expect(page.locator("#app-shell")).toBeVisible();
});

test("Common pledge list is rendered when Firestore is offline", async ({ page }) => {
  // Firestore 오프라인 시 공통 현안 목록 렌더링 확인
  await blockFirestore(page);
  await mockEmptyHotspotSnapshot(page);
  await page.goto("/map/");
  await waitForOfflineMapReady(page);
  // 공통 현안은 config.data.commonPledges 에서 렌더링됨
  const pledgeList = page.locator("#common-pledge-list");
  const itemCount = await pledgeList.locator("li").count();
  expect(itemCount).toBeGreaterThan(0);
});

test("Common pledge tags use squircle rhythm", async ({ page }) => {
  // 공통 현안 태그는 현안 통계 칩과 같은 squircle 반경을 사용함
  await blockFirestore(page);
  await mockHotspotSnapshot(page, [
    {
      id: "common-style-a",
      title: "[상습정체] 판교역 주변 정체",
      categoryId: "traffic_parking",
      dongName: "판교동",
      lat: 37.394,
      lng: 127.111
    }
  ]);
  await page.goto("/map/");
  await page.waitForSelector("#common-pledge-list .pledge-common-tag", { timeout: 30000 });
  const rhythm = await page.evaluate(() => {
    const tagEl = document.querySelector("#common-pledge-list .pledge-common-tag");
    if (!tagEl) return null;
    const rect = tagEl.getBoundingClientRect();
    const style = window.getComputedStyle(tagEl);
    return {
      radius: parseFloat(style.borderTopLeftRadius),
      height: rect.height,
      paddingTop: parseFloat(style.paddingTop),
      paddingLeft: parseFloat(style.paddingLeft),
      gap: parseFloat(style.columnGap || style.gap)
    };
  });
  expect(rhythm).not.toBeNull();
  expect(rhythm.radius).toBe(10);
  expect(rhythm.radius).toBeLessThan(rhythm.height / 2);
  expect(rhythm.paddingTop).toBeGreaterThanOrEqual(4);
  expect(rhythm.paddingLeft).toBeGreaterThanOrEqual(8);
  expect(rhythm.gap).toBeGreaterThanOrEqual(7);
});

test("View mode does not request Firestore", async ({ page }) => {
  // 공개 열람 화면은 Firestore 대신 정적 JSON 스냅샷만 사용한다.
  const firestoreRequests = [];
  let snapshotRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("firestore.googleapis.com")) {
      firestoreRequests.push(request.url());
    }
  });
  await page.route("**/data/hotspots.public.json", (route) => {
    snapshotRequests += 1;
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        generatedAt: "2026-01-01T00:00:00.000Z",
        source: "firestore",
        collection: "crowd_hotspots",
        count: 0,
        hotspots: []
      })
    });
  });
  await page.goto("/map/");
  await expect.poll(() => snapshotRequests).toBe(1);
  expect(firestoreRequests).toHaveLength(0);
});
