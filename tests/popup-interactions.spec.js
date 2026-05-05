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

async function blockFirestore(page, hotspots = []) {
  await page.route("**/firestore.googleapis.com/**", (route) => route.abort());
  await page.route("**/data/hotspots.public.json", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        generatedAt: "2026-01-01T00:00:00.000Z",
        source: "firestore",
        collection: "crowd_hotspots",
        count: hotspots.length,
        hotspots
      })
    });
  });
}

async function waitForSpotListHooks(page) {
  await page.waitForFunction(() => {
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.renderHotspotList === "function" &&
      typeof window.__spotListTestHooks.renderVisibleIssueListWithData === "function" &&
      document.querySelector("#issue-stats-summary") &&
      document.querySelector("#issue-stats-summary").textContent.trim().length > 0
    );
  });
}

async function gotoMap(page) {
  await page.goto("/map/", { waitUntil: "domcontentloaded" });
}

// 현안 목록을 렌더링하고 테스트 훅이 준비될 때까지 대기한다.
async function setupSpots(page, spots) {
  await blockFirestore(page);
  await gotoMap(page);
  await waitForSpotListHooks(page);
  await page.evaluate((items) => {
    window.__spotListTestHooks.renderHotspotList(items);
  }, spots);
}

async function waitForMapPopupToSettle(page) {
  await page.waitForFunction(() => {
    const popup = document.getElementById("map-popup");
    if (!popup || popup.classList.contains("hidden") || popup.classList.contains("map-popup-closing")) {
      return false;
    }
    const firstRect = popup.getBoundingClientRect();
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const secondRect = popup.getBoundingClientRect();
          const stable =
            Math.abs(firstRect.left - secondRect.left) < 0.5 &&
            Math.abs(firstRect.top - secondRect.top) < 0.5 &&
            Math.abs(firstRect.width - secondRect.width) < 0.5 &&
            Math.abs(firstRect.height - secondRect.height) < 0.5;
          resolve(stable);
        });
      });
    });
  });
}

test("Map popup element exists and is initially hidden", async ({ page }) => {
  // 지도 팝업 요소가 초기에 숨겨진 상태임
  await gotoMap(page);
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

test("Clicking issue stats dong filter does not error", async ({ page }) => {
  // 동 통계 버튼 클릭 시 해당 동 필터가 적용되고 앱이 정상 상태를 유지함
  await blockFirestore(page);
  await gotoMap(page);
  await waitForSpotListHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      { id: "fg1", title: "포커스 그룹", categoryId: "traffic_parking", dongName: "판교동", lat: 37.394, lng: 127.111 }
    ]);
  });
  const dongFilterBtn = page.locator("#issue-stats-summary [data-filter-type='dong'][data-filter-label='판교동']");
  await expect(dongFilterBtn).toBeAttached();
  await dongFilterBtn.click();
  await expect(page.locator("#issue-stats-summary #clear-issue-filter-btn")).not.toHaveClass(/issue-stats-clear-btn-inactive/);
  await expect(page.locator("#map-popup")).not.toHaveClass(/hidden/);
  await expect(page.locator("#map-popup")).toContainText("판교동");
  await expect(page.locator("#map-popup")).toContainText("현안 건수: 1건");
  // 앱이 정상 상태를 유지해야 함
  await expect(page.locator("#app-shell")).toBeVisible();
});

test("Mobile popup collapses helper bubble", async ({ page }) => {
  // 모바일에서 지도 팝업이 열리면 안내 말풍선은 접고 캐릭터만 남긴다.
  await page.setViewportSize({ width: 390, height: 900 });
  await blockFirestore(page);
  await gotoMap(page);
  await waitForSpotListHooks(page);
  await expect(page.locator(".issue-helper")).not.toHaveClass(/issue-helper-collapsed/);

  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      { id: "helper-popup", title: "팝업 정리", categoryId: "traffic_parking", dongName: "판교동", lat: 37.394, lng: 127.111 }
    ]);
  });
  await page.locator("#issue-stats-summary [data-filter-type='dong'][data-filter-label='판교동']").click();

  await expect(page.locator("#map-popup")).not.toHaveClass(/hidden/);
  await expect(page.locator(".issue-helper")).toHaveClass(/issue-helper-collapsed/);
  await expect(page.locator("#issue-helper-toggle")).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#issue-helper-bubble")).toHaveAttribute("aria-hidden", "true");
});

