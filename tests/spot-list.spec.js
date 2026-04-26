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

test("Memo presence toggles compact card class", async ({ page }) => {
  // 메모 유무에 따라 카드 클래스/요소가 달라지는지 확인
  await page.goto("/map/");
  await page.waitForFunction(() => {
    return window.__spotListTestHooks && typeof window.__spotListTestHooks.renderHotspotList === "function";
  });

  const hotspots = [
    {
      id: "spot-with-memo",
      title: "메모 있는 현안",
      memo: "주민 의견 접수 완료",
      dongName: "판교동",
      categoryId: "traffic_parking"
    },
    {
      id: "spot-without-memo",
      title: "메모 없는 현안",
      memo: "   ",
      dongName: "운중동",
      categoryId: "education_childcare"
    }
  ];

  const result = await page.evaluate((items) => {
    window.__spotListTestHooks.renderHotspotList(items);
    const cards = Array.from(document.querySelectorAll("#spot-list .spot-item"));
    const memoCard = cards.find((card) => card.dataset.spotId === "spot-with-memo");
    const noMemoCard = cards.find((card) => card.dataset.spotId === "spot-without-memo");
    return {
      cardCount: cards.length,
      memoHasNoMemoClass: memoCard ? memoCard.classList.contains("spot-item--no-memo") : null,
      memoText: memoCard && memoCard.querySelector(".spot-memo")
        ? memoCard.querySelector(".spot-memo").textContent.trim()
        : "",
      noMemoHasNoMemoClass: noMemoCard ? noMemoCard.classList.contains("spot-item--no-memo") : null,
      noMemoHasMemoEl: Boolean(noMemoCard && noMemoCard.querySelector(".spot-memo"))
    };
  }, hotspots);

  expect(result.cardCount).toBe(2);
  expect(result.memoHasNoMemoClass).toBe(false);
  expect(result.memoText).toBe("주민 의견 접수 완료");
  expect(result.noMemoHasNoMemoClass).toBe(true);
  expect(result.noMemoHasMemoEl).toBe(false);
});
