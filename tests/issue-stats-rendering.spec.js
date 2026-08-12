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

// Firestore를 차단하여 오프라인 상태를 시뮬레이션한다.
async function blockFirestore(page) {
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
}

// 테스트 훅이 준비될 때까지 대기한다.
async function waitForHooks(page) {
  await blockFirestore(page);
  const waitForReady = () => page.waitForFunction(() => {
    const stats = document.querySelector("#issue-stats-summary");
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.renderVisibleIssueListWithData === "function" &&
      stats
    );
  }, null, { timeout: 15000 });
  await page.goto("/map/", { waitUntil: "domcontentloaded" });
  try {
    await waitForReady();
  } catch (error) {
    await page.goto("/map/", { waitUntil: "domcontentloaded" });
    await waitForReady();
  }
}

// WebKit에서는 통계 DOM 반영 직후 클릭이 앞서갈 수 있어 표시 확인 후 클릭한다.
async function clickIssueStatsFilter(page, selector) {
  const filterButton = page.locator(selector);
  await expect(filterButton).toBeVisible();
  await filterButton.click();
}

test("Issue stats shows empty message when no hotspots", async ({ page }) => {
  // renderIssueStatsSummary([]) → 선택 레이어 범위의 빈 상태 메시지가 표시됨
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueStatsSummary([]);
  });
  const statsEl = page.locator("#issue-stats-summary");
  const html = await statsEl.innerHTML();
  expect(html).toContain("표시할 현안/변화 현황이 없습니다");
});

test("Issue stats shows category section with one hotspot", async ({ page }) => {
  // 현안 1건이 있으면 분야 통계가 표시됨
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueStatsSummary([
      {
        id: "s1",
        title: "교통 현안",
        categoryId: "traffic_parking",
        categoryLabel: "교통·주차",
        dongName: "판교동"
      }
    ]);
  });
  const statsEl = page.locator("#issue-stats-summary");
  const html = await statsEl.innerHTML();
  expect(html).toContain("분야별 현안/변화");
  expect(html).toContain("1건");
});

test("Issue stats category count matches hotspot count per category", async ({ page }) => {
  // 분야별 건수가 정확히 표시됨
  await waitForHooks(page);
  const result = await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueStatsSummary([
      { id: "a", title: "현안 A", categoryId: "traffic_parking", dongName: "판교동" },
      { id: "b", title: "현안 B", categoryId: "traffic_parking", dongName: "운중동" },
      { id: "c", title: "현안 C", categoryId: "environment_park", dongName: "백현동" }
    ]);
    const statsEl = document.querySelector("#issue-stats-summary");
    return statsEl ? statsEl.innerHTML : "";
  });
  // 교통·주차 2건, 환경·공원 1건
  expect(result).toContain("2건");
  expect(result).toContain("1건");
});

test("Issue stats dong section shows dong names", async ({ page }) => {
  // 동별 통계 섹션에 동 이름이 표시됨
  await waitForHooks(page);
  const result = await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueStatsSummary([
      { id: "x", title: "현안 X", categoryId: "safety_security", dongName: "대장동" },
      { id: "y", title: "현안 Y", categoryId: "housing_infra", dongName: "백현동" }
    ]);
    const statsEl = document.querySelector("#issue-stats-summary");
    return statsEl ? statsEl.innerHTML : "";
  });
  expect(result).toContain("대장동");
  expect(result).toContain("백현동");
});

test("Issue stats scope label is rendered", async ({ page }) => {
  // 현안 통계 범위 레이블(전체 기준)이 표시됨
  await waitForHooks(page);
  const result = await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueStatsSummary([
      { id: "z", title: "현안 Z", categoryId: "economy_culture", dongName: "판교동" }
    ]);
    const statsEl = document.querySelector("#issue-stats-summary");
    return statsEl ? statsEl.innerHTML : "";
  });
  expect(result).toContain("전체 기준");
});

test("Issue stats aligns counts", async ({ page }) => {
  // 통계 버튼은 라벨과 건수를 분리된 열로 정렬함
  await waitForHooks(page);
  const styles = await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueStatsSummary([
      { id: "a", title: "교통 현안", categoryId: "traffic_parking", dongName: "판교동" },
      { id: "b", title: "교육 현안", categoryId: "education_childcare", dongName: "운중동" }
    ]);
    const buttonEl = document.querySelector("#issue-stats-summary .issue-stats-filter-btn");
    const countEl = document.querySelector("#issue-stats-summary .issue-stats-count");
    if (!buttonEl || !countEl) return null;
    const buttonStyle = window.getComputedStyle(buttonEl);
    const countStyle = window.getComputedStyle(countEl);
    return {
      columnGap: buttonStyle.columnGap,
      display: buttonStyle.display,
      countTextAlign: countStyle.textAlign,
      countWhiteSpace: countStyle.whiteSpace
    };
  });
  expect(styles).not.toBeNull();
  expect(styles.display).toBe("grid");
  expect(parseFloat(styles.columnGap)).toBeGreaterThanOrEqual(10);
  expect(styles.countTextAlign).toBe("right");
  expect(styles.countWhiteSpace).toBe("nowrap");
});