test("Mobile low zoom shows dong aggregate markers", async ({ page }) => {
  // 축소된 모바일 지도에서는 현안 지점을 동별 건수 마커로 집계한다.
  await page.setViewportSize({ width: 390, height: 900 });
  await blockFirestore(page, [
    { id: "aggregate-p1", title: "판교 현안 A", categoryId: "traffic_parking", dongName: "판교동", lat: 37.394, lng: 127.111 },
    { id: "aggregate-p2", title: "판교 현안 B", categoryId: "traffic_parking", dongName: "판교동", lat: 37.3942, lng: 127.1112 },
    { id: "aggregate-b1", title: "백현 현안 A", categoryId: "housing_infra", dongName: "백현동", lat: 37.388, lng: 127.113 },
    { id: "aggregate-b2", title: "백현 현안 B", categoryId: "environment_park", dongName: "백현동", lat: 37.3882, lng: 127.1132 }
  ]);
  await gotoMap(page);
  await waitForSpotListHooks(page);
  await page.waitForFunction(() => {
    const hooks = window.__spotListTestHooks;
    const aggregateState = hooks && hooks.getHotspotAggregateState ? hooks.getHotspotAggregateState() : null;
    return aggregateState &&
      aggregateState.visible &&
      aggregateState.featureCount === 4 &&
      aggregateState.aggregateCount === 2;
  });

  const aggregateState = await page.evaluate(() => window.__spotListTestHooks.getHotspotAggregateState());
  expect(aggregateState.aggregates.map((entry) => entry.dongName)).toEqual(["백현동", "판교동"]);
  expect(aggregateState.aggregates.map((entry) => entry.count)).toEqual([2, 2]);

  // 동네 안으로 확대하면 동별 집계를 풀고 기존 개별 마커로 돌아간다.
  const transitionState = await page.evaluate(() => {
    window.__spotListTestHooks.setMapZoomForTest(13.2);
    return {
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      markerState: window.__spotListTestHooks.getHotspotAggregateState()
    };
  });
  if (!transitionState.reducedMotion) {
    expect(transitionState.markerState.transitionActive).toBe(true);
    expect(transitionState.markerState.visible).toBe(true);
    expect(transitionState.markerState.hotspotVisible).toBe(true);
  }
  await page.waitForFunction(() => {
    const aggregateState = window.__spotListTestHooks.getHotspotAggregateState();
    return aggregateState && !aggregateState.visible && aggregateState.hotspotVisible;
  });
  const zoomedState = await page.evaluate(() => window.__spotListTestHooks.getHotspotAggregateState());
  expect(zoomedState.visible).toBe(false);
  expect(zoomedState.hotspotVisible).toBe(true);
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
  await gotoMap(page);
  const popup = page.locator("#map-popup");
  const ariaHidden = await popup.getAttribute("aria-hidden");
  expect(ariaHidden).toBe("true");
});

test("Clear issue filter button is hidden initially", async ({ page }) => {
  // 현안이 없는 초기 통계 상태에서는 필터 초기화 버튼이 렌더링되지 않음
  await blockFirestore(page);
  await gotoMap(page);
  await waitForSpotListHooks(page);
  await expect(page.locator("#clear-issue-filter-btn")).toHaveCount(0);
});

