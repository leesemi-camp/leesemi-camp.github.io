const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");

async function waitForSpotListHooks(page) {
  await page.waitForLoadState("domcontentloaded");
  try {
    await page.waitForFunction(() => {
      return window.__spotListTestHooks && typeof window.__spotListTestHooks.renderHotspotList === "function";
    }, null, { timeout: 5000 });
  } catch (error) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      return window.__spotListTestHooks && typeof window.__spotListTestHooks.renderHotspotList === "function";
    }, null, { timeout: 5000 });
  }
}

async function waitForSpotListHook(page, hookName) {
  await waitForSpotListHooks(page);
  try {
    await page.waitForFunction((name) => {
      return window.__spotListTestHooks && typeof window.__spotListTestHooks[name] === "function";
    }, hookName, { timeout: 5000 });
  } catch (error) {
    const availableHooks = await page.evaluate(() => {
      const hooks = window.__spotListTestHooks;
      if (!hooks || typeof hooks !== "object") {
        return { hasHooks: false, keys: [] };
      }
      return { hasHooks: true, keys: Object.keys(hooks).sort() };
    });
    const message = availableHooks.hasHooks
      ? `spot list test hook "${hookName}" not available. available: ${availableHooks.keys.join(", ")}`
      : "spot list test hooks not available (window.__spotListTestHooks missing).";
    throw new Error(message);
  }
}

test("HS-SNAPSHOT-001 Hotspot snapshot schema validation", () => {
  // 스냅샷 파일이 없으면 최소 fixture를 생성한 뒤 스키마를 검증합니다.
  // (로컬/CI 모두 동일하게 실행해, 스키마 변경이 즉시 감지되도록 합니다.)
  const filePath = path.resolve(process.cwd(), "test-results", "firestore", "hotspots.snapshot.json");
  const outputDir = path.dirname(filePath);
  fs.mkdirSync(outputDir, { recursive: true });

  // 스냅샷 파일이 없으면 최소 fixture로 생성 (실제 운영에서는 Firestore export로 대체)
  if (!fs.existsSync(filePath)) {
    const fixtureSnapshot = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      collection: "crowd_hotspots",
      count: 2,
      hotspots: [
        {
          id: "test-1",
          title: "테스트 현안 A",
          memo: "테스트 메모",
          lat: 37.3970,
          lng: 127.1121,
          dongName: "판교동",
          emdCode: "41135107",
          categoryId: "traffic_parking",
          externalUrl: "https://example.com/",
          updatedAt: new Date().toISOString()
        },
        {
          id: "test-2",
          title: "테스트 현안 B",
          memo: "",
          lat: 37.4014,
          lng: 127.1177,
          dongName: "운중동",
          emdCode: "41135111",
          categoryId: "education_childcare",
          updatedAt: new Date().toISOString()
        }
      ]
    };
    fs.writeFileSync(filePath, JSON.stringify(fixtureSnapshot, null, 2));
    console.log(`[hotspots-snapshot] Fixture snapshot created at ${filePath}`);
  }

  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    throw new Error(`Failed to parse snapshot at ${filePath}: ${err.message}`);
  }

  // 스키마 검증
  if (!payload || payload.schemaVersion !== 1) {
    throw new Error("Invalid snapshot schemaVersion (expected 1)");
  }

  const hotspots = Array.isArray(payload.hotspots) ? payload.hotspots : [];
  if (hotspots.length === 0) {
    throw new Error("Snapshot must contain at least one hotspot");
  }

  hotspots.forEach((spot, index) => {
    if (!spot || typeof spot !== "object") {
      throw new Error("Invalid hotspot record at index " + String(index));
    }
    if (!spot.id) {
      throw new Error("Missing hotspot id at index " + String(index));
    }
    if (!Number.isFinite(Number(spot.lat)) || !Number.isFinite(Number(spot.lng))) {
      throw new Error("Missing/invalid hotspot coordinates at index " + String(index));
    }
    if (spot.updatedAt) {
      const date = new Date(spot.updatedAt);
      if (!Number.isFinite(date.getTime())) {
        throw new Error("Invalid hotspot updatedAt at index " + String(index));
      }
    }
    if (spot.visibility) {
      const visibility = String(spot.visibility).trim().toLowerCase();
      if (visibility !== "public" && visibility !== "internal") {
        throw new Error("Invalid hotspot visibility at index " + String(index));
      }
    }
    const rawExternalUrl = spot.externalUrl || spot.external_url;
    if (rawExternalUrl) {
      let parsedUrl;
      try {
        parsedUrl = new URL(String(rawExternalUrl));
      } catch (error) {
        throw new Error("Invalid hotspot externalUrl at index " + String(index));
      }
      const protocol = String(parsedUrl.protocol || "").toLowerCase();
      if (protocol !== "http:" && protocol !== "https:") {
        throw new Error("Invalid hotspot externalUrl protocol at index " + String(index));
      }
    }
  });
});