test("Issue stats prioritizes dong totals", async ({ page }) => {
  // 모바일/PC 모두 동별 통계를 먼저 훑을 수 있도록 순서를 유지함
  await waitForHooks(page);
  const headings = await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueStatsSummary([
      { id: "a", title: "교통 현안", categoryId: "traffic_parking", dongName: "판교동" },
      { id: "b", title: "교육 현안", categoryId: "education_childcare", dongName: "운중동" }
    ]);
    return Array.from(document.querySelectorAll("#issue-stats-summary .issue-stats-block h4"))
      .map((element) => element.textContent.trim());
  });
  expect(headings[0]).toBe("동별 현안/변화");
  expect(headings[1]).toBe("분야별 현안/변화");
  expect(headings[2]).toBe("상태별 건수");
});

test("Mobile sheet combines stats and common tab", async ({ page }) => {
  // 모바일에서는 통계 탭 안에서 공통 현안까지 함께 본다.
  await page.setViewportSize({ width: 390, height: 900 });
  await waitForHooks(page);
  await expect(page.locator("[data-mobile-sheet-tab='stats']")).toHaveCount(1);
  await expect(page.locator("[data-mobile-sheet-tab='issues']")).toHaveCount(1);
  await expect(page.locator("[data-mobile-sheet-tab='common']")).toHaveCount(0);
  await expect(page.locator("#common-pledge-panel")).toBeVisible();
  await expect(page.locator("#common-pledge-panel .pledge-item:not(.pledge-item-empty) p")).toHaveCount(0);
});

test("Issue stats rows look actionable", async ({ page }) => {
  // 통계 행은 진입 표시와 버튼 테두리로 선택 가능한 항목임을 드러냄
  await waitForHooks(page);
  const affordance = await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueStatsSummary([
      { id: "a", title: "교통 현안", categoryId: "traffic_parking", dongName: "판교동" }
    ]);
    const buttonEl = document.querySelector("#issue-stats-summary .issue-stats-filter-btn");
    const indicatorEl = document.querySelector("#issue-stats-summary .issue-stats-open-indicator");
    if (!buttonEl || !indicatorEl) return null;
    const buttonStyle = window.getComputedStyle(buttonEl);
    return {
      ariaLabel: buttonEl.getAttribute("aria-label"),
      borderWidth: buttonStyle.borderTopWidth,
      gridColumnCount: buttonStyle.gridTemplateColumns.split(" ").filter(Boolean).length,
      indicatorText: indicatorEl.textContent,
      indicatorAriaHidden: indicatorEl.getAttribute("aria-hidden")
    };
  });
  expect(affordance).not.toBeNull();
  expect(affordance.ariaLabel).toContain("보기");
  expect(affordance.borderWidth).not.toBe("0px");
  expect(affordance.gridColumnCount).toBeGreaterThanOrEqual(3);
  expect(affordance.indicatorText).toBe("›");
  expect(affordance.indicatorAriaHidden).toBe("true");
});

test("Issue stats uses squircle radius rhythm", async ({ page }) => {
  // 통계 영역은 pill 대신 squircle에 가까운 반경 계층을 사용함
  await waitForHooks(page);
  const rhythm = await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueStatsSummary([
      { id: "a", title: "교통 현안", categoryId: "traffic_parking", dongName: "판교동" }
    ]);
    const summaryEl = document.querySelector("#issue-stats-summary");
    const buttonEl = document.querySelector("#issue-stats-summary .issue-stats-filter-btn");
    const chipEl = document.querySelector("#issue-stats-summary .issue-stats-chip");
    const clearEl = document.querySelector("#issue-stats-summary .issue-stats-clear-btn");
    const listEl = document.querySelector("#issue-stats-summary .issue-stats-list");
    if (!summaryEl || !buttonEl || !chipEl || !clearEl || !listEl) return null;
    const buttonRect = buttonEl.getBoundingClientRect();
    const chipRect = chipEl.getBoundingClientRect();
    const summaryStyle = window.getComputedStyle(summaryEl);
    const buttonStyle = window.getComputedStyle(buttonEl);
    const chipStyle = window.getComputedStyle(chipEl);
    const clearStyle = window.getComputedStyle(clearEl);
    const listStyle = window.getComputedStyle(listEl);
    return {
      summaryRadius: parseFloat(summaryStyle.borderTopLeftRadius),
      buttonRadius: parseFloat(buttonStyle.borderTopLeftRadius),
      chipRadius: parseFloat(chipStyle.borderTopLeftRadius),
      clearRadius: parseFloat(clearStyle.borderTopLeftRadius),
      buttonHeight: buttonRect.height,
      chipHeight: chipRect.height,
      chipTopInset: chipRect.top - buttonRect.top,
      chipLeftInset: chipRect.left - buttonRect.left,
      chipBottomInset: buttonRect.bottom - chipRect.bottom,
      listGap: parseFloat(listStyle.rowGap),
      buttonPaddingLeft: parseFloat(buttonStyle.paddingLeft)
    };
  });
  expect(rhythm).not.toBeNull();
  expect(rhythm.summaryRadius).toBeGreaterThan(rhythm.buttonRadius);
  expect(rhythm.buttonRadius).toBeGreaterThan(rhythm.chipRadius);
  expect(rhythm.clearRadius).toBeLessThanOrEqual(rhythm.chipRadius);
  expect(rhythm.buttonRadius).toBeLessThan(rhythm.buttonHeight / 2);
  expect(rhythm.chipRadius).toBeLessThan(rhythm.chipHeight / 2);
  expect(Math.abs(rhythm.chipTopInset - rhythm.chipLeftInset)).toBeLessThanOrEqual(1);
  expect(Math.abs(rhythm.chipBottomInset - rhythm.chipTopInset)).toBeLessThanOrEqual(1);
  expect(rhythm.listGap).toBeGreaterThanOrEqual(rhythm.buttonPaddingLeft);
});

