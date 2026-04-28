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
}

// 테스트 훅이 준비될 때까지 대기한다.
async function waitForHooks(page) {
  await blockFirestore(page);
  await page.goto("/map/");
  await page.waitForSelector("#spot-list li.empty", { timeout: 30000 });
  await page.waitForFunction(() => {
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.renderVisibleIssueListWithData === "function"
    );
  });
}

test("Issue stats shows empty message when no hotspots", async ({ page }) => {
  // renderIssueStatsSummary([]) → 빈 상태 메시지가 표시됨
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueStatsSummary([]);
  });
  const statsEl = page.locator("#issue-stats-summary");
  const html = await statsEl.innerHTML();
  expect(html).toContain("표시할 현안 통계가 없습니다");
});

test("Issue stats shows category section with one hotspot", async ({ page }) => {
  // 현안 1건이 있으면 카테고리 통계가 표시됨
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
  expect(html).toContain("카테고리별");
  expect(html).toContain("1건");
});

test("Issue stats category count matches hotspot count per category", async ({ page }) => {
  // 카테고리별 건수가 정확히 표시됨
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

test("renderVisibleIssueListWithData updates total count label", async ({ page }) => {
  // renderVisibleIssueListWithData 호출 시 총 현안 건수 레이블이 업데이트됨
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      { id: "t1", title: "현안 1", categoryId: "traffic_parking", dongName: "판교동" },
      { id: "t2", title: "현안 2", categoryId: "environment_park", dongName: "운중동" }
    ]);
  });
  const countEl = page.locator("#total-issue-count");
  const text = await countEl.textContent();
  expect(text).toContain("2건");
});

test("renderVisibleIssueListWithData renders dong groups", async ({ page }) => {
  // renderVisibleIssueListWithData 호출 시 동별 그룹 목록이 렌더링됨
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      { id: "d1", title: "판교 현안", categoryId: "traffic_parking", dongName: "판교동" },
      { id: "d2", title: "운중 현안", categoryId: "environment_park", dongName: "운중동" }
    ]);
  });
  const spotList = page.locator("#spot-list");
  const html = await spotList.innerHTML();
  expect(html).toContain("판교동");
  expect(html).toContain("운중동");
});

test("renderVisibleIssueListWithData with empty array shows empty message", async ({ page }) => {
  // 빈 배열로 호출 시 빈 메시지가 표시됨
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([]);
  });
  const emptyItem = page.locator("#spot-list li.empty");
  await expect(emptyItem).toBeVisible();
});

test("Issue stats HTML special chars in category are escaped", async ({ page }) => {
  // 카테고리 레이블에 HTML 특수문자가 있어도 이스케이프됨
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
