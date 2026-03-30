# TODO: `app.js` 테스트 기반 복잡도 낮추기 계획

목표: `app.js`(약 5,200 lines)의 책임을 **테스트로 고정한 뒤**, 기능을 유지하면서 파일/모듈 단위로 점진 분리해 **변경 비용과 리스크를 낮춘다**.

원칙

- 매 단계마다 `npm test`(Playwright)로 회귀 확인
- “No fake implementation, no stubs, no mocks” 정책 준수
  - 네트워크/권한 의존(실제 Firebase/외부 API)은 “스모크/라우팅” 위주로 고정하고,
  - 브라우저에서 호출 가능한 **테스트 훅(이미 `__spotListTestHooks` 존재)** + 순수 함수 추출로 핵심 로직을 검증
- 실패 처리: 각 단계는 작은 PR 단위로 쪼개고, 테스트 실패 시 즉시 직전 단계로 되돌려 원인을 국소화

---

## 현재 `app.js` 주요 책임/모듈 경계(현 상태 요약)

아래 라인 번호는 `app.js` 기준(1-based)입니다.

- **부트스트랩/초기화/모드 분기**
  - `init()` `app.js#L232`
  - `resolveMapMode()` `app.js#L271` (body `data-map-mode` 기반)
  - `validateConfig()` `app.js#L292`
- **UI 이벤트 바인딩(리스트/토글/폼/모바일 시트)**
  - `bindUiEvents()` `app.js#L309`
- **공통 공약/공통 태그 렌더링(대괄호 태그 기반)**
  - `renderCommonPledges()` `app.js#L550`
  - `focusCommonIssueTag()` `app.js#L4390`
- **연동 현안 카탈로그(issueCatalog) 로딩 + 편집 폼 연동**
  - `getIssueCatalogConfig()` `app.js#L724` 부근
  - `ensureIssueCatalogLoaded()` `app.js#L782` 부근
  - `applyIssueCatalogSelection()` `app.js#L1016` 부근
- **Firebase 초기화 + Auth 흐름 + staff 권한 확인**
  - `initFirebase()` `app.js#L1126`
  - `onAuthStateChanged()` `app.js#L1051`
  - `resolveStaffAccess()` `app.js#L5022`
  - 로그인/로그아웃: `signIn()` `app.js#L1166`, `signOut()` `app.js#L1177`
- **OpenLayers 지도 생성 + 클릭/이동 이벤트 + 팝업**
  - `ensureMapReady()` `app.js#L1186`
  - 팝업: `openHotspotPopup()` `app.js#L4959`, `openBoundaryPopup()` `app.js#L4902`, `openIssueGroupPopup()` `app.js#L4983`
- **동 경계(boundary) 로더/파서/렌더**
  - `loadBoundaries()` `app.js#L1367`
  - `parseBoundaryFeatures()` `app.js#L1418` 부근
  - `renderBoundaries()` `app.js#L1570` 부근
  - 동 메타: `normalizeEmdCode()` `app.js#L3068`, `buildDongKey()` `app.js#L1891`
- **현안(Hotspot) Firestore 구독/정규화/렌더**
  - `subscribeHotspots()` `app.js#L3623`
  - `processHotspotSnapshot()` `app.js#L3649`
  - 지도 렌더: `renderHotspots()` `app.js#L3960`
  - 리스트 렌더: `renderHotspotList()` `app.js#L4159`
  - 그룹 리스트: `renderIssueGroupList()` `app.js#L4222` + `buildIssueGroups()` `app.js#L4278`
- **편집(등록/수정/삭제)**
  - 저장: `handleHotspotSubmit()` `app.js#L4459`
  - 편집 모드: `enterHotspotEditMode()` `app.js#L4561`, `exitHotspotEditMode()` `app.js#L4625`
  - 삭제: `deleteHotspot()` `app.js#L4648`
  - 현재 위치: `useCurrentLocationForSpot()` `app.js#L4789`
- **테스트 훅(Playwright)**
- `window.__spotListTestHooks.renderHotspotList` `app.js#L4213`

참고: `toggle-vehicle-flow`, `toggle-population-flow` 등 오버레이/인구 UI 요소가 현재 `map/index.html`, `map/edit/index.html`에서 발견되지 않아(IDs 미존재) 관련 코드 경로는 실사용이 제한적입니다. (코드 자체는 존재)

---

## 핵심 사용자 시나리오 → 구현 위치/테스트 매핑

상세 매핑은 [user-scenarios.md](user-scenarios.md) 참고.

- 기본 렌더/라우팅(테스트 있음)
  - `/` 렌더: `tests/smoke.spec.js`
  - `/map/` 렌더: `tests/smoke.spec.js`
  - `/map/edit/` 로그인 패널: `tests/smoke.spec.js`
  - `/system/` 로딩: `tests/smoke.spec.js`
  - `/party-dialer/`, `/sponsor-dialer/` 미로그인 리다이렉트: `tests/static-pages.spec.js`
- `app.js`의 리스트 UI 로직(부분 테스트 있음)
  - “메모 유무에 따른 카드 클래스/DOM”: `tests/spot-list.spec.js`, `tests/smoke.spec.js` (훅 사용)
- 그 외 지도 상호작용/편집 기능은 현재 테스트 공백(아래 TODO에서 우선순위로 보강)

---

## 단계별 리팩터링 로드맵(테스트 우선)

### 0) 베이스라인 고정

- [ ] `npm install`
- [ ] `npm test`로 현재 상태 통과 확인(3 projects: Chrome/Edge/WebKit)
- [ ] [user-scenarios.md](user-scenarios.md)를 “정답”으로 두고, 이후 리팩터링 시 시나리오 변화가 있으면 문서/테스트를 먼저 수정

