# TODO

## `app.js` 테스트 기반 복잡도 낮추기 계획

목표: `app.js`(약 5,200 lines)의 책임을 **테스트로 고정한 뒤**, 기능을 유지하면서 파일/모듈 단위로 점진 분리해 **변경 비용과 리스크를 낮춘다**.

원칙

- 매 단계마다 `npm test`(Playwright)로 회귀 확인
- “No fake implementation, no stubs, no mocks” 정책 준수
  - 네트워크/권한 의존(실제 Firebase/외부 API)은 “스모크/라우팅” 위주로 고정하고,
  - 브라우저에서 호출 가능한 **테스트 훅(이미 `__spotListTestHooks` 존재)** + 순수 함수 추출로 핵심 로직을 검증
- 실패 처리: 각 단계는 작은 PR 단위로 쪼개고, 테스트 실패 시 즉시 직전 단계로 되돌려 원인을 국소화

### 현재 `app.js` 주요 책임/모듈 경계(현 상태 요약)

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

### 핵심 사용자 시나리오 → 구현 위치/테스트 매핑

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

### 추가 TODO (요청 반영)

#### A) CI에서 “변경된 웹페이지” 스크린샷 캡처 + PR 코멘트(시각 회귀 설명)

목표: PR이 업데이트될 때마다(현재 `pull_request` 트리거) Playwright로 주요 페이지 스크린샷을 자동 생성하고, 이전 결과 대비 변경점이 있으면 PR 코멘트로 요약합니다. 스크린샷 파일은 매 실행마다 동일 경로/파일명으로 생성되어 “최신 결과로 덮어쓰기”됩니다.

- [ ] Playwright “스크린샷 캡처 전용” spec 추가
  - 대상 페이지 최소 세트: `/`, `/map/`, `/map/edit/`, `/system/`
  - 각 페이지의 “레이아웃 안정화 지점(셀렉터)”를 기다린 뒤 `page.screenshot({ path })`
  - 저장 경로 고정: 예) `test-results/visual/latest/<project>/<page>.png`

- [ ] CI 워크플로(`.github/workflows/ci.yml`)에 시각 결과 아티팩트 업로드 추가
  - `actions/upload-artifact`로 `test-results/visual/latest/**` 업로드
  - 실행마다 같은 artifact name 사용(예: `visual-snapshots`)

- [ ] PR 코멘트 자동 작성/업데이트(권장: “기존 코멘트 갱신”)
  - `actions/github-script`로 “마커(예: `<!-- visual-regression -->`)”가 포함된 코멘트를 찾아 업데이트
  - 코멘트 내용(최소): 캡처한 페이지 리스트 + diff 여부 + artifact 링크

- [ ] “변화 비교(diff)” 전략 결정
  - 옵션 1(권장): base branch(main) 기준 스크린샷도 같은 워크플로에서 생성 후 픽셀 diff 생성
  - 옵션 2: 기준 스크린샷을 별도 저장소/버킷에 저장해 내려받아 비교(운영 복잡도 ↑)

주의:

- PR 코멘트에서 이미지를 “바로 표시”하려면 공개 URL이 필요합니다(artifact 링크만으로는 미리보기 제약이 있을 수 있음). 필요 시 `gh-pages`에 PR별 “latest”로 발행하는 방식을 별도 검토합니다.

#### B) 지도 API 교체 기술 검토(OpenLayers → Kakao Map / Naver Map)

목표: 시민들이 익숙한 지도(카카오/네이버)로 전환 가능성을 검토하고, 기능/비용/운영 리스크를 비교합니다.

- [ ] 요구사항 정리(현재 기능 기준)
  - 동 경계 폴리곤 렌더 + 클릭 판별(동 필터)
  - hotspot 포인트 렌더 + 강조/디밍 + 팝업
  - (확장) route/trajectory(선) 렌더 + 편집 UI

- [ ] Kakao / Naver 비교 표 작성(문서)
  - 라이선스/요금/쿼터/도메인 제한 정책
  - 도형(폴리곤/폴리라인) 렌더 + 히트테스트 + 커스텀 오버레이 지원
  - 좌표계/GeoJSON 변환 편의성, 성능(모바일)

