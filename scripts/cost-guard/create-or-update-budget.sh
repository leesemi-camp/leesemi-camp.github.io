#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${1:-${ROOT_DIR}/.env.local}"

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck source=/dev/null
  source "${ENV_FILE}"
fi

require_env() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    echo "[ERROR] Missing required env: ${key}" >&2
    exit 1
  fi
}

normalize_billing_account_id() {
  local value="$1"
  value="${value#billingAccounts/}"
  echo "${value}"
}

for cmd in gcloud curl jq; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "[ERROR] Required command not found: ${cmd}" >&2
    exit 1
  fi
done

require_env GCP_PROJECT_ID
require_env TARGET_PROJECT_ID
require_env BILLING_ACCOUNT_ID
require_env BUDGET_TOPIC_ID
require_env BUDGET_DISPLAY_NAME
require_env BUDGET_AMOUNT_UNITS

CURRENCY_CODE="${CURRENCY_CODE:-KRW}"
THRESHOLD_1="${THRESHOLD_1:-0.5}"
THRESHOLD_2="${THRESHOLD_2:-0.8}"
THRESHOLD_3="${THRESHOLD_3:-0.9}"
THRESHOLD_4="${THRESHOLD_4:-1.0}"

BILLING_ACCOUNT_SHORT_ID="$(normalize_billing_account_id "${BILLING_ACCOUNT_ID}")"
TOPIC_FULL_NAME="projects/${GCP_PROJECT_ID}/topics/${BUDGET_TOPIC_ID}"

if [[ -z "${TARGET_PROJECT_NUMBER:-}" ]]; then
  TARGET_PROJECT_NUMBER="$(gcloud projects describe "${TARGET_PROJECT_ID}" --format='value(projectNumber)')"
fi

if [[ -z "${TARGET_PROJECT_NUMBER}" ]]; then
  echo "[ERROR] Unable to resolve TARGET_PROJECT_NUMBER." >&2
  exit 1
fi

gcloud config set project "${GCP_PROJECT_ID}" >/dev/null
gcloud services enable billingbudgets.googleapis.com >/dev/null

ACCESS_TOKEN="$(gcloud auth print-access-token)"
BASE_URL="https://billingbudgets.googleapis.com/v1/billingAccounts/${BILLING_ACCOUNT_SHORT_ID}/budgets"

REQUEST_PAYLOAD="$(cat <<JSON
{
  "displayName": "${BUDGET_DISPLAY_NAME}",
  "budgetFilter": {
    "projects": [
      "projects/${TARGET_PROJECT_NUMBER}"
    ],
    "calendarPeriod": "MONTH",
    "creditTypesTreatment": "INCLUDE_ALL_CREDITS"
  },
  "amount": {
    "specifiedAmount": {
      "currencyCode": "${CURRENCY_CODE}",
      "units": "${BUDGET_AMOUNT_UNITS}"
    }
  },
  "thresholdRules": [
    {"thresholdPercent": ${THRESHOLD_1}, "spendBasis": "CURRENT_SPEND"},
    {"thresholdPercent": ${THRESHOLD_2}, "spendBasis": "CURRENT_SPEND"},
    {"thresholdPercent": ${THRESHOLD_3}, "spendBasis": "CURRENT_SPEND"},
    {"thresholdPercent": ${THRESHOLD_4}, "spendBasis": "CURRENT_SPEND"}
  ],
  "notificationsRule": {
    "pubsubTopic": "${TOPIC_FULL_NAME}",
    "schemaVersion": "1.0",
    "disableDefaultIamRecipients": false,
    "enableProjectLevelRecipients": false
  }
}
JSON
)"

EXISTING_BUDGET_NAME="$(
  curl -sS "${BASE_URL}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
  | jq -r --arg name "${BUDGET_DISPLAY_NAME}" '.budgets[]? | select(.displayName == $name) | .name' \
  | head -n 1
)"

if [[ -n "${EXISTING_BUDGET_NAME}" ]]; then
  echo "Updating existing budget: ${EXISTING_BUDGET_NAME}"
  curl -sS -X PATCH \
    "https://billingbudgets.googleapis.com/v1/${EXISTING_BUDGET_NAME}?updateMask=displayName,budgetFilter,amount,thresholdRules,notificationsRule" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${REQUEST_PAYLOAD}" >/dev/null
else
  echo "Creating budget: ${BUDGET_DISPLAY_NAME}"
  curl -sS -X POST \
    "${BASE_URL}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${REQUEST_PAYLOAD}" >/dev/null
fi

echo "Budget connected to topic: ${TOPIC_FULL_NAME}"
echo "Disable threshold expected by function: DISABLE_THRESHOLD=${THRESHOLD_4}"