test("Escape clears active dong filter", async ({ page }) => {
  // Esc 키를 누르면 활성 동 필터가 해제되고 전체 목록으로 돌아감
  await blockFirestore(page);
  await gotoMap(page);
  await waitForSpotListHooks(page);
  await page.waitForFunction(() => {
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.renderVisibleIssueListWithData === "function" &&
      typeof window.__spotListTestHooks.setActiveDongFilter === "function"
    );
  });
  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      { id: "esc-p", title: "판교 현안", categoryId: "traffic_parking", dongName: "판교동" },
      { id: "esc-u", title: "운중 현안", categoryId: "environment_park", dongName: "운중동" }
    ]);
    window.__spotListTestHooks.setActiveDongFilter("판교동");
  });

  const clearBtn = page.locator("#issue-stats-summary #clear-issue-filter-btn");
  const spotList = page.locator("#spot-list");
  const issueListPanel = page.locator("#issue-list-panel");
  const statsEl = page.locator("#issue-stats-summary");
  await expect(clearBtn).not.toHaveClass(/issue-stats-clear-btn-inactive/);
  await expect(statsEl).toContainText("동: 판교동");
  await expect(issueListPanel).not.toHaveClass(/issue-list-panel-hidden/);
  await expect(spotList).toContainText("판교 현안");
  await expect(spotList).not.toContainText("운중 현안");

  await page.keyboard.press("Escape");

  const listState = await spotList.evaluate((element) => {
    return {
      refreshing: element.classList.contains("spot-list-refreshing")
    };
  });
  const statsRefreshing = await statsEl.evaluate((element) => {
    return element.classList.contains("issue-stats-refreshing");
  });
  expect(listState.refreshing).toBe(false);
  expect(statsRefreshing).toBe(false);
  await expect(clearBtn).toHaveClass(/issue-stats-clear-btn-inactive/);
  await expect(clearBtn).toBeDisabled();
  await expect(statsEl).toContainText("전체 기준");
  await expect(issueListPanel).toHaveClass(/issue-list-panel-hidden/);
  await expect(spotList).not.toContainText("판교 현안");
  await expect(spotList).not.toContainText("운중 현안");
});

test("Escape closes dong popup and clears dong filter together", async ({ page }) => {
  // 동 선택으로 열린 팝업이 있으면 Esc 한 번으로 팝업과 동 필터를 함께 닫음
  await blockFirestore(page);
  await gotoMap(page);
  await waitForSpotListHooks(page);
  await page.waitForFunction(() => {
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.renderVisibleIssueListWithData === "function" &&
      typeof window.__spotListTestHooks.focusDongIssues === "function" &&
      typeof window.__spotListTestHooks.getMapViewState === "function" &&
      typeof window.__spotListTestHooks.getBoundaryExtentCenter === "function" &&
      window.__spotListTestHooks.getBoundaryExtentCenter()
    );
  });
  const distanceFromRegionCenter = () => {
    return page.evaluate(() => {
      const viewState = window.__spotListTestHooks.getMapViewState();
      const regionCenter = window.__spotListTestHooks.getBoundaryExtentCenter();
      if (!viewState || !viewState.center || !regionCenter) {
        return 0;
      }
      return (
        Math.abs(viewState.center[0] - regionCenter[0]) +
        Math.abs(viewState.center[1] - regionCenter[1])
      );
    });
  };
  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      { id: "popup-p", title: "판교 팝업 현안", categoryId: "traffic_parking", dongName: "판교동", lat: 37.394, lng: 127.111 },
      { id: "popup-u", title: "운중 팝업 현안", categoryId: "environment_park", dongName: "운중동", lat: 37.391, lng: 127.079 }
    ]);
    window.__spotListTestHooks.focusDongIssues("판교동");
  });

  const popup = page.locator("#map-popup");
  const clearBtn = page.locator("#issue-stats-summary #clear-issue-filter-btn");
  await expect(popup).not.toHaveClass(/hidden/);
  await expect(popup).toHaveAttribute("aria-hidden", "false");
  await expect(clearBtn).not.toHaveClass(/issue-stats-clear-btn-inactive/);
  await expect.poll(distanceFromRegionCenter, { timeout: 5000 }).toBeGreaterThan(0.003);

  await page.keyboard.press("Escape");

  const closingState = await popup.evaluate((element) => {
    return {
      hidden: element.classList.contains("hidden"),
      closing: element.classList.contains("map-popup-closing"),
      ariaHidden: element.getAttribute("aria-hidden")
    };
  });
  expect(closingState.ariaHidden).toBe("true");
  expect(closingState.hidden || closingState.closing).toBe(true);
  await expect(popup).toHaveClass(/hidden/);
  await expect(clearBtn).toHaveClass(/issue-stats-clear-btn-inactive/);
  await expect(clearBtn).toBeDisabled();
  await expect.poll(distanceFromRegionCenter, { timeout: 5000 }).toBeLessThan(0.003);
});

