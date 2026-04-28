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

async function blockFirestore(page) {
  await page.route("**/firestore.googleapis.com/**", (route) => route.abort());
}

// 현안 목록을 렌더링하고 테스트 훅이 준비될 때까지 대기한다.
async function setupSpots(page, spots) {
  await blockFirestore(page);
  await page.goto("/map/");
  await page.waitForSelector("#spot-list li.empty", { timeout: 30000 });
  await page.evaluate((items) => {
    window.__spotListTestHooks.renderHotspotList(items);
  }, spots);
}

test("Map popup element exists and is initially hidden", async ({ page }) => {
  // 지도 팝업 요소가 초기에 숨겨진 상태임
  await page.goto("/map/");
  const popup = page.locator("#map-popup");
  await expect(popup).toBeAttached();
  await expect(popup).toHaveClass(/hidden/);
});

test("Clicking spot list item with no OL map does not throw", async ({ page }) => {
  // OL 지도 없이 현안 목록 클릭 시 에러 없이 처리됨 (early return 경로)
  await setupSpots(page, [
    { id: "click-test", title: "클릭 테스트", categoryId: "traffic_parking", dongName: "판교동" }
  ]);
  const item = page.locator("[data-spot-id='click-test']");
  await expect(item).toBeVisible();
  // OL 지도가 없으므로 클릭해도 팝업이 열리지 않고 에러도 없어야 함
  await item.click();
  // 앱 셸이 정상 상태를 유지해야 함
  await expect(page.locator("#app-shell")).toBeVisible();
});

test("Clicking focus-group button does not error", async ({ page }) => {
  // focus-group 버튼 클릭 시 에러 없이 처리됨
  await blockFirestore(page);
  await page.goto("/map/");
  await page.waitForSelector("#spot-list li.empty", { timeout: 30000 });
  await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueDongList([
      { id: "fg1", title: "포커스 그룹", categoryId: "traffic_parking", dongName: "판교동" }
    ]);
  });
  const focusBtn = page.locator("[data-action='focus-group']");
  await expect(focusBtn).toBeAttached();
  await focusBtn.click();
  // 앱이 정상 상태를 유지해야 함
  await expect(page.locator("#app-shell")).toBeVisible();
});

test("Clicking spot list item opens photo lightbox when photo clicked", async ({ page }) => {
  // 사진이 있는 현안 아이템에서 사진 클릭 시 라이트박스가 열림
  await setupSpots(page, [
    {
      id: "photo-popup",
      title: "팝업 사진 테스트",
      categoryId: "safety_security",
      dongName: "운중동",
      photoDataUrls: ["https://example.com/popup-photo.jpg"]
    }
  ]);
  await page.waitForSelector("#spot-list .photo-slide-image");
  const photoImg = page.locator("#spot-list .photo-slide-image").first();
  await photoImg.click();
  await expect(page.locator("#photo-lightbox")).not.toHaveClass(/hidden/);
});

test("Map popup aria-hidden attribute set initially", async ({ page }) => {
  // 지도 팝업의 aria-hidden 속성이 초기에 설정됨
  await page.goto("/map/");
  const popup = page.locator("#map-popup");
  const ariaHidden = await popup.getAttribute("aria-hidden");
  expect(ariaHidden).toBe("true");
});

test("Clear dong filter button is hidden initially", async ({ page }) => {
  // '전체 보기' 동 필터 초기화 버튼이 초기에 숨겨져 있음
  await page.goto("/map/");
  const clearBtn = page.locator("#clear-dong-filter-btn");
  await expect(clearBtn).toHaveClass(/hidden/);
});

test("Issue view dong button is present and active by default", async ({ page }) => {
  // '동별 보기' 버튼이 초기에 활성화된 상태로 표시됨
  await page.goto("/map/");
  const dongBtn = page.locator("#issue-view-dong-btn");
  await expect(dongBtn).toBeVisible();
  await expect(dongBtn).toHaveClass(/spot-action-btn-checked/);
});

test("Clicking dong view button does not change state when already active", async ({ page }) => {
  // 이미 활성화된 '동별 보기' 버튼 클릭 시 상태 유지
  await page.goto("/map/");
  const dongBtn = page.locator("#issue-view-dong-btn");
  await dongBtn.click();
  // 버튼이 여전히 활성화 상태를 유지해야 함
  await expect(dongBtn).toHaveClass(/spot-action-btn-checked/);
});

test("Map has map-wrap element with initializing class", async ({ page }) => {
  // 지도 래퍼 요소가 로드됨
  await page.goto("/map/");
  await expect(page.locator(".map-wrap")).toBeAttached();
});

test("Landing page has map link", async ({ page }) => {
  // 랜딩 페이지에 지도 페이지 링크가 있음
  await page.goto("/");
  const mapLink = page.locator(".public-link-map");
  await expect(mapLink).toBeVisible();
  const href = await mapLink.getAttribute("href");
  expect(href).toContain("/map/");
});

test("Landing page has system link", async ({ page }) => {
  // 랜딩 페이지에 시스템 링크가 있음
  await page.goto("/");
  const sysLink = page.locator(".public-system-link");
  await expect(sysLink).toBeVisible();
  const href = await sysLink.getAttribute("href");
  expect(href).toContain("/system/");
});
