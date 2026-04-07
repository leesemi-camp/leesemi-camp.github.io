"use strict";

(function attachRouteModule(root, factory) {
  if (typeof module === "object" && module && typeof module.exports !== "undefined") {
    module.exports = factory();
    return;
  }
  root.RouteModule = factory();
})(
  typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : globalThis,
  function buildRouteModule() {
    function normalizeRouteVisibility(value) {
      const normalized = String(value || "").trim().toLowerCase();
      if (normalized === "internal") {
        return "internal";
      }
      return "public";
    }

    function isValidExternalUrl(value) {
      const raw = String(value || "").trim();
      if (!raw) {
        return false;
      }
      let parsed;
      try {
        parsed = new URL(raw);
      } catch (error) {
        return false;
      }
      const protocol = String(parsed.protocol || "").toLowerCase();
      return protocol === "http:" || protocol === "https:";
    }

    function sanitizeLineStringCoordinates(coords) {
      const list = Array.isArray(coords) ? coords : [];
      const sanitized = [];
      for (const item of list) {
        if (!Array.isArray(item) || item.length < 2) {
          continue;
        }
        const lng = Number(item[0]);
        const lat = Number(item[1]);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
          continue;
        }
        if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
          continue;
        }
        sanitized.push([lng, lat]);
      }
      return sanitized;
    }

    function computeLngLatBbox(coords) {
      const list = sanitizeLineStringCoordinates(coords);
      if (list.length === 0) {
        return [0, 0, 0, 0];
      }
      let minLng = list[0][0];
      let minLat = list[0][1];
      let maxLng = list[0][0];
      let maxLat = list[0][1];
      for (let i = 1; i < list.length; i += 1) {
        const lng = list[i][0];
        const lat = list[i][1];
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      }
      return [minLng, minLat, maxLng, maxLat];
    }

    function normalizeRouteRecord(input) {
      const record = input && typeof input === "object" ? input : {};
      const id = String(record.id || "").trim();
      const name = String(record.name || record.title || "").trim();
      const memo = String(record.memo || "");
      const categoryId = String(record.categoryId || record.category_id || "").trim();
      const categoryLabel = String(record.categoryLabel || record.category_label || "").trim();
      const visibility = normalizeRouteVisibility(record.visibility || record.visibility_level);
      const externalUrl = isValidExternalUrl(record.externalUrl || record.external_url)
        ? String(record.externalUrl || record.external_url).trim()
        : "";
      const geometryType = "LineString";
      const coordinates = sanitizeLineStringCoordinates(record.coordinates);
      const bbox = computeLngLatBbox(coordinates);

      return {
        id,
        name: name || "경로 이름 없음",
        memo,
        categoryId,
        categoryLabel,
        externalUrl,
        visibility,
        geometryType,
        coordinates,
        bbox,
        updatedBy: String(record.updatedBy || ""),
        updatedAt: record.updatedAt || null
      };
    }

    return {
      normalizeRouteVisibility,
      isValidExternalUrl,
      sanitizeLineStringCoordinates,
      computeLngLatBbox,
      normalizeRouteRecord
    };
  }
);