test("Map popup close button uses close animation", async ({ page }) => {
  // 팝업 닫기 버튼도 Escape와 같은 닫힘 애니메이션 경로를 사용함
  await blockFirestore(page);
  await gotoMap(page);
  await waitForSpotListHooks(page);
  await page.waitForFunction(() => {
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.renderVisibleIssueListWithData === "function" &&
      typeof window.__spotListTestHooks.focusDongIssues === "function"
    );
  });
  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      { id: "popup-close-p", title: "판교 닫기 현안", categoryId: "traffic_parking", dongName: "판교동", lat: 37.394, lng: 127.111 },
      { id: "popup-close-u", title: "운중 닫기 현안", categoryId: "environment_park", dongName: "운중동", lat: 37.391, lng: 127.079 }
    ]);
    window.__spotListTestHooks.focusDongIssues("판교동");
  });

  const popup = page.locator("#map-popup");
  const clearBtn = page.locator("#issue-stats-summary #clear-issue-filter-btn");
  await expect(popup).not.toHaveClass(/hidden/);
  await expect(popup).toHaveAttribute("aria-hidden", "false");
  const closeButton = popup.locator("[data-action='close-popup']");
  await expect(closeButton).toBeVisible();

  // WebKit은 지도 이동 중 팝업 위치가 흔들리면 locator.click()의 stable 대기 중 요소가 교체될 수 있다.
  await closeButton.dispatchEvent("click");

  const closingState = await popup.evaluate((element) => {
    return {
      hidden: element.classList.contains("hidden"),
      closing: element.classList.contains("map-popup-closing"),
      ariaHidden: element.getAttribute("aria-hidden")
    };
  });
  expect(closingState.ariaHidden).toBe("true");
  expect(closingState.hidden || closingState.closing).toBe(true);
  await expect(popup).toHaveClass(/hidden/);
  await expect(clearBtn).toHaveClass(/issue-stats-clear-btn-inactive/);
  await expect(clearBtn).toBeDisabled();
});

test("Closing hotspot popup clears selected hotspot highlight", async ({ page }) => {
  // 단일 현안 팝업을 닫으면 선택된 지도 아이콘과 목록 카드 강조가 함께 해제됨
  await blockFirestore(page, [
    {
      id: "selected-popup",
      title: "선택 해제 현안",
      categoryId: "traffic_parking",
      dongName: "판교동",
      lat: 37.394,
      lng: 127.111
    }
  ]);
  await gotoMap(page);
  await waitForSpotListHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.setActiveDongFilter("판교동");
  });
  await page.waitForFunction(() => {
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.getHighlightedHotspotIds === "function" &&
      typeof window.__spotListTestHooks.getSelectedHotspotId === "function" &&
      typeof window.__spotListTestHooks.dismissMapPopupForTest === "function" &&
      document.querySelector("#spot-list [data-spot-id='selected-popup']")
    );
  });

  const popup = page.locator("#map-popup");
  const clearBtn = page.locator("#issue-stats-summary #clear-issue-filter-btn");
  const spotItem = page.locator("#spot-list [data-spot-id='selected-popup']");
  await expect(spotItem).toBeVisible();
  await expect(clearBtn).not.toHaveClass(/issue-stats-clear-btn-inactive/);

  await spotItem.click();

  await expect(popup).not.toHaveClass(/hidden/);
  await expect(popup).toHaveAttribute("aria-hidden", "false");
  await expect(spotItem).toHaveClass(/spot-item-selected/);
  await expect.poll(() => {
    return page.evaluate(() => window.__spotListTestHooks.getHighlightedHotspotIds());
  }).toEqual(["selected-popup"]);
  await expect.poll(() => {
    return page.evaluate(() => window.__spotListTestHooks.getSelectedHotspotId());
  }).toBe("selected-popup");
  await waitForMapPopupToSettle(page);

  await expect.poll(() => {
    return page.evaluate(() => {
      const popupElement = document.getElementById("map-popup");
      if (!popupElement) {
        return false;
      }
      if (
        popupElement.classList.contains("hidden") ||
        popupElement.classList.contains("map-popup-closing")
      ) {
        return true;
      }
      return window.__spotListTestHooks.dismissMapPopupForTest({
        immediate: true
      });
    });
  }).toBe(true);

  await expect.poll(() => {
    return page.evaluate(() => window.__spotListTestHooks.getHighlightedHotspotIds());
  }).toEqual([]);
  await expect.poll(() => {
    return page.evaluate(() => window.__spotListTestHooks.getSelectedHotspotId());
  }).toBe("");
  await expect(spotItem).not.toHaveClass(/spot-item-selected/);
  await expect(clearBtn).not.toHaveClass(/issue-stats-clear-btn-inactive/);
  await expect(popup).toHaveClass(/hidden/);
});

