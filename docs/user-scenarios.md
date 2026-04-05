# 사용자 시나리오(사용자 플로우) + 구현/테스트 매핑 (as of 2026-03-30)

이 문서는 이 저장소가 **현재 제공(또는 코드상 구현)하는 사용자 시나리오**를 정리하고,
각 시나리오가 어디에서 어떻게 구현되는지(`app.js`/관련 페이지)와
어떤 테스트가 이를 보호하는지(`tests/`)를 매핑합니다.

## 0) 엔트리 페이지 / 역할

- 공개(누구나)
  - `/` → `index.html`
  - `/map/`(현안 열람) → `map/index.html` + `config.js` + `app.js`
- 내부/편집(선거사무원 staff)
  - `/map/edit/`(현안 등록/수정) → `map/edit/index.html` + `config.js` + `app.js`
  - `/system/`(런처) → `system/index.html` + `config.js` + `launcher.js`
- 내부 서비스 셸(로그인 가드)
  - `/party-dialer/`, `/sponsor-dialer/` → 각 `index.html` + `config.js` + `service-shell.js`

참고:
- 런처의 서비스 버튼 목록은 `config.js`의 `launcher.services`를 사용합니다(외부 링크 포함).

## 1) 시나리오 인덱스

| ID | 역할 | 페이지 | 핵심 목표 |
|---:|---|---|---|
| PUB-001 | 공개 | `/` | 랜딩에서 `/map/` 및 `/system/`로 이동 |
| PUB-002 | 공개 | `/map/` | 지도 컨테이너/리스트가 렌더링되고 앱 부트스트랩이 수행됨 |
| PUB-003 | 공개 | `/map/` | 현안 카드 렌더링 규칙(메모 유무) |
| PUB-004 | 공개 | `/map/` | “개별/그룹 보기” 전환 및 리스트 포커싱 흐름 |
| PUB-005 | 공개 | `/map/` | 동 선택(경계 클릭) → 동 필터 적용/해제 |
| PUB-006 | 공개 | `/map/` | 리스트 클릭 → 지도 이동/하이라이트/팝업 |
| STF-001 | staff | `/map/edit/` | 미로그인 시 로그인 패널 노출 |
| STF-002 | staff | `/map/edit/` | 로그인 + staff claim 확인 후 편집 UI 진입 및 로그아웃 |
| STF-003 | staff | `/map/edit/` | 좌표 선택(지도 클릭/현위치) → 폼 반영(모바일 시트 포함) |
| STF-004 | staff | `/map/edit/` | 현안 추가/수정(저장) |
| STF-005 | staff | `/map/edit/` | 현안 삭제 |
| STF-006 | staff | `/map/edit/` | 외부 현안 카탈로그(issueCatalog) 연동 선택/잠금 |
| OVR-001 | 공개/편집 | `/map/`, `/map/edit/` | 교통/인구 오버레이 on/off 및 유동인구 보기(코드상) |
| SYS-001 | staff | `/system/` | 런처에서 로그인/권한 확인 후 서비스 버튼 노출 |
| SYS-002 | staff | `/party-dialer/`, `/sponsor-dialer/` | 미로그인/권한 없음이면 런처로 리다이렉트 |
| OPS-001 | 운영 | (테스트) | `config.js` 기준 데이터/엔드포인트 응답 확인 |

---

## PUB-001: 랜딩에서 지도/시스템으로 이동

- Entry: `/` (`index.html`)
- 구현
  - 정적 링크: `.public-link-map` → `/map/`, `.public-system-link` → `/system/`
- 테스트
  - `tests/smoke.spec.js`: `Landing page loads`

## PUB-002: 지도(View) 부트스트랩 및 기본 렌더링

- Entry: `/map/` (`map/index.html`)
- 구현(핵심 흐름)
  - 모드 판별: `app.js#L271` `resolveMapMode()`
  - 초기화 시퀀스: `app.js#L232` `init()`의 view 분기
  - 이벤트 연결: `app.js#L309` `bindUiEvents()`
  - 지도 준비: `app.js#L1186` `ensureMapReady()`
  - 경계 로딩: `app.js#L1367` `loadBoundaries()`
  - Firestore 구독: `app.js#L3623` `subscribeHotspots()` → `app.js#L3649` `processHotspotSnapshot()`
