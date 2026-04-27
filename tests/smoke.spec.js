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

test("Landing page loads", async ({ page }) => {
  // 공개 랜딩 페이지 렌더링 확인
  await page.goto("/");
  await expect(page.locator("main.public-landing")).toBeVisible();
  await expect(page.locator(".public-link-map")).toBeVisible();
  await expect(page.locator(".public-system-link")).toBeVisible();
});

test("Map view renders", async ({ page }) => {
  // 지도 뷰 기본 렌더링 확인
  await page.goto("/map/");
  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator("#spot-list")).toBeAttached();
});

test("Map spot memo state", async ({ page }) => {
  // 메모 유무에 따른 카드 렌더링과 패딩 확인
  // Firestore를 차단하여 구독 업데이트가 테스트 렌더링을 덮어쓰지 않도록 한다.
  await page.route("**/firestore.googleapis.com/**", (route) => route.abort());
  await page.goto("/map/");
  // Firestore 오프라인 처리가 완료되고 빈 목록이 렌더링될 때까지 대기한다.
  await page.waitForSelector("#spot-list li.empty", { timeout: 30000 });
  await page.waitForFunction(() => {
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.renderHotspotList === "function"
    );
  });

  await page.evaluate(() => {
    window.__spotListTestHooks.renderHotspotList([
      {
        id: "spot-no-memo",
        title: "메모 없는 현안",
        memo: "",
        dongName: "판교동",
        categoryId: "traffic_parking"
      },
      {
        id: "spot-with-memo",
        title: "메모 있는 현안",
        memo: "현안 내용",
        dongName: "판교동",
        categoryId: "traffic_parking"
      }
    ]);
  });

  const noMemoItem = page.locator("[data-spot-id='spot-no-memo']");
  await expect(noMemoItem).toHaveClass(/spot-item--no-memo/);
  await expect(noMemoItem.locator(".spot-memo")).toHaveCount(0);
  const noMemoPaddingTop = await noMemoItem.evaluate((el) => window.getComputedStyle(el).paddingTop);

  const withMemoItem = page.locator("[data-spot-id='spot-with-memo']");
  await expect(withMemoItem).not.toHaveClass(/spot-item--no-memo/);
  await expect(withMemoItem.locator(".spot-memo")).toHaveText("현안 내용");
  const withMemoPaddingTop = await withMemoItem.evaluate((el) => window.getComputedStyle(el).paddingTop);

  expect(noMemoPaddingTop).toBe("8px");
  expect(withMemoPaddingTop).toBe("10px");
});

test("Edit page shows login", async ({ page }) => {
  // 편집 페이지 로그인 패널 노출 확인
  await page.goto("/map/edit/");
  await expect(page.locator("#login-panel")).toBeVisible();
  await expect(page.locator("#login-btn")).toBeVisible();
});

test("System launcher loads", async ({ page }) => {
  // 시스템 런처 초기 화면 확인
  await page.goto("/system/");
  await expect(page.locator("#launcher-loading")).toBeVisible();
});