test("Keyboard hotspot popup returns focus to issue card", async ({ page }) => {
  // 키보드로 현안 카드를 열면 팝업 닫기 후 포커스가 원래 카드로 돌아간다.
  await blockFirestore(page, [
    {
      id: "keyboard-popup",
      title: "키보드 현안",
      categoryId: "traffic_parking",
      dongName: "판교동",
      lat: 37.394,
      lng: 127.111
    }
  ]);
  await gotoMap(page);
  await waitForSpotListHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.setActiveDongFilter("판교동");
  });

  const popup = page.locator("#map-popup");
  const spotItem = page.locator("#spot-list [data-spot-id='keyboard-popup']");
  await expect(spotItem).toHaveAttribute("role", "button");
  await spotItem.focus();
  await spotItem.press("Enter");

  await expect(popup).not.toHaveClass(/hidden/);
  await expect(popup.locator("[data-action='close-popup']")).toBeFocused();

  await page.keyboard.press("Escape");

  await expect(popup).toHaveClass(/hidden/);
  await expect(spotItem).toBeFocused();
});

test("Dong stats filter highlight does not select single hotspot card", async ({ page }) => {
  // 동 통계 필터는 목록 카드를 강조하되 단일 팝업 선택 상태로 만들지 않음
  await blockFirestore(page, [
    {
      id: "single-dong",
      title: "단일 동 현안",
      categoryId: "traffic_parking",
      dongName: "판교동",
      lat: 37.394,
      lng: 127.111
    }
  ]);
  await gotoMap(page);
  await waitForSpotListHooks(page);
  await page.waitForFunction(() => {
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.getHighlightedHotspotIds === "function" &&
      typeof window.__spotListTestHooks.getSelectedHotspotId === "function" &&
      document.querySelector("#issue-stats-summary [data-filter-type='dong'][data-filter-label='판교동']")
    );
  });

  await page.locator("#issue-stats-summary [data-filter-type='dong'][data-filter-label='판교동']").click();

  const spotItem = page.locator("#spot-list [data-spot-id='single-dong']");
  await expect(spotItem).toBeVisible();
  await expect(spotItem).toHaveClass(/spot-item-highlighted/);
  await expect(spotItem).not.toHaveClass(/spot-item-selected/);
  await expect.poll(() => {
    return page.evaluate(() => window.__spotListTestHooks.getHighlightedHotspotIds());
  }).toEqual(["single-dong"]);
  await expect.poll(() => {
    return page.evaluate(() => window.__spotListTestHooks.getSelectedHotspotId());
  }).toBe("");
});

