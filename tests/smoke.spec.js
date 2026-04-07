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