- [ ] 마이그레이션 설계(최소 변경)
  - 지도 어댑터 계층(`MapProvider`) 도입 → OL 구현을 기준으로 유지한 채 제공자 교체 실험

#### C) Firestore 데이터/스키마 테스트를 위한 Hotspot 스냅샷(data/ 사본) 준비

목표: 실제 Firebase에 축적된 `crowd_hotspots` 데이터를 `data/` 폴더에 스냅샷(사본)으로 보관(또는 안전한 저장소에 보관 후 CI에서 내려받음)하여 테스트 커버리지를 고도화합니다.

- [ ] 데이터 반출(export) 방식 결정
  - 옵션 1: `firebase-admin` + 서비스 계정으로 컬렉션 덤프(JSON) 생성
  - 옵션 2: GCP Firestore export(버킷) → 다운로드

- [ ] 보안/개인정보 점검(필수)
  - 공개 저장소 커밋 여부 재검토(우선 `.gitignore` 제외 권장)
  - 익명화/삭제 규칙(PII 제거) 수립

- [ ] 테스트 적용(“가짜 구현”이 아니라 실제 데이터 사본 사용)
  - `processHotspotSnapshot()`의 정규화 로직을 순수 함수로 분리 → 스냅샷 기반 단위테스트
  - 그룹 보기/공통 태그/정렬 규칙 회귀 고정

#### D) 저장소/배포 보안 검수(GitHub Pages + GitHub 기본 기능) + Agent Skill 적용 검토

목표: GitHub Pages로 배포되는 정적 웹앱 특성(설정 파일 노출, CDN 의존, 공개 URL)을 전제로, **저장소/워크플로/Pages 설정**을 점검하고 GitHub 기본 기능으로 가능한 보안 강화를 적용합니다.

- [ ] 저장소 보안 점검(체크리스트)
  - 노출 점검: `config.js`/로그/문서에 토큰/비밀키/개인정보(PII) 포함 여부 재검토
  - Firebase 키/도메인 제한: Web API key의 HTTP referrer 제한, Authorized domains 최소화(운영/로컬 분리)
  - Firestore rules 재검토: 공개 read 필요성, 최소 권한(필요 시 read 제한/조건 추가)
  - 외부 API 호출: CORS/프록시 필요성, 토큰 프록시화(Cloudflare Worker/Cloud Run 등)

- [ ] GitHub 기본 기능 활용(권장)
  - Security 탭 활성 기능 확인: Dependabot alerts/updates, Secret scanning(+ push protection 가능 여부), Code scanning(CodeQL)
  - 브랜치 보호: `main` 보호 규칙(PR 필수, CI 통과 필수, 관리자 예외 정책)
  - Actions 하드닝: 워크플로 권한 최소화(`permissions:`), 서드파티 액션 pinning(커밋 SHA), PR에서 fork 권한 정책
  - 릴리즈/배포: Pages “Enforce HTTPS” 확인, 배포 워크플로에서 최소 권한 유지(`deploy-pages.yml`는 이미 제한적)

- [ ] 문서/정책 파일 추가(필요 시)
  - `SECURITY.md`: 취약점 제보 채널/응답 절차/지원 버전
  - `.github/dependabot.yml`: npm(Playwright) 의존성 업데이트 자동화
  - `.github/workflows/codeql.yml`: JS CodeQL 스캔(정적 분석)
  - (선택) OSSF Scorecard 워크플로(공급망 관점)

- [ ] “Agent Skill” 적용 검토
  - Codex/에이전트 커뮤니티에서 사용하는 보안 점검 스킬이 있는지 확인 후 적용(가능하면 `skill-installer`로 설치)
  - 없다면: 이 저장소 전용 “보안 점검 런북(skill)”을 내부에 정의(예: 체크리스트/명령/리포트 템플릿)
  - 목표 산출물: PR 템플릿/체크리스트로 자동화(리뷰 시 누락 방지)

### 단계별 리팩터링 로드맵(테스트 우선)

#### 0) 베이스라인 고정

- [ ] `npm install`
- [ ] `npm test`로 현재 상태 통과 확인(3 projects: Chrome/Edge/WebKit)
- [ ] [user-scenarios.md](user-scenarios.md)를 “정답”으로 두고, 이후 리팩터링 시 시나리오 변화가 있으면 문서/테스트를 먼저 수정

