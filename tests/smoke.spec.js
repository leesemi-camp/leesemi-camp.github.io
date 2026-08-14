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

async function getMarkerTransitionSequence(page) {
  return page.evaluate(() => {
    const state = window.__spotListTestHooks.getHotspotAggregateState();
    return state && state.lastContentTransition
      ? state.lastContentTransition.sequence
      : 0;
  });
}

async function expectMarkerCrossfade(page, previousSequence) {
  const reducedMotion = await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (reducedMotion) {
    return;
  }
  await page.waitForFunction((sequence) => {
    const state = window.__spotListTestHooks.getHotspotAggregateState();
    return state &&
      state.lastContentTransition &&
      state.lastContentTransition.sequence > sequence;
  }, previousSequence);
  const markerTransitionState = await page.evaluate(() => window.__spotListTestHooks.getHotspotAggregateState());
  expect(markerTransitionState.lastContentTransition.oldFeatureCount).toBeGreaterThan(0);
  expect(markerTransitionState.lastContentTransition.oldOpacitySum).toBeGreaterThan(0);
  expect(markerTransitionState.lastContentTransition.targetOpacitySum).toBeGreaterThan(0);
  if (!markerTransitionState.contentTransitionActive) {
    return;
  }
  await page.waitForFunction(() => {
    const state = window.__spotListTestHooks.getHotspotAggregateState();
    if (!state) {
      return false;
    }
    if (!state.contentTransitionActive) {
      return true;
    }
    const oldOpacity = state.displayMode === "hotspot"
      ? state.transitionHotspotOpacity
      : state.transitionAggregateOpacity;
    const newOpacity = state.displayMode === "hotspot"
      ? state.hotspotOpacity
      : state.aggregateOpacity;
    const oldFeatureCount = state.transitionFeatureCount + state.transitionAggregateFeatureCount;
    return oldFeatureCount > 0 && newOpacity > 0 && oldOpacity + newOpacity >= 0.95;
  });
}

test("Root map page loads", async ({ page }) => {
  // 루트 공개 현안도 렌더링과 유틸리티 메뉴를 확인한다.
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#map")).toBeVisible();
  await expect(page.getByRole("link", { name: "이세미 소개 및 링크" })).toBeVisible();
  await expect(page.getByRole("button", { name: "이세미 후원 안내" })).toBeVisible();
});

test("Map view renders", async ({ page }) => {
  // 지도 뷰 기본 렌더링 확인
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator("#spot-list")).toBeAttached();
});

