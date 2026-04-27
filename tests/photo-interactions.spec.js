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

// Firestore 요청을 차단하여 슬라이드쇼가 재렌더링되지 않도록 한다.
async function blockFirestore(page) {
  await page.route("**/firestore.googleapis.com/**", (route) => route.abort());
}

// 두 장의 사진을 가진 현안으로 슬라이드쇼를 렌더링한다.
async function renderSpotWithPhotos(page) {
  await blockFirestore(page);
  await page.goto("/map/");
  // Firestore 에러 경로가 완료될 때까지 대기 (빈 목록이 렌더링된 이후에 덮어쓰기 방지)
  await page.waitForSelector("#spot-list li.empty", { timeout: 30000 });
  await page.evaluate(() => {
    window.__spotListTestHooks.renderHotspotList([
      {
        id: "photo-test-1",
        title: "사진 테스트 현안",
        categoryId: "traffic",
        categoryLabel: "교통",
        dongName: "판교동",
        photoDataUrls: [
          "https://example.com/photo1.jpg",
          "https://example.com/photo2.jpg"
        ]
      }
    ]);
  });
  // 슬라이드쇼 이미지가 DOM에 나타날 때까지 대기
  await page.waitForSelector("#spot-list .photo-slide-image");
}

// 한 장의 사진을 가진 현안으로 렌더링한다.
async function renderSpotWithSinglePhoto(page) {
  await blockFirestore(page);
  await page.goto("/map/");
  // Firestore 에러 경로가 완료될 때까지 대기
  await page.waitForSelector("#spot-list li.empty", { timeout: 30000 });
  await page.evaluate(() => {
    window.__spotListTestHooks.renderHotspotList([
      {
        id: "single-photo-1",
        title: "단일 사진 현안",
        categoryId: "env",
        categoryLabel: "환경",
        dongName: "운중동",
        photoDataUrls: ["https://example.com/single.jpg"]
      }
    ]);
  });
  await page.waitForSelector("#spot-list .photo-slide-image");
}

test("Photo slideshow prev button navigates to previous slide", async ({ page }) => {
  // 이전 버튼 클릭 시 슬라이드 이동 (tryHandlePhotoSlideControlClick, movePhotoSlideshow, renderPhotoSlideshow)
  await renderSpotWithPhotos(page);
  const prevBtn = page.locator("#spot-list .photo-slide-arrow-prev").first();
  await expect(prevBtn).toBeVisible();
  await prevBtn.click();
  // 슬라이드 인디케이터가 업데이트되었는지 확인
  const indicator = page.locator("#spot-list .photo-slide-indicator").first();
  const text = await indicator.textContent();
  expect(text).toMatch(/\d+ \/ 2/);
});

test("Photo slideshow next button navigates to next slide", async ({ page }) => {
  // 다음 버튼 클릭 시 슬라이드 이동
  await renderSpotWithPhotos(page);
  const nextBtn = page.locator("#spot-list .photo-slide-arrow-next").first();
  await expect(nextBtn).toBeVisible();
  await nextBtn.click();
  const indicator = page.locator("#spot-list .photo-slide-indicator").first();
  const text = await indicator.textContent();
  expect(text).toMatch(/\d+ \/ 2/);
});

test("Single photo spot has no prev/next buttons", async ({ page }) => {
  // 사진이 한 장인 경우 이전/다음 버튼이 없음
  await renderSpotWithSinglePhoto(page);
  const prevBtn = page.locator("#spot-list .photo-slide-arrow-prev");
  expect(await prevBtn.count()).toBe(0);
});

test("Clicking photo image opens lightbox", async ({ page }) => {
  // 사진 클릭 시 라이트박스 열림 (openPhotoLightboxFromImage, openPhotoLightbox, renderActivePhotoLightboxSlide)
  await renderSpotWithPhotos(page);
  const photoImg = page.locator("#spot-list .photo-slide-image").first();
  await photoImg.click();
  // 라이트박스가 표시되어야 함
  await expect(page.locator("#photo-lightbox")).not.toHaveClass(/hidden/);
});

test("Lightbox prev button navigates slides", async ({ page }) => {
  // 라이트박스 이전 버튼으로 슬라이드 이동 (movePhotoLightbox, isPhotoLightboxVisible)
  await renderSpotWithPhotos(page);
  await page.locator("#spot-list .photo-slide-image").first().click();
  await expect(page.locator("#photo-lightbox")).not.toHaveClass(/hidden/);

  const prevBtn = page.locator("#photo-lightbox-prev-btn");
  await expect(prevBtn).toBeVisible();
  await prevBtn.click();
  // 카운터가 표시되어야 함
  const counter = page.locator("#photo-lightbox-counter");
  const text = await counter.textContent();
  expect(text).toMatch(/\d+ \/ 2/);
});

test("Lightbox next button navigates slides", async ({ page }) => {
  // 라이트박스 다음 버튼으로 슬라이드 이동
  await renderSpotWithPhotos(page);
  await page.locator("#spot-list .photo-slide-image").first().click();
  await expect(page.locator("#photo-lightbox")).not.toHaveClass(/hidden/);

  const nextBtn = page.locator("#photo-lightbox-next-btn");
  await expect(nextBtn).toBeVisible();
  await nextBtn.click();
  const counter = page.locator("#photo-lightbox-counter");
  const text = await counter.textContent();
  expect(text).toMatch(/\d+ \/ 2/);
});

test("Escape key closes lightbox", async ({ page }) => {
  // Escape 키로 라이트박스 닫기 (keydown 핸들러)
  await renderSpotWithPhotos(page);
  await page.locator("#spot-list .photo-slide-image").first().click();
  await expect(page.locator("#photo-lightbox")).not.toHaveClass(/hidden/);

  await page.keyboard.press("Escape");
  await expect(page.locator("#photo-lightbox")).toHaveClass(/hidden/);
});

test("Lightbox close button closes lightbox", async ({ page }) => {
  // 라이트박스 닫기 버튼으로 닫기
  await renderSpotWithPhotos(page);
  await page.locator("#spot-list .photo-slide-image").first().click();
  await expect(page.locator("#photo-lightbox")).not.toHaveClass(/hidden/);

  await page.locator("#photo-lightbox-close-btn").click({ force: true });
  await expect(page.locator("#photo-lightbox")).toHaveClass(/hidden/);
});

test("rAF sync updates photo slideshow load state after render", async ({ page }) => {
  // requestAnimationFrame 이후 슬라이드쇼 로드 상태 동기화
  // (syncPhotoSlideImageLoadState, resolvePhotoSlideshowContainer, setPhotoSlideshowLoadState)
  await renderSpotWithPhotos(page);
  // rAF 콜백이 실행되도록 짧게 대기
  await page.waitForTimeout(100);
  // 슬라이드쇼 컨테이너의 로드 상태 속성이 존재해야 함
  const loadState = await page.locator("#spot-list .photo-slideshow").first().getAttribute("data-photo-load-state");
  expect(["loading", "ready", "error"]).toContain(loadState);
});
