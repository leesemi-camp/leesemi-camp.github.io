#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DEFAULT_SNAPSHOT_PATH = "data/hotspots.public.json";
const FORBIDDEN_KEYS = new Set([
  "photoDataUrl",
  "photo_data_url",
  "createdBy",
  "created_by",
  "updatedBy",
  "updated_by"
]);
const CONTENT_TAB_ISSUES = "issues";
const CONTENT_TAB_CHANGES = "changes";
const ITEM_TYPE_ISSUE = "issue";
const ITEM_TYPE_IMPROVEMENT = "improvement";
const ITEM_TYPE_SAFETY_NOTICE = "safety_notice";
const ITEM_TYPE_LIFE_NOTICE = "life_notice";
const ISSUE_PROGRESS_STATUSES = new Set(["checking", "action_requested", "consulting"]);
const IMPROVEMENT_PROGRESS_STATUSES = new Set(["in_progress", "completed"]);
const NOTICE_PROGRESS_STATUSES = new Set(["active", "ended"]);

function readSnapshot(snapshotPath) {
  const text = fs.readFileSync(snapshotPath, "utf8");
  return {
    text,
    payload: JSON.parse(text)
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function findForbiddenKey(value, trail = []) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenKey(value[index], trail.concat(String(index)));
      if (found) {
        return found;
      }
    }
    return "";
  }

  if (!isPlainObject(value)) {
    return "";
  }

  for (const [key, child] of Object.entries(value)) {
    const childTrail = trail.concat(key);
    if (FORBIDDEN_KEYS.has(key)) {
      return childTrail.join(".");
    }
    const found = findForbiddenKey(child, childTrail);
    if (found) {
      return found;
    }
  }
  return "";
}

function assertOptionalString(value, fieldName) {
  assert(value === undefined || typeof value === "string", `${fieldName} must be a string when present.`);
}