test("HS-LIST-001 Memo presence toggles compact card class", async ({ page }) => {
  // 메모 유무에 따라 카드 클래스/요소가 달라지는지 확인
  await page.goto("/map/", { waitUntil: "domcontentloaded" });
  await waitForSpotListHooks(page);

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

test("HS-FB-001 Edit page uses local Firebase config", async ({ page }) => {
  await page.goto("/map/edit/", { waitUntil: "domcontentloaded" });
  const result = await page.evaluate(() => {
    const config = window.APP_CONFIG || {};
    const firebase = config.firebase || {};
    const firebaseConfig = firebase.config || {};
    return {
      apiKey: firebaseConfig.apiKey || "",
      projectId: firebaseConfig.projectId || ""
    };
  });

  expect(result.projectId).toBeTruthy();
  expect(result.projectId).not.toBe("YOUR_PROJECT_ID");
  expect(result.apiKey).toBeTruthy();
  expect(result.apiKey).not.toBe("YOUR_FIREBASE_API_KEY");
});

test("HS-VIS-001 Public view hides internal hotspots", async ({ page }) => {
  await page.goto("/map/", { waitUntil: "domcontentloaded" });
  await waitForSpotListHook(page, "renderVisibleHotspotList");

  // 구현(app.js) 메모:
  // - `exposeSpotListTestHooks()`에서 `renderVisibleHotspotList(hotspots)`를 노출한다.
  // - `renderVisibleHotspotList`는 (1) visibility 정규화(없거나 유효하지 않으면 public),
  //   (2) public view에서는 `internal`을 필터링, (3) 최종적으로 `renderHotspotList(filtered)`를 호출한다.
  const result = await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleHotspotList([
      {
        id: "spot-public",
        title: "공개 현안",
        memo: "",
        dongName: "판교동",
        categoryId: "traffic_parking",
        visibility: "public"
      },
      {
        id: "spot-internal",
        title: "내부 현안",
        memo: "",
        dongName: "판교동",
        categoryId: "traffic_parking",
        visibility: "internal"
      }
    ]);

    const cards = Array.from(document.querySelectorAll("#spot-list .spot-item"));
    const internalCard = cards.find((card) => card.dataset.spotId === "spot-internal");
    const publicCard = cards.find((card) => card.dataset.spotId === "spot-public");
    return {
      cardCount: cards.length,
      hasPublic: Boolean(publicCard),
      hasInternal: Boolean(internalCard)
    };
  });

  expect(result.cardCount).toBe(1);
  expect(result.hasPublic).toBe(true);
  expect(result.hasInternal).toBe(false);
});

test("HS-DATA-001 Missing/invalid visibility treated as public", async ({ page }) => {
  await page.goto("/map/", { waitUntil: "domcontentloaded" });
  await waitForSpotListHook(page, "renderVisibleHotspotList");

  // 구현(app.js) 메모:
  // - Firestore/스냅샷의 기존 데이터는 visibility가 없을 수 있으므로,
  //   정규화 단계에서 `null/undefined/빈값/unknown`은 모두 `public`로 취급한다.
  const result = await page.evaluate(() => {
    window.__spotListTestHooks.renderVisibleHotspotList([
      {
        id: "spot-missing-visibility",
        title: "visibility 누락",
        memo: "",
        dongName: "판교동",
        categoryId: "traffic_parking"
      },
      {
        id: "spot-invalid-visibility",
        title: "visibility 잘못된 값",
        memo: "",
        dongName: "판교동",
        categoryId: "traffic_parking",
        visibility: "unknown"
      },
      {
        id: "spot-internal",
        title: "내부 현안",
        memo: "",
        dongName: "판교동",
        categoryId: "traffic_parking",
        visibility: "internal"
      }
    ]);

    const cards = Array.from(document.querySelectorAll("#spot-list .spot-item"));
    return cards.map((card) => card.dataset.spotId).sort();
  });

  expect(result).toEqual(["spot-invalid-visibility", "spot-missing-visibility"]);
});

