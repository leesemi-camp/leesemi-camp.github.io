# Blaze 안전장치: 예산 100% 도달 시 Billing 자동 차단 + 텔레그램 알림

이 문서는 Cloud Billing Budget 알림(Pub/Sub)을 받아서 다음 동작을 자동화하는 방법을 정리합니다.

1. 텔레그램으로 비용 알림 전송
2. 실제 지출 임계치가 100%(기본값) 이상일 때 `billingAccountName=""`으로 업데이트하여 프로젝트 Billing 비활성화

구현 파일:

- `scripts/cost-guard/index.js`
- `scripts/cost-guard/deploy.sh`
- `scripts/cost-guard/create-or-update-budget.sh`
- `scripts/cost-guard/setup-all.sh`
- `scripts/cost-guard/.env.example`

## 중요 주의사항

- Budget 알림은 하드캡이 아닙니다. 보고 지연 때문에 소액 초과 과금이 발생할 수 있습니다.
- Billing 비활성화는 강제 정지 동작입니다. 서비스가 즉시 중단될 수 있습니다.
- Pub/Sub는 at-least-once 전달이므로 중복 알림이 올 수 있습니다.

## 사전 준비

1. Telegram Bot 생성 후 `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` 확보
2. `gcloud auth login` 및 `gcloud auth application-default login`
3. 배포 권한 확인
   - 프로젝트: Cloud Functions/Run/Eventarc/PubSub/IAM 수정 권한
   - Billing Account: Budget 생성/수정 권한, IAM 바인딩 권한

## 빠른 실행

1. 환경파일 생성:

```bash
cd /Users/junyeol/projects/election-map/scripts/cost-guard
cp .env.example .env.local
```

2. `.env.local` 값 채우기 (필수):

- `GCP_PROJECT_ID`
- `TARGET_PROJECT_ID`
- `BILLING_ACCOUNT_ID`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `BUDGET_DISPLAY_NAME`
- `BUDGET_AMOUNT_UNITS`

3. 전체 자동화 실행:

```bash
cd /Users/junyeol/projects/election-map/scripts/cost-guard
./setup-all.sh ./.env.local
```

위 스크립트는 아래를 순서대로 수행합니다.

1. API 활성화
2. Pub/Sub 토픽 생성 및 Budget publisher 권한 부여
3. Cloud Run Functions(Gen2) 배포
4. 함수 서비스 계정 권한 부여
   - 프로젝트: `roles/billing.projectManager`
   - Billing account: `roles/billing.user`
5. Budget 생성/갱신 + Pub/Sub 연결

참고:

- 최신 환경에서는 Budget 연결 단계에서 Pub/Sub publisher IAM이 자동 처리되는 경우가 많습니다.
- `billingbudgets-notification@system.gserviceaccount.com` 같은 legacy principal은 프로젝트/환경에 따라 존재하지 않을 수 있습니다.
- 필요할 때만 `ENABLE_LEGACY_BUDGET_PUBLISHER_BINDING=true`로 강제 시도하세요(기본 `false`).

## 수동 실행

배포만 먼저:

```bash
cd /Users/junyeol/projects/election-map/scripts/cost-guard
./deploy.sh ./.env.local
```

예산 생성/갱신만:

```bash
cd /Users/junyeol/projects/election-map/scripts/cost-guard
./create-or-update-budget.sh ./.env.local
```

## 동작 검증

1. Pub/Sub 테스트 메시지 발행:

```bash
gcloud pubsub topics publish billing-budget-alerts \
  --message='{"budgetDisplayName":"semi-campaign-monthly-budget","costAmount":100000,"budgetAmount":100000,"alertThresholdExceeded":1.0,"currencyCode":"KRW","costIntervalStart":"2026-01-01T00:00:00Z"}'
```

2. 기대 결과:

- 텔레그램 알림 수신
- 함수 로그에 `billing disabled` 또는 `billing already disabled` 표시

로그 확인:

```bash
gcloud functions logs read billing-guard-telegram --gen2 --region=asia-northeast3 --limit=100
```

## 운영 권장값

- `DISABLE_THRESHOLD=1.0` (요구사항)
- 예산 금액은 실제 한도보다 낮게 설정 권장 (지연 초과 대비)
- 초기 리허설은 `SIMULATE_DISABLE=true`로 먼저 검증 후 실제 전환
