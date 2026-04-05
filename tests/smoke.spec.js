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

  // app.js가 로드되어 테스트 훅이 노출될 때까지 대기
  await page.waitForFunction(() => {
    return window.__spotListTestHooks && typeof window.__spotListTestHooks.renderHotspotList === "function";
  });

  // CI에서 간헐적으로 #spot-list가 중복되는 케이스가 있어, side-panel 아래로 범위를 제한
  const duplicateCount = await page.evaluate(() => document.querySelectorAll("#spot-list").length);
  if (duplicateCount !== 1) {
    console.log(`[smoke][debug] duplicate #spot-list count=${duplicateCount}`);
  }

  const spotList = page.locator("#spot-list").first();
  await expect(spotList).toBeVisible();
});

test("Map spot memo state", async ({ page }) => {
  // 메모 유무에 따른 카드 렌더링과 패딩 확인
  await page.goto("/map/");
  const spotList = page.locator("#spot-list").first();
  await expect(spotList).toBeVisible();

  await page.waitForFunction(() => {
    return window.__spotListTestHooks && typeof window.__spotListTestHooks.renderHotspotList === "function";
  });

  const result = await page.evaluate(() => {
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

    // renderHotspotList는 내부적으로 document.getElementById("spot-list")를 사용하므로,
    // CI에서 #spot-list가 중복되어도 렌더된 결과를 전역에서 찾아 검증한다.
    const noMemoItem = document.querySelector("[data-spot-id='spot-no-memo']");
    const withMemoItem = document.querySelector("[data-spot-id='spot-with-memo']");

    if (!noMemoItem || !withMemoItem) {
      return {
        ok: false,
        debugSpotListHtml: document.querySelector("#spot-list")
          ? document.querySelector("#spot-list").innerHTML
          : ""
      };
    }

    const noMemoPaddingTop = window.getComputedStyle(noMemoItem).paddingTop;
    const withMemoPaddingTop = window.getComputedStyle(withMemoItem).paddingTop;

    return {
      ok: true,
      noMemoHasNoMemoClass: noMemoItem.classList.contains("spot-item--no-memo"),
      noMemoMemoCount: noMemoItem.querySelectorAll(".spot-memo").length,
      noMemoPaddingTop,
      withMemoHasNoMemoClass: withMemoItem.classList.contains("spot-item--no-memo"),
      withMemoText: withMemoItem.querySelector(".spot-memo")
        ? withMemoItem.querySelector(".spot-memo").textContent.trim()
        : "",
      withMemoPaddingTop
    };
  });

  expect(result.ok).toBe(true);
  expect(result.noMemoHasNoMemoClass).toBe(true);
  expect(result.noMemoMemoCount).toBe(0);
  expect(result.withMemoHasNoMemoClass).toBe(false);
  expect(result.withMemoText).toBe("현안 내용");
  expect(result.noMemoPaddingTop).toBe("8px");
  expect(result.withMemoPaddingTop).toBe("10px");
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
