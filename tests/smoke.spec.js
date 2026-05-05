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

test("Mobile map header stays compact", async ({ page }) => {
  // 모바일 상단 헤더는 제목을 한 줄로 유지하고 지도 영역을 과도하게 밀어내지 않음
  await page.setViewportSize({ width: 390, height: 900 });
  await page.route("**/firestore.googleapis.com/**", (route) => route.abort());
  await page.route("**/data/hotspots.public.json", (route) => {
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
  await expect(page.locator(".topbar-title")).toBeVisible();

  const metrics = await page.evaluate(() => {
    const topbar = document.querySelector(".topbar");
    const title = document.querySelector(".topbar-title");
    const iconButton = document.querySelector(".topbar-actions .icon-btn");
    const topbarRect = topbar.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const iconRect = iconButton.getBoundingClientRect();
    const titleStyle = window.getComputedStyle(title);
    return {
      topbarHeight: topbarRect.height,
      titleHeight: titleRect.height,
      iconButtonWidth: iconRect.width,
      iconButtonHeight: iconRect.height,
      titleLineHeight: Number.parseFloat(titleStyle.lineHeight),
      titleWhiteSpace: titleStyle.whiteSpace
    };
  });

  expect(metrics.topbarHeight).toBeLessThanOrEqual(58);
  expect(metrics.titleWhiteSpace).toBe("nowrap");
  expect(metrics.titleHeight).toBeLessThanOrEqual(metrics.titleLineHeight + 2);
  expect(metrics.iconButtonWidth).toBeLessThanOrEqual(34);
  expect(metrics.iconButtonHeight).toBeLessThanOrEqual(34);
});

test("Map viewport clips rounded bottom corners", async ({ page }) => {
  // 앱 셸 하나가 전체 하단 곡률을 담당해 이중 클리핑으로 생기는 흰 모서리 틈을 방지한다.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route("**/firestore.googleapis.com/**", (route) => route.abort());
  await page.route("**/data/hotspots.public.json", (route) => {
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
  await page.waitForSelector(".map .ol-viewport");

  const readCornerState = () => {
    return page.evaluate(() => {
      const workspace = document.querySelector(".workspace");
      const mapWrap = document.querySelector(".map-wrap");
      const viewport = document.querySelector(".map .ol-viewport");
      const appShell = document.querySelector(".app-shell");
      const sidePanel = document.querySelector(".side-panel");
      const topbar = document.querySelector(".topbar");
      const workspaceStyle = window.getComputedStyle(workspace);
      const mapWrapStyle = window.getComputedStyle(mapWrap);
      const viewportStyle = window.getComputedStyle(viewport);
      const appShellStyle = window.getComputedStyle(appShell);
      const sidePanelStyle = window.getComputedStyle(sidePanel);
      const topbarStyle = window.getComputedStyle(topbar);
      const appShellRect = appShell.getBoundingClientRect();
      const workspaceRect = workspace.getBoundingClientRect();
      const sidePanelRect = sidePanel.getBoundingClientRect();
      return {
        workspaceOverflow: workspaceStyle.overflow,
        workspaceBottomLeftRadius: Number.parseFloat(workspaceStyle.borderBottomLeftRadius),
        workspaceBottomRightRadius: Number.parseFloat(workspaceStyle.borderBottomRightRadius),
        mapWrapOverflow: mapWrapStyle.overflow,
        mapWrapBackground: mapWrapStyle.backgroundColor,
        mapWrapBottomLeftRadius: Number.parseFloat(mapWrapStyle.borderBottomLeftRadius),
        mapWrapBottomRightRadius: Number.parseFloat(mapWrapStyle.borderBottomRightRadius),
        appShellOverflow: appShellStyle.overflow,
        appShellBackground: appShellStyle.backgroundColor,
        appShellBorderLeftWidth: Number.parseFloat(appShellStyle.borderLeftWidth),
        appShellBottomLeftRadius: Number.parseFloat(appShellStyle.borderBottomLeftRadius),
        appShellTopLeftRadius: Number.parseFloat(appShellStyle.borderTopLeftRadius),
        sheetBottomInset: appShellRect.bottom - sidePanelRect.bottom,
        sheetContentBottomInset: workspaceRect.bottom - sidePanelRect.bottom,
        sheetBottomRadius: Number.parseFloat(sidePanelStyle.borderBottomLeftRadius),
        sheetTopRadius: Number.parseFloat(sidePanelStyle.borderTopLeftRadius),
        topbarBackground: topbarStyle.backgroundColor,
        viewportOverflow: viewportStyle.overflow,
        viewportBottomRightRadius: Number.parseFloat(viewportStyle.borderBottomRightRadius)
      };
    });
  };

  const desktopCorners = await readCornerState();
  expect(desktopCorners.appShellOverflow).toBe("hidden");
  expect(desktopCorners.appShellBottomLeftRadius).toBeGreaterThan(0);
  expect(desktopCorners.workspaceOverflow).toBe("visible");
  expect(desktopCorners.workspaceBottomRightRadius).toBeLessThanOrEqual(1);
  expect(desktopCorners.mapWrapOverflow).toBe("visible");
  expect(desktopCorners.mapWrapBottomRightRadius).toBeLessThanOrEqual(1);
  expect(desktopCorners.viewportBottomRightRadius).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 390, height: 900 });
  const mobileCorners = await readCornerState();
  const expectedMobileAppRadius = mobileCorners.sheetBottomInset + mobileCorners.sheetBottomRadius;
  expect(mobileCorners.appShellOverflow).toBe("hidden");
  expect(mobileCorners.appShellBackground).toBe(mobileCorners.mapWrapBackground);
  expect(mobileCorners.mapWrapBackground).not.toBe("rgb(255, 255, 255)");
  expect(mobileCorners.mapWrapBackground).not.toBe("rgba(0, 0, 0, 0)");
  expect(mobileCorners.topbarBackground).toBe("rgb(255, 255, 255)");
  expect(mobileCorners.workspaceOverflow).toBe("visible");
  expect(mobileCorners.workspaceBottomLeftRadius).toBeLessThanOrEqual(1);
  expect(mobileCorners.workspaceBottomRightRadius).toBeLessThanOrEqual(1);
  expect(mobileCorners.mapWrapOverflow).toBe("hidden");
  expect(Math.abs(mobileCorners.mapWrapBottomLeftRadius - mobileCorners.appShellBottomLeftRadius)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobileCorners.mapWrapBottomRightRadius - mobileCorners.appShellBottomLeftRadius)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobileCorners.viewportBottomRightRadius - mobileCorners.appShellBottomLeftRadius)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobileCorners.sheetTopRadius - mobileCorners.sheetBottomRadius)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobileCorners.appShellBottomLeftRadius - expectedMobileAppRadius)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobileCorners.appShellTopLeftRadius - expectedMobileAppRadius)).toBeLessThanOrEqual(1);
});

