#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createSign } from "node:crypto";
import APP_CONFIG from "../config.js";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";
const DEFAULT_OUTPUT_PATH = "data/hotspots.public.json";
const DEFAULT_PAGE_SIZE = 1000;
const CONTENT_TAB_ISSUES = "issues";
const CONTENT_TAB_CHANGES = "changes";
const CONTENT_TAB_NOTICES = "notices";
const ITEM_TYPE_ISSUE = "issue";
const ITEM_TYPE_IMPROVEMENT = "improvement";
const ITEM_TYPE_NOTICE = "notice";
const PROGRESS_STATUS_CHECKING = "checking";
const PROGRESS_STATUS_COMPLETED = "completed";

const PUBLIC_FIELD_MASKS = [
  "title",
  "memo",
  "level",
  "contentTab",
  "content_tab",
  "mapTab",
  "map_tab",
  "displayTab",
  "display_tab",
  "status",
  "itemType",
  "item_type",
  "progressStatus",
  "progress_status",
  "categoryId",
  "categoryLabel",
  "category_id",
  "category_label",
  "issueRefId",
  "issue_id",
  "lat",
  "lng",
  "dongName",
  "dong_name",
  "emdCode",
  "emd_cd",
  "dongSelectionMode",
  "dongKey",
  "groupLabel",
  "group_label",
  "issueGroupLabel",
  "issue_group_label",
  "photoUrls",
  "photoUrl",
  "photo_urls",
  "photo_url",
  "photoProcessingVersion",
  "photo_processing_version",
  "updatedAt"
];

function parseArgs(argv) {
  const result = {
    outputPath: DEFAULT_OUTPUT_PATH,
    projectId: "",
    collectionName: "",
    serviceAccountPath: ""
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index] || "");
    const next = String(argv[index + 1] || "");
    if (token === "--out") {
      result.outputPath = next;
      index += 1;
      continue;
    }
    if (token === "--project-id") {
      result.projectId = next;
      index += 1;
      continue;
    }
    if (token === "--collection") {
      result.collectionName = next;
      index += 1;
      continue;
    }
    if (token === "--service-account") {
      result.serviceAccountPath = next;
      index += 1;
    }
  }

  return result;
}

function readServiceAccount(args) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, "base64").toString("utf8");
    return JSON.parse(decoded);
  }

  const credentialPath = args.serviceAccountPath || process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
  if (!credentialPath) {
    return null;
  }

  const raw = fs.readFileSync(path.resolve(credentialPath), "utf8");
  return JSON.parse(raw);
}

function base64Url(value) {
  const source = typeof value === "string" ? value : JSON.stringify(value);
  return Buffer.from(source)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  const claims = {
    iss: serviceAccount.client_email,
    scope: FIRESTORE_SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: now,
    exp: now + 3600
  };
  const unsigned = base64Url(header) + "." + base64Url(claims);
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return unsigned + "." + signer.sign(serviceAccount.private_key, "base64url");
}

async function getAccessToken(serviceAccount) {
  const envToken = process.env.FIREBASE_ACCESS_TOKEN || process.env.GOOGLE_OAUTH_ACCESS_TOKEN || "";
  if (envToken) {
    return envToken;
  }
  if (!serviceAccount || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("Missing service account. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.");
  }

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: createJwt(serviceAccount)
  });
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error("OAuth token request failed (" + String(response.status) + "): " + JSON.stringify(payload));
  }
  return String(payload && payload.access_token ? payload.access_token : "");
}

function resolveProjectId(args, serviceAccount) {
  return String(
    args.projectId ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCP_PROJECT_ID ||
    (APP_CONFIG.firebase && APP_CONFIG.firebase.config && APP_CONFIG.firebase.config.projectId) ||
    (serviceAccount && serviceAccount.project_id) ||
    ""
  ).trim();
}

function resolveCollectionName(args) {
  const dataConfig = APP_CONFIG.data && typeof APP_CONFIG.data === "object" ? APP_CONFIG.data : {};
  return String(
    args.collectionName ||
    process.env.HOTSPOT_COLLECTION ||
    dataConfig.issueCollection ||
    dataConfig.hotspotCollection ||
    "crowd_hotspots"
  ).trim();
}

