"use strict";

(function attachHotspotModule(root, factory) {
  if (typeof module === "object" && module && typeof module.exports !== "undefined") {
    module.exports = factory();
    return;
  }
  root.HotspotModule = factory();
})(
  typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : globalThis,
  function buildHotspotModule() {
    function normalizeHotspotVisibility(value) {
      const normalized = String(value || "").trim().toLowerCase();
      if (normalized === "internal") {
        return "internal";
      }
      return "public";
    }

    function normalizeExternalUrl(value) {
      const raw = String(value || "").trim();
      if (!raw) {
        return "";
      }

      let parsed;
      try {
        parsed = new URL(raw);
      } catch (error) {
        return "";
      }

      const protocol = String(parsed.protocol || "").toLowerCase();
      if (protocol !== "http:" && protocol !== "https:") {
        return "";
      }
      return raw;
    }

    function isGoogleEditUrl(urlString) {
      let parsed;
      try {
        parsed = new URL(String(urlString));
      } catch (error) {
        return false;
      }

      const host = String(parsed.hostname || "").toLowerCase();
      if (host !== "docs.google.com" && host !== "drive.google.com") {
        return false;
      }

      const pathName = String(parsed.pathname || "").toLowerCase();
      return pathName.includes("/edit");
    }

    function normalizeHotspotRecord(input) {
      const record = input && typeof input === "object" ? input : {};
      const normalized = { ...record };

      normalized.id = String(record.id || "").trim();
      normalized.title = String(record.title || "").trim() || "현안 제목 없음";
      normalized.memo = String(record.memo || "");
      normalized.lat = Number(record.lat);
      normalized.lng = Number(record.lng);
      normalized.dongName = String(record.dongName || record.dong_name || "").trim();
      normalized.emdCode = String(record.emdCode || record.emd_cd || "").trim();
      normalized.categoryId = String(record.categoryId || record.category_id || "").trim();
      normalized.categoryLabel = String(record.categoryLabel || record.category_label || "").trim();
      normalized.issueRefId = String(record.issueRefId || record.issue_id || "").trim();
      normalized.groupLabel = String(
        record.groupLabel ||
        record.group_label ||
        record.issueGroupLabel ||
        record.issue_group_label ||
        ""
      ).trim();
      normalized.visibility = normalizeHotspotVisibility(record.visibility || record.visibility_level);
      normalized.externalUrl = normalizeExternalUrl(record.externalUrl || record.external_url);
      normalized.updatedBy = String(record.updatedBy || "");
      normalized.updatedAt = record.updatedAt || null;

      return normalized;
    }

    function mergeHotspotLists(temporary, firestore) {
      const map = new Map();
      (Array.isArray(temporary) ? temporary : []).forEach((spot) => {
        if (!spot || typeof spot !== "object") {
          return;
        }
        const id = String(spot.id || "").trim();
        if (!id) {
          return;
        }
        map.set(id, spot);
      });
      (Array.isArray(firestore) ? firestore : []).forEach((spot) => {
        if (!spot || typeof spot !== "object") {
          return;
        }
        const id = String(spot.id || "").trim();
        if (!id) {
          return;
        }
        map.set(id, spot);
      });
      return Array.from(map.values());
    }

    return {
      normalizeHotspotVisibility,
      normalizeExternalUrl,
      isGoogleEditUrl,
      normalizeHotspotRecord,
      mergeHotspotLists
    };
  }
);

