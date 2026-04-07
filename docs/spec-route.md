# Route Spec (이동 경로/궤적) (as of 2026-04-07)

이 문서는 Route(이동 경로) 기능의 **요구사항/데이터 계약/테스트 매핑**을 단일 기준으로 유지합니다.
관련 문서는 이 문서를 참조만 하고, 중복 명세는 두지 않습니다.

## 0) 범위와 용어

- **Route**: 지도 위의 LineString(선) 기반 이동 경로/구간.
- **권한 역할**: `public`(일반 방문자) / `staff`(편집 권한).
- **visibility**: `public` 또는 `internal`.
  - 값이 없거나 유효하지 않으면 `public`으로 처리합니다.
  - `internal`은 `/map/`에서 숨기고 `/map/edit/`에서만 staff가 볼 수 있습니다.
- **좌표 기준**
  - `coordinates`: `[[lng, lat], ...]` (EPSG:4326 고정)
  - 지도 렌더링(OpenLayers)은 내부적으로 EPSG:3857로 변환합니다.

## 1) 데이터 계약 (Firestore + Local Preview)

### 1.1 컬렉션

- 기본: `crowd_routes` (설정: `config.data.routeCollection`)
- JSON 스키마(로컬 프리뷰/테스트 데이터): [data/route.schema.json](../data/route.schema.json)

### 1.2 필드 스키마

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| id | string | yes | Firestore doc id 또는 로컬 프리뷰 레코드 id |
| name | string | yes | 경로명 |
| memo | string | no | 메모 |
| categoryId | string | no | 분류 id (hotspot 분류 팔레트 재사용) |
| categoryLabel | string | no | 분류 라벨(선택) |
| externalUrl | string | no | 외부 링크 (`http`/`https`만 허용) |
| visibility | string | no | `public` / `internal` (없으면 `public`) |
| geometryType | string | yes | v1: `LineString` 고정 |
| coordinates | array | yes | `[[lng, lat], ...]` (최소 2점) |
| bbox | array | yes | `[minLng, minLat, maxLng, maxLat]` (검색/줌 최적화) |
| updatedBy | string | no | 수정자 이메일 |
| updatedAt | timestamp | no | 수정 시각 |

### 1.3 제약/검증 규칙

- **RT-DATA-001**: `coordinates`는 최소 2점 이상이어야 한다.
- **RT-DATA-002**: 각 좌표는 finite number이며, 범위는 `lng[-180..180]`, `lat[-90..90]`를 만족해야 한다.
- **RT-DATA-003**: `visibility`가 없거나 잘못된 값이면 `public`으로 처리한다.
- **RT-LINK-001**: `externalUrl`은 `http/https`만 허용하며 그 외는 빈 값으로 정규화한다.

## 2) 요구사항 (Spec IDs)

### 2.1 공개/편집 노출

- **RT-VIS-001**: `/map/`에서는 `visibility=internal` route를 렌더링하지 않는다.
- **RT-VIS-002**: `/map/edit/`에서 staff는 `public` + `internal` 모두 볼 수 있다.

### 2.2 UI/상호작용

- **RT-UI-001**: side panel에 `현안/경로` 탭이 존재하며 탭 전환이 가능하다.
- **RT-UI-002**: route 탭이 활성화된 편집 화면에서 지도 클릭은 hotspot 좌표선택으로 처리되지 않는다.
- **RT-LIST-001**: memo가 없으면 카드에 `spot-item--no-memo` 클래스가 적용된다.
- **RT-POPUP-001**: route를 선택하면 팝업에 name/분류/메모/외부링크(있는 경우)가 표시된다.

### 2.3 편집/저장

- **RT-EDIT-001**: staff는 route를 그릴 수 있다(LineString).
- **RT-EDIT-002**: 저장 시 `geometryType`, `coordinates`, `bbox`, `visibility`, `externalUrl`이 payload에 포함된다.
- **RT-EDIT-003**: staff는 route를 수정/삭제할 수 있다.

## 3) 테스트 매핑

| Spec ID | 테스트 | 상태 |
|---|---|---|
| RT-SCHEMA-001 | [tests/route.spec.js](../tests/route.spec.js) | 자동 |
| RT-VIS-001 | [tests/route.spec.js](../tests/route.spec.js) | 자동 |
| RT-LIST-001 | [tests/route.spec.js](../tests/route.spec.js) | 자동 |
| RT-LINK-001 | [tests/route.spec.js](../tests/route.spec.js) | 자동 |
| RT-UI-001 | [tests/route.spec.js](../tests/route.spec.js) | 자동 |

## 4) 수동 확인(권장)

1. `npm run serve`
2. `/map/`에서 route 탭 전환 후 route 리스트/선 표시 확인
3. `/map/edit/`에서 staff 로그인 후 route 탭에서 그리기/저장/수정/삭제 확인

## 5) 관련 문서

- [docs/data-hotspots-and-routes.md](data-hotspots-and-routes.md)
- [docs/spec-hotspot.md](spec-hotspot.md)
- [firestore.rules](../firestore.rules)

