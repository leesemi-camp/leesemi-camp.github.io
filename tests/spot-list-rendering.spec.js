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

// 테스트 훅이 준비될 때까지 대기 후 반환한다.
async function waitForHook(page) {
  await page.goto("/map/");
  await page.waitForFunction(() => {
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.renderHotspotList === "function"
    );
  });
}

test("Empty list renders generic message", async ({ page }) => {
  // 현안 없을 때 일반 안내 문구 확인
  await waitForHook(page);
  const text = await page.evaluate(() => {
    window.__spotListTestHooks.renderHotspotList([]);
    const el = document.querySelector("#spot-list .empty");
    return el ? el.textContent.trim() : "";
  });
  expect(text).toBe("등록된 지역 현안이 없습니다.");
});

test("Spot renders category badge and dong label", async ({ page }) => {
  // 카테고리 배지와 동 레이블 렌더링 확인
  await waitForHook(page);
  const result = await page.evaluate(() => {
    window.__spotListTestHooks.renderHotspotList([
      {
        id: "spot-cat-dong",
        title: "교통 현안",
        memo: "설명",
        dongName: "판교동",
        categoryId: "traffic_parking",
        categoryLabel: "교통/주차"
      }
    ]);
    const item = document.querySelector("[data-spot-id='spot-cat-dong']");
    const badge = item ? item.querySelector(".spot-category") : null;
    const dong = item ? item.querySelector(".spot-dong") : null;
    return {
      categoryText: badge ? badge.textContent.trim() : "",
      dongText: dong ? dong.textContent.trim() : "",
      hasBadgeStyle: badge ? !!badge.getAttribute("style") : false
    };
  });
  expect(result.categoryText).toBe("🚌 교통·주차");
  expect(result.dongText).toBe("판교동");
  expect(result.hasBadgeStyle).toBe(true);
});

test("Spot with unknown category shows fallback label", async ({ page }) => {
  // 카테고리 없는 현안은 미분류로 표시됨
  await waitForHook(page);
  const categoryText = await page.evaluate(() => {
    window.__spotListTestHooks.renderHotspotList([
      {
        id: "spot-no-cat",
        title: "분류 없는 현안",
        memo: "",
        dongName: "운중동",
        categoryId: "",
        categoryLabel: ""
      }
    ]);
    const item = document.querySelector("[data-spot-id='spot-no-cat']");
    const badge = item ? item.querySelector(".spot-category") : null;
    return badge ? badge.textContent.trim() : "";
  });
  expect(categoryText).toBe("미분류");
});

test("Spot with photo shows photo badge in title", async ({ page }) => {
  // 사진 첨부 현안은 제목에 사진 배지(🖼️)가 렌더링됨
  await waitForHook(page);
  const hasBadge = await page.evaluate(() => {
    window.__spotListTestHooks.renderHotspotList([
      {
        id: "spot-photo",
        title: "사진 있는 현안",
        memo: "내용",
        dongName: "대장동",
        categoryId: "safety_security",
        photoDataUrls: ["https://example.com/photo.jpg"]
      }
    ]);
    const item = document.querySelector("[data-spot-id='spot-photo']");
    return Boolean(item && item.querySelector(".spot-title-photo-badge"));
  });
  expect(hasBadge).toBe(true);
});

test("Spot with multiple photos shows slideshow indicator", async ({ page }) => {
  // 사진 2장 이상이면 슬라이드쇼 인디케이터(1 / 2)가 표시됨
  await waitForHook(page);
  const indicatorText = await page.evaluate(() => {
    window.__spotListTestHooks.renderHotspotList([
      {
        id: "spot-multi-photo",
        title: "사진 여러 장",
        memo: "내용",
        dongName: "백현동",
        categoryId: "environment_park",
        photoDataUrls: [
          "https://example.com/photo1.jpg",
          "https://example.com/photo2.jpg"
        ]
      }
    ]);
    const item = document.querySelector("[data-spot-id='spot-multi-photo']");
    const indicator = item ? item.querySelector(".photo-slide-indicator") : null;
    return indicator ? indicator.textContent.trim() : "";
  });
  expect(indicatorText).toBe("1 / 2");
});

