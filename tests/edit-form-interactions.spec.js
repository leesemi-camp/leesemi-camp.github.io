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

test("Edit page form has title input", async ({ page }) => {
  // 편집 페이지에 현안명 입력 필드가 있음
  await page.goto("/map/edit/");
  await expect(page.locator("#spot-title")).toBeAttached();
});

test("Edit page category select has all 6 options", async ({ page }) => {
  // 현안 분류 선택 드롭다운에 6가지 카테고리가 있음
  await page.goto("/map/edit/");
  const optionCount = await page.locator("#spot-category option").count();
  expect(optionCount).toBe(6);
});

test("Edit page category options include traffic_parking", async ({ page }) => {
  // 교통·주차 옵션이 드롭다운에 포함됨
  await page.goto("/map/edit/");
  const trafficOption = page.locator("#spot-category option[value='traffic_parking']");
  await expect(trafficOption).toBeAttached();
  const text = await trafficOption.textContent();
  expect(text).toContain("교통");
});

test("Edit page content tab uses changes value", async ({ page }) => {
  // 변화 탭은 신규 저장값 changes를 사용함
  await page.goto("/map/edit/");
  const changeOption = page.locator("#spot-content-tab option[value='changes']");
  await expect(changeOption).toBeAttached();
  await expect(changeOption).toHaveText("우리동네 변화");
});

