#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${1:-${ROOT_DIR}/.env.local}"

"${ROOT_DIR}/deploy.sh" "${ENV_FILE}"
"${ROOT_DIR}/create-or-update-budget.sh" "${ENV_FILE}"

echo
echo "All done."
echo "Test by publishing a sample message:"
echo "  gcloud pubsub topics publish \${BUDGET_TOPIC_ID:-billing-budget-alerts} --message='{\"budgetDisplayName\":\"test\",\"costAmount\":100,\"budgetAmount\":100,\"alertThresholdExceeded\":1.0,\"currencyCode\":\"KRW\"}'"