#### 1) 테스트 가능한 “핵심 UI 로직” 범위를 확장(가장 작은 변화로)

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

#### 2) 순수 유틸/정규화 로직부터 파일 분리(동작 동일)

목표: OL/Firebase/DOM과 무관한 함수들을 별도 파일로 이동해 `app.js`의 표면적 감소.

- [ ] 새 파일 후보(정적 서빙 전제, 번들러 없음)
  - `app/utils.js`: 문자열/정규화/정렬/색상 유틸(예: `escapeHtml`, `normalizeEmdCode`, `normalizeCategoryId`, `toRgba` 등)
  - `app/issues.js`: 그룹핑/공통태그 규칙(예: `buildIssueGroups`, `resolveIssueGroupKey` 등)
- [ ] `/map/`, `/map/edit/`의 `<script ... defer>` 로딩 순서에 분리 파일을 추가하고, `app.js`는 해당 모듈을 호출하도록 교체
- [ ] 기존 Playwright 테스트 + 1)에서 추가한 테스트가 동일하게 통과하는지 확인

실패 처리

- 스크립트 로딩 순서/전역 네임스페이스 충돌이 가장 흔한 실패 포인트
  - 실패 시: 로딩 순서만 먼저 고정(테스트) → 그 다음 코드 이동

#### 3) “데이터 로더”와 “UI 렌더러” 분리(부수효과 경계 명확화)

목표: `fetch`/Firestore/OL 레이어 업데이트 같은 I/O와, 리스트 HTML 생성 같은 렌더를 분리.

- [ ] `renderHotspotList()`/`renderIssueGroupList()`에서 “HTML 문자열 생성”을 별도 순수 함수로 추출
  - 예: `buildHotspotListHtml(hotspots, options)` → 문자열 반환
  - 테스트는 DOM 없이 문자열/구조 규칙만 검증 가능(Playwright에서도 `page.evaluate`로 실행)
- [ ] Issue catalog 로더(`ensureIssueCatalogLoaded`)에서
  - URL 생성/파싱/정규화(순수) vs
  - `fetch`/상태 업데이트(부수효과) 분리

#### 4) 지도(OL) 로직 분리: “지도 생성/레이어/피처/팝업”을 모듈화

목표: `ensureMapReady()`를 “MapService” 형태로 분리해, 이벤트 핸들러/레이어 구성이 `app.js`에서 사라지도록.

- [ ] `app/map.js`로 이동 후보
  - 지도 생성, 레이어 생성, 클릭 디스패치(`kind` 기반), 팝업 렌더
- [ ] 경계 로더(`loadBoundaries`)는 `app/boundaries.js`로 이동 후보
- [ ] 최소 스모크 테스트로 “지도 컨테이너가 초기화 상태를 벗어나는지(map-wrap 클래스)” 같은 안정적인 체크 추가

#### 5) Firestore/Auth 분리: 권한/구독/CRUD를 모듈화

목표: `onAuthStateChanged`, `subscribeHotspots`, `handleHotspotSubmit`, `deleteHotspot`의 책임을 분리.

- [ ] `app/auth.js`: staff claim 판별, 로그인/로그아웃, 상태 전환 메시지 생성(순수 분기 테스트 가능)
- [ ] `app/hotspots-store.js`: Firestore collection name 결정, snapshot → spot 정규화, CRUD

테스트 전략

- 실제 Firebase 로그인/쓰기 권한은 CI/로컬에서 불안정할 수 있으므로
  - “문자열/정규화/분기(권한 없을 때 메시지)”를 우선 테스트로 고정
  - E2E는 스모크/라우팅 중심으로 유지

#### 6) 죽은 코드/미사용 UI 정리(선택)

현재 `app.js`에는 교통/생활이동 오버레이 관련 코드가 존재하지만, UI 요소가 페이지에 없어 경로가 닫혀 있습니다.

- [ ] 선택지 A: UI를 페이지에 추가하고(토글/상태 영역) 시나리오+테스트까지 완성
- [ ] 선택지 B: 오버레이 기능을 별도 스크립트로 분리하고, 기본 로드에서는 제외(복잡도 즉시 감소)

### 실행 커맨드

- 테스트: `npm test`
- 로컬 서빙(수동 확인): `npm run serve` (기본 `http://localhost:5173`)