- 테스트
  - `tests/smoke.spec.js`: `Map view renders`

## PUB-003: 현안 카드 렌더링(메모 유무)

- Entry: `/map/`
- 구현(리스트 렌더링)
  - `app.js#L4159` `renderHotspotList(hotspots)`
  - 테스트 훅 노출: `app.js#L4213` `exposeSpotListTestHooks()` → `window.__spotListTestHooks.renderHotspotList`
- 테스트
  - `tests/spot-list.spec.js`: `Memo presence toggles compact card class`
  - `tests/smoke.spec.js`: `Map spot memo state`

## PUB-004: 현안 열람(리스트 모드 전환: 개별/그룹)

- Entry: `/map/` (편집 화면에도 동일 버튼/리스트가 존재)
- 사용자 흐름
  - “개별 보기/그룹 보기” 버튼으로 리스트 렌더링 모드를 전환합니다.
- 구현
  - 버튼 이벤트: `app.js#L309` `bindUiEvents()`에서 `#issue-view-list-btn`, `#issue-view-group-btn`
  - 모드 전환: `app.js#L2045` `setIssueListMode(mode)` → `syncIssueListModeUi()`
  - 렌더 분기: `app.js#L4150` `renderVisibleIssueList()`가 `renderHotspotList()` / `renderIssueGroupList()` 선택
  - 그룹 렌더: `app.js#L4222` `renderIssueGroupList(hotspots)` / `buildIssueGroups(...)`
- 테스트
  - 없음(현재)

## PUB-005: 동 선택(경계 클릭) → 동 필터 적용/해제

- Entry: `/map/`
- 사용자 흐름
  - 지도에서 동 경계를 클릭하면 해당 동 현안만 보이고, “전체 보기”로 필터를 해제할 수 있습니다.
- 구현(핵심)
  - 지도 클릭: `app.js#L1186` `ensureMapReady()`의 `map.on("singleclick", ...)`
  - 필터 상태: `setActiveDongFilter(dongName)` / `updateDongFilterUi()` / `updateBoundaryHighlightStyles()`
  - 리스트 반영: `applyIssueFilter(hotspots)` → `renderVisibleIssueList()`
- 테스트
  - 없음(현재)

## PUB-006: 리스트 클릭 → 지도 이동/하이라이트/팝업

- Entry: `/map/`
- 사용자 흐름
  - 리스트에서 특정 현안을 클릭하면 지도가 해당 위치로 이동하고 팝업이 열립니다.
- 구현
  - 리스트 클릭 핸들러: `app.js#L309` `bindUiEvents()` 내 `#spot-list` click
  - 팝업: `app.js#L4959` `openHotspotPopup(coordinate, spot)`
- 테스트
  - 없음(현재)

---

## STF-001: 편집 진입 시 로그인 패널 노출

- Entry: `/map/edit/` (`map/edit/index.html`)
- 구현(핵심)
  - 편집 모드 분기: `app.js#L271` `resolveMapMode()` → edit 모드
  - 로그인 패널 UI: `app.js#L1102` `showLoginPanel(message, isError)`
- 테스트
  - `tests/smoke.spec.js`: `Edit page shows login`

## STF-002: 로그인/권한(staff claim) 확인 후 편집 UI 진입 + 로그아웃

- Entry: `/map/edit/`
- 구현(핵심)
  - auth 상태 처리: `app.js#L1051` `onAuthStateChanged(user)`
  - 권한 확인: `app.js#L5022` `resolveStaffAccess(user)` / `hasStaffClaim(...)`
  - 편집 UI 전환: `app.js#L1114` `showAppShell()`
  - 로그아웃: `bindUiEvents()`에서 `#logout-btn` → `signOut()`
- 테스트
  - 없음(현재, 실제 Firebase 로그인/claim 필요)

## STF-003: 좌표 선택(지도 클릭/현위치) → 폼 반영 (모바일 레이아웃 포함)

- Entry: `/map/edit/`
- 구현(핵심)
  - 지도 클릭 좌표: `app.js#L1186` `ensureMapReady()` singleclick에서 `setSelectedCoord(...)` 경로
  - 현위치: `app.js#L4789` `useCurrentLocationForSpot(triggerButton)` → geolocation → `setSelectedCoord(...)`
  - 모바일 시트: `openSpotFormSheetForMobile()` / `closeSpotFormSheetForMobile()` / `syncSpotFormLayoutState()`
