const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");

function validateRouteSnapshotPayload(payload, label) {
  if (!payload || payload.schemaVersion !== 1) {
    throw new Error(`${label}: invalid schemaVersion (expected 1)`);
  }

  const routes = Array.isArray(payload.routes) ? payload.routes : [];
  if (routes.length === 0) {
    throw new Error(`${label}: must contain at least one route`);
  }

  routes.forEach((route, index) => {
    if (!route || typeof route !== "object") {
      throw new Error(`${label}: invalid route record at index ` + String(index));
    }
    if (!route.id) {
      throw new Error(`${label}: missing route id at index ` + String(index));
    }
    if (!route.name) {
      throw new Error(`${label}: missing route name at index ` + String(index));
    }
    if (route.geometryType !== "LineString") {
      throw new Error(`${label}: invalid geometryType at index ` + String(index));
    }
    const coords = Array.isArray(route.coordinates) ? route.coordinates : [];
    if (coords.length < 2) {
      throw new Error(`${label}: route must have at least 2 coordinates at index ` + String(index));
    }
    coords.forEach((pair) => {
      if (!Array.isArray(pair) || pair.length < 2) {
        throw new Error(`${label}: invalid coordinate pair at index ` + String(index));
      }
      const lng = Number(pair[0]);
      const lat = Number(pair[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        throw new Error(`${label}: invalid coordinate numbers at index ` + String(index));
      }
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        throw new Error(`${label}: coordinate out of range at index ` + String(index));
      }
    });

    const bbox = Array.isArray(route.bbox) ? route.bbox : [];
    if (bbox.length !== 4 || !bbox.every((value) => Number.isFinite(Number(value)))) {
      throw new Error(`${label}: invalid bbox at index ` + String(index));
    }

    if (route.visibility) {
      const visibility = String(route.visibility).trim().toLowerCase();
      if (visibility !== "public" && visibility !== "internal") {
        throw new Error(`${label}: invalid route visibility at index ` + String(index));
      }
    }

    if (route.externalUrl) {
      let parsedUrl;
      try {
        parsedUrl = new URL(String(route.externalUrl));
      } catch (error) {
        throw new Error(`${label}: invalid route externalUrl at index ` + String(index));
      }
      const protocol = String(parsedUrl.protocol || "").toLowerCase();
      if (protocol !== "http:" && protocol !== "https:") {
        throw new Error(`${label}: invalid route externalUrl protocol at index ` + String(index));
      }
    }
  });
}

async function waitForRouteListHooks(page) {
  await page.waitForLoadState("domcontentloaded");
  try {
    await page.waitForFunction(() => {
      return window.__routeListTestHooks && typeof window.__routeListTestHooks.renderRouteList === "function";
    }, null, { timeout: 5000 });
  } catch (error) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      return window.__routeListTestHooks && typeof window.__routeListTestHooks.renderRouteList === "function";
    }, null, { timeout: 5000 });
  }
}

async function waitForRouteListHook(page, hookName) {
  await waitForRouteListHooks(page);
  try {
    await page.waitForFunction((name) => {
      return window.__routeListTestHooks && typeof window.__routeListTestHooks[name] === "function";
    }, hookName, { timeout: 5000 });
  } catch (error) {
    const availableHooks = await page.evaluate(() => {
      const hooks = window.__routeListTestHooks;
      if (!hooks || typeof hooks !== "object") {
        return { hasHooks: false, keys: [] };
      }
      return { hasHooks: true, keys: Object.keys(hooks).sort() };
    });
    const message = availableHooks.hasHooks
      ? `route list test hook "${hookName}" not available. available: ${availableHooks.keys.join(", ")}`
      : "route list test hooks not available (window.__routeListTestHooks missing).";
    throw new Error(message);
  }
}

test("RT-SCHEMA-001 Temporary routes dataset matches schema", () => {
  const schemaPath = path.resolve(process.cwd(), "data", "route.schema.json");
  const dataPath = path.resolve(process.cwd(), "data", "temporary-routes.json");

  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  expect(schema && schema.type).toBe("object");
  expect(schema && schema.title).toBeTruthy();

  const payload = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  validateRouteSnapshotPayload(payload, "temporary-routes");
  expect(payload.count).toBe(payload.routes.length);
});

