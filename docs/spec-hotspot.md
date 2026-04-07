# Hotspot Spec (현안 지점) (as of 2026-04-05)

이 문서는 Hotspot(현안 지점) 기능의 **요구사항/데이터 계약/테스트 매핑**을 단일 기준으로 유지합니다.
관련 문서는 이 문서를 참조만 하고, 중복 명세는 두지 않습니다.

## 0) 범위와 용어

- **Hotspot**: 지도 위의 Point 기반 현안 지점.
- **권한 역할**: `public`(일반 방문자) / `staff`(편집 권한).
- **visibility**: `public` 또는 `internal`.
  - 값이 없거나 유효하지 않으면 `public`으로 처리합니다.
  - `internal`은 `/map/`에서 숨기고 `/map/edit/`에서만 staff가 볼 수 있습니다.
- **externalUrl**: 선택한 현안에 연결할 외부 링크.
  - 허용 스킴: `http`, `https`.
  - edit 페이지 입력/수정 시 Google Docs/Drive 편집 URL이면 1회 경고합니다.
- **데이터 소스**
  - `/map/`: 정적 스냅샷(JSON) 경로에서 로드.
  - `/map/edit/`: Firestore 실시간 구독.

## 1) 데이터 계약 (Firestore + Snapshot)

### 1.1 컬렉션

- 기본: `crowd_hotspots` (설정: `config.data.issueCollection`)
- JSON 스키마(스냅샷/테스트 데이터): [data/hotspot.schema.json](../data/hotspot.schema.json)

### 1.2 필드 스키마

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| id | string | yes | Firestore doc id 또는 스냅샷 레코드 id |
| lat | number | yes | 위도 (EPSG:4326) |
| lng | number | yes | 경도 (EPSG:4326) |
| title | string | yes | 현안 제목 |
| memo | string | no | 현안 내용 |
| level | number | no | 1~5 범위 보정 |
| categoryId | string | no | 분류 id |
| categoryLabel | string | no | 분류 라벨 |
| issueRefId | string | no | 외부 카탈로그 연동 id |
| dongName | string | yes | 행정동명 |
| emdCode | string | no | 행정동 코드 |
| dongSelectionMode | string | no | `auto` / `manual` / `common` |
| dongKey | string | no | `__common__` 또는 명시 key |
| groupLabel | string | no | 그룹 라벨(선택) |
| externalUrl | string | no | 외부 링크 (`http`/`https`만 허용) |
| visibility | string | no | `public` / `internal` (없으면 `public`) |
| updatedBy | string | no | 수정자 이메일 |
| updatedAt | timestamp | no | 수정 시각 |

### 1.3 호환성 규칙

- 기존 데이터는 `visibility`가 없어도 정상 표시되어야 합니다.
- 클라이언트는 `snake_case` 필드(`dong_name`, `emd_cd`, `category_id` 등)를 함께 읽습니다.
- `externalUrl`은 `external_url`과 호환됩니다.
- 스냅샷(JSON)은 `visibility`를 포함할 수 있으며, 누락 시 `public`으로 처리합니다.

## 2) 요구사항 (Spec IDs)

### 2.1 데이터/호환성

- **HS-DATA-001**: `visibility`가 없거나 잘못된 값이면 `public`으로 처리한다.
- **HS-DATA-002**: 기존 `snake_case` 필드를 읽어 기존 데이터가 깨지지 않는다.

### 2.2 공개/편집 노출

- **HS-VIS-001**: `/map/`에서는 `visibility=internal` hotspot을 렌더링하지 않는다.
- **HS-VIS-002**: `/map/edit/`에서 staff는 `public` + `internal` 모두 볼 수 있다.

### 2.3 편집/저장

- **HS-EDIT-001**: 편집 폼에서 `visibility`를 on/off 형태로 지정할 수 있다.
- **HS-EDIT-002**: 저장 시 `visibility`가 Firestore payload에 포함된다.

### 2.4 UI 렌더링

- **HS-LIST-001**: 메모가 없으면 카드에 `spot-item--no-memo` 클래스가 적용된다.

### 2.5 보안 규칙

- **HS-RULE-001**: 공개 읽기는 `visibility`가 없거나 `public`인 문서만 허용한다.
- **HS-RULE-002**: staff는 모든 문서를 읽고 쓸 수 있다.

### 2.6 Firebase 설정 확인

