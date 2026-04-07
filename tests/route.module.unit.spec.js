const { test, expect } = require("@playwright/test");

const RouteModule = require("../route.js");

test("RouteModule.sanitizeLineStringCoordinates filters invalid/out-of-range points", () => {
  const coords = RouteModule.sanitizeLineStringCoordinates([
    [127.1, 37.4],
    ["127.2", "37.5"],
    [Infinity, 0],
    [200, 0],
    [0, -100],
    [127.3],
    null
  ]);

  expect(coords).toEqual([
    [127.1, 37.4],
    [127.2, 37.5]
  ]);
});

test("RouteModule.computeLngLatBbox computes bbox from coords", () => {
  const bbox = RouteModule.computeLngLatBbox([
    [127.0, 37.5],
    [127.2, 37.4],
    [127.1, 37.6]
  ]);
  expect(bbox).toEqual([127.0, 37.4, 127.2, 37.6]);
});

test("RouteModule.normalizeRouteRecord normalizes visibility/externalUrl/geometryType", () => {
  const route = RouteModule.normalizeRouteRecord({
    id: "r1",
    title: "fallback name",
    visibility_level: "internal",
    external_url: "https://example.com/",
    coordinates: [
      [127.1, 37.4],
      [127.2, 37.5]
    ]
  });

  expect(route.id).toBe("r1");
  expect(route.name).toBe("fallback name");
  expect(route.visibility).toBe("internal");
  expect(route.externalUrl).toBe("https://example.com/");
  expect(route.geometryType).toBe("LineString");
  expect(route.coordinates.length).toBe(2);
  expect(route.bbox).toEqual([127.1, 37.4, 127.2, 37.5]);
});

