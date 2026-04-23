"use strict";

const {google} = require("googleapis");

const BILLING_SCOPES = [
  "https://www.googleapis.com/auth/cloud-billing",
  "https://www.googleapis.com/auth/cloud-platform"
];

let cloudBillingApiPromise = null;

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error("Missing required env: " + name);
  }
  return value;
}

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : NaN;
}

function parseCsvSet(value) {
  const items = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return new Set(items);
}

function decodeBudgetPayload(base64Data) {
  const decoded = Buffer.from(String(base64Data || ""), "base64").toString("utf8");
  if (!decoded) {
    throw new Error("Budget notification payload is empty.");
  }
  return JSON.parse(decoded);
}

function extractPubSubEnvelope(event, context) {
  if (event && event.data && event.data.message && typeof event.data.message.data === "string") {
    return {
      attributes: event.data.message.attributes || {},
      data: event.data.message.data,
      messageId: String(event.data.message.messageId || event.id || ""),
      publishTime: String(event.data.message.publishTime || event.time || ""),
      eventId: String(event.id || (context && context.eventId) || "")
    };
  }

  if (event && typeof event.data === "string") {
    return {
      attributes: event.attributes || {},
      data: event.data,
      messageId: String(event.messageId || (context && context.eventId) || ""),
      publishTime: String(event.publishTime || ""),
      eventId: String((context && context.eventId) || "")
    };
  }

  if (event && event.data && typeof event.data.data === "string") {
    return {
      attributes: event.data.attributes || {},
      data: event.data.data,
      messageId: String(event.data.messageId || event.id || ""),
      publishTime: String(event.data.publishTime || event.time || ""),
      eventId: String(event.id || (context && context.eventId) || "")
    };
  }

  throw new Error("Unsupported Pub/Sub event format.");
}

function isNotificationAllowed(envelope, payload) {
  const budgetIdAllowlist = parseCsvSet(process.env.BUDGET_ID_ALLOWLIST);
  if (budgetIdAllowlist.size > 0) {
    const budgetId = String(envelope.attributes.budgetId || "").trim();
    if (!budgetIdAllowlist.has(budgetId)) {
      return false;
    }
  }

  const displayNameAllowlist = parseCsvSet(process.env.BUDGET_DISPLAY_NAME_ALLOWLIST);
  if (displayNameAllowlist.size > 0) {
    const displayName = String(payload.budgetDisplayName || "").trim();
    if (!displayNameAllowlist.has(displayName)) {
      return false;
    }
  }

  return true;
}

function formatMoney(value, currencyCode) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "-";
  }

  const currency = String(currencyCode || "USD").trim().toUpperCase() || "USD";
  try {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (_error) {
    return amount.toFixed(2) + " " + currency;
  }
}

function getDisableThreshold() {
  const raw = toNumber(process.env.DISABLE_THRESHOLD);
  if (Number.isFinite(raw) && raw >= 0) {
    return raw;
  }
  return 1.0;
}

function shouldDisableBilling(payload) {
  const threshold = getDisableThreshold();
  const actualThresholdExceeded = toNumber(payload.alertThresholdExceeded);
  if (Number.isFinite(actualThresholdExceeded) && actualThresholdExceeded >= threshold) {
    return true;
  }

  if (String(process.env.DISABLE_ON_COST_FALLBACK || "true").toLowerCase() !== "true") {
    return false;
  }

  const costAmount = toNumber(payload.costAmount);
  const budgetAmount = toNumber(payload.budgetAmount);
  return Number.isFinite(costAmount) && Number.isFinite(budgetAmount) && budgetAmount > 0 && costAmount >= budgetAmount;
}

async function getCloudBillingApi() {
  if (!cloudBillingApiPromise) {
    cloudBillingApiPromise = (async () => {
      const authClient = await google.auth.getClient({scopes: BILLING_SCOPES});
      google.options({auth: authClient});
      return google.cloudbilling("v1");
    })();
  }
  return cloudBillingApiPromise;
}

