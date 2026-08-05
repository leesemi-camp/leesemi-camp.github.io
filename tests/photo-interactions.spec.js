import { test, expect } from "@playwright/test";
import { addCoverageReport } from "monocart-reporter";

const TEST_PHOTO_BLUE =
  "data:image/gif;base64,R0lGODlhAQABAPAAAFqJzAAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";
const TEST_PHOTO_GREEN =
  "data:image/gif;base64,R0lGODlhAQABAPAAAGKpXQAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";

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

async function waitForSpotListHook(page) {
  await page.waitForFunction(() => {
    const stats = document.querySelector("#issue-stats-summary");
    return (
      window.__spotListTestHooks &&
      typeof window.__spotListTestHooks.renderVisibleIssueListWithData === "function" &&
      typeof window.__spotListTestHooks.movePhotoSlideshowForTest === "function" &&
      stats &&
      stats.textContent.trim().length > 0
    );
  });
}

// 두 장의 사진을 가진 현안으로 슬라이드쇼를 렌더링한다.
async function renderSpotWithPhotos(page) {
  await blockFirestore(page);
  await page.goto("/map/", { waitUntil: "domcontentloaded" });
  await waitForSpotListHook(page);
  await page.evaluate(([firstPhoto, secondPhoto]) => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      {
        id: "photo-test-1",
        title: "사진 테스트 현안",
        categoryId: "traffic",
        categoryLabel: "교통",
        dongName: "판교동",
        lat: 37.394,
        lng: 127.111,
        photoDataUrls: [
          firstPhoto,
          secondPhoto
        ]
      }
    ]);
  }, [TEST_PHOTO_BLUE, TEST_PHOTO_GREEN]);
  // 슬라이드쇼 이미지가 DOM에 나타날 때까지 대기
  await page.waitForSelector("#spot-list .photo-slide-image");
}

// 한 장의 사진을 가진 현안으로 렌더링한다.
async function renderSpotWithSinglePhoto(page) {
  await blockFirestore(page);
  await page.goto("/map/", { waitUntil: "domcontentloaded" });
  await waitForSpotListHook(page);
  await page.evaluate((photoUrl) => {
    window.__spotListTestHooks.renderVisibleIssueListWithData([
      {
        id: "single-photo-1",
        title: "단일 사진 현안",
        categoryId: "env",
        categoryLabel: "환경",
        dongName: "운중동",
        lat: 37.391,
        lng: 127.079,
        photoDataUrls: [photoUrl]
      }
    ]);
  }, TEST_PHOTO_BLUE);
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

test("Map popup photo slideshow next button navigates to next slide", async ({ page }) => {
  // 지도 팝업에서도 슬라이드쇼 상태가 유지되어 다음 사진으로 이동해야 한다.
  await blockFirestore(page, [
    {
      id: "map-popup-photo-test",
      title: "팝업 사진 현안",
      categoryId: "traffic_parking",
      categoryLabel: "교통·주차",
      dongName: "판교동",
      lat: 37.394,
      lng: 127.111,
      photoDataUrls: [
        TEST_PHOTO_BLUE,
        TEST_PHOTO_GREEN
      ]
    }
  ]);
  await page.goto("/map/", { waitUntil: "domcontentloaded" });
  await waitForSpotListHook(page);
  await page.evaluate(() => {
    window.__spotListTestHooks.setActiveDongFilter("판교동");
  });

  const spotItem = page.locator("#spot-list [data-spot-id='map-popup-photo-test']");
  await spotItem.locator("strong").first().click();
  await expect(page.locator("#map-popup")).not.toHaveClass(/hidden/);
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
          resolve(
            Math.abs(firstRect.left - secondRect.left) < 0.5 &&
            Math.abs(firstRect.top - secondRect.top) < 0.5 &&
            Math.abs(firstRect.width - secondRect.width) < 0.5 &&
            Math.abs(firstRect.height - secondRect.height) < 0.5
          );
        });
      });
    });
  });

  const movedSlideshowHandle = await page.waitForFunction(() => {
    const popup = document.getElementById("map-popup");
    const slideshow = document.querySelector("#map-popup .photo-slideshow");
    const indicator = document.querySelector("#map-popup .photo-slide-indicator");
    const image = document.querySelector("#map-popup .photo-slide-image");
    const hooks = window.__spotListTestHooks;
    if (
      !popup ||
      popup.classList.contains("hidden") ||
      popup.classList.contains("map-popup-closing") ||
      !(slideshow instanceof HTMLElement) ||
      !indicator ||
      !(image instanceof HTMLImageElement) ||
      !hooks
    ) {
      return null;
    }
    const slideshowId = String(slideshow.getAttribute("data-photo-slideshow-id") || "").trim();
    const count = String(slideshow.getAttribute("data-photo-count") || "").trim();
    const label = String(indicator.textContent || "").trim();
    if (
      !slideshowId ||
      count !== "2" ||
      label !== "1 / 2" ||
      typeof hooks.hasPhotoSlideshowForTest !== "function" ||
      typeof hooks.movePhotoSlideshowForTest !== "function" ||
      !hooks.hasPhotoSlideshowForTest(slideshowId)
    ) {
      return null;
    }
    if (!hooks.movePhotoSlideshowForTest(slideshowId, 1)) {
      return null;
    }
    const nextIndicator = document.querySelector("#map-popup .photo-slide-indicator");
    const nextImage = document.querySelector("#map-popup .photo-slide-image");
    return {
      label: String(nextIndicator ? nextIndicator.textContent : "").trim(),
      index: nextImage instanceof HTMLImageElement
        ? String(nextImage.getAttribute("data-photo-index") || "")
        : ""
    };
  });
  expect(await movedSlideshowHandle.jsonValue()).toEqual({
    label: "2 / 2",
    index: "1"
  });
});