function normalizeToken(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function normalizeContentTab(value) {
  const token = normalizeToken(value);
  if (!token) {
    return "";
  }
  if (token === CONTENT_TAB_ISSUES || token === "issue" || token === "현안") {
    return CONTENT_TAB_ISSUES;
  }
  if (
    token === CONTENT_TAB_CHANGES ||
    token === "change" ||
    token === "achievements" ||
    token === "achievement" ||
    token === "성과" ||
    token === "변화" ||
    token === "개선" ||
    token === "완료"
  ) {
    return CONTENT_TAB_CHANGES;
  }
  return "__invalid__";
}

function normalizeItemType(value) {
  const token = normalizeToken(value);
  if (!token) {
    return "";
  }
  if (token === ITEM_TYPE_ISSUE || token === "현안") {
    return ITEM_TYPE_ISSUE;
  }
  if (token === ITEM_TYPE_IMPROVEMENT || token === "improvements" || token === "개선") {
    return ITEM_TYPE_IMPROVEMENT;
  }
  if (token === "safetynotice" || token === "안전안내") {
    return ITEM_TYPE_SAFETY_NOTICE;
  }
  if (token === "lifenotice" || token === "생활안내") {
    return ITEM_TYPE_LIFE_NOTICE;
  }
  return "__invalid__";
}

function normalizeProgressStatus(value) {
  const token = normalizeToken(value);
  if (!token) {
    return "";
  }
  const normalized = {
    checking: "checking",
    확인중: "checking",
    actionrequested: "action_requested",
    조치요청: "action_requested",
    consulting: "consulting",
    협의중: "consulting",
    inprogress: "in_progress",
    추진중: "in_progress",
    completed: "completed",
    complete: "completed",
    개선완료: "completed",
    완료: "completed",
    active: "active",
    안내중: "active",
    ended: "ended",
    종료: "ended"
  }[token];
  return normalized || "__invalid__";
}

function assertValidClassification(hotspot, label) {
  const contentTab = normalizeContentTab(hotspot.contentTab);
  const itemType = normalizeItemType(hotspot.itemType);
  const progressStatus = normalizeProgressStatus(hotspot.progressStatus);
  assert(contentTab !== "__invalid__", `${label}.contentTab has an unsupported value.`);
  assert(itemType !== "__invalid__", `${label}.itemType has an unsupported value.`);
  assert(progressStatus !== "__invalid__", `${label}.progressStatus has an unsupported value.`);

  if (!itemType && !progressStatus) {
    return;
  }
  assert(contentTab, `${label}.contentTab is required when itemType/progressStatus is set.`);
  assert(itemType, `${label}.itemType is required when progressStatus is set.`);
  assert(progressStatus, `${label}.progressStatus is required when itemType is set.`);

  if (contentTab === CONTENT_TAB_ISSUES) {
    assert(itemType === ITEM_TYPE_ISSUE, `${label} issues entries must use itemType=issue.`);
    assert(ISSUE_PROGRESS_STATUSES.has(progressStatus), `${label} has an invalid issue progressStatus.`);
    return;
  }
  if (itemType === ITEM_TYPE_IMPROVEMENT) {
    assert(IMPROVEMENT_PROGRESS_STATUSES.has(progressStatus), `${label} has an invalid improvement progressStatus.`);
    return;
  }
  assert(
    itemType === ITEM_TYPE_SAFETY_NOTICE || itemType === ITEM_TYPE_LIFE_NOTICE,
    `${label} changes entries must use improvement, safety_notice, or life_notice.`
  );
  assert(NOTICE_PROGRESS_STATUSES.has(progressStatus), `${label} has an invalid notice progressStatus.`);
}

function assertValidHotspot(hotspot, index) {
  const label = `hotspots[${index}]`;
  assert(isPlainObject(hotspot), `${label} must be an object.`);
  assert(typeof hotspot.id === "string" && hotspot.id.trim(), `${label}.id must be a non-empty string.`);
  assert(Number.isFinite(Number(hotspot.lat)), `${label}.lat must be numeric.`);
  assert(Number.isFinite(Number(hotspot.lng)), `${label}.lng must be numeric.`);

  [
    "issueRefId",
    "title",
    "memo",
    "contentTab",
    "itemType",
    "progressStatus",
    "categoryId",
    "categoryLabel",
    "dongName",
    "emdCode",
    "dongSelectionMode",
    "dongKey",
    "groupLabel",
    "photoUrl",
    "updatedAt"
  ].forEach((fieldName) => assertOptionalString(hotspot[fieldName], `${label}.${fieldName}`));
  assertValidClassification(hotspot, label);

  assert(
    hotspot.photoUrls === undefined || Array.isArray(hotspot.photoUrls),
    `${label}.photoUrls must be an array when present.`
  );

  const photoUrls = Array.isArray(hotspot.photoUrls) ? hotspot.photoUrls : [];
  photoUrls.forEach((photoUrl, photoIndex) => {
    assert(typeof photoUrl === "string", `${label}.photoUrls[${photoIndex}] must be a string.`);
    assert(/^https?:\/\//.test(photoUrl), `${label}.photoUrls[${photoIndex}] must be an http(s) URL.`);
    assert(!photoUrl.startsWith("data:image/"), `${label}.photoUrls[${photoIndex}] must not be inline base64 data.`);
  });
}

function validateSnapshot(snapshotPath) {
  const { text, payload } = readSnapshot(snapshotPath);
  assert(isPlainObject(payload), "Snapshot root must be an object.");
  assert(payload.source === "firestore", `Unexpected snapshot source: ${payload.source}`);
  assert(typeof payload.collection === "string" && payload.collection.trim(), "Snapshot collection must be set.");
  assert(Array.isArray(payload.hotspots), "Snapshot hotspots must be an array.");
  assert(payload.count === payload.hotspots.length, `Snapshot count mismatch: ${payload.count} !== ${payload.hotspots.length}`);
  assert(!text.includes("data:image/"), "Snapshot contains inline base64 image data.");

  const forbiddenPath = findForbiddenKey(payload);
  assert(!forbiddenPath, `Forbidden field exported: ${forbiddenPath}`);

  payload.hotspots.forEach(assertValidHotspot);
  console.log(`Validated ${payload.hotspots.length} public hotspots from ${snapshotPath}.`);
}

const snapshotPath = path.resolve(process.argv[2] || DEFAULT_SNAPSHOT_PATH);

try {
  validateSnapshot(snapshotPath);
} catch (error) {
  console.error("[validate-hotspots]", error && error.message ? error.message : String(error));
  process.exit(1);
}