### 1) 테스트 가능한 “핵심 UI 로직” 범위를 확장(가장 작은 변화로)

목표: Firebase/OL/네트워크 없이도 **브라우저 내 순수 렌더/그룹핑/필터링 규칙**을 고정.

- [ ] `app.js`에 `window.__appTestHooks` 추가(또는 기존 훅 확장)
  - 후보 노출 함수(순수/부수효과 최소):
    - `buildIssueGroups()`, `resolveIssueGroupKey()`, `resolveIssueGroupTitle()`
    - `formatSpotDongLabel()`, `isCommonSpot()`, `resolveBracketedCommonTag()`
    - `normalizeCategoryId()`, `resolveIssueCategoryMeta()`
- [ ] Playwright 테스트 추가(네트워크/권한 비의존)
  - [ ] 그룹 보기 렌더링 규칙(같은 `issueRefId`/`groupLabel`/`[tag]`/title 기준 그룹키 생성)
  - [ ] 공통(대괄호) 태그가 리스트/라벨에 미치는 영향(`spot`의 dong label 규칙)
  - [ ] 동 필터 UI 텍스트(`activeDongFilter`) 렌더링 규칙(순수 함수화 또는 훅으로 검증)

실패 처리

- 훅 노출이 과해지면: “테스트에서 필요한 것”만 남기고 축소(공개 전역 API 최소화)

### 2) 순수 유틸/정규화 로직부터 파일 분리(동작 동일)

목표: OL/Firebase/DOM과 무관한 함수들을 별도 파일로 이동해 `app.js`의 표면적 감소.

- [ ] 새 파일 후보(정적 서빙 전제, 번들러 없음)
  - `app/utils.js`: 문자열/정규화/정렬/색상 유틸(예: `escapeHtml`, `normalizeEmdCode`, `normalizeCategoryId`, `toRgba` 등)
  - `app/issues.js`: 그룹핑/공통태그 규칙(예: `buildIssueGroups`, `resolveIssueGroupKey` 등)
- [ ] `/map/`, `/map/edit/`의 `<script ... defer>` 로딩 순서에 분리 파일을 추가하고, `app.js`는 해당 모듈을 호출하도록 교체
- [ ] 기존 Playwright 테스트 + 1)에서 추가한 테스트가 동일하게 통과하는지 확인

실패 처리

- 스크립트 로딩 순서/전역 네임스페이스 충돌이 가장 흔한 실패 포인트
  - 실패 시: 로딩 순서만 먼저 고정(테스트) → 그 다음 코드 이동

### 3) “데이터 로더”와 “UI 렌더러” 분리(부수효과 경계 명확화)

목표: `fetch`/Firestore/OL 레이어 업데이트 같은 I/O와, 리스트 HTML 생성 같은 렌더를 분리.

- [ ] `renderHotspotList()`/`renderIssueGroupList()`에서 “HTML 문자열 생성”을 별도 순수 함수로 추출
  - 예: `buildHotspotListHtml(hotspots, options)` → 문자열 반환
  - 테스트는 DOM 없이 문자열/구조 규칙만 검증 가능(Playwright에서도 `page.evaluate`로 실행)
- [ ] Issue catalog 로더(`ensureIssueCatalogLoaded`)에서
  - URL 생성/파싱/정규화(순수) vs
  - `fetch`/상태 업데이트(부수효과) 분리

### 4) 지도(OL) 로직 분리: “지도 생성/레이어/피처/팝업”을 모듈화

목표: `ensureMapReady()`를 “MapService” 형태로 분리해, 이벤트 핸들러/레이어 구성이 `app.js`에서 사라지도록.

- [ ] `app/map.js`로 이동 후보
  - 지도 생성, 레이어 생성, 클릭 디스패치(`kind` 기반), 팝업 렌더
- [ ] 경계 로더(`loadBoundaries`)는 `app/boundaries.js`로 이동 후보
- [ ] 최소 스모크 테스트로 “지도 컨테이너가 초기화 상태를 벗어나는지(map-wrap 클래스)” 같은 안정적인 체크 추가

### 5) Firestore/Auth 분리: 권한/구독/CRUD를 모듈화

목표: `onAuthStateChanged`, `subscribeHotspots`, `handleHotspotSubmit`, `deleteHotspot`의 책임을 분리.

- [ ] `app/auth.js`: staff claim 판별, 로그인/로그아웃, 상태 전환 메시지 생성(순수 분기 테스트 가능)
- [ ] `app/hotspots-store.js`: Firestore collection name 결정, snapshot → spot 정규화, CRUD

테스트 전략

- 실제 Firebase 로그인/쓰기 권한은 CI/로컬에서 불안정할 수 있으므로
  - “문자열/정규화/분기(권한 없을 때 메시지)”를 우선 테스트로 고정
  - E2E는 스모크/라우팅 중심으로 유지

### 6) 죽은 코드/미사용 UI 정리(선택)

현재 `app.js`에는 교통/생활이동 오버레이 관련 코드가 존재하지만, UI 요소가 페이지에 없어 경로가 닫혀 있습니다.

- [ ] 선택지 A: UI를 페이지에 추가하고(토글/상태 영역) 시나리오+테스트까지 완성
- [ ] 선택지 B: 오버레이 기능을 별도 스크립트로 분리하고, 기본 로드에서는 제외(복잡도 즉시 감소)

---

## 실행 커맨드

- 테스트: `npm test`
- 로컬 서빙(수동 확인): `npm run serve` (기본 `http://localhost:5173`)