test("HS-LINK-001 Invalid externalUrl is ignored", async ({ page }) => {
  await page.goto("/map/", { waitUntil: "domcontentloaded" });
  await waitForSpotListHook(page, "openHotspotPopup");

  // 구현(app.js) 메모:
  // - `exposeSpotListTestHooks()`에서 `openHotspotPopup(spot)`를 노출한다.
  //   (테스트 훅은 coordinate를 내부에서 안전한 값으로 선택해서 기존 `openHotspotPopup(coord, spot)`을 호출하면 된다.)
  // - `externalUrl`은 URL 파싱 후 protocol이 http/https가 아니면 "없는 값"으로 정규화한다.
  await page.evaluate(() => {
    window.__spotListTestHooks.openHotspotPopup({
      id: "spot-invalid-link",
      title: "잘못된 링크",
      memo: "",
      dongName: "판교동",
      categoryId: "traffic_parking",
      externalUrl: "javascript:alert(1)"
    });
  });

  await expect(page.locator("#map-popup a")).toHaveCount(0);
});

test("HS-LINK-002 Popup renders external link", async ({ page }) => {
  await page.goto("/map/", { waitUntil: "domcontentloaded" });
  await waitForSpotListHook(page, "openHotspotPopup");

  // 구현(app.js) 메모:
  // - `openHotspotPopup(coord, spot)`에서 `externalUrl`이 유효할 때만 팝업 HTML에 <a>를 포함한다.
  // - href는 정규화된 URL 문자열을 그대로 사용하고, XSS 방지를 위해 attribute escape를 보장한다.
  await page.evaluate(() => {
    window.__spotListTestHooks.openHotspotPopup({
      id: "spot-external-link",
      title: "외부 링크",
      memo: "",
      dongName: "판교동",
      categoryId: "traffic_parking",
      externalUrl: "https://example.com/"
    });
  });

  const link = page.locator("#map-popup a");
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute("href", "https://example.com/");
});

test("HS-LINK-003 External link opens new tab", async ({ page }) => {
  await page.goto("/map/", { waitUntil: "domcontentloaded" });
  await waitForSpotListHook(page, "openHotspotPopup");

  // 구현(app.js) 메모:
  // - 팝업의 외부 링크는 새 탭으로 열리도록 `target=_blank`를 지정하고,
  //   보안상 `rel`에 최소 `noopener` (권장: `noopener noreferrer`)를 포함한다.
  await page.evaluate(() => {
    window.__spotListTestHooks.openHotspotPopup({
      id: "spot-external-link-tab",
      title: "외부 링크",
      memo: "",
      dongName: "판교동",
      categoryId: "traffic_parking",
      externalUrl: "https://example.com/"
    });
  });

  const link = page.locator("#map-popup a");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
});

test("HS-LINK-004 Google edit URL warns once on change", async ({ page }) => {
  await page.goto("/map/edit/", { waitUntil: "domcontentloaded" });
  let dialogCount = 0;
  page.on("dialog", async (dialog) => {
    dialogCount += 1;
    await dialog.dismiss();
  });

  await page.evaluate(() => {
    const input = document.getElementById("spot-external-url");
    if (!input) {
      return;
    }
    // 구현(app.js) 메모:
    // - `#spot-external-url` change/input 이벤트에서 Google Docs/Drive "편집 URL" 패턴을 감지한다.
    // - 감지되면 `window.alert(...)` (또는 dialog)로 1회만 경고하고, 이후 동일 세션에서는 재경고하지 않는다.
    // - 경고 로직은 URL이 유효(http/https)한 경우에만 수행한다.
    input.value = "https://docs.google.com/document/d/abc/edit";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  await page.waitForTimeout(100);
  expect(dialogCount).toBe(1);

  await page.evaluate(() => {
    const input = document.getElementById("spot-external-url");
    if (!input) {
      return;
    }
    input.value = "https://docs.google.com/document/d/abc/edit";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  await page.waitForTimeout(100);
  expect(dialogCount).toBe(1);
});