- 테스트
  - 없음(현재)

## STF-004: 현안 추가/수정(저장)

- Entry: `/map/edit/`
- 구현(핵심)
  - 폼 submit: `app.js#L309` `bindUiEvents()`에서 `#spot-form` submit → `app.js#L4459` `handleHotspotSubmit(event)`
  - 편집 모드: `enterHotspotEditMode(spot)` / `exitHotspotEditMode(resetForm)`
  - Firestore write: `state.db.collection(...).add()/doc(id).update()` 경로
- 테스트
  - 없음(현재, 실제 Firestore 권한/데이터 필요)

## STF-005: 현안 삭제

- Entry: `/map/edit/`
- 구현(핵심)
  - 리스트의 삭제 버튼: `app.js#L309` `bindUiEvents()`에서 `data-action='delete-spot'` → `app.js#L4648` `deleteHotspot(spotId)`
- 테스트
  - 없음(현재)

## STF-006: 외부 현안 카탈로그(issueCatalog) 연동 선택/잠금

- Entry: `/map/edit/`
- 전제: `config.js`의 `data.issueCatalog.enabled: true` + `apiUrl` 설정
- 구현(핵심)
  - 설정: `app.js#L722` `getIssueCatalogConfig()`
  - 로드: `app.js#L760` `ensureIssueCatalogLoaded()` → `app.js#L828` `buildIssueCatalogRequestUrl(...)`
  - 선택 반영: `app.js#L1009` `applyIssueCatalogSelection(issueRefId)`
- 테스트
  - 없음(현재)

---

## OVR-001: 교통/유동인구 오버레이 on/off (코드상) + 유동인구 보기

- Entry: `/map/`, `/map/edit/`
- 구현(코드상 핵심)
  - 교통 오버레이 UI/상태: `app.js#L3137` `updateOverlayControls()` / `app.js#L3216` `handleOverlayToggle(...)`
  - 교통 오버레이 URL: `app.js#L3405` `buildOverlayRequestUrl(...)`
  - 인구 오버레이 UI/상태: `app.js#L2235` `updatePopulationControls()` / `app.js#L2310` `handlePopulationToggle(...)`
  - 인구 데이터 URL: `app.js#L2573` `buildPopulationRequestUrl(...)`
- 현재 상태(중요: UI 노출)
  - `app.js`는 `#toggle-vehicle-flow`, `#toggle-pedestrian-flow`, `#overlay-status`,
    `#toggle-population-flow`, `#population-month`, `#population-hour`, `#population-status` DOM을 `document.getElementById(...)`로 찾지만,
    현재 저장소의 HTML에는 해당 요소가 존재하지 않습니다(리포지토리 전체 검색 기준).
  - 즉 “사용자 토글로 켜는 플로우”는 현재 UI 기준으로는 접근 불가/미완 상태로 분류하는 것이 안전합니다.
- 테스트
  - 없음(현재)

---

## SYS-001: 시스템 런처 로그인/권한 확인 후 서비스 버튼 노출

- Entry: `/system/` (`launcher.js`)
- 구현(핵심)
  - Firebase Auth + staff claim 확인 후 서비스 버튼 렌더(`config.js > launcher.services`)
- 테스트
  - `tests/smoke.spec.js`: `System launcher loads` (로딩 화면)

## SYS-002: 서비스 셸은 미로그인/권한 없음이면 런처로 리다이렉트

- Entry: `/party-dialer/`, `/sponsor-dialer/` (`service-shell.js`)
- 구현(핵심)
  - auth 없으면 `window.location.replace("/system/")`
- 테스트
  - `tests/static-pages.spec.js`
    - `Party dialer redirects to login`
    - `Sponsor dialer redirects to login`

---

## OPS-001: (테스트) 데이터/엔드포인트 응답 확인

- 목적: `config.js`가 가리키는 로컬 데이터 파일/외부 API가 브라우저 fetch로 응답하는지 확인
- 구현(테스트 헬퍼)
  - `tests/helpers/config.js`: `buildApiRequests(config, baseURL)`
  - `tests/api-files.spec.js`: 브라우저 컨텍스트에서 `fetch()` 실행
- 테스트
  - `tests/api-files.spec.js`: `API endpoints respond in browser`