test("Issue stats height stays stable", async ({ page }) => {
  // 전체 보기 버튼이 비활성 상태에서도 공간을 유지해 통계 박스 높이가 흔들리지 않음
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      { id: "stable-a", title: "판교 현안", categoryId: "traffic_parking", dongName: "판교동" },
      { id: "stable-b", title: "운중 현안", categoryId: "education_childcare", dongName: "운중동" }
    ]);
  });
  await page.evaluate(() => document.fonts ? document.fonts.ready : Promise.resolve());
  const statsEl = page.locator("#issue-stats-summary");
  const inactiveHeight = await statsEl.evaluate((element) => element.getBoundingClientRect().height);
  await clickIssueStatsFilter(page, "#issue-stats-summary [data-filter-type='dong'][data-filter-label='판교동']");
  const activeHeight = await statsEl.evaluate((element) => element.getBoundingClientRect().height);
  await page.locator("#issue-stats-summary #clear-issue-filter-btn").click();
  const clearedHeight = await statsEl.evaluate((element) => element.getBoundingClientRect().height);
  expect(Math.abs(activeHeight - inactiveHeight)).toBeLessThanOrEqual(1);
  expect(Math.abs(clearedHeight - inactiveHeight)).toBeLessThanOrEqual(1);
  await expect(statsEl.locator("#clear-issue-filter-btn")).toHaveClass(/issue-stats-clear-btn-inactive/);
});

test("renderVisibleIssueListWithData updates total count label", async ({ page }) => {
  // renderVisibleIssueListWithData 호출 시 선택 레이어 총건수 레이블이 업데이트됨
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      { id: "t1", title: "현안 1", categoryId: "traffic_parking", dongName: "판교동" },
      { id: "t2", title: "현안 2", categoryId: "environment_park", dongName: "운중동" }
    ]);
  });
  const countEl = page.locator("#total-issue-count");
  await expect(countEl).toHaveText("총 현안/변화 건수: 2건");
});

test("Issue list shows selected layers before filtering", async ({ page }) => {
  // 필터 선택 전에도 켜진 레이어 전체 목록을 보여주고, 레이어 버튼은 아이콘 pill로 표시한다.
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      { id: "d1", title: "판교 현안", categoryId: "traffic_parking", dongName: "판교동" },
      { id: "d2", title: "운중 현안", categoryId: "environment_park", dongName: "운중동" },
      {
        id: "d3",
        title: "판교 변화",
        contentTab: "changes",
        itemType: "improvement",
        progressStatus: "completed",
        categoryId: "traffic_parking",
        dongName: "판교동"
      }
    ]);
  });
  await expect(page.locator(".map-layer-tabs")).toHaveCSS("position", "absolute");
  const layerControls = await page.locator(".map-layer-tabs").evaluate((element) => {
    const baseStyle = window.getComputedStyle(element);
    const beforeStyle = window.getComputedStyle(element, "::before");
    const style = window.getComputedStyle(element, "::after");
    const parentClass = element.parentElement ? element.parentElement.className : "";
    return {
      parentClass,
      display: baseStyle.display,
      top: baseStyle.top,
      left: baseStyle.left,
      background: baseStyle.backgroundColor,
      beforeDisplay: beforeStyle.display,
      afterDisplay: style.display,
      pointerEvents: baseStyle.pointerEvents
    };
  });
  expect(layerControls.parentClass).toContain("map-wrap");
  expect(layerControls.display).toBe("flex");
  expect(layerControls.top).toBe("14px");
  expect(layerControls.left).toBe("56px");
  expect(layerControls.background).toBe("rgba(0, 0, 0, 0)");
  expect(layerControls.beforeDisplay).toBe("none");
  expect(layerControls.afterDisplay).toBe("none");
  expect(layerControls.pointerEvents).toBe("none");
  await expect(page.locator(".map-layer-tabs [data-content-tab='issues']")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".map-layer-tabs [data-content-tab='changes']")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".map-layer-tabs [data-content-tab='notices']")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".map-layer-tabs [data-content-tab='issues']")).toHaveCSS("background-color", "rgb(0, 62, 154)");
  await expect(page.locator(".map-layer-tabs [data-content-tab='changes']")).toHaveCSS("background-color", "rgb(0, 62, 154)");
  await expect(page.locator(".map-layer-tabs .content-tab-icon")).toHaveCount(3);
  const tabVisualState = await page.locator(".map-layer-tabs").evaluate((element) => {
    const noticeTab = element.querySelector("[data-content-tab='notices']");
    const noticeIcon = noticeTab ? noticeTab.querySelector(".content-tab-icon") : null;
    const issuesIcon = element.querySelector("[data-content-tab='issues'] .content-tab-icon");
    const changesIcon = element.querySelector("[data-content-tab='changes'] .content-tab-icon");
    const noticeStyle = noticeTab ? window.getComputedStyle(noticeTab) : null;
    const noticeIconStyle = noticeIcon ? window.getComputedStyle(noticeIcon) : null;
    const issuesIconStyle = issuesIcon ? window.getComputedStyle(issuesIcon) : null;
    const changesIconStyle = changesIcon ? window.getComputedStyle(changesIcon) : null;
    return {
      noticeBackground: noticeStyle ? noticeStyle.backgroundColor : "",
      noticeColor: noticeStyle ? noticeStyle.color : "",
      noticeIconStroke: noticeIconStyle ? noticeIconStyle.stroke : "",
      noticeIconStrokeWidth: noticeIconStyle ? noticeIconStyle.strokeWidth : "",
      issuesIconStroke: issuesIconStyle ? issuesIconStyle.stroke : "",
      changesIconStroke: changesIconStyle ? changesIconStyle.stroke : ""
    };
  });
  expect(tabVisualState.noticeBackground).toContain("255, 255, 255");
  expect(tabVisualState.noticeColor).toBe("rgb(17, 24, 39)");
  expect(tabVisualState.noticeIconStroke).toBe("rgb(43, 138, 62)");
  expect(parseFloat(tabVisualState.noticeIconStrokeWidth)).toBe(3);
  expect(tabVisualState.issuesIconStroke).toBe("rgb(255, 255, 255)");
  expect(tabVisualState.changesIconStroke).toBe("rgb(255, 255, 255)");
  await expect(page.locator("#issue-list-panel")).not.toHaveClass(/issue-list-panel-hidden/);
  await expect(page.locator("#issue-list-panel")).toHaveAttribute("aria-label", "우리동네 현안/변화");
  await expect(page.locator("#spot-list")).toContainText("판교 현안");
  await expect(page.locator("#spot-list")).toContainText("운중 현안");
  await expect(page.locator("#spot-list")).toContainText("판교 변화");
});