test("Multiple spots all rendered as items", async ({ page }) => {
  // 여러 현안이 모두 렌더링됨 확인
  await waitForHook(page);
  const count = await page.evaluate(() => {
    window.__spotListTestHooks.renderHotspotList([
      { id: "s-a", title: "현안 A", memo: "", dongName: "판교동", categoryId: "traffic_parking" },
      { id: "s-b", title: "현안 B", memo: "메모", dongName: "운중동", categoryId: "education_childcare" },
      { id: "s-c", title: "현안 C", memo: "", dongName: "대장동", categoryId: "safety_security" }
    ]);
    return document.querySelectorAll("#spot-list [data-spot-id]").length;
  });
  expect(count).toBe(3);
});

test("HTML special chars in title are escaped", async ({ page }) => {
  // 제목의 HTML 특수 문자는 이스케이프 처리되어 스크립트 삽입 불가
  await waitForHook(page);
  const innerHTML = await page.evaluate(() => {
    window.__spotListTestHooks.renderHotspotList([
      {
        id: "spot-xss",
        title: '<script>alert(1)</script>',
        memo: "",
        dongName: "판교동",
        categoryId: "traffic_parking"
      }
    ]);
    const item = document.querySelector("[data-spot-id='spot-xss']");
    const strong = item ? item.querySelector("strong") : null;
    return strong ? strong.innerHTML : "";
  });
  expect(innerHTML).not.toContain("<script>");
  expect(innerHTML).toContain("&lt;script&gt;");
});

test("Re-render replaces previous list content", async ({ page }) => {
  // 재렌더링 시 이전 목록이 완전히 교체됨 확인
  await waitForHook(page);
  const counts = await page.evaluate(() => {
    window.__spotListTestHooks.renderHotspotList([
      { id: "old-1", title: "구 현안 1", memo: "", dongName: "판교동", categoryId: "" },
      { id: "old-2", title: "구 현안 2", memo: "", dongName: "판교동", categoryId: "" }
    ]);
    const firstCount = document.querySelectorAll("#spot-list [data-spot-id]").length;

    window.__spotListTestHooks.renderHotspotList([
      { id: "new-1", title: "신 현안 1", memo: "", dongName: "운중동", categoryId: "" }
    ]);
    const secondCount = document.querySelectorAll("#spot-list [data-spot-id]").length;
    const oldItemPresent = Boolean(document.querySelector("[data-spot-id='old-1']"));
    return { firstCount, secondCount, oldItemPresent };
  });
  expect(counts.firstCount).toBe(2);
  expect(counts.secondCount).toBe(1);
  expect(counts.oldItemPresent).toBe(false);
});

test("Spot without memo has no-memo class and no memo element", async ({ page }) => {
  // 메모 없는 현안은 no-memo 클래스와 .spot-memo 요소 없음 확인
  await waitForHook(page);
  const result = await page.evaluate(() => {
    window.__spotListTestHooks.renderHotspotList([
      { id: "no-memo", title: "메모 없음", memo: "", dongName: "판교동", categoryId: "traffic_parking" }
    ]);
    const item = document.querySelector("[data-spot-id='no-memo']");
    return {
      hasNoMemoClass: item ? item.classList.contains("spot-item--no-memo") : null,
      hasMemoEl: Boolean(item && item.querySelector(".spot-memo"))
    };
  });
  expect(result.hasNoMemoClass).toBe(true);
  expect(result.hasMemoEl).toBe(false);
});

test("Spot with memo renders memo text", async ({ page }) => {
  // 메모 있는 현안은 .spot-memo 요소에 텍스트 렌더링 확인
  await waitForHook(page);
  const result = await page.evaluate(() => {
    window.__spotListTestHooks.renderHotspotList([
      {
        id: "has-memo",
        title: "메모 있음",
        memo: "지역 주민 의견 반영",
        dongName: "백현동",
        categoryId: "housing_infra"
      }
    ]);
    const item = document.querySelector("[data-spot-id='has-memo']");
    const memoEl = item ? item.querySelector(".spot-memo") : null;
    return {
      hasNoMemoClass: item ? item.classList.contains("spot-item--no-memo") : null,
      memoText: memoEl ? memoEl.textContent.trim() : ""
    };
  });
  expect(result.hasNoMemoClass).toBe(false);
  expect(result.memoText).toBe("지역 주민 의견 반영");
});