test("Edit page hides item type for issue tab", async ({ page }) => {
  // 현안 탭에서는 게시물 성격을 고정하므로 필드를 숨김
  await page.goto("/map/edit/");
  await expect(page.locator("#spot-progress-status option")).toHaveCount(3);
  await page.evaluate(() => {
    const select = document.querySelector("#spot-content-tab");
    select.value = "issues";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.locator("#spot-item-type-field")).toHaveClass(/hidden/);
  await expect(page.locator("#spot-progress-status option")).toHaveText(["확인 중", "조치 요청", "협의 중"]);
});

test("Edit page changes item type controls progress statuses", async ({ page }) => {
  // 변화 탭에서는 게시물 성격에 따라 진행 상태 옵션이 바뀜
  await page.goto("/map/edit/");
  await expect(page.locator("#spot-progress-status option")).toHaveCount(3);
  await page.evaluate(() => {
    const select = document.querySelector("#spot-content-tab");
    select.value = "changes";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.locator("#spot-item-type-field")).not.toHaveClass(/hidden/);
  await expect(page.locator("#spot-item-type option")).toHaveText(["개선", "안전 안내", "생활 안내"]);
  await expect(page.locator("#spot-progress-status option")).toHaveText(["추진 중", "개선 완료"]);

  await page.evaluate(() => {
    const select = document.querySelector("#spot-item-type");
    select.value = "safety_notice";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.locator("#spot-progress-status option")).toHaveText(["안내 중", "종료"]);
  await expect(page.locator("#spot-progress-status")).toHaveValue("active");
});

test("Edit page dong select has auto option", async ({ page }) => {
  // 동 선택 드롭다운에 '좌표 기준 자동 판별' 옵션이 있음
  await page.goto("/map/edit/");
  const autoOption = page.locator("#spot-dong option[value='__auto__']");
  await expect(autoOption).toBeAttached();
  const text = await autoOption.textContent();
  expect(text).toContain("자동 판별");
});

test("Edit page dong select has common option", async ({ page }) => {
  // 동 선택 드롭다운에 '공통' 옵션이 있음
  await page.goto("/map/edit/");
  const commonOption = page.locator("#spot-dong option[value='__common__']");
  await expect(commonOption).toBeAttached();
  const text = await commonOption.textContent();
  expect(text).toContain("공통");
});

test("Edit page memo textarea exists", async ({ page }) => {
  // 현안 내용 텍스트에어리어가 있음
  await page.goto("/map/edit/");
  await expect(page.locator("#spot-memo")).toBeAttached();
});

test("Edit page coord box shows no-coord message initially", async ({ page }) => {
  // 초기 상태에서 좌표 미선택 메시지가 표시됨
  await page.goto("/map/edit/");
  await expect(page.locator("#login-panel")).toBeVisible();
  const coordBox = page.locator("#selected-coord");
  await expect(coordBox).toBeAttached();
  const text = await coordBox.textContent();
  expect(text).toContain("좌표 미선택");
});

test("Edit page submit button exists", async ({ page }) => {
  // 현안 저장 버튼이 있음
  await page.goto("/map/edit/");
  await expect(page.locator("#spot-submit-btn")).toBeAttached();
});

test("Edit page photo file input accepts images", async ({ page }) => {
  // 사진 파일 입력이 이미지를 받도록 설정됨
  await page.goto("/map/edit/");
  const fileInput = page.locator("#spot-photo-file");
  await expect(fileInput).toBeAttached();
  const accept = await fileInput.getAttribute("accept");
  expect(accept).toContain("image");
});

test("Edit page photo preview wrap is initially hidden", async ({ page }) => {
  // 사진 미리보기 래퍼가 초기에는 숨겨져 있음
  await page.goto("/map/edit/");
  await expect(page.locator("#spot-photo-preview-wrap")).toHaveClass(/hidden/);
});

test("Edit page spot form cancel button is initially hidden", async ({ page }) => {
  // 수정 취소 버튼이 초기에는 숨겨져 있음
  await page.goto("/map/edit/");
  const cancelBtn = page.locator("#spot-cancel-edit-btn");
  await expect(cancelBtn).toHaveClass(/hidden/);
});

test("Edit page use current location button exists", async ({ page }) => {
  // 내 위치 불러오기 버튼이 있음
  await page.goto("/map/edit/");
  await expect(page.locator("#use-current-location-btn")).toBeAttached();
});

test("Edit page clear coord button exists", async ({ page }) => {
  // 좌표 해제 버튼이 있음
  await page.goto("/map/edit/");
  await expect(page.locator("#clear-coord-btn")).toBeAttached();
});

test("Edit page status text changes from initializing message", async ({ page }) => {
  // 상태 텍스트가 '초기화 중...'에서 다른 메시지로 변경됨
  await page.goto("/map/edit/");
  await page.waitForFunction(() => {
    const el = document.getElementById("status-text");
    return el && el.textContent.trim() !== "초기화 중..." && el.textContent.trim().length > 0;
  }, { timeout: 15000 });
  const statusText = await page.locator("#status-text").textContent();
  expect(statusText.trim().length).toBeGreaterThan(0);
  expect(statusText).not.toBe("초기화 중...");
});

test("Edit page spot list element is present", async ({ page }) => {
  // 편집 페이지에 현안 목록 요소가 있음
  await page.goto("/map/edit/");
  await expect(page.locator("#spot-list")).toBeAttached();
});

test("Edit page issue-stats-summary element is present", async ({ page }) => {
  // 편집 페이지에 현안 통계 요약 요소가 있음
  await page.goto("/map/edit/");
  await expect(page.locator("#issue-stats-summary")).toBeAttached();
});

test("Edit page common pledge list element is present", async ({ page }) => {
  // 편집 페이지에 공통 현안 목록 요소가 있음
  await page.goto("/map/edit/");
  await expect(page.locator("#common-pledge-list")).toBeAttached();
});

test("Edit page mobile backdrop element is present", async ({ page }) => {
  // 모바일 폼 백드롭 요소가 있음
  await page.goto("/map/edit/");
  await expect(page.locator("#mobile-form-backdrop")).toBeAttached();
});

test("Edit page issue-helper toggle exists", async ({ page }) => {
  // 편집 페이지에도 현안 안내 토글 버튼이 있음
  await page.goto("/map/edit/");
  await expect(page.locator("#issue-helper-toggle")).toBeAttached();
});

test("Edit page spot form close button exists", async ({ page }) => {
  // 현안 등록 폼 닫기 버튼이 있음
  await page.goto("/map/edit/");
  await expect(page.locator("#spot-form-close-btn")).toBeAttached();
});