test("Mobile layer controls float above map and sheet grip stays visible", async ({ page }) => {
  // 모바일에서는 레이어 컨트롤을 지도 위에 띄우고, 바텀시트 손잡이는 시트 배경 위에 유지한다.
  await page.setViewportSize({ width: 390, height: 900 });
  await waitForHooks(page);
  const layerState = await page.locator(".map-layer-tabs").evaluate((element) => {
    const style = window.getComputedStyle(element);
    const sidePanel = document.querySelector(".side-panel");
    const grip = document.querySelector(".mobile-sheet-grip");
    const sideStyle = sidePanel ? window.getComputedStyle(sidePanel) : null;
    const gripStyle = grip ? window.getComputedStyle(grip) : null;
    const gripHandleStyle = grip ? window.getComputedStyle(grip, "::before") : null;
    const zoom = document.querySelector(".map .ol-zoom");
    const zoomStyle = zoom ? window.getComputedStyle(zoom) : null;
    return {
      position: style.position,
      top: style.top,
      left: style.left,
      sideBackground: sideStyle ? sideStyle.backgroundColor : "",
      gripDisplay: gripStyle ? gripStyle.display : "",
      gripBackground: gripStyle ? gripStyle.backgroundColor : "",
      gripHandleBackground: gripHandleStyle ? gripHandleStyle.backgroundColor : "",
      zoomDisplay: zoomStyle ? zoomStyle.display : ""
    };
  });
  expect(layerState.position).toBe("absolute");
  expect(layerState.top).toBe("12px");
  expect(layerState.left).toBe("12px");
  expect(layerState.sideBackground).toBe("rgb(247, 250, 255)");
  expect(layerState.gripDisplay).toBe("flex");
  expect(layerState.gripBackground).toBe(layerState.sideBackground);
  expect(layerState.gripHandleBackground).toBe("rgb(191, 208, 230)");
  expect(layerState.zoomDisplay).toBe("none");
});

test("Clicking category stats filters issue list", async ({ page }) => {
  // 분야 통계 버튼을 누르면 해당 분야 현안만 표시됨
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      { id: "cat-a", title: "교통 현안", categoryId: "traffic_parking", dongName: "판교동" },
      { id: "cat-b", title: "환경 현안", categoryId: "environment_park", dongName: "운중동" }
    ]);
  });
  await clickIssueStatsFilter(page, "#issue-stats-summary [data-filter-type='category'][data-filter-label='🚌 교통·주차']");
  const spotList = page.locator("#spot-list");
  const statsEl = page.locator("#issue-stats-summary");
  const clearBtn = statsEl.locator("#clear-issue-filter-btn");
  await expect(spotList).toContainText("교통 현안");
  await expect(spotList).not.toContainText("환경 현안");
  await expect(statsEl).toContainText("분야: 🚌 교통·주차");
  await expect(clearBtn).not.toHaveClass(/issue-stats-clear-btn-inactive/);
  await expect(clearBtn).toBeEnabled();
  await expect(page.locator("#issue-filter-row")).toHaveCount(0);
});

