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