test("RT-UI-001 Route tab toggles panel visibility", async ({ page }) => {
  await page.goto("/map/", { waitUntil: "domcontentloaded" });
  await waitForRouteListHook(page, "setActivePanelTab");

  await page.click("#panel-tab-routes");
  await expect(page.locator("#panel-routes")).not.toHaveClass(/hidden/);
  await expect(page.locator("#panel-hotspots")).toHaveClass(/hidden/);
});

test("RT-VIS-001 Public view hides internal routes", async ({ page }) => {
  await page.goto("/map/", { waitUntil: "domcontentloaded" });
  await waitForRouteListHook(page, "renderVisibleRouteList");

  const result = await page.evaluate(() => {
    window.__routeListTestHooks.renderVisibleRouteList([
      {
        id: "route-public",
        name: "공개 경로",
        memo: "",
        categoryId: "traffic_parking",
        visibility: "public",
        geometryType: "LineString",
        coordinates: [
          [127.111, 37.394],
          [127.112, 37.395]
        ],
        bbox: [127.111, 37.394, 127.112, 37.395]
      },
      {
        id: "route-internal",
        name: "내부 경로",
        memo: "",
        categoryId: "traffic_parking",
        visibility: "internal",
        geometryType: "LineString",
        coordinates: [
          [127.113, 37.394],
          [127.114, 37.395]
        ],
        bbox: [127.113, 37.394, 127.114, 37.395]
      }
    ]);

    const cards = Array.from(document.querySelectorAll("#route-list .spot-item"));
    return cards.map((card) => card.dataset.routeId).sort();
  });

  expect(result).toEqual(["route-public"]);
});

test("RT-LIST-001 Memo presence toggles compact card class", async ({ page }) => {
  await page.goto("/map/", { waitUntil: "domcontentloaded" });
  await waitForRouteListHooks(page);

  const routes = [
    {
      id: "route-with-memo",
      name: "메모 있는 경로",
      memo: "주민 의견 접수 완료",
      categoryId: "traffic_parking",
      geometryType: "LineString",
      coordinates: [
        [127.111, 37.394],
        [127.112, 37.395]
      ],
      bbox: [127.111, 37.394, 127.112, 37.395]
    },
    {
      id: "route-without-memo",
      name: "메모 없는 경로",
      memo: "   ",
      categoryId: "education_childcare",
      geometryType: "LineString",
      coordinates: [
        [127.113, 37.394],
        [127.114, 37.395]
      ],
      bbox: [127.113, 37.394, 127.114, 37.395]
    }
  ];

  const result = await page.evaluate((items) => {
    window.__routeListTestHooks.renderRouteList(items);
    const cards = Array.from(document.querySelectorAll("#route-list .spot-item"));
    const memoCard = cards.find((card) => card.dataset.routeId === "route-with-memo");
    const noMemoCard = cards.find((card) => card.dataset.routeId === "route-without-memo");
    return {
      cardCount: cards.length,
      memoHasNoMemoClass: memoCard ? memoCard.classList.contains("spot-item--no-memo") : null,
      noMemoHasNoMemoClass: noMemoCard ? noMemoCard.classList.contains("spot-item--no-memo") : null
    };
  }, routes);

  expect(result.cardCount).toBe(2);
  expect(result.memoHasNoMemoClass).toBe(false);
  expect(result.noMemoHasNoMemoClass).toBe(true);
});

test("RT-LINK-001 Invalid externalUrl is ignored", async ({ page }) => {
  await page.goto("/map/", { waitUntil: "domcontentloaded" });
  await waitForRouteListHook(page, "openRoutePopup");

  await page.evaluate(() => {
    window.__routeListTestHooks.openRoutePopup({
      id: "route-invalid-link",
      name: "잘못된 링크",
      memo: "",
      categoryId: "traffic_parking",
      externalUrl: "javascript:alert(1)",
      geometryType: "LineString",
      coordinates: [
        [127.111, 37.394],
        [127.112, 37.395]
      ],
      bbox: [127.111, 37.394, 127.112, 37.395]
    });
  });

  await expect(page.locator("#map-popup a")).toHaveCount(0);
});