test("Optimized boundary GeoJSON uses browser cache", async ({ page }) => {
  // 동 경계는 단일 최적화 GeoJSON만 요청하고 no-store로 매번 새로 받지 않는다.
  await page.addInitScript(() => {
    window.__boundaryFetchCacheModes = [];
    window.__boundaryFetchUrls = [];
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === "string"
        ? input
        : (input && input.url ? input.url : "");
      if (String(url).includes("dong-boundaries.optimized.geojson") || String(url).includes(".wfs.xml")) {
        const cacheMode = init && Object.prototype.hasOwnProperty.call(init, "cache")
          ? init.cache
          : "default";
        window.__boundaryFetchCacheModes.push(cacheMode);
        window.__boundaryFetchUrls.push(String(url));
      }
      return originalFetch(input, init);
    };
  });
  await page.route("**/firestore.googleapis.com/**", (route) => route.abort());
  await page.route("**/data/hotspots.public.json", (route) => {
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
  await page.waitForFunction(() => {
    return (
      window.__spotListTestHooks &&
      document.querySelector("#issue-stats-summary") &&
      document.querySelector("#issue-stats-summary").textContent.trim().length > 0
    );
  });

  const cacheModes = await page.evaluate(() => window.__boundaryFetchCacheModes || []);
  const boundaryUrls = await page.evaluate(() => window.__boundaryFetchUrls || []);
  expect(cacheModes.length).toBeGreaterThan(0);
  expect(cacheModes).not.toContain("no-store");
  expect(boundaryUrls.some((url) => url.includes("dong-boundaries.optimized.geojson"))).toBe(true);
  expect(boundaryUrls.some((url) => url.includes(".wfs.xml"))).toBe(false);
});

test("Static boundary mask reveals map before boundary GeoJSON completes", async ({ page }) => {
  // 정적 fallback 마스크가 먼저 깔려 최적화 GeoJSON 응답 전에도 지도가 표시됨
  await page.route("**/data/dong-boundaries.optimized.geojson", async (route) => {
    await new Promise((resolve) => {
      setTimeout(resolve, 1200);
    });
    await route.continue();
  });

  await page.goto("/map/");
  await expect(page.locator(".map-wrap")).not.toHaveClass(/map-wrap-initializing/, {
    timeout: 600
  });
});

test("Boundary mask redraws during map animation", async ({ page }) => {
  // 줌아웃 중 새로 드러난 화면에도 외곽 마스크가 즉시 다시 그려짐
  await page.goto("/map/");
  await page.waitForFunction(() => {
    const hooks = window.__spotListTestHooks;
    return (
      hooks &&
      typeof hooks.getBoundaryMaskState === "function" &&
      hooks.getBoundaryMaskState()
    );
  });

  const maskState = await page.evaluate(() => window.__spotListTestHooks.getBoundaryMaskState());

  expect(maskState.renderBuffer).toBeGreaterThanOrEqual(4096);
  expect(maskState.updateWhileAnimating).toBe(true);
  expect(maskState.updateWhileInteracting).toBe(true);
});

test("Static boundary mask stays after boundary GeoJSON completes", async ({ page }) => {
  // 최적화 GeoJSON 경계가 도착해도 외곽 마스크는 정적 전체 지역구 마스크를 유지함
  await page.route("**/firestore.googleapis.com/**", (route) => route.abort());
  await page.route("**/data/hotspots.public.json", (route) => {
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
  await page.waitForFunction(() => {
    const hooks = window.__spotListTestHooks;
    return (
      hooks &&
      typeof hooks.getBoundaryMaskState === "function" &&
      hooks.getBoundaryMaskState() &&
      hooks.getBoundaryMaskState().source === "static"
    );
  });
  const initialMaskState = await page.evaluate(() => window.__spotListTestHooks.getBoundaryMaskState());

  await page.waitForFunction(() => {
    const hooks = window.__spotListTestHooks;
    return hooks && typeof hooks.getBoundaryExtentCenter === "function" && hooks.getBoundaryExtentCenter();
  });
  const loadedMaskState = await page.evaluate(() => window.__spotListTestHooks.getBoundaryMaskState());

  expect(initialMaskState).toMatchObject({
    count: 1,
    source: "static",
    staticApplied: true
  });
  expect(loadedMaskState).toEqual(initialMaskState);
});

test("Initial mobile map is pannable before zoom controls", async ({ page }) => {
  // +/- 컨트롤을 누르기 전에도 지도 표면이 드래그 가능한 상태로 노출되고 뷰가 이동 가능해야 한다.
  await page.setViewportSize({ width: 390, height: 900 });
  await page.route("**/firestore.googleapis.com/**", (route) => route.abort());
  await page.route("**/data/hotspots.public.json", (route) => {
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
  await page.waitForFunction(() => {
    const hooks = window.__spotListTestHooks;
    const mapWrap = document.querySelector(".map-wrap");
    const mapViewport = document.querySelector(".map .ol-viewport");
    const viewState = hooks && typeof hooks.getMapViewState === "function"
      ? hooks.getMapViewState()
      : null;
    return (
      hooks &&
      typeof hooks.panMapByPixelsForTest === "function" &&
      mapWrap &&
      mapViewport &&
      !mapWrap.classList.contains("map-wrap-initializing") &&
      typeof hooks.getBoundaryExtentCenter === "function" &&
      hooks.getBoundaryExtentCenter() &&
      viewState &&
      !viewState.animating
    );
  });

  const dragPoint = await page.evaluate(() => {
    const mapViewport = document.querySelector(".map .ol-viewport");
    if (!mapViewport) {
      return null;
    }
    const rect = mapViewport.getBoundingClientRect();
    const candidates = [
      [0.68, 0.22],
      [0.58, 0.26],
      [0.72, 0.32],
      [0.46, 0.22]
    ];
    const isSafeMapPoint = (x, y) => {
      const target = document.elementFromPoint(x, y);
      return Boolean(
        target &&
        target.closest(".map") &&
        !target.closest(".ol-control") &&
        !target.closest(".side-panel") &&
        !target.closest(".issue-helper") &&
        !target.closest(".map-popup")
      );
    };
    for (const [xRatio, yRatio] of candidates) {
      const startX = rect.left + rect.width * xRatio;
      const startY = rect.top + rect.height * yRatio;
      const endX = Math.max(rect.left + rect.width * 0.32, startX - rect.width * 0.36);
      const endY = startY;
      if (isSafeMapPoint(startX, startY) && isSafeMapPoint(endX, endY)) {
        return {
          startX,
          startY,
          endX,
          endY
        };
      }
    }
    return null;
  });
  expect(dragPoint).not.toBeNull();

  const panState = await page.evaluate((point) => {
    const target = document.elementFromPoint(point.startX, point.startY);
    const targetIsMapSurface = Boolean(
      target &&
      target.closest(".map") &&
      !target.closest(".ol-control") &&
      !target.closest(".side-panel") &&
      !target.closest(".issue-helper") &&
      !target.closest(".map-popup")
    );
    const panResult = window.__spotListTestHooks.panMapByPixelsForTest(
      point.endX - point.startX,
      point.endY - point.startY
    );
    return {
      targetIsMapSurface,
      panResult
    };
  }, dragPoint);
  expect(panState.targetIsMapSurface).toBe(true);
  expect(panState.panResult).not.toBeNull();
  expect(Math.max(panState.panResult.deltaLng, panState.panResult.deltaLat)).toBeGreaterThan(0.0001);
});

test("Helper shadow is layered", async ({ page }) => {
  // 캐릭터 PNG의 알파 채널이 사각 그림자를 만들지 않도록 이미지 필터를 쓰지 않는다.
  await page.goto("/map/");

  const shadowStyles = await page.locator(".issue-helper-toggle").evaluate((toggle) => {
    const image = toggle.querySelector(".issue-helper-character");
    const imageStyle = image ? window.getComputedStyle(image) : null;
    const bodyShadowStyle = window.getComputedStyle(toggle, "::before");
    const baseShadowStyle = window.getComputedStyle(toggle, "::after");

    return {
      imageFilter: imageStyle ? imageStyle.filter : "",
      bodyShadowContent: bodyShadowStyle.content,
      bodyShadowPosition: bodyShadowStyle.position,
      bodyShadowMask: bodyShadowStyle.webkitMaskImage || bodyShadowStyle.maskImage,
      baseShadowBackground: baseShadowStyle.backgroundImage
    };
  });

  expect(shadowStyles.imageFilter).toBe("none");
  expect(shadowStyles.bodyShadowContent).not.toBe("none");
  expect(shadowStyles.bodyShadowPosition).toBe("absolute");
  expect(shadowStyles.bodyShadowMask).toContain("03_thumbs_up.png");
  expect(shadowStyles.baseShadowBackground).toContain("radial-gradient");
});

test("Mobile helper introduces itself then stays docked", async ({ page }) => {
  // 모바일에서는 안내 메시지를 먼저 보여준 뒤, 접힌 캐릭터가 지도 하단에 머문다.
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/map/");
  await expect(page.locator(".issue-helper")).not.toHaveClass(/issue-helper-collapsed/);

  await page.waitForFunction(() => {
    const helper = document.querySelector(".issue-helper");
    const mapWrap = document.querySelector(".map-wrap");
    const sidePanel = document.querySelector(".side-panel");
    if (!helper || !mapWrap || !sidePanel) {
      return false;
    }
    const helperRect = helper.getBoundingClientRect();
    const sheetRect = sidePanel.getBoundingClientRect();
    return Math.abs(helperRect.bottom - (sheetRect.top - 10)) <= 24;
  });

  const expandedHelperHitState = await page.locator(".issue-helper").evaluate((helper) => {
    const bubble = helper.querySelector(".issue-helper-bubble");
    const bubbleRect = bubble.getBoundingClientRect();
    const hitElement = document.elementFromPoint(
      Math.round(bubbleRect.left + 20),
      Math.round(bubbleRect.top + 12)
    );
    return {
      bubblePointerEvents: window.getComputedStyle(bubble).pointerEvents,
      mapHitBlockedByBubble: Boolean(hitElement && hitElement.closest(".issue-helper"))
    };
  });

  expect(expandedHelperHitState.bubblePointerEvents).toBe("none");
  expect(expandedHelperHitState.mapHitBlockedByBubble).toBe(false);

  await page.locator("#issue-stats-summary").evaluate((element) => {
    element.scrollTop = 180;
  });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));

  const mobileHelperMetrics = await page.locator(".issue-helper").evaluate((helper) => {
    const mapWrap = document.querySelector(".map-wrap");
    const sidePanel = document.querySelector(".side-panel");
    const helperRect = helper.getBoundingClientRect();
    const mapRect = mapWrap.getBoundingClientRect();
    const sheetRect = sidePanel.getBoundingClientRect();

    return {
      helperBottom: helperRect.bottom,
      helperTop: helperRect.top,
      mapBottom: mapRect.bottom,
      mapTop: mapRect.top,
      sheetTop: sheetRect.top
    };
  });

  expect(mobileHelperMetrics.helperTop).toBeGreaterThanOrEqual(mobileHelperMetrics.mapTop);
  expect(mobileHelperMetrics.helperBottom).toBeLessThanOrEqual(mobileHelperMetrics.sheetTop + 4);
  expect(mobileHelperMetrics.helperBottom).toBeGreaterThan(mobileHelperMetrics.sheetTop - 24);

  await page.waitForFunction(() => {
    const helper = document.querySelector(".issue-helper");
    return helper && helper.classList.contains("issue-helper-collapsed");
  });

  const collapsedHelperMetrics = await page.locator(".issue-helper").evaluate((helper) => {
    const mapWrap = document.querySelector(".map-wrap");
    const sidePanel = document.querySelector(".side-panel");
    const helperRect = helper.getBoundingClientRect();
    const mapRect = mapWrap.getBoundingClientRect();
    const sheetRect = sidePanel.getBoundingClientRect();
    const hitX = Math.round(mapRect.left + mapRect.width * 0.54);
    const hitY = Math.round(mapRect.top + mapRect.height * 0.28);
    const hitElement = document.elementFromPoint(hitX, hitY);

    return {
      ariaExpanded: document.querySelector("#issue-helper-toggle").getAttribute("aria-expanded"),
      helperBottom: helperRect.bottom,
      helperRight: window.innerWidth - helperRect.right,
      mapBottom: mapRect.bottom,
      sheetTop: sheetRect.top,
      helperPointerEvents: window.getComputedStyle(helper).pointerEvents,
      mapHitBlockedByHelper: Boolean(hitElement && hitElement.closest(".issue-helper"))
    };
  });

  expect(collapsedHelperMetrics.ariaExpanded).toBe("false");
  expect(collapsedHelperMetrics.helperRight).toBeGreaterThanOrEqual(8);
  expect(collapsedHelperMetrics.helperBottom).toBeLessThanOrEqual(collapsedHelperMetrics.sheetTop + 4);
  expect(collapsedHelperMetrics.helperBottom).toBeGreaterThan(collapsedHelperMetrics.sheetTop - 24);
  expect(collapsedHelperMetrics.helperPointerEvents).toBe("none");
  expect(collapsedHelperMetrics.mapHitBlockedByHelper).toBe(false);
});

test("Map spot memo state", async ({ page }) => {
  // 메모 유무에 따른 카드 렌더링과 패딩 확인
  // 공개 스냅샷을 비워 테스트 렌더링을 덮어쓰지 않도록 한다.
  await page.route("**/firestore.googleapis.com/**", (route) => route.abort());
  await page.route("**/data/hotspots.public.json", (route) => {
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
  await page.waitForFunction(() => {
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.renderHotspotList === "function" &&
      document.querySelector("#issue-stats-summary") &&
      document.querySelector("#issue-stats-summary").textContent.trim().length > 0
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