test("Clicking progress status stats filters issue list", async ({ page }) => {
  // 진행 상태 통계 버튼은 확인/완료를 모두 보여주고 해당 탭으로 이동한다.
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      { id: "status-a", title: "확인 현안", categoryId: "traffic_parking", dongName: "판교동", progressStatus: "checking" },
      { id: "status-b", title: "완료된 변화", contentTab: "changes", itemType: "improvement", progressStatus: "completed", categoryId: "environment_park", dongName: "운중동" }
    ]);
  });
  const checkingStatus = page.locator("#issue-stats-summary [data-filter-type='progressStatus'][data-filter-key='checking']");
  const completedStatus = page.locator("#issue-stats-summary [data-filter-type='progressStatus'][data-filter-key='completed']");
  await expect(checkingStatus).toContainText("1건");
  await expect(completedStatus).toContainText("1건");
  await expect(completedStatus).not.toHaveClass(/issue-stats-filter-btn-muted/);

  await checkingStatus.click();
  const spotList = page.locator("#spot-list");
  const statsEl = page.locator("#issue-stats-summary");
  await expect(spotList).toContainText("확인 현안");
  await expect(spotList).not.toContainText("완료된 변화");
  await expect(statsEl).toContainText("진행 상태: 확인");

  await clickIssueStatsFilter(page, "#issue-stats-summary [data-filter-type='progressStatus'][data-filter-key='completed']");
  await expect.poll(async () => {
    return page.evaluate(() => window.__spotListTestHooks.getActiveContentTab());
  }).toBe("changes");
  await expect(spotList).toContainText("완료된 변화");
  await expect(spotList).not.toContainText("확인 현안");
  await expect(statsEl).toContainText("진행 상태: 완료");
  await expect(page.locator("#issue-stats-summary [data-filter-type='progressStatus'][data-filter-key='checking']")).not.toHaveClass(/issue-stats-filter-btn-muted/);
});

test("Notice layer lists notice items without status filters", async ({ page }) => {
  // 안내 레이어만 켜진 경우 상태 없이 안내 목록을 제목 내림차순으로 보여준다.
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.setVisibleContentTabsForTest(["notices"]);
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      {
        id: "change-a",
        title: "보행로 볼라드 보수",
        contentTab: "changes",
        itemType: "improvement",
        progressStatus: "completed",
        categoryId: "safety_security",
        dongName: "판교동"
      },
      {
        id: "notice-old",
        title: "260709 운중천 안전통제선 설치",
        contentTab: "notices",
        itemType: "notice",
        progressStatus: "checking",
        categoryId: "safety_security",
        dongName: "운중동"
      },
      {
        id: "notice-new",
        title: "260727 대장도서관 공사 현장 금연 안내",
        contentTab: "notices",
        itemType: "notice",
        progressStatus: "checking",
        categoryId: "education_childcare",
        dongName: "대장동"
      }
    ]);
  });
  await expect(page.locator("#issue-stats-summary")).toContainText("안내 현황");
  await expect(page.locator("#issue-stats-summary")).not.toContainText("전체 안내");
  await expect(page.locator("#issue-stats-summary .notice-stats-total")).toHaveCount(0);
  await expect(page.locator("#issue-stats-summary .notice-stats-main strong")).toHaveText([
    "260727 대장도서관 공사 현장 금연 안내",
    "260709 운중천 안전통제선 설치"
  ]);
  await expect(page.locator("#spot-list .spot-item-top strong")).toHaveText([
    "260727 대장도서관 공사 현장 금연 안내",
    "260709 운중천 안전통제선 설치"
  ]);
  await expect(page.locator("#issue-stats-summary")).not.toContainText("상태별 건수");
  await expect(page.locator("#issue-stats-summary [data-filter-type='progressStatus']")).toHaveCount(0);
  await expect(page.locator("#issue-stats-summary")).not.toContainText("보행로 볼라드 보수");
});

