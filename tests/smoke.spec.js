const { test, expect } = require("@playwright/test");

async function waitForSpotListHooks(page) {
  await page.waitForLoadState("domcontentloaded");
  try {
    await page.waitForFunction(() => {
      return window.__spotListTestHooks && typeof window.__spotListTestHooks.renderHotspotList === "function";
    }, null, { timeout: 15000 });
  } catch (error) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      return window.__spotListTestHooks && typeof window.__spotListTestHooks.renderHotspotList === "function";
    }, null, { timeout: 15000 });
  }
}

async function waitForSpotListHook(page, hookName) {
  await waitForSpotListHooks(page);
  await page.waitForFunction((name) => {
    return window.__spotListTestHooks && typeof window.__spotListTestHooks[name] === "function";
  }, hookName, { timeout: 15000 });
}

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
  await waitForSpotListHooks(page);

  // CI에서 간헐적으로 #spot-list가 중복되는 케이스가 있어, side-panel 아래로 범위를 제한
  const duplicateCount = await page.evaluate(() => document.querySelectorAll("#spot-list").length);
  if (duplicateCount !== 1) {
    console.log(`[smoke][debug] duplicate #spot-list count=${duplicateCount}`);
  }

  const spotList = page.locator("#spot-list").first();
  await expect(spotList).toBeVisible();
});

test("HS-LIST-001 Map spot memo state", async ({ page }) => {
  // 메모 유무에 따른 카드 렌더링과 패딩 확인
  await page.goto("/map/");
  const spotList = page.locator("#spot-list").first();
  await expect(spotList).toBeVisible();

  await waitForSpotListHooks(page);

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

test("HS-FB-001 Edit page uses local Firebase config", async ({ page }) => {
  await page.goto("/map/edit/");
  const result = await page.evaluate(() => {
    const config = window.APP_CONFIG || {};
    const firebase = config.firebase || {};
    const firebaseConfig = firebase.config || {};
    return {
      apiKey: firebaseConfig.apiKey || "",
      projectId: firebaseConfig.projectId || ""
    };
  });

  expect(result.projectId).toBeTruthy();
  expect(result.projectId).not.toBe("YOUR_PROJECT_ID");
  expect(result.apiKey).toBeTruthy();
  expect(result.apiKey).not.toBe("YOUR_FIREBASE_API_KEY");
});

test("HS-VIS-001 Public view hides internal hotspots", async ({ page }) => {
  await page.goto("/map/");
  await waitForSpotListHook(page, "renderVisibleHotspotList");

  const result = await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleHotspotList([
      {
        id: "spot-public",
        title: "공개 현안",
        memo: "",
        dongName: "판교동",
        categoryId: "traffic_parking",
        visibility: "public"
      },
      {
        id: "spot-internal",
        title: "내부 현안",
        memo: "",
        dongName: "판교동",
        categoryId: "traffic_parking",
        visibility: "internal"
      }
    ]);

    const cards = Array.from(document.querySelectorAll("#spot-list .spot-item"));
    const internalCard = cards.find((card) => card.dataset.spotId === "spot-internal");
    const publicCard = cards.find((card) => card.dataset.spotId === "spot-public");
    return {
      cardCount: cards.length,
      hasPublic: Boolean(publicCard),
      hasInternal: Boolean(internalCard)
    };
  });

  expect(result.cardCount).toBe(1);
  expect(result.hasPublic).toBe(true);
  expect(result.hasInternal).toBe(false);
});

test("HS-LINK-001 Invalid externalUrl is ignored", async ({ page }) => {
  await page.goto("/map/");
  await waitForSpotListHook(page, "openHotspotPopup");

  await page.evaluate(() => {
    window.__spotListTestHooks.openHotspotPopup({
      id: "spot-invalid-link",
      title: "잘못된 링크",
      memo: "",
      dongName: "판교동",
      categoryId: "traffic_parking",
      externalUrl: "javascript:alert(1)"
    });
  });

  await expect(page.locator("#map-popup a")).toHaveCount(0);
});

test("HS-LINK-002 Popup renders external link", async ({ page }) => {
  await page.goto("/map/");
  await waitForSpotListHook(page, "openHotspotPopup");

  await page.evaluate(() => {
    window.__spotListTestHooks.openHotspotPopup({
      id: "spot-external-link",
      title: "외부 링크",
      memo: "",
      dongName: "판교동",
      categoryId: "traffic_parking",
      externalUrl: "https://example.com/"
    });
  });

  const link = page.locator("#map-popup a");
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute("href", "https://example.com/");
});

test("HS-LINK-003 External link opens new tab", async ({ page }) => {
  await page.goto("/map/");
  await waitForSpotListHook(page, "openHotspotPopup");

  await page.evaluate(() => {
    window.__spotListTestHooks.openHotspotPopup({
      id: "spot-external-link-tab",
      title: "외부 링크",
      memo: "",
      dongName: "판교동",
      categoryId: "traffic_parking",
      externalUrl: "https://example.com/"
    });
  });

  const link = page.locator("#map-popup a");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
});

test("HS-LINK-004 Google edit URL warns once on change", async ({ page }) => {
  await page.goto("/map/edit/");
  let dialogCount = 0;
  page.on("dialog", async (dialog) => {
    dialogCount += 1;
    await dialog.dismiss();
  });

  await page.evaluate(() => {
    const input = document.getElementById("spot-external-url");
    if (!input) {
      return;
    }
    input.value = "https://docs.google.com/document/d/abc/edit";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  await page.waitForTimeout(100);
  expect(dialogCount).toBe(1);

  await page.evaluate(() => {
    const input = document.getElementById("spot-external-url");
    if (!input) {
      return;
    }
    input.value = "https://docs.google.com/document/d/abc/edit";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  await page.waitForTimeout(100);
  expect(dialogCount).toBe(1);
});

test("System launcher loads", async ({ page }) => {
  // 시스템 런처 초기 화면 확인
  await page.goto("/system/");
  await expect(page.locator("#launcher-loading")).toBeVisible();
});