async function getProjectBillingInfo(projectName) {
  const cloudbilling = await getCloudBillingApi();
  const response = await cloudbilling.projects.getBillingInfo({name: projectName});
  return response.data || {};
}

async function disableProjectBilling(projectName) {
  const cloudbilling = await getCloudBillingApi();
  const response = await cloudbilling.projects.updateBillingInfo({
    name: projectName,
    requestBody: {
      billingAccountName: ""
    }
  });
  return response.data || {};
}

async function sendTelegramMessage(lines) {
  const botToken = requiredEnv("TELEGRAM_BOT_TOKEN");
  const chatId = requiredEnv("TELEGRAM_CHAT_ID");
  const endpoint = "https://api.telegram.org/bot" + botToken + "/sendMessage";
  const text = Array.isArray(lines) ? lines.join("\n") : String(lines || "");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error("Telegram sendMessage failed (" + String(response.status) + "): " + body);
  }
}

function buildMessageLines(params) {
  const {
    envelope,
    payload,
    targetProjectId,
    actionSummary
  } = params;

  const currencyCode = String(payload.currencyCode || "USD");
  const costAmount = toNumber(payload.costAmount);
  const budgetAmount = toNumber(payload.budgetAmount);
  const usageRatio = Number.isFinite(costAmount) && Number.isFinite(budgetAmount) && budgetAmount > 0
    ? (costAmount / budgetAmount) * 100
    : NaN;
  const exceeded = Number.isFinite(toNumber(payload.alertThresholdExceeded))
    ? (toNumber(payload.alertThresholdExceeded) * 100).toFixed(1) + "%"
    : "-";

  return [
    "[GCP 과금 안전장치 알림]",
    "프로젝트: " + targetProjectId,
    "예산 이름: " + String(payload.budgetDisplayName || "-"),
    "현재 비용: " + formatMoney(costAmount, currencyCode),
    "예산 금액: " + formatMoney(budgetAmount, currencyCode),
    "사용률: " + (Number.isFinite(usageRatio) ? usageRatio.toFixed(2) + "%" : "-"),
    "초과 임계치(실측): " + exceeded,
    "집계 시작 시각: " + String(payload.costIntervalStart || "-"),
    "예산 ID: " + String(envelope.attributes.budgetId || "-"),
    "메시지 ID: " + String(envelope.messageId || "-"),
    "처리 결과: " + actionSummary
  ];
}

exports.onBudgetNotification = async (event, context) => {
  const targetProjectId = requiredEnv("TARGET_PROJECT_ID");
  const projectName = "projects/" + targetProjectId;
  const simulateDisable = String(process.env.SIMULATE_DISABLE || "false").toLowerCase() === "true";
  const disableAllowed = String(process.env.DISABLE_BILLING || "true").toLowerCase() === "true";

  const envelope = extractPubSubEnvelope(event, context);
  const payload = decodeBudgetPayload(envelope.data);
  const allowed = isNotificationAllowed(envelope, payload);

  let actionSummary = "무시됨 (허용 목록 불일치)";
  if (allowed) {
    const needDisable = shouldDisableBilling(payload);
    if (!needDisable) {
      actionSummary = "알림만 전송 (차단 임계치 미도달)";
    } else if (!disableAllowed) {
      actionSummary = "알림만 전송 (과금 비활성화 미사용: DISABLE_BILLING=false)";
    } else if (simulateDisable) {
      actionSummary = "과금 비활성화 시뮬레이션 (SIMULATE_DISABLE=true)";
    } else {
      const billingInfo = await getProjectBillingInfo(projectName);
      if (billingInfo.billingEnabled === false) {
        actionSummary = "이미 과금 비활성화 상태";
      } else {
        await disableProjectBilling(projectName);
        actionSummary = "과금 비활성화 완료 (예산 임계치 도달)";
      }
    }
  }

  const lines = buildMessageLines({
    envelope,
    payload,
    targetProjectId,
    actionSummary
  });
  await sendTelegramMessage(lines);
  return actionSummary;
};