test("Injected notice data survives late public snapshot", async ({ page }) => {
  // 테스트 훅 데이터는 늦게 도착한 public snapshot에 덮이지 않는다.
  let markSnapshotRequested = () => {};
  let releaseSnapshot = () => {};
  const snapshotRequested = new Promise((resolve) => {
    markSnapshotRequested = resolve;
  });
  const snapshotRelease = new Promise((resolve) => {
    releaseSnapshot = resolve;
  });

  await page.route("**/firestore.googleapis.com/**", (route) => route.abort());
  await page.route("**/data/hotspots.public.json", async (route) => {
    markSnapshotRequested();
    await snapshotRelease;
    await route.fulfill({
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

  await page.goto("/map/", { waitUntil: "domcontentloaded" });
  await snapshotRequested;
  await page.waitForFunction(() => {
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.renderVisibleIssueListWithData === "function" &&
      typeof window.__spotListTestHooks.setVisibleContentTabsForTest === "function"
    );
  });
  await page.evaluate(() => {
    window.__spotListTestHooks.setVisibleContentTabsForTest(["notices"]);
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      {
        id: "late-notice",
        title: "260801 늦은 스냅샷 안내",
        contentTab: "notices",
        itemType: "notice",
        progressStatus: "checking",
        categoryId: "traffic_parking",
        dongName: "판교동"
      }
    ]);
  });

  const noticeTitle = page.locator("#issue-stats-summary .notice-stats-main strong");
  await expect(noticeTitle).toHaveText("260801 늦은 스냅샷 안내");
  const snapshotResponse = page.waitForResponse("**/data/hotspots.public.json");
  releaseSnapshot();
  await snapshotResponse;
  await expect(noticeTitle).toHaveText("260801 늦은 스냅샷 안내");
});

test("Desktop side panel prioritizes selected result", async ({ page }) => {
  // PC에서는 필터 선택 후 결과 목록을 통계보다 먼저 배치해 선택 맥락을 분명히 보여준다.
  await page.setViewportSize({ width: 1280, height: 900 });
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      { id: "desktop-panel-a", title: "판교 현안", categoryId: "traffic_parking", dongName: "판교동" },
      { id: "desktop-panel-b", title: "운중 현안", categoryId: "environment_park", dongName: "운중동" }
    ]);
  });

  const sidePanel = page.locator(".side-panel");
  await expect(sidePanel).not.toHaveClass(/side-panel-has-filter/);

  await clickIssueStatsFilter(page, "#issue-stats-summary [data-filter-type='dong'][data-filter-label='판교동']");

  await expect(sidePanel).toHaveClass(/side-panel-has-filter/);
  await expect(sidePanel).toHaveAttribute("data-issue-filter-type", "dong");
  await expect(page.locator("#issue-list-title")).toHaveText("판교동 현안/변화");
  await expect(page.locator("#issue-list-panel")).toHaveAttribute("aria-label", "판교동 현안/변화");
  await expect(page.locator("#issue-list-clear-filter-btn")).toBeVisible();
  await expect(page.locator("#issue-list-clear-filter-btn")).toBeEnabled();

  const orderState = await page.evaluate(() => {
    const listPanel = document.querySelector("#issue-list-panel");
    const statsPanel = document.querySelector("#mobile-stats-panel");
    return {
      listOrder: Number(window.getComputedStyle(listPanel).order),
      statsOrder: Number(window.getComputedStyle(statsPanel).order)
    };
  });
  expect(orderState.listOrder).toBeLessThan(orderState.statsOrder);

  await page.locator("#issue-list-clear-filter-btn").click();
  await expect(sidePanel).not.toHaveClass(/side-panel-has-filter/);
  await expect(page.locator("#issue-list-title")).toHaveText("우리동네 현안/변화");
});

test("Mobile sheet switches to issue tab after filter", async ({ page }) => {
  // 모바일 바텀시트는 선택 전 통계 탭을 보여주고, 필터 선택 후 현안 탭으로 전환한다.
  await page.setViewportSize({ width: 390, height: 900 });
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      { id: "mobile-tab-a", title: "교통 현안", categoryId: "traffic_parking", dongName: "판교동" },
      { id: "mobile-tab-b", title: "교육 현안", categoryId: "education_childcare", dongName: "운중동" }
    ]);
  });

  await expect(page.locator("[data-mobile-sheet-tab='stats']")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("[data-mobile-sheet-tab='issues']")).toBeEnabled();
  await expect(page.locator("#issue-list-panel")).not.toHaveClass(/issue-list-panel-hidden/);
  await expect(page.locator(".mobile-sheet-tabs")).toBeHidden();

  await clickIssueStatsFilter(page, "#issue-stats-summary [data-filter-type='category'][data-filter-label='🚌 교통·주차']");

  await expect(page.locator(".mobile-sheet-tabs")).toBeVisible();
  await expect(page.locator("[data-mobile-sheet-tab='issues']")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("[data-mobile-sheet-tab='issues']")).toBeEnabled();
  await expect(page.locator("#issue-list-panel")).toBeVisible();
  await expect(page.locator("#issue-list-clear-filter-btn")).toBeVisible();
  await expect(page.locator("#issue-list-clear-filter-btn")).toBeEnabled();
  await expect(page.locator("#spot-list [data-spot-id='mobile-tab-a']")).toBeVisible();
  const issueHeadStyle = await page.locator(".issue-list-head").evaluate((element) => {
    const style = window.getComputedStyle(element);
    const listStyle = window.getComputedStyle(document.querySelector("#spot-list"));
    const panelStyle = window.getComputedStyle(document.querySelector("#issue-list-panel"));
    return {
      boxShadow: style.boxShadow,
      panelOverflow: panelStyle.overflow,
      position: style.position,
      spotListOverflow: listStyle.overflow,
      zIndex: Number(style.zIndex)
    };
  });
  expect(issueHeadStyle.panelOverflow).toBe("hidden");
  expect(issueHeadStyle.position).toBe("relative");
  expect(issueHeadStyle.spotListOverflow).toBe("auto");
  expect(issueHeadStyle.zIndex).toBeGreaterThanOrEqual(5);
  expect(issueHeadStyle.boxShadow).not.toBe("none");

  await page.locator("#issue-list-clear-filter-btn").click();
  await expect(page.locator("[data-mobile-sheet-tab='stats']")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("[data-mobile-sheet-tab='issues']")).toBeEnabled();
  await expect(page.locator("#issue-list-panel")).not.toHaveClass(/issue-list-panel-hidden/);
  await expect(page.locator("#spot-list")).toContainText("교통 현안");
  await expect(page.locator("#spot-list")).toContainText("교육 현안");
});