test("Dong stats filter fits full dong boundary", async ({ page }) => {
  // 동 통계 버튼을 누르면 현안 지점만이 아니라 해당 동 경계 전체가 보이도록 지도를 맞춤
  await blockFirestore(page, [
    {
      id: "dong-fit-a",
      title: "동 포커스 A",
      categoryId: "traffic_parking",
      dongName: "판교동",
      lat: 37.394,
      lng: 127.111
    },
    {
      id: "dong-fit-b",
      title: "동 포커스 B",
      categoryId: "environment_park",
      dongName: "판교동",
      lat: 37.396,
      lng: 127.113
    },
    {
      id: "dong-fit-other",
      title: "다른 동 현안",
      categoryId: "safety_security",
      dongName: "운중동",
      lat: 37.366,
      lng: 127.078
    }
  ]);
  await gotoMap(page);
  await page.waitForFunction(() => {
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.getHighlightedHotspotIds === "function" &&
      typeof window.__spotListTestHooks.getMapViewState === "function" &&
      typeof window.__spotListTestHooks.getMapVisibleExtentState === "function" &&
      typeof window.__spotListTestHooks.getDongBoundaryExtentState === "function" &&
      window.__spotListTestHooks.getDongBoundaryExtentState("판교동") &&
      document.querySelector("#issue-stats-summary [data-filter-type='dong'][data-filter-label='판교동']")
    );
  });
  const beforeState = await page.evaluate(() => window.__spotListTestHooks.getMapViewState());

  await page.locator("#issue-stats-summary [data-filter-type='dong'][data-filter-label='판교동']").click();

  await expect.poll(() => {
    return page.evaluate(() => window.__spotListTestHooks.getHighlightedHotspotIds());
  }).toEqual(["dong-fit-a", "dong-fit-b"]);
  await page.waitForFunction(() => {
    const viewState = window.__spotListTestHooks.getMapViewState();
    return viewState && !viewState.animating;
  });
  const afterState = await page.evaluate(() => window.__spotListTestHooks.getMapViewState());
  const visibleExtent = await page.evaluate(() => window.__spotListTestHooks.getMapVisibleExtentState());
  const dongExtent = await page.evaluate(() => window.__spotListTestHooks.getDongBoundaryExtentState("판교동"));
  expect(afterState.zoom).toBeGreaterThan(beforeState.zoom);
  expect(afterState.zoom).toBeLessThanOrEqual(15);
  expect(visibleExtent.west).toBeLessThanOrEqual(dongExtent.west + 0.001);
  expect(visibleExtent.east).toBeGreaterThanOrEqual(dongExtent.east - 0.001);
  expect(visibleExtent.south).toBeLessThanOrEqual(dongExtent.south + 0.001);
  expect(visibleExtent.north).toBeGreaterThanOrEqual(dongExtent.north - 0.001);
});

test("Category stats filter focuses matching map markers", async ({ page }) => {
  // 카테고리 통계 버튼을 누르면 해당 카테고리 마커들이 보이도록 지도를 이동함
  await blockFirestore(page, [
    {
      id: "category-focus-a",
      title: "카테고리 포커스 A",
      categoryId: "traffic_parking",
      dongName: "판교동",
      lat: 37.414,
      lng: 127.128
    },
    {
      id: "category-focus-b",
      title: "카테고리 포커스 B",
      categoryId: "traffic_parking",
      dongName: "운중동",
      lat: 37.366,
      lng: 127.078
    },
    {
      id: "category-focus-other",
      title: "다른 카테고리",
      categoryId: "environment_park",
      dongName: "백현동",
      lat: 37.39,
      lng: 127.112
    }
  ]);
  await gotoMap(page);
  await page.waitForFunction(() => {
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.getHighlightedHotspotIds === "function" &&
      typeof window.__spotListTestHooks.getMapViewState === "function" &&
      document.querySelector("#issue-stats-summary [data-filter-type='category'][data-filter-label='🚌 교통·주차']")
    );
  });
  const beforeCenter = await page.evaluate(() => {
    const viewState = window.__spotListTestHooks.getMapViewState();
    return viewState && viewState.center;
  });

  await page.locator("#issue-stats-summary [data-filter-type='category'][data-filter-label='🚌 교통·주차']").click();

  await expect.poll(() => {
    return page.evaluate(() => window.__spotListTestHooks.getHighlightedHotspotIds());
  }).toEqual(["category-focus-a", "category-focus-b"]);
  await page.waitForFunction(() => {
    const viewState = window.__spotListTestHooks.getMapViewState();
    return viewState && !viewState.animating;
  });
  const afterCenter = await page.evaluate(() => {
    const viewState = window.__spotListTestHooks.getMapViewState();
    return viewState && viewState.center;
  });
  expect(afterCenter[0]).toBeGreaterThan(127.07);
  expect(afterCenter[0]).toBeLessThan(127.13);
  expect(afterCenter[1]).toBeGreaterThan(37.36);
  expect(afterCenter[1]).toBeLessThan(37.42);
  expect(
    Math.abs(afterCenter[0] - beforeCenter[0]) +
    Math.abs(afterCenter[1] - beforeCenter[1])
  ).toBeGreaterThan(0.001);
});

