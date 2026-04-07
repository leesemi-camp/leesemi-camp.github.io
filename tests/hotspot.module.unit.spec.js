const { test, expect } = require("@playwright/test");

const HotspotModule = require("../hotspot.js");

test("HotspotModule.normalizeHotspotVisibility defaults to public", () => {
  expect(HotspotModule.normalizeHotspotVisibility()).toBe("public");
  expect(HotspotModule.normalizeHotspotVisibility("")).toBe("public");
  expect(HotspotModule.normalizeHotspotVisibility("unknown")).toBe("public");
  expect(HotspotModule.normalizeHotspotVisibility("internal")).toBe("internal");
  expect(HotspotModule.normalizeHotspotVisibility(" INTERNAL ")).toBe("internal");
});

test("HotspotModule.normalizeExternalUrl accepts http/https only", () => {
  expect(HotspotModule.normalizeExternalUrl("")).toBe("");
  expect(HotspotModule.normalizeExternalUrl("   ")).toBe("");
  expect(HotspotModule.normalizeExternalUrl("javascript:alert(1)")).toBe("");
  expect(HotspotModule.normalizeExternalUrl("ftp://example.com")).toBe("");
  expect(HotspotModule.normalizeExternalUrl("https://example.com/")).toBe("https://example.com/");
  expect(HotspotModule.normalizeExternalUrl("http://example.com/a?b=c")).toBe("http://example.com/a?b=c");
});

test("HotspotModule.isGoogleEditUrl detects docs/drive edit URLs", () => {
  expect(HotspotModule.isGoogleEditUrl("")).toBe(false);
  expect(HotspotModule.isGoogleEditUrl("https://example.com/edit")).toBe(false);
  expect(HotspotModule.isGoogleEditUrl("https://docs.google.com/document/d/abc/edit")).toBe(true);
  expect(HotspotModule.isGoogleEditUrl("https://drive.google.com/file/d/abc/edit")).toBe(true);
  expect(HotspotModule.isGoogleEditUrl("https://docs.google.com/document/d/abc/view")).toBe(false);
});

test("HotspotModule.normalizeHotspotRecord supports snake_case and normalizes visibility/url", () => {
  const record = HotspotModule.normalizeHotspotRecord({
    id: "spot-1",
    title: "Test",
    memo: "Memo",
    lat: "37.1",
    lng: "127.1",
    dong_name: "판교동",
    emd_cd: "41135107",
    category_id: "traffic_parking",
    category_label: "custom",
    issue_id: "ref-1",
    group_label: "group-a",
    visibility: "unknown",
    external_url: "javascript:alert(1)",
    updatedBy: "user@example.com",
    updatedAt: "2026-04-07T00:00:00.000Z"
  });

  expect(record.id).toBe("spot-1");
  expect(record.title).toBe("Test");
  expect(record.memo).toBe("Memo");
  expect(record.lat).toBeCloseTo(37.1, 6);
  expect(record.lng).toBeCloseTo(127.1, 6);
  expect(record.dongName).toBe("판교동");
  expect(record.emdCode).toBe("41135107");
  expect(record.categoryId).toBe("traffic_parking");
  expect(record.categoryLabel).toBe("custom");
  expect(record.issueRefId).toBe("ref-1");
  expect(record.groupLabel).toBe("group-a");
  expect(record.visibility).toBe("public");
  expect(record.externalUrl).toBe("");
});

test("HotspotModule.mergeHotspotLists keeps last write per id", () => {
  const merged = HotspotModule.mergeHotspotLists(
    [
      { id: "a", title: "old" },
      { id: "b", title: "temp" }
    ],
    [
      { id: "a", title: "new" }
    ]
  );

  const byId = Object.fromEntries(merged.map((item) => [item.id, item]));
  expect(Object.keys(byId).sort()).toEqual(["a", "b"]);
  expect(byId.a.title).toBe("new");
  expect(byId.b.title).toBe("temp");
});