test("Mobile sheet grip collapses and expands sheet", async ({ page }) => {
  // 손잡이는 실제 버튼처럼 바텀시트를 접고 펼친다.
  await page.setViewportSize({ width: 390, height: 900 });
  await waitForHooks(page);

  const sheet = page.locator(".side-panel");
  const grip = page.locator("#mobile-sheet-toggle");

  await expect(grip).toHaveAttribute("aria-expanded", "true");
  const expandedPadding = await page.evaluate(() => window.__spotListTestHooks.getIssueMapFocusPadding());
  await grip.click();
  await expect(sheet).toHaveClass(/mobile-sheet-collapsed/);
  await expect(grip).toHaveAttribute("aria-expanded", "false");
  await expect(grip).toBeFocused();
  const collapsedPadding = await page.evaluate(() => window.__spotListTestHooks.getIssueMapFocusPadding());
  expect(expandedPadding[2]).toBeGreaterThan(collapsedPadding[2]);

  await grip.click();
  await expect(sheet).not.toHaveClass(/mobile-sheet-collapsed/);
  await expect(grip).toHaveAttribute("aria-expanded", "true");
  await expect(grip).toBeFocused();
});

test("Mobile full region refits when sheet collapses", async ({ page }) => {
  // 전체 보기 상태에서도 시트가 접히면 접힌 시트 기준으로 지역 전체를 다시 맞춘다.
  await page.setViewportSize({ width: 390, height: 900 });
  await waitForHooks(page);
  await page.waitForFunction(() => {
    const hooks = window.__spotListTestHooks;
    return hooks && typeof hooks.getBoundaryExtentCenter === "function" && hooks.getBoundaryExtentCenter();
  });

  const before = await page.evaluate(() => {
    const hooks = window.__spotListTestHooks;
    return {
      center: hooks.getMapViewState().center,
      expandedPadding: hooks.getRegionMapFocusPadding()
    };
  });

  await page.locator("#mobile-sheet-toggle").click();
  await page.waitForFunction(() => {
    const hooks = window.__spotListTestHooks;
    const sheet = document.querySelector(".side-panel");
    const viewState = hooks && hooks.getMapViewState ? hooks.getMapViewState() : null;
    return sheet && sheet.classList.contains("mobile-sheet-collapsed") && viewState && !viewState.animating;
  });

  const after = await page.evaluate(() => {
    const hooks = window.__spotListTestHooks;
    return {
      center: hooks.getMapViewState().center,
      zoom: hooks.getMapViewState().zoom,
      collapsedPadding: hooks.getRegionMapFocusPadding()
    };
  });

  expect(after.collapsedPadding[2]).toBeLessThan(before.expandedPadding[2]);
  expect(after.collapsedPadding[2]).toBeLessThanOrEqual(108);
  await expect.poll(async () => {
    return page.evaluate((initialCenter) => {
      const center = window.__spotListTestHooks.getMapViewState().center;
      return Math.abs(center[0] - initialCenter[0]) + Math.abs(center[1] - initialCenter[1]);
    }, before.center);
  }).toBeGreaterThan(0.00001);
});

test("Mobile issue focus uses target sheet height", async ({ page }) => {
  // 접힌 상태에서 필터가 활성화되어도 지도 패딩은 펼쳐질 시트 높이를 기준으로 계산함
  await page.setViewportSize({ width: 390, height: 900 });
  await waitForHooks(page);
  const paddingState = await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      { id: "target-sheet-a", title: "교통 현안", categoryId: "traffic_parking", dongName: "판교동" }
    ]);
    window.__spotListTestHooks.setMobileSheetExpanded(false);
    const collapsed = window.__spotListTestHooks.getIssueMapFocusPadding();
    window.__spotListTestHooks.setActiveIssueFilter("category", "traffic_parking", {
      label: "🚌 교통·주차"
    });
    return {
      collapsed,
      active: window.__spotListTestHooks.getIssueMapFocusPadding(),
      expandedAttr: document.querySelector("#mobile-sheet-toggle").getAttribute("aria-expanded")
    };
  });

  expect(paddingState.expandedAttr).toBe("true");
  expect(paddingState.active[2]).toBeGreaterThan(paddingState.collapsed[2]);
});

test("Mobile hotspot focus accounts for expanded sheet", async ({ page }) => {
  // 현안 카드 선택 시에도 펼쳐진 바텀시트가 가리는 영역을 중심 계산에 반영함
  await page.setViewportSize({ width: 390, height: 900 });
  await waitForHooks(page);
  const deltas = await page.evaluate(() => {
    window.__spotListTestHooks.setMobileSheetExpanded(false);
    const collapsed = window.__spotListTestHooks.getPopupAwareCenterDelta({
      hasPhoto: false
    });
    window.__spotListTestHooks.setMobileSheetExpanded(true);
    const expanded = window.__spotListTestHooks.getPopupAwareCenterDelta({
      hasPhoto: false
    });
    const expandedWithPhoto = window.__spotListTestHooks.getPopupAwareCenterDelta({
      hasPhoto: true
    });
    return { collapsed, expanded, expandedWithPhoto };
  });

  expect(deltas.expanded.deltaY).toBeLessThan(deltas.collapsed.deltaY);
  expect(Math.abs(deltas.expanded.deltaY - deltas.collapsed.deltaY)).toBeGreaterThan(100);
  expect(deltas.expandedWithPhoto.deltaY).toBeGreaterThan(deltas.expanded.deltaY);
});

