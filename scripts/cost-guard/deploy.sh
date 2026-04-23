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

for cmd in gcloud curl; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "[ERROR] Required command not found: ${cmd}" >&2
    exit 1
  fi
done

require_env GCP_PROJECT_ID
require_env TARGET_PROJECT_ID
require_env BILLING_ACCOUNT_ID
require_env TELEGRAM_BOT_TOKEN
require_env TELEGRAM_CHAT_ID

REGION="${REGION:-asia-northeast3}"
FUNCTION_NAME="${FUNCTION_NAME:-billing-guard-telegram}"
FUNCTION_RUNTIME="${FUNCTION_RUNTIME:-nodejs22}"
BUDGET_TOPIC_ID="${BUDGET_TOPIC_ID:-billing-budget-alerts}"
SERVICE_ACCOUNT_ID="${SERVICE_ACCOUNT_ID:-billing-guard-sa}"
DISABLE_THRESHOLD="${DISABLE_THRESHOLD:-1.0}"
DISABLE_BILLING="${DISABLE_BILLING:-true}"
SIMULATE_DISABLE="${SIMULATE_DISABLE:-false}"
BUDGET_ID_ALLOWLIST="${BUDGET_ID_ALLOWLIST:-}"
BUDGET_DISPLAY_NAME_ALLOWLIST="${BUDGET_DISPLAY_NAME_ALLOWLIST:-}"
ENABLE_LEGACY_BUDGET_PUBLISHER_BINDING="${ENABLE_LEGACY_BUDGET_PUBLISHER_BINDING:-false}"
if [[ -z "${BUDGET_DISPLAY_NAME_ALLOWLIST}" && -n "${BUDGET_DISPLAY_NAME:-}" ]]; then
  BUDGET_DISPLAY_NAME_ALLOWLIST="${BUDGET_DISPLAY_NAME}"
fi

BILLING_ACCOUNT_SHORT_ID="$(normalize_billing_account_id "${BILLING_ACCOUNT_ID}")"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_ID}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
TOPIC_FULL_NAME="projects/${GCP_PROJECT_ID}/topics/${BUDGET_TOPIC_ID}"
PROJECT_NUMBER="$(gcloud projects describe "${GCP_PROJECT_ID}" --format='value(projectNumber)')"
PUBSUB_SERVICE_AGENT="service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"
COMPUTE_DEFAULT_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "[1/8] Set active project"
gcloud config set project "${GCP_PROJECT_ID}" >/dev/null

echo "[2/8] Enable required APIs"
gcloud services enable \
  cloudfunctions.googleapis.com \
  run.googleapis.com \
  eventarc.googleapis.com \
  pubsub.googleapis.com \
  cloudbuild.googleapis.com \
  cloudbilling.googleapis.com \
  billingbudgets.googleapis.com >/dev/null

echo "[3/8] Ensure Pub/Sub topic exists: ${TOPIC_FULL_NAME}"
if ! gcloud pubsub topics describe "${BUDGET_TOPIC_ID}" >/dev/null 2>&1; then
  gcloud pubsub topics create "${BUDGET_TOPIC_ID}" >/dev/null
fi

echo "[4/9] Ensure Pub/Sub service identity and token permissions"
if gcloud beta services identity create --service=pubsub.googleapis.com --project="${GCP_PROJECT_ID}" >/dev/null 2>&1; then
  echo "  - Pub/Sub service identity created."
else
  echo "  - Pub/Sub service identity already exists or creation skipped."
fi

gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
  --member="serviceAccount:${PUBSUB_SERVICE_AGENT}" \
  --role="roles/pubsub.serviceAgent" >/dev/null

gcloud iam service-accounts add-iam-policy-binding "${COMPUTE_DEFAULT_SERVICE_ACCOUNT}" \
  --member="serviceAccount:${PUBSUB_SERVICE_AGENT}" \
  --role="roles/iam.serviceAccountTokenCreator" >/dev/null

echo "[5/9] Budget publisher IAM handling"
if [[ "${ENABLE_LEGACY_BUDGET_PUBLISHER_BINDING}" == "true" ]]; then
  echo "  - legacy binding enabled; attempting billingbudgets-notification@system.gserviceaccount.com"
  if ! gcloud pubsub topics add-iam-policy-binding "${BUDGET_TOPIC_ID}" \
    --member="serviceAccount:billingbudgets-notification@system.gserviceaccount.com" \
    --role="roles/pubsub.publisher" >/dev/null 2>&1; then
    echo "  - warning: legacy publisher binding skipped (principal not found or no longer used)."
    echo "    Budget 연결 시 자동 권한 부여(또는 콘솔 연결) 경로를 사용합니다."
  fi
else
  echo "  - skipped (default). Budget 연결 단계에서 topic IAM이 자동 처리됩니다."
fi

echo "[6/9] Ensure service account exists: ${SERVICE_ACCOUNT_EMAIL}"
if ! gcloud iam service-accounts describe "${SERVICE_ACCOUNT_EMAIL}" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${SERVICE_ACCOUNT_ID}" \
    --display-name="Budget Guard Telegram" >/dev/null
fi

echo "[7/9] Grant target project role to service account"
gcloud projects add-iam-policy-binding "${TARGET_PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/billing.projectManager" >/dev/null

echo "[8/9] Grant billing account role to service account"
gcloud beta billing accounts add-iam-policy-binding "${BILLING_ACCOUNT_SHORT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/billing.user" >/dev/null

echo "[9/9] Deploy Cloud Run function (Gen2)"
gcloud functions deploy "${FUNCTION_NAME}" \
  --gen2 \
  --runtime="${FUNCTION_RUNTIME}" \
  --region="${REGION}" \
  --source="${ROOT_DIR}" \
  --entry-point=onBudgetNotification \
  --trigger-topic="${BUDGET_TOPIC_ID}" \
  --service-account="${SERVICE_ACCOUNT_EMAIL}" \
  --quiet \
  --set-env-vars="TARGET_PROJECT_ID=${TARGET_PROJECT_ID},TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN},TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID},DISABLE_THRESHOLD=${DISABLE_THRESHOLD},DISABLE_BILLING=${DISABLE_BILLING},SIMULATE_DISABLE=${SIMULATE_DISABLE},BUDGET_ID_ALLOWLIST=${BUDGET_ID_ALLOWLIST},BUDGET_DISPLAY_NAME_ALLOWLIST=${BUDGET_DISPLAY_NAME_ALLOWLIST}" \
  >/dev/null

echo
echo "Deployment complete."
echo "- Project: ${GCP_PROJECT_ID}"
echo "- Region: ${REGION}"
echo "- Function: ${FUNCTION_NAME}"
echo "- Topic: ${TOPIC_FULL_NAME}"
echo
echo "Next: create/update budget connection"
echo "  ${ROOT_DIR}/create-or-update-budget.sh ${ENV_FILE}"