function encodeFirestorePath(value) {
  return String(value || "")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildListUrl(projectId, collectionName, pageToken) {
  const baseUrl = "https://firestore.googleapis.com/v1/projects/" +
    encodeURIComponent(projectId) +
    "/databases/(default)/documents/" +
    encodeFirestorePath(collectionName);
  const params = new URLSearchParams({
    pageSize: String(DEFAULT_PAGE_SIZE)
  });
  PUBLIC_FIELD_MASKS.forEach((fieldPath) => {
    params.append("mask.fieldPaths", fieldPath);
  });
  if (pageToken) {
    params.set("pageToken", pageToken);
  }
  return baseUrl + "?" + params.toString();
}

async function fetchAllDocuments(projectId, collectionName, accessToken) {
  const documents = [];
  let pageToken = "";
  do {
    const response = await fetch(buildListUrl(projectId, collectionName, pageToken), {
      headers: {
        Authorization: "Bearer " + accessToken
      }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error("Firestore list failed (" + String(response.status) + "): " + JSON.stringify(payload));
    }
    if (Array.isArray(payload && payload.documents)) {
      documents.push(...payload.documents);
    }
    pageToken = String(payload && payload.nextPageToken ? payload.nextPageToken : "");
  } while (pageToken);
  return documents;
}

function convertFirestoreValue(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  if ("stringValue" in value) {
    return String(value.stringValue || "");
  }
  if ("integerValue" in value) {
    return Number(value.integerValue);
  }
  if ("doubleValue" in value) {
    return Number(value.doubleValue);
  }
  if ("booleanValue" in value) {
    return Boolean(value.booleanValue);
  }
  if ("timestampValue" in value) {
    return String(value.timestampValue || "");
  }
  if ("nullValue" in value) {
    return null;
  }
  if ("arrayValue" in value) {
    const items = value.arrayValue && Array.isArray(value.arrayValue.values)
      ? value.arrayValue.values
      : [];
    return items.map(convertFirestoreValue);
  }
  if ("mapValue" in value) {
    return convertFirestoreFields(value.mapValue && value.mapValue.fields);
  }
  if ("geoPointValue" in value) {
    return {
      lat: Number(value.geoPointValue.latitude),
      lng: Number(value.geoPointValue.longitude)
    };
  }
  if ("referenceValue" in value) {
    return String(value.referenceValue || "");
  }
  return null;
}

function convertFirestoreFields(fields) {
  const result = {};
  const source = fields && typeof fields === "object" ? fields : {};
  Object.keys(source).forEach((key) => {
    result[key] = convertFirestoreValue(source[key]);
  });
  return result;
}

function getFirstValue(data, keys, fallback) {
  for (const key of keys) {
    const value = data[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }
  return fallback;
}

function normalizeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : NaN;
}

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeClassificationToken(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function normalizeContentTab(value) {
  const token = normalizeClassificationToken(value);
  if (
    token === CONTENT_TAB_CHANGES ||
    token === "change" ||
    token === "achievements" ||
    token === "achievement" ||
    token === "completed" ||
    token === "complete" ||
    token === "done" ||
    token === "성과" ||
    token === "변화" ||
    token === "개선" ||
    token === "완료"
  ) {
    return CONTENT_TAB_CHANGES;
  }
  if (
    token === CONTENT_TAB_NOTICES ||
    token === "notice" ||
    token === "notices" ||
    token === "guide" ||
    token === "guides" ||
    token === "info" ||
    token === "안내" ||
    token === "안내도"
  ) {
    return CONTENT_TAB_NOTICES;
  }
  return CONTENT_TAB_ISSUES;
}

function isNoticeItemType(value) {
  const token = normalizeClassificationToken(value);
  return (
    token === ITEM_TYPE_NOTICE ||
    token === "notice" ||
    token === "notices" ||
    token === "safetynotice" ||
    token === "lifenotice" ||
    token === "안내" ||
    token === "안전안내" ||
    token === "생활안내"
  );
}

function normalizeProgressStatus(value, fallbackContentTab) {
  const token = normalizeClassificationToken(value);
  if (
    token === PROGRESS_STATUS_COMPLETED ||
    token === "complete" ||
    token === "done" ||
    token === "ended" ||
    token === "end" ||
    token === "closed" ||
    token === "완료" ||
    token === "개선완료" ||
    token === "종료" ||
    token === "안내종료"
  ) {
    return PROGRESS_STATUS_COMPLETED;
  }
  if (
    token === PROGRESS_STATUS_CHECKING ||
    token === "actionrequested" ||
    token === "consulting" ||
    token === "inprogress" ||
    token === "active" ||
    token === "reviewclosed" ||
    token === "확인" ||
    token === "확인중" ||
    token === "조치요청" ||
    token === "협의" ||
    token === "협의중" ||
    token === "추진중" ||
    token === "진행중" ||
    token === "안내중" ||
    token === "검토종료"
  ) {
    return PROGRESS_STATUS_CHECKING;
  }
  return normalizeContentTab(fallbackContentTab) === CONTENT_TAB_CHANGES
    ? PROGRESS_STATUS_COMPLETED
    : PROGRESS_STATUS_CHECKING;
}

function resolveContentTab(itemType, progressStatus, fallbackContentTab) {
  if (isNoticeItemType(itemType) || normalizeContentTab(fallbackContentTab) === CONTENT_TAB_NOTICES) {
    return CONTENT_TAB_NOTICES;
  }
  return progressStatus === PROGRESS_STATUS_COMPLETED
    ? CONTENT_TAB_CHANGES
    : CONTENT_TAB_ISSUES;
}

function resolveItemType(itemType, contentTab, progressStatus) {
  if (isNoticeItemType(itemType) || contentTab === CONTENT_TAB_NOTICES) {
    return ITEM_TYPE_NOTICE;
  }
  return progressStatus === PROGRESS_STATUS_COMPLETED
    ? ITEM_TYPE_IMPROVEMENT
    : ITEM_TYPE_ISSUE;
}

function normalizePhotoUrls(value) {
  const items = [];
  if (Array.isArray(value)) {
    items.push(...value);
  } else if (value) {
    items.push(value);
  }
  const seen = new Set();
  return items
    .map((item) => normalizeString(item))
    .filter((item) => item.startsWith("https://") || item.startsWith("http://"))
    .filter((item) => {
      if (seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    })
    .slice(0, 8);
}

function getDocumentId(document) {
  const name = String(document && document.name ? document.name : "");
  const chunks = name.split("/").filter(Boolean);
  return chunks.length > 0 ? chunks[chunks.length - 1] : "";
}

function toPublicHotspot(document) {
  const data = convertFirestoreFields(document && document.fields);
  const lat = normalizeNumber(data.lat);
  const lng = normalizeNumber(data.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const photoUrls = normalizePhotoUrls(getFirstValue(data, ["photoUrls", "photo_urls"], []));
  const legacyPhotoUrl = normalizeString(getFirstValue(data, ["photoUrl", "photo_url"], ""));
  if (legacyPhotoUrl && (legacyPhotoUrl.startsWith("https://") || legacyPhotoUrl.startsWith("http://")) && !photoUrls.includes(legacyPhotoUrl)) {
    photoUrls.push(legacyPhotoUrl);
  }
  const rawContentTab = normalizeString(getFirstValue(data, ["contentTab", "content_tab", "mapTab", "map_tab", "displayTab", "display_tab", "status"], ""));
  const rawItemType = normalizeString(getFirstValue(data, ["itemType", "item_type"], ""));
  const rawProgressStatus = normalizeString(getFirstValue(data, ["progressStatus", "progress_status"], ""));
  const progressStatus = normalizeProgressStatus(rawProgressStatus, rawContentTab);
  const contentTab = resolveContentTab(rawItemType, progressStatus, rawContentTab);
  const itemType = resolveItemType(rawItemType, contentTab, progressStatus);

  return {
    id: getDocumentId(document),
    issueRefId: normalizeString(getFirstValue(data, ["issueRefId", "issue_id"], "")),
    title: normalizeString(data.title),
    memo: normalizeString(data.memo),
    level: normalizeNumber(data.level) || 3,
    contentTab,
    itemType,
    progressStatus,
    categoryId: normalizeString(getFirstValue(data, ["categoryId", "category_id"], "")),
    categoryLabel: normalizeString(getFirstValue(data, ["categoryLabel", "category_label"], "")),
    lat,
    lng,
    dongName: normalizeString(getFirstValue(data, ["dongName", "dong_name"], "")),
    emdCode: normalizeString(getFirstValue(data, ["emdCode", "emd_cd"], "")),
    dongSelectionMode: normalizeString(data.dongSelectionMode),
    dongKey: normalizeString(data.dongKey),
    groupLabel: normalizeString(getFirstValue(data, ["groupLabel", "group_label", "issueGroupLabel", "issue_group_label"], "")),
    photoUrls,
    photoUrl: photoUrls[0] || "",
    photoProcessingVersion: normalizeNumber(getFirstValue(data, ["photoProcessingVersion", "photo_processing_version"], 0)) || 0,
    updatedAt: normalizeString(data.updatedAt)
  };
}

function compareHotspots(a, b) {
  const titleCompare = String(a.title || "").localeCompare(String(b.title || ""), "ko-KR");
  if (titleCompare !== 0) {
    return titleCompare;
  }
  return String(a.id || "").localeCompare(String(b.id || ""));
}

function buildComparablePayload(payload) {
  return JSON.stringify({
    source: payload.source,
    collection: payload.collection,
    count: payload.count,
    hotspots: payload.hotspots
  });
}

function readExistingPayload(outputPath) {
  try {
    return JSON.parse(fs.readFileSync(outputPath, "utf8"));
  } catch (_error) {
    return null;
  }
}

function writeJsonIfChanged(outputPath, payload) {
  const existing = readExistingPayload(outputPath);
  if (existing && buildComparablePayload(existing) === buildComparablePayload(payload)) {
    console.log("[export-hotspots] no public hotspot changes");
    return false;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + "\n");
  console.log("[export-hotspots] wrote " + outputPath + " (" + String(payload.count) + " hotspots)");
  return true;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const serviceAccount = readServiceAccount(args);
  const projectId = resolveProjectId(args, serviceAccount);
  const collectionName = resolveCollectionName(args);
  if (!projectId) {
    throw new Error("Missing Firebase project id.");
  }
  if (!collectionName) {
    throw new Error("Missing hotspot collection name.");
  }

  const accessToken = await getAccessToken(serviceAccount);
  const documents = await fetchAllDocuments(projectId, collectionName, accessToken);
  const hotspots = documents
    .map(toPublicHotspot)
    .filter(Boolean)
    .sort(compareHotspots);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "firestore",
    collection: collectionName,
    count: hotspots.length,
    hotspots
  };
  writeJsonIfChanged(path.resolve(args.outputPath), payload);
}

main().catch((error) => {
  console.error("[export-hotspots]", error && error.message ? error.message : String(error));
  process.exit(1);
});
