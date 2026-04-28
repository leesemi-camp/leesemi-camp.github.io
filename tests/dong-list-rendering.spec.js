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
      typeof window.__spotListTestHooks.renderIssueDongList === "function"
    );
  });
}

test("Dong list renders group headers per dong", async ({ page }) => {
  // 동별 목록에 동 이름 그룹 헤더가 렌더링됨
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueDongList([
      { id: "a", title: "판교 현안", categoryId: "traffic_parking", dongName: "판교동" },
      { id: "b", title: "운중 현안", categoryId: "environment_park", dongName: "운중동" }
    ]);
  });
  const html = await page.locator("#spot-list").innerHTML();
  expect(html).toContain("판교동");
  expect(html).toContain("운중동");
});

test("Dong list groups multiple spots under same dong", async ({ page }) => {
  // 같은 동 현안이 하나의 그룹으로 묶임
  await waitForHooks(page);
  const result = await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueDongList([
      { id: "a", title: "현안 A", categoryId: "traffic_parking", dongName: "판교동" },
      { id: "b", title: "현안 B", categoryId: "environment_park", dongName: "판교동" },
      { id: "c", title: "현안 C", categoryId: "safety_security", dongName: "판교동" }
    ]);
    const groups = document.querySelectorAll("#spot-list .spot-dong-group-item");
    const pangyo = Array.from(groups).find((g) => g.textContent.includes("판교동"));
    if (!pangyo) return { groupCount: 0, issueCount: 0 };
    return {
      groupCount: groups.length,
      issueCount: pangyo.querySelectorAll(".spot-dong-issue-item").length
    };
  });
  expect(result.groupCount).toBe(1);
  expect(result.issueCount).toBe(3);
});

test("Dong list count badge shows spot count per dong", async ({ page }) => {
  // 동별 그룹 건수 배지가 정확히 표시됨
  await waitForHooks(page);
  const result = await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueDongList([
      { id: "a", title: "현안 A", categoryId: "traffic_parking", dongName: "백현동" },
      { id: "b", title: "현안 B", categoryId: "safety_security", dongName: "백현동" }
    ]);
    const countEl = document.querySelector("#spot-list .spot-group-count");
    return countEl ? countEl.textContent.trim() : "";
  });
  expect(result).toBe("2건");
});

test("Dong list shows empty message when no hotspots", async ({ page }) => {
  // 현안이 없을 때 빈 상태 메시지가 표시됨
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueDongList([]);
  });
  const emptyEl = page.locator("#spot-list li.empty");
  await expect(emptyEl).toBeVisible();
  const text = await emptyEl.textContent();
  expect(text).toContain("등록된 지역 현안이 없습니다");
});

test("Dong list issue items show category badges", async ({ page }) => {
  // 동별 목록의 각 현안 아이템에 카테고리 배지가 렌더링됨
  await waitForHooks(page);
  const result = await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueDongList([
      { id: "x", title: "환경 현안", categoryId: "environment_park", dongName: "대장동" }
    ]);
    const badge = document.querySelector("#spot-list .spot-dong-issue-category");
    return badge ? badge.textContent.trim() : "";
  });
  expect(result).toContain("환경");
});

test("Dong list group has focus-group action button", async ({ page }) => {
  // 동별 그룹에 '지도에서 동별 보기' 버튼이 있음
  await waitForHooks(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueDongList([
      { id: "f", title: "포커스 테스트", categoryId: "housing_infra", dongName: "운중동" }
    ]);
  });
  const focusBtn = page.locator("#spot-list [data-action='focus-group']");
  await expect(focusBtn).toBeAttached();
});

test("Dong list escaped HTML in spot title", async ({ page }) => {
  // 동별 목록 현안 제목의 HTML 특수문자가 이스케이프됨
  await waitForHooks(page);
  const html = await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueDongList([
      { id: "xss", title: "<img onerror=alert(1)>", categoryId: "economy_culture", dongName: "판교동" }
    ]);
    return document.querySelector("#spot-list")?.innerHTML ?? "";
  });
  expect(html).not.toContain("<img onerror");
  expect(html).toContain("&lt;img");
});

test("Multiple dongs create separate group items", async ({ page }) => {
  // 서로 다른 동 현안은 별개의 그룹으로 렌더링됨
  await waitForHooks(page);
  const groupCount = await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueDongList([
      { id: "p", title: "판교", categoryId: "traffic_parking", dongName: "판교동" },
      { id: "u", title: "운중", categoryId: "environment_park", dongName: "운중동" },
      { id: "b", title: "백현", categoryId: "safety_security", dongName: "백현동" }
    ]);
    return document.querySelectorAll("#spot-list .spot-dong-group-item").length;
  });
  expect(groupCount).toBe(3);
});

test("Dong list category distribution text shown in group", async ({ page }) => {
  // 동별 그룹에 카테고리 분포 텍스트가 표시됨
  await waitForHooks(page);
  const html = await page.evaluate(() => {
    window.__spotListTestHooks.renderIssueDongList([
      { id: "y", title: "경제 현안", categoryId: "economy_culture", dongName: "대장동" }
    ]);
    return document.querySelector("#spot-list")?.innerHTML ?? "";
  });
  expect(html).toContain("카테고리 분포");
});