- **HS-FB-001**: `/map/edit/`는 로컬 `config.local.js`가 존재할 때 실 Firebase 설정을 사용한다.

### 2.7 External Link

- **HS-LINK-001**: `externalUrl`은 `http`/`https`만 허용하며 그 외는 빈 값으로 정규화한다.
- **HS-LINK-002**: 현안을 선택하면 정보 팝업에 외부 링크를 확인할 수 있다.
- **HS-LINK-003**: 외부 링크를 클릭하면 새 탭으로 열린다.
- **HS-LINK-004**: edit 페이지에서 Google Docs/Drive 편집 URL을 입력/수정할 때 1회 경고한다.

## 3) 동작 요약

- `/map/`: 스냅샷(JSON)에서 데이터를 읽고, `public`만 리스트/지도에 표시합니다.
- `/map/edit/`: staff 로그인 성공 시 Firestore 구독을 시작합니다.
- visibility가 `internal`인 hotspot은 edit 화면에서만 노출됩니다.
- 외부 링크가 있으면 팝업에서 확인하고 새 탭으로 열 수 있습니다.

## 4) 테스트 매핑

| Spec ID | 테스트 | 상태 |
|---|---|---|
| HS-LIST-001 | [tests/spot-list.spec.js](../tests/spot-list.spec.js) | 자동 |
| HS-VIS-001 | [tests/smoke.spec.js](../tests/smoke.spec.js) | 자동 |
| HS-FB-001 | [tests/smoke.spec.js](../tests/smoke.spec.js), [tests/config-local-secret.unit.spec.js](../tests/config-local-secret.unit.spec.js) | 자동 |
| HS-LINK-001 | [tests/smoke.spec.js](../tests/smoke.spec.js) | 자동 |
| HS-LINK-002 | [tests/smoke.spec.js](../tests/smoke.spec.js) | 자동 |
| HS-LINK-003 | [tests/smoke.spec.js](../tests/smoke.spec.js) | 자동 |
| HS-LINK-004 | [tests/smoke.spec.js](../tests/smoke.spec.js) | 자동 |
| HS-EDIT-001 | (수동) edit 폼 UI 확인 | 수동 |
| HS-EDIT-002 | (수동) Firestore payload 확인 | 수동 |
| HS-RULE-001 | (수동) 비인증 읽기 제한 확인 | 수동 |
| HS-RULE-002 | (수동) staff 읽기/쓰기 확인 | 수동 |

테스트 제목은 Spec ID를 포함해야 합니다. (예: `HS-LIST-001 ...`)

## 5) 로컬 Firebase 확인 절차 (수동)

1. `config.local.js`가 존재하는지 확인합니다.
2. `npm run serve`로 로컬 서버를 띄웁니다.
3. `/map/edit/`에 접속해 Google 로그인 후 staff 권한을 확인합니다.
4. `public`과 `internal` hotspot을 각각 저장하고, 재로드 후 표시 여부를 확인합니다.
5. 외부 링크가 있는 hotspot을 저장하고, 팝업에 링크가 표시되는지 확인합니다.
6. Google Docs/Drive 편집 URL을 입력/수정했을 때 1회 경고가 뜨는지 확인합니다.
7. `/map/`에서 `internal`이 표시되지 않는지 확인합니다.

## 6) TODO / Backlog

- **HS-TODO-001**: 테스트 훅 확장(`buildIssueGroups`, `formatSpotDongLabel`, `isCommonSpot`, `resolveIssueGroupKey`)을 `__appTestHooks`로 정리.
- **HS-TODO-002**: `renderHotspotList` / `renderIssueGroupList`의 HTML 생성 로직을 순수 함수로 분리.
- **HS-TODO-003**: Firestore hotspot 스냅샷 export 방식 결정 및 익명화 규칙 수립.
- **HS-TODO-004**: Route/Trajectory 지원 설계
  - 별도 컬렉션 분리(`crowd_routes` 등)
  - LineString/MultiLineString 스키마 확정
  - route UI(열람/편집) 및 동 메타 정책 결정
  - 최소 E2E 테스트 및 시각 캡처 추가

## 7) 관련 문서

- [docs/data-hotspots-and-routes.md](data-hotspots-and-routes.md)
- [docs/user-scenarios.md](user-scenarios.md)
- [firestore.rules](../firestore.rules)
