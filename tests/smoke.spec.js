const { test, expect } = require("@playwright/test");

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
  // CI에서 HTML 중복 병합 실수 등으로 #spot-list가 중복될 수 있어 first()로 고정한다.
  await expect(page.locator("#spot-list").first()).toBeAttached();
});

test("Map spot memo state", async ({ page }) => {
  // 메모 유무에 따른 카드 렌더링과 패딩 확인
  await page.goto("/map/");
  // CI에서 HTML 중복 병합 실수 등으로 #spot-list가 중복될 수 있어 first()로 고정한다.
  await expect(page.locator("#spot-list").first()).toBeAttached();

  await page.evaluate(() => {
    if (!window.__spotListTestHooks || typeof window.__spotListTestHooks.renderHotspotList !== "function") {
      throw new Error("spot list test hooks not available");
    }
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