test("Common issue tag filters list and focuses map markers", async ({ page }) => {
  // 지역구 공통 현안 태그를 누르면 목록과 지도가 해당 공통 현안으로 좁혀짐
  await blockFirestore(page, [
    {
      id: "common-focus-a",
      title: "[상습정체] 판교역 주변 정체",
      categoryId: "traffic_parking",
      dongName: "판교동",
      lat: 37.394,
      lng: 127.111
    },
    {
      id: "common-focus-b",
      title: "[상습정체] 운중로 병목",
      categoryId: "traffic_parking",
      dongName: "운중동",
      lat: 37.366,
      lng: 127.078
    },
    {
      id: "common-focus-other",
      title: "다른 현안",
      categoryId: "environment_park",
      dongName: "백현동",
      lat: 37.414,
      lng: 127.128
    }
  ]);
  await gotoMap(page);
  await page.waitForFunction(() => {
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.getHighlightedHotspotIds === "function" &&
      typeof window.__spotListTestHooks.getMapViewState === "function" &&
      document.querySelector("#common-pledge-list [data-action='focus-common-tag'][data-common-tag='상습정체']")
    );
  });
  const beforeCenter = await page.evaluate(() => {
    const viewState = window.__spotListTestHooks.getMapViewState();
    return viewState && viewState.center;
  });

  const commonTagButton = page.locator("#common-pledge-list [data-action='focus-common-tag'][data-common-tag='상습정체']");
  await commonTagButton.click();

  const spotList = page.locator("#spot-list");
  await expect(spotList).toContainText("판교역 주변 정체");
  await expect(spotList).toContainText("운중로 병목");
  await expect(spotList).not.toContainText("다른 현안");
  await expect(page.locator("#issue-stats-summary")).toContainText("공통 현안: [상습정체]");
  await expect(commonTagButton).toHaveClass(/pledge-common-tag-active/);
  await expect(page.locator("#issue-stats-summary #clear-issue-filter-btn")).not.toHaveClass(/issue-stats-clear-btn-inactive/);
  await expect.poll(() => {
    return page.evaluate(() => window.__spotListTestHooks.getHighlightedHotspotIds().sort());
  }).toEqual(["common-focus-a", "common-focus-b"]);
  await page.waitForFunction(() => {
    const viewState = window.__spotListTestHooks.getMapViewState();
    return viewState && !viewState.animating;
  });
  const afterCenter = await page.evaluate(() => {
    const viewState = window.__spotListTestHooks.getMapViewState();
    return viewState && viewState.center;
  });
  expect(afterCenter[0]).toBeGreaterThan(127.07);
  expect(afterCenter[0]).toBeLessThan(127.12);
  expect(afterCenter[1]).toBeGreaterThan(37.36);
  expect(afterCenter[1]).toBeLessThan(37.40);
  expect(
    Math.abs(afterCenter[0] - beforeCenter[0]) +
    Math.abs(afterCenter[1] - beforeCenter[1])
  ).toBeGreaterThan(0.001);
});