test("Legacy map routes redirect", async ({ page }) => {
  // 과거 공유 링크가 새 공개/관리 주소로 이동하는지 확인한다.
  await page.goto("/map/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/map/edit/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/edit\/$/);
});

test("Map layer controls show selected layers in list", async ({ page }) => {
  // 현안/변화/안내는 지도 레이어로 표시하고, 켜진 레이어 전체를 좌측 목록 기준으로 삼는다.
  await page.route("**/firestore.googleapis.com/**", (route) => route.abort());
  await page.route("**/data/hotspots.public.json", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        generatedAt: "2026-01-01T00:00:00.000Z",
        source: "firestore",
        collection: "crowd_hotspots",
        count: 5,
        hotspots: [
          {
            id: "issue-1",
            title: "통학로 정비 요청",
            memo: "보행 안전 개선 필요",
            categoryId: "safety_security",
            dongName: "판교동",
            lat: 37.394,
            lng: 127.111
          },
          {
            id: "issue-2",
            title: "주차장 확충 요청",
            memo: "주말 주차난 개선 필요",
            categoryId: "traffic_parking",
            dongName: "백현동",
            lat: 37.388,
            lng: 127.113
          },
          {
            id: "achievement-1",
            title: "통학로 조명 개선 완료",
            memo: "야간 보행 안전 개선",
            contentTab: "changes",
            itemType: "improvement",
            progressStatus: "completed",
            categoryId: "safety_security",
            dongName: "판교동",
            lat: 37.395,
            lng: 127.112
          },
          {
            id: "achievement-2",
            title: "공원 시설 정비 완료",
            memo: "노후 시설 개선",
            contentTab: "changes",
            itemType: "improvement",
            progressStatus: "completed",
            categoryId: "environment_park",
            dongName: "운중동",
            lat: 37.39,
            lng: 127.08
          },
          {
            id: "notice-1",
            title: "공사 안내",
            memo: "보행로 우회 안내",
            contentTab: "notices",
            itemType: "notice",
            progressStatus: "checking",
            categoryId: "traffic_parking",
            dongName: "대장동",
            lat: 37.381,
            lng: 127.071
          }
        ]
      })
    });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#total-issue-count")).toHaveText("총 현안/변화 건수: 4건");
  await expect(page.locator("#spot-list")).toContainText("통학로 정비 요청");
  await expect(page.locator("#spot-list")).toContainText("주차장 확충 요청");
  await expect(page.locator("#spot-list")).toContainText("통학로 조명 개선 완료");
  await expect(page.locator("#spot-list")).toContainText("공원 시설 정비 완료");
  await expect.poll(async () => {
    return page.evaluate(() => window.__spotListTestHooks.getHotspotFeatureStatesForTest());
  }).toEqual([
    { id: "achievement-1", contentTab: "changes", emphasisMode: "normal", visualMode: "normal" },
    { id: "achievement-2", contentTab: "changes", emphasisMode: "normal", visualMode: "normal" },
    { id: "issue-1", contentTab: "issues", emphasisMode: "normal", visualMode: "normal" },
    { id: "issue-2", contentTab: "issues", emphasisMode: "normal", visualMode: "normal" }
  ]);
  await expect.poll(async () => {
    return page.evaluate(() => window.__spotListTestHooks.getVisibleContentTabs());
  }).toEqual(["issues", "changes"]);
  // 레이어 마커는 모두 같은 컬러 렌더 경로를 사용한다.
  const initialIconCacheKeys = await page.evaluate(() => window.__spotListTestHooks.getHotspotIconCacheKeysForTest());
  expect(initialIconCacheKeys.some((key) => key.endsWith("|muted"))).toBe(false);
  expect(initialIconCacheKeys.some((key) => key.endsWith("|color"))).toBe(false);
  await expect(page.locator(".topbar-title")).toHaveText("우리동네 현안과 변화도, 이세미입니다");
  await expect(page).toHaveTitle("우리동네 현안과 변화도, 이세미입니다");

  const beforeFirstTabTransition = await getMarkerTransitionSequence(page);
  await page.locator(".map-layer-tabs [data-content-tab='changes']").click();
  await expectMarkerCrossfade(page, beforeFirstTabTransition);
  await expect(page.locator("#total-issue-count")).toHaveText("총 현안 건수: 2건");
  await expect(page.locator("#common-pledge-title")).toHaveText("지역구 공통 현안");
  await expect(page.locator("#spot-list")).not.toContainText("통학로 조명 개선 완료");
  await expect(page.locator("#spot-list")).not.toContainText("공원 시설 정비 완료");
  await expect(page.locator("#spot-list")).toContainText("통학로 정비 요청");
  await expect.poll(async () => {
    return page.evaluate(() => window.__spotListTestHooks.getHotspotFeatureStatesForTest());
  }).toEqual([
    { id: "issue-1", contentTab: "issues", emphasisMode: "normal", visualMode: "normal" },
    { id: "issue-2", contentTab: "issues", emphasisMode: "normal", visualMode: "normal" }
  ]);
  await expect.poll(async () => {
    return page.evaluate(() => window.__spotListTestHooks.getVisibleContentTabs());
  }).toEqual(["issues"]);
  await expect(page.locator(".topbar-title")).toHaveText("우리동네 현안도, 이세미입니다");
  await expect(page).toHaveTitle("우리동네 현안도, 이세미입니다");
  await page.waitForFunction(() => {
    const state = window.__spotListTestHooks.getHotspotAggregateState();
    return state && !state.contentTransitionActive;
  });

  const beforeSecondTabTransition = await getMarkerTransitionSequence(page);
  await page.locator(".map-layer-tabs [data-content-tab='changes']").click();
  await expectMarkerCrossfade(page, beforeSecondTabTransition);
  await expect(page.locator("#total-issue-count")).toHaveText("총 현안/변화 건수: 4건");
  await expect(page.locator("#common-pledge-title")).toHaveText("지역구 공통 현안/변화");
  await expect(page.locator("#spot-list")).toContainText("통학로 조명 개선 완료");
  await expect(page.locator("#spot-list")).toContainText("공원 시설 정비 완료");
  await expect(page.locator("#spot-list")).toContainText("통학로 정비 요청");
  await expect.poll(async () => {
    return page.evaluate(() => window.__spotListTestHooks.getVisibleContentTabs());
  }).toEqual(["issues", "changes"]);
  await expect(page.locator(".topbar-title")).toHaveText("우리동네 현안과 변화도, 이세미입니다");
  await expect(page).toHaveTitle("우리동네 현안과 변화도, 이세미입니다");
  await page.waitForFunction(() => {
    const state = window.__spotListTestHooks.getHotspotAggregateState();
    return state && !state.contentTransitionActive;
  });

  await page.locator(".map-layer-tabs [data-content-tab='notices']").click();
  await expect(page.locator("#total-issue-count")).toHaveText("총 현안/변화/안내 건수: 5건");
  await expect(page.locator("#common-pledge-panel")).toBeVisible();
  await expect(page.locator("#spot-list")).toContainText("공사 안내");
  await expect(page.locator(".topbar-title")).toHaveText("우리동네 소식도, 이세미입니다");
  await expect(page).toHaveTitle("우리동네 소식도, 이세미입니다");
  await expect.poll(async () => {
    return page.evaluate(() => window.__spotListTestHooks.getHotspotFeatureStatesForTest());
  }).toEqual([
    { id: "achievement-1", contentTab: "changes", emphasisMode: "normal", visualMode: "normal" },
    { id: "achievement-2", contentTab: "changes", emphasisMode: "normal", visualMode: "normal" },
    { id: "issue-1", contentTab: "issues", emphasisMode: "normal", visualMode: "normal" },
    { id: "issue-2", contentTab: "issues", emphasisMode: "normal", visualMode: "normal" },
    { id: "notice-1", contentTab: "notices", emphasisMode: "normal", visualMode: "normal" }
  ]);
  await page.waitForFunction(() => {
    const state = window.__spotListTestHooks.getHotspotAggregateState();
    return state && !state.contentTransitionActive;
  });

  await page.getByRole("button", { name: "🚨 안전·치안 2건 보기" }).click();
  await expect(page.locator("#spot-list")).toContainText("통학로 조명 개선 완료");
  await expect(page.locator("#spot-list")).toContainText("통학로 정비 요청");
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
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".topbar-title")).toBeVisible();

  const metrics = await page.evaluate(() => {
    const topbar = document.querySelector(".topbar");
    const title = document.querySelector(".topbar-title");
    const utilityActions = Array.from(document.querySelectorAll(".topbar-actions .utility-action"));
    const topbarRect = topbar.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const titleStyle = window.getComputedStyle(title);
    const actionRects = utilityActions.map((action) => action.getBoundingClientRect());
    const labelsVisible = utilityActions.every((action) => {
      const label = action.querySelector(".utility-label");
      if (!label) return false;
      const rect = label.getBoundingClientRect();
      return window.getComputedStyle(label).display !== "none" && rect.width > 0;
    });
    const iconsHidden = utilityActions.every((action) => {
      const icon = action.querySelector("svg:not(.utility-external-icon)");
      return !icon || window.getComputedStyle(icon).display === "none";
    });
    return {
      topbarHeight: topbarRect.height,
      titleHeight: titleRect.height,
      utilityActionMaxWidth: Math.max(...actionRects.map((rect) => rect.width)),
      utilityActionMaxHeight: Math.max(...actionRects.map((rect) => rect.height)),
      labelsVisible,
      iconsHidden,
      titleLineHeight: Number.parseFloat(titleStyle.lineHeight),
      titleWhiteSpace: titleStyle.whiteSpace
    };
  });

  expect(metrics.topbarHeight).toBeLessThanOrEqual(58);
  expect(metrics.titleWhiteSpace).toBe("nowrap");
  expect(metrics.titleHeight).toBeLessThanOrEqual(metrics.titleLineHeight + 2);
  expect(metrics.utilityActionMaxWidth).toBeLessThanOrEqual(58);
  expect(metrics.utilityActionMaxHeight).toBeLessThanOrEqual(34);
  expect(metrics.labelsVisible).toBe(true);
  expect(metrics.iconsHidden).toBe(true);
  await expect(page.locator(".topbar-actions .icon-btn")).toHaveCount(0);
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
  await page.goto("/", { waitUntil: "domcontentloaded" });
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
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    return (
      window.__spotListTestHooks &&
      document.querySelector("#issue-stats-summary")
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

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".map-wrap")).not.toHaveClass(/map-wrap-initializing/, {
    timeout: 600
  });
});