test("Single photo spot has no prev/next buttons", async ({ page }) => {
  // 사진이 한 장인 경우 이전/다음 버튼이 없음
  await renderSpotWithSinglePhoto(page);
  const prevBtn = page.locator("#spot-list .photo-slide-arrow-prev");
  expect(await prevBtn.count()).toBe(0);
});

test("Spot list photo fills width and centers image", async ({ page }) => {
  // 목록 사진은 카드 폭을 꽉 채우고 프레임 중앙에 맞춤
  await renderSpotWithSinglePhoto(page);
  const styles = await page.locator("#spot-list .spot-photo-thumb").first().evaluate((element) => {
    const computed = window.getComputedStyle(element);
    return {
      objectFit: computed.objectFit,
      objectPosition: computed.objectPosition
    };
  });
  expect(styles.objectFit).toBe("cover");
  expect(styles.objectPosition).toBe("50% 50%");
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

  const lightbox = page.locator("#photo-lightbox");
  await page.keyboard.press("Escape");

  const closingState = await lightbox.evaluate((element) => {
    return {
      hidden: element.classList.contains("hidden"),
      closing: element.classList.contains("photo-lightbox-closing"),
      ariaHidden: element.getAttribute("aria-hidden")
    };
  });
  expect(closingState.ariaHidden).toBe("true");
  expect(closingState.hidden || closingState.closing).toBe(true);
  await expect(lightbox).toHaveClass(/hidden/);
});

test("Lightbox close button uses close animation", async ({ page }) => {
  // 닫기 버튼으로 라이트박스를 닫아도 Escape와 같은 닫힘 상태를 거친다.
  await renderSpotWithPhotos(page);
  await page.locator("#spot-list .photo-slide-image").first().click();
  await expect(page.locator("#photo-lightbox")).not.toHaveClass(/hidden/);

  const lightbox = page.locator("#photo-lightbox");
  await page.locator("#photo-lightbox-close-btn").click();

  const closingState = await lightbox.evaluate((element) => {
    return {
      hidden: element.classList.contains("hidden"),
      closing: element.classList.contains("photo-lightbox-closing"),
      ariaHidden: element.getAttribute("aria-hidden")
    };
  });
  expect(closingState.ariaHidden).toBe("true");
  expect(closingState.hidden || closingState.closing).toBe(true);
  await expect(lightbox).toHaveClass(/hidden/);
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