test("Clear issue filter controls return map to full region", async ({ page }) => {
  // 전체 보기 버튼과 Esc는 같은 필터 해제 경로로 지역 전체가 보이는 화면으로 돌아감
  await blockFirestore(page, [
    {
      id: "region-reset-focus",
      title: "지역 리셋 포커스",
      categoryId: "traffic_parking",
      dongName: "대장동",
      lat: 37.367,
      lng: 127.071
    },
    {
      id: "region-reset-focus-nearby",
      title: "지역 리셋 포커스 인근",
      categoryId: "traffic_parking",
      dongName: "대장동",
      lat: 37.368,
      lng: 127.073
    },
    {
      id: "region-reset-other",
      title: "다른 현안",
      categoryId: "environment_park",
      dongName: "백현동",
      lat: 37.414,
      lng: 127.128
    }
  ]);
  await gotoMap(page);
  await page.waitForFunction(() => {
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.getMapViewState === "function" &&
      typeof window.__spotListTestHooks.getBoundaryExtentCenter === "function" &&
      window.__spotListTestHooks.getBoundaryExtentCenter() &&
      document.querySelector("#issue-stats-summary [data-filter-type='category'][data-filter-label='🚌 교통·주차']")
    );
  });
  const distanceFromRegionCenter = () => {
    return page.evaluate(() => {
      const viewState = window.__spotListTestHooks.getMapViewState();
      const regionCenter = window.__spotListTestHooks.getBoundaryExtentCenter();
      if (!viewState || !viewState.center || !regionCenter) {
        return 0;
      }
      return (
        Math.abs(viewState.center[0] - regionCenter[0]) +
        Math.abs(viewState.center[1] - regionCenter[1])
      );
    });
  };

  await page.locator("#issue-stats-summary [data-filter-type='category'][data-filter-label='🚌 교통·주차']").click();
  await expect.poll(distanceFromRegionCenter, { timeout: 5000 }).toBeGreaterThan(0.01);

  await page.locator("#issue-stats-summary #clear-issue-filter-btn").click();
  await expect.poll(distanceFromRegionCenter, { timeout: 5000 }).toBeLessThan(0.003);

  await page.locator("#issue-stats-summary [data-filter-type='category'][data-filter-label='🚌 교통·주차']").click();
  await expect.poll(distanceFromRegionCenter, { timeout: 5000 }).toBeGreaterThan(0.01);

  await page.keyboard.press("Escape");
  await expect.poll(distanceFromRegionCenter, { timeout: 5000 }).toBeLessThan(0.003);
});

test("Clearing issue filter animates markers", async ({ page }) => {
  // 전체 보기 또는 Esc로 필터를 해제할 때 지도 마커 크기 변화가 보간됨
  await blockFirestore(page, [
    {
      id: "marker-animate-a",
      title: "마커 애니메이션 A",
      categoryId: "traffic_parking",
      dongName: "판교동",
      lat: 37.394,
      lng: 127.111
    },
    {
      id: "marker-animate-b",
      title: "마커 애니메이션 B",
      categoryId: "environment_park",
      dongName: "운중동",
      lat: 37.391,
      lng: 127.079
    }
  ]);
  await gotoMap(page);
  await page.waitForFunction(() => {
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.getHotspotStyleAnimationCount === "function" &&
      document.querySelector("#issue-stats-summary [data-filter-type='dong'][data-filter-label='판교동']")
    );
  });

  await page.locator("#issue-stats-summary [data-filter-type='dong'][data-filter-label='판교동']").click();
  await expect.poll(() => {
    return page.evaluate(() => window.__spotListTestHooks.getHotspotStyleAnimationCount());
  }).toBe(0);

  await page.keyboard.press("Escape");

  const animationCount = await page.evaluate(() => {
    return window.__spotListTestHooks.getHotspotStyleAnimationCount();
  });
  expect(animationCount).toBeGreaterThan(0);
  await expect.poll(() => {
    return page.evaluate(() => window.__spotListTestHooks.getHotspotStyleAnimationCount());
  }).toBe(0);
});

test("Issue view dong button is removed", async ({ page }) => {
  // 중복된 '동별 보기' 버튼이 렌더링되지 않음
  await gotoMap(page);
  await expect(page.locator("#issue-view-dong-btn")).toHaveCount(0);
});

test("Issue filter row is removed", async ({ page }) => {
  // 중복된 목록 위 필터 행이 렌더링되지 않음
  await gotoMap(page);
  await expect(page.locator("#issue-filter-row")).toHaveCount(0);
});

test("Map has map-wrap element", async ({ page }) => {
  // 지도 래퍼 요소가 로드됨
  await gotoMap(page);
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