test("Mobile dong popup centers as sheet changes", async ({ page }) => {
  // 동 요약 팝업은 펼침/접힘 상태의 실제 지도 가시 영역 중심에 맞춘다.
  await page.setViewportSize({ width: 390, height: 900 });
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      { id: "popup-center-a", title: "판교 현안 A", categoryId: "traffic_parking", dongName: "판교동", lat: 37.394, lng: 127.111 },
      { id: "popup-center-b", title: "판교 현안 B", categoryId: "housing_infra", dongName: "판교동", lat: 37.397, lng: 127.114 }
    ]);
  });

  const measurePopupOffset = async () => {
    return page.evaluate(() => {
      const popup = document.querySelector("#map-popup");
      const mapWrap = document.querySelector(".map-wrap");
      const sidePanel = document.querySelector(".side-panel");
      if (!popup || !mapWrap || !sidePanel || popup.classList.contains("hidden")) {
        return null;
      }
      const popupRect = popup.getBoundingClientRect();
      const mapRect = mapWrap.getBoundingClientRect();
      const sheetRect = sidePanel.getBoundingClientRect();
      const visibleBottom = Math.min(mapRect.bottom, sheetRect.top);
      const visibleCenter = mapRect.top + ((visibleBottom - mapRect.top) / 2);
      return Math.abs(((popupRect.top + popupRect.bottom) / 2) - visibleCenter);
    });
  };

  await clickIssueStatsFilter(page, "#issue-stats-summary [data-filter-type='dong'][data-filter-label='판교동']");
  await page.waitForFunction(() => {
    const hooks = window.__spotListTestHooks;
    const popup = document.querySelector("#map-popup");
    const viewState = hooks && hooks.getMapViewState ? hooks.getMapViewState() : null;
    return popup && !popup.classList.contains("hidden") && viewState && !viewState.animating;
  });
  await expect.poll(measurePopupOffset).toBeLessThanOrEqual(40);

  await page.locator("#mobile-sheet-toggle").click();
  await page.waitForFunction(() => {
    const hooks = window.__spotListTestHooks;
    const sheet = document.querySelector(".side-panel");
    const viewState = hooks && hooks.getMapViewState ? hooks.getMapViewState() : null;
    return sheet && sheet.classList.contains("mobile-sheet-collapsed") && viewState && !viewState.animating;
  });
  await expect.poll(measurePopupOffset).toBeLessThanOrEqual(40);
});

test("Clicking dong stats filters issue list", async ({ page }) => {
  // 동 통계 버튼을 누르면 해당 동 현안만 표시됨
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      { id: "dong-a", title: "판교 현안", categoryId: "traffic_parking", dongName: "판교동" },
      { id: "dong-b", title: "운중 현안", categoryId: "environment_park", dongName: "운중동" }
    ]);
  });
  await clickIssueStatsFilter(page, "#issue-stats-summary [data-filter-type='dong'][data-filter-label='운중동']");
  const spotList = page.locator("#spot-list");
  await expect(spotList).not.toContainText("판교 현안");
  await expect(spotList).toContainText("운중 현안");
  await expect(page.locator("#issue-stats-summary")).toContainText("동: 운중동");
});

test("Clear issue filter returns to full issue list", async ({ page }) => {
  // 전체 보기를 누르면 필터가 해제되고 전체 현안 목록으로 돌아감
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      { id: "clear-a", title: "판교 현안", categoryId: "traffic_parking", dongName: "판교동" },
      { id: "clear-b", title: "운중 현안", categoryId: "environment_park", dongName: "운중동" }
    ]);
  });
  await clickIssueStatsFilter(page, "#issue-stats-summary [data-filter-type='dong'][data-filter-label='판교동']");
  await page.locator("#issue-stats-summary #clear-issue-filter-btn").click();
  const spotList = page.locator("#spot-list");
  const statsEl = page.locator("#issue-stats-summary");
  await expect.poll(async () => {
    return statsEl.evaluate((element) => element.classList.contains("issue-stats-refreshing"));
  }).toBe(false);
  await expect.poll(async () => {
    return spotList.evaluate((element) => element.classList.contains("spot-list-refreshing"));
  }).toBe(false);
  await expect(page.locator("#issue-list-panel")).not.toHaveClass(/issue-list-panel-hidden/);
  await expect(spotList).toContainText("판교 현안");
  await expect(spotList).toContainText("운중 현안");
  await expect(statsEl).toContainText("전체 기준");
  await expect(statsEl.locator("#clear-issue-filter-btn")).toHaveClass(/issue-stats-clear-btn-inactive/);
  await expect(statsEl.locator("#clear-issue-filter-btn")).toBeDisabled();
});

test("renderVisibleIssueListWithData with empty array keeps issue list hidden", async ({ page }) => {
  // 빈 배열로 호출 시 목록 패널은 보이지 않음
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([]);
  });
  await expect(page.locator("#issue-list-panel")).toHaveClass(/issue-list-panel-hidden/);
});

test("Issue stats HTML special chars in category are escaped", async ({ page }) => {
  // 분야 레이블에 HTML 특수문자가 있어도 이스케이프됨
  await waitForHooks(page);
  const result = await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueStatsSummary([
      {
        id: "xss",
        title: "XSS 테스트",
        categoryId: "",
        categoryLabel: '<script>alert(1)</script>',
        dongName: "판교동"
      }
    ]);
    const statsEl = document.querySelector("#issue-stats-summary");
    return statsEl ? statsEl.innerHTML : "";
  });
  expect(result).not.toContain("<script>");
});