test("Boundary mask redraws during map animation", async ({ page }) => {
  // 줌아웃 중 새로 드러난 화면에도 외곽 마스크가 즉시 다시 그려짐
  await page.goto("/", { waitUntil: "domcontentloaded" });
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

  await page.goto("/", { waitUntil: "domcontentloaded" });
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

test("Initial mobile map pans and zooms before controls are primed", async ({ page, browserName }) => {
  // 초기 상태에서도 지도 표면의 wheel 줌, 줌 컨트롤, 드래그 이동이 모두 실제 사용자 경로로 동작해야 한다.
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
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const hooks = window.__spotListTestHooks;
    const mapWrap = document.querySelector(".map-wrap");
    const mapViewport = document.querySelector(".map .ol-viewport");
    const viewState = hooks && typeof hooks.getMapViewState === "function"
      ? hooks.getMapViewState()
      : null;
    return (
      hooks &&
      mapWrap &&
      mapViewport &&
      !mapWrap.classList.contains("map-wrap-initializing") &&
      typeof hooks.getBoundaryExtentCenter === "function" &&
      hooks.getBoundaryExtentCenter() &&
      viewState &&
      !viewState.animating
    );
  });

  const interactionPoint = await page.evaluate(() => {
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
        target.closest(".ol-viewport") === mapViewport &&
        !target.closest(".ol-overlaycontainer-stopevent") &&
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
  expect(interactionPoint).not.toBeNull();

  await expect(page.locator(".map .ol-zoom")).toBeHidden();

  const initialViewState = await page.evaluate(() => window.__spotListTestHooks.getMapViewState());
  if (browserName === "webkit") {
    // 모바일에서는 +/- 버튼을 숨기므로 WebKit은 지도 상태 훅으로 줌 가능 상태만 확인한다.
    const zoomed = await page.evaluate((zoom) => window.__spotListTestHooks.setMapZoomForTest(zoom), initialViewState.zoom + 1);
    expect(zoomed).toBeGreaterThan(initialViewState.zoom + 0.5);
    const restored = await page.evaluate((zoom) => window.__spotListTestHooks.setMapZoomForTest(zoom), initialViewState.zoom);
    expect(restored).toBeLessThan(zoomed - 0.5);
  } else {
    const wheelTargetedMapSurface = await page.evaluate((point) => {
      const target = document.elementFromPoint(point.startX, point.startY);
      if (!target || target.closest(".ol-viewport") !== document.querySelector(".map .ol-viewport")) {
        return false;
      }
      for (let i = 0; i < 3; i += 1) {
        target.dispatchEvent(new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          clientX: point.startX,
          clientY: point.startY,
          deltaMode: 0,
          deltaX: 0,
          deltaY: -600
        }));
      }
      return true;
    }, interactionPoint);
    expect(wheelTargetedMapSurface).toBe(true);
    await expect.poll(() => {
      return page.evaluate(() => window.__spotListTestHooks.getMapViewState().zoom);
    }).toBeGreaterThan(initialViewState.zoom + 0.1);

    await page.waitForFunction(() => !window.__spotListTestHooks.getMapViewState().animating);
    const wheelZoomState = await page.evaluate(() => window.__spotListTestHooks.getMapViewState());
    const wheelZoomedOut = await page.evaluate((point) => {
      const target = document.elementFromPoint(point.startX, point.startY);
      if (!target || target.closest(".ol-viewport") !== document.querySelector(".map .ol-viewport")) {
        return false;
      }
      for (let i = 0; i < 3; i += 1) {
        target.dispatchEvent(new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          clientX: point.startX,
          clientY: point.startY,
          deltaMode: 0,
          deltaX: 0,
          deltaY: 600
        }));
      }
      return true;
    }, interactionPoint);
    expect(wheelZoomedOut).toBe(true);
    await expect.poll(() => {
      return page.evaluate(() => window.__spotListTestHooks.getMapViewState().zoom);
    }).toBeLessThan(wheelZoomState.zoom - 0.02);
    await page.waitForFunction(() => !window.__spotListTestHooks.getMapViewState().animating);
  }

  if (browserName === "webkit") {
    // Linux WebKit CI에서는 실제 마우스 드래그가 간헐적으로 OL viewport까지 전달되지 않아
    // 사용자 입력 경로는 Chromium에서 검증하고, WebKit은 초기 view가 pan 가능한 상태인지 보조 확인한다.
    const panResult = await page.evaluate((point) => {
      const deltaX = point.endX - point.startX;
      const deltaY = point.endY - point.startY;
      return window.__spotListTestHooks.panMapByPixelsForTest(deltaX, deltaY);
    }, interactionPoint);
    expect(panResult).not.toBeNull();
    expect(Math.max(Math.abs(panResult.deltaLng), Math.abs(panResult.deltaLat))).toBeGreaterThan(0.0001);
    return;
  }

  const beforePanCenter = await page.evaluate(() => window.__spotListTestHooks.getMapViewState().center);
  await page.mouse.move(interactionPoint.startX, interactionPoint.startY);
  await page.mouse.down();
  await page.mouse.move(interactionPoint.endX, interactionPoint.endY, { steps: 12 });
  await page.mouse.up();

  await expect.poll(() => {
    return page.evaluate((before) => {
      const center = window.__spotListTestHooks.getMapViewState().center;
      return Math.max(
        Math.abs(Number(center[0]) - Number(before[0])),
        Math.abs(Number(center[1]) - Number(before[1]))
      );
    }, beforePanCenter);
  }).toBeGreaterThan(0.0001);
});

test("Helper shadow is layered", async ({ page }) => {
  // 캐릭터 PNG의 알파 채널이 사각 그림자를 만들지 않도록 이미지 필터를 쓰지 않는다.
  await page.goto("/", { waitUntil: "domcontentloaded" });

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
  await page.goto("/", { waitUntil: "domcontentloaded" });
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
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const stats = document.querySelector("#issue-stats-summary");
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.renderHotspotList === "function" &&
      stats &&
      stats.textContent.trim().length > 0
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
  await page.goto("/edit/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#login-panel")).toBeVisible();
  await expect(page.locator("#login-btn")).toBeVisible();
});

test("System launcher loads", async ({ page }) => {
  // 시스템 런처 초기 화면 확인
  await page.goto("/system/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#launcher-loading")).toBeVisible();
});
