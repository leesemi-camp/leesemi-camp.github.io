# TODO (Work Breakdown / Verification First)

이 문서는 “무엇을 언제/어디까지 바꿀지”를 **저장소 구현 코드에 미칠 영향 범위(impact scope)** 기준으로 재그룹/정렬한 작업 목록입니다.  
각 작업은 **검증 가능(자동/수동)** 해야 하며, 가능하면 **시각화(스크린샷/리포트/요약 코멘트)** 산출물을 포함합니다.

---

## 작업 정의 템플릿(권장)

- **Impact scope**: 주로 변경되는 영역(예: `.github/workflows`, `tests/`, `map/*.html`, `app.js`, Firestore rules 등)
- **Deliverables**: PR에서 확인 가능한 산출물(파일/아티팩트/코멘트)
- **Verification**: 재현 가능한 검증 방법(커맨드, CI 체크)
- **Visualization**: 스크린샷/리포트/요약 등 “변화가 보이도록” 만드는 방법

---

## 0) 현재 상태(컨텍스트)

### 0.1 `app.js` 책임/모듈 경계(요약)

`app.js`는 약 5,200 lines 규모로 지도/경계/현안/권한/UI를 모두 포함합니다.

- 부트스트랩/초기화: `init()` `app.js#L232`
- 모드 분기(view/edit): `resolveMapMode()` `app.js#L271`
- UI 이벤트: `bindUiEvents()` `app.js#L309`
- Firebase/Auth: `initFirebase()` `app.js#L1126`, `onAuthStateChanged()` `app.js#L1051`
- 지도(OL) 생성/이벤트: `ensureMapReady()` `app.js#L1186`
- 경계 로딩: `loadBoundaries()` `app.js#L1367`
- hotspot 구독/정규화: `subscribeHotspots()` `app.js#L3623`, `processHotspotSnapshot()` `app.js#L3649`
- 렌더: 지도 `renderHotspots()` `app.js#L3960`, 리스트 `renderHotspotList()` `app.js#L4159`, 그룹 `renderIssueGroupList()` `app.js#L4222`
- 편집 CRUD: 저장 `handleHotspotSubmit()` `app.js#L4459`, 삭제 `deleteHotspot()` `app.js#L4648`
- 테스트 훅: `window.__spotListTestHooks.renderHotspotList` `app.js#L4213`

### 0.2 시나리오/테스트 매핑

- 상세: `docs/user-scenarios.md`
- 현재 자동 테스트: Playwright `npm test`

---

## 1) 최저 영향 범위(문서/CI/보안/시각화) — 런타임 로직 변경 없음

### 1.1 (최우선) Web page preview → screenshot → PR comment (Playwright 기반 “시각 회귀 설명”)

**Impact scope**: `tests/`, `.github/workflows/ci.yml`, (선택) `package.json`, `scripts/`  
**Deliverables**: CI artifact(스크린샷/디프/리포트) + PR 코멘트(요약) + 실패 시 trace/리포트

#### 목표

- PR이 업데이트될 때마다(현재 `pull_request`) 주요 페이지를 “미리보기”처럼 캡처
- **변경된 화면이 무엇인지**를 PR 코멘트로 설명(파일 링크/요약/아티팩트 안내)
- 매 실행마다 동일 경로/파일명으로 생성되어 “latest로 덮어쓰기”

#### 설계 제약(현 저장소 특성 반영)

- 지도(`/map/`)는 외부 리소스(타일/폰트 등)에 의해 픽셀 차이가 날 수 있어 **전면(full page) 스크린샷은 불안정**할 수 있음
- “No stubs/mocks” 원칙을 지키기 위해, 테스트에서 네트워크 응답을 가짜로 만들기보다는:
  - (권장) **스크린샷 범위를 안정적인 UI 영역으로 제한**(topbar/side-panel 등)
  - (권장) **애니메이션/트랜지션/커서/포커스** 같은 비결정 요소를 CSS로 제거

#### WBS (세부 작업 분해)

##### A) 스크린샷 캡처(로컬/CI 공통) — “latest” 결과 생성

- [ ] `tests/visual-preview.spec.js` 추가(캡처 전용)
  - 캡처 대상(최소): `/`, `/map/`, `/map/edit/`, `/system/`
  - 라우트 → 파일명 규칙(권장)
    - `/` → `root.png`
    - `/map/` → `map.png`
    - `/map/edit/` → `map-edit.png`
    - `/system/` → `system.png`
  - 프로젝트별 폴더 분리(Playwright 프로젝트명 사용)
  - 공통 캡처 설정:
    - viewport 고정(예: 1280x720)
    - `page.addStyleTag`로 애니메이션/트랜지션/캐럿/스크롤바 등 안정화
    - `page.emulateMedia({ reducedMotion: 'reduce' })`
    - `page.waitForLoadState('domcontentloaded')` + 핵심 셀렉터 대기
  - 페이지별 “안정화 셀렉터” (권장)
    - `/`: `main.public-landing`
    - `/map/`: `#map` + `#spot-list`
    - `/map/edit/`: `#login-panel` + `#login-btn` (권한/로그인 없이도 항상 검증 가능)
    - `/system/`: `#launcher-loading` 또는 `#launcher-error` (환경에 따라 달라질 수 있어 둘 중 하나)
  - **클립(clip) 전략(권장)**:
    - `/map/`: map 영역은 변동 가능성이 커서 `aside.side-panel`, `header.topbar` 등으로 clip
    - `/map/edit/`: 로그인 패널/상단바/폼 시트 영역을 clip
    - `/system/`: launcher card 영역을 clip
    - `/`: 랜딩 main 영역을 clip
  - 출력 디렉토리(권장)
    - `test-results/visual/latest/<project>/root.png`
    - `test-results/visual/latest/<project>/map.png`
    - `test-results/visual/latest/<project>/map-edit.png`
    - `test-results/visual/latest/<project>/system.png`
  - 저장 경로(고정): `test-results/visual/latest/<project>/<route>.png`
  - 덮어쓰기: 같은 경로로 저장(매 실행 최신화)

- [ ] (선택) npm script 분리
  - 예: `npm run test:visual` → `playwright test tests/visual-preview.spec.js`
  - 목적: 일반 기능 테스트(`npm test`)와 시각 캡처를 분리/선택 실행 가능

- [ ] (권장) 캡처 안정화용 “공통 CSS” 스니펫을 테스트 파일에 고정
  - 예: `* { caret-color: transparent !important; }`
  - 예: `*, *::before, *::after { transition: none !important; animation: none !important; }`
  - 예: `html { scroll-behavior: auto !important; }`
  - 예: `:focus { outline: none !important; }` (접근성 테스트가 별도로 있을 때만)

**Verification**
- 로컬: `npm test` 또는 `npm run test:visual` 실행 후 `test-results/visual/latest/**` 확인

**Visualization**
- 생성된 png 파일 자체가 “preview”

##### B) baseline 생성 + diff 생성(픽셀 비교) — “무엇이 변했는지” 자동 판별

변화 비교는 “PR head”만 캡처하면 불충분합니다. 최소한 base(대개 `main`) 대비가 있어야 합니다.

- [ ] CI에서 base/head 둘 다 캡처하는 방식 확정
  - 옵션 1(권장): 동일 워크플로에서 `git worktree`로 base/head를 각각 체크아웃해 캡처
    - `base/`(BASE_SHA) → `test-results/visual/base/**`
    - `head/`(HEAD_SHA) → `test-results/visual/head/**`
  - 옵션 2: base 스크린샷을 별도 저장소/브랜치/버킷에 보관 후 내려받기(운영 복잡도 ↑)

- [ ] diff 생성 스크립트 추가(예: `scripts/visual-diff.js`)
  - 입력: base png, head png
  - 출력:
    - `test-results/visual/diff/<project>/<route>.diff.png`
    - `test-results/visual/diff/summary.json` (changed 여부, diff pixel 수, 비율, 누락 파일)
    - `test-results/visual/diff/summary.md` (PR 코멘트용 표)
  - 픽셀 diff 라이브러리 예: `pixelmatch` + `pngjs`
  - 임계치(threshold) 정책:
    - 기본 0(변경 있으면 모두 표시) + 허용 오차는 추후 조정
    - “지도 타일”이 포함되는 영역은 clip 전략으로 애초에 제외해 임계치로 땜빵하지 않기
  - summary.json 권장 스키마(예)
    - `generatedAt`, `baseSha`, `headSha`
    - `items: [{ project, page, changed, diffPixels, diffRatio, basePath, headPath, diffPath, note }]`
    - `missing: [{ project, page, missingSide: 'base'|'head' }]`

**Verification**
- CI에서 summary가 생성되고, diff png가 아티팩트로 업로드되는지 확인

**Visualization**
- diff png + markdown summary 표

##### C) CI 업로드(artifact) — 실행마다 덮어쓰기되는 “최신 결과”

- [ ] `.github/workflows/ci.yml`에 artifact 업로드 추가
  - 업로드 대상:
    - `test-results/visual/latest/**` (캡처 결과)
    - `test-results/visual/diff/**` (diff 결과)
    - `playwright-report/**` (Playwright HTML report; 현재 CI reporter 설정 유지)
  - artifact name 고정(예: `visual-preview`, `visual-diff`, `playwright-report`)
  - retention-days 설정(예: 7~14일)

- [ ] (권장) CI에서 “이번 PR에서 화면 캡처를 수행할지” 조건 추가
  - 예: 문서만 변경된 PR이면 캡처 생략
  - 예: 변경 파일이 `index.html`, `map/**`, `system/**`, `styles.css`, `app.js`, `config.js`에 포함될 때만 캡처

**Verification**
- Actions run → Artifacts 섹션에서 다운로드 가능

**Visualization**
- artifact가 곧 “스크린샷 갤러리”

##### D) PR 코멘트(요약) — “무슨 변화인지” 바로 읽히게

- [ ] `.github/workflows/ci.yml`에 PR 코멘트 단계 추가(권장: 마지막 단계)
  - 조건: `pull_request` 이벤트일 때만 실행
  - 방법: `actions/github-script`로 upsert(기존 코멘트 갱신)
    - 코멘트에 마커 포함: `<!-- visual-preview -->`
    - 기존 마커 코멘트가 있으면 update, 없으면 create
  - 코멘트 내용(최소)
    - 캡처 대상 페이지 리스트
    - 변경 여부 요약(예: changed/unchanged 개수)
    - diff summary 표(파일명/변경량/누락)
    - artifact 다운로드 안내(“이번 실행의 Artifacts에서 …”)
  - 코멘트 내용(권장)
    - “이번 PR에서 변경된 파일 목록(상위 폴더)”과 시각 변화의 연관 추정(단, 추정은 추정이라고 표시)

- [ ] 워크플로 권한/예외 처리
  - PR 코멘트 작성에는 권한이 필요합니다.
    - 워크플로 상단 `permissions:`에 `pull-requests: write`(또는 `issues: write`)가 필요
  - fork PR에서는 `GITHUB_TOKEN` 권한이 제한될 수 있으므로:
    - “권한 부족이면 코멘트 단계를 skip”하도록 설계(로그로만 남기기)
    - 또는 `pull_request_target`를 쓰는 경우에는 보안상 매우 신중하게(체크아웃/실행 스코프 제한) 운영

- [ ] PR 코멘트 포맷(템플릿) 고정(예)

```md
<!-- visual-preview -->
### Visual preview (Playwright)

- Base: `<BASE_SHA>` / Head: `<HEAD_SHA>`
- Captured: `root`, `map`, `map-edit`, `system`
- Changed: X / Unchanged: Y / Missing: Z

| Project | Page | Changed | Diff pixels | Notes |
|---|---:|:---:|---:|---|
| WebKit-Safari | map | ✅ | 1234 | side-panel clip |

Artifacts:
- `visual-preview` (latest screenshots)
- `visual-diff` (diff + summary)
- `playwright-report`
```

**Verification**
- PR에서 코멘트가 “1개로 유지(업데이트)”되는지 확인

**Visualization**
- 코멘트의 표 + diff 결과 안내

##### E) 실패/플레이크 대응(운영 체크리스트)

- [ ] 캡처 안정화 규칙 문서화(이 섹션에 유지)
  - 폰트 로딩/아이콘 이슈: 캡처 전 `document.fonts.ready` 대기(지원 브라우저 고려)
  - 시간/랜덤 요소: 있으면 UI에서 제거하거나, 캡처 전 DOM에서 숨김
  - 모바일/데스크탑 2종 캡처가 필요하면 프로젝트 분리(예: Desktop, Mobile)

---

### 1.2 저장소/배포 보안 검수(GitHub Pages + GitHub 기본 기능) + Agent Skill 적용 검토

**Impact scope**: GitHub 설정(저장소 설정), `.github/`, 문서(선택)  
**Deliverables**: 보안 워크플로/설정 파일 + 체크리스트 + PR 템플릿(선택)

- [ ] GitHub 기본 보안 기능 적용 계획 수립(권한/플랜 제약 포함)
  - Dependabot alerts/updates, secret scanning(push protection 가능 여부), CodeQL(Code scanning)
- [ ] Actions 하드닝
  - 최소 권한 `permissions:` 적용, third-party actions pinning(SHA), fork PR 정책 점검
- [ ] Pages 보안 점검
  - Enforce HTTPS, 배포 워크플로 권한 최소화 유지
- [ ] 정책/운영 문서 추가(필요 시)
  - `SECURITY.md`, `.github/dependabot.yml`, `.github/workflows/codeql.yml`
- [ ] Agent Skill 적용 검토
  - 커뮤니티 스킬이 있으면 적용(없으면 저장소 전용 “보안 점검 런북” 스킬 정의)

**Verification**
- Security 탭/PR 체크/Dependabot PR 생성 여부로 확인

**Visualization**
- CodeQL 결과(탭), Dependabot PR, 보안 체크리스트 보고서

---

## 2) 저영향 범위(테스트 강화/관측 가능성) — `app.js` 최소 변경(훅/순수 함수 중심)

### 2.1 테스트 훅 확장(순수 규칙의 회귀 고정)

**Impact scope**: `app.js`(전역 훅), `tests/`  
**Deliverables**: 신규/보강 테스트 + 훅 계약 문서(간단)

- [ ] `window.__appTestHooks`(또는 `__spotListTestHooks` 확장)로 순수 로직 노출
  - 후보: `buildIssueGroups`, `formatSpotDongLabel`, `isCommonSpot`, `resolveIssueGroupKey` 등
- [ ] Playwright 테스트로 “그룹 보기/공통 태그/동 라벨 규칙” 고정

**Verification**
- `npm test`

**Visualization**
- (가능) 시각 캡처 파이프라인(1.1)에서 그룹 보기 화면 캡처 추가

---

## 3) 중영향 범위(UI/HTML/CSS) — 사용자 시나리오를 “보이게” 만드는 작업

### 3.1 오버레이/유동인구 UI 정리(현 상태: 코드 경로는 있으나 UI DOM 없음)

**Impact scope**: `map/index.html`, `map/edit/index.html`, `styles.css`, `app.js`(연결부)  
**Deliverables**: UI 추가 또는 제거 결정 + 시나리오/테스트 업데이트

- [ ] 선택지 A(완성): 토글/상태 DOM을 페이지에 추가하고, 시나리오 + 테스트까지 완성
- [ ] 선택지 B(정리): 관련 코드를 모듈/옵션으로 분리하고 기본 로드에서 제외(복잡도 감소)

**Verification**
- `npm test` + (A일 경우) 오버레이 토글을 E2E로 최소 1개 고정

**Visualization**
- 1.1 스크린샷에 오버레이 토글 UI 캡처 포함

---

## 4) 고영향 범위(`app.js` 리팩터링/모듈화) — 점진 분리(테스트 우선)

### 4.1 “순수 유틸”부터 분리(동작 동일)

**Impact scope**: `app.js`, 신규 `app/*.js`(또는 상위 js), HTML 로딩 순서  
**Deliverables**: 파일 분리 PR + 단위/브라우저 테스트 통과

- [ ] 문자열/정규화/색상/정렬 유틸을 별도 파일로 이동
- [ ] 로딩 순서(HTML `<script defer>`)를 유지하며 회귀 없이 교체

**Verification**
- `npm test`

**Visualization**
- 1.1 스크린샷/디프가 리팩터링 전후 변화 없음(또는 의도 변화만 존재)임을 보여줌

### 4.2 데이터 로더 vs 렌더러 분리(fetch/Firestore/OL ↔ HTML 생성)

**Impact scope**: `app.js` 큰 구조 변경, 테스트 보강 필요  
**Deliverables**: 책임 분리된 모듈 + 테스트 커버 증가

- [ ] `renderHotspotList`/`renderIssueGroupList`의 HTML 생성 로직을 순수 함수로 추출
- [ ] issueCatalog/population/overlay의 URL 생성/파싱(순수)과 fetch/상태변경(I/O) 분리

**Verification**
- `npm test` + (가능) 순수 함수 단위 테스트 추가

**Visualization**
- diff가 없어야 하는 PR은 1.1로 “변화 없음”이 확인되게

### 4.3 지도 로직 모듈화(MapService) — 향후 지도 제공자 교체 준비

**Impact scope**: `app.js`, 신규 `app/map*.js`  
**Deliverables**: OL 초기화/이벤트/레이어가 분리된 구조 + 스모크 테스트

- [ ] `ensureMapReady`를 MapService로 분리(레이어/클릭 디스패치/팝업)
- [ ] 경계 로더/파서 분리(`app/boundaries.js`)

**Verification**
- `npm test`

**Visualization**
- 1.1 스크린샷/디프 + (가능) map 영역 제외 clip으로 안정성 유지

### 4.4 Firestore/Auth 분리(Store/Auth Service)

**Impact scope**: `app.js`, 신규 `app/auth.js`, `app/hotspots-store.js`  
**Deliverables**: CRUD/구독/권한 분리 + 테스트 가능한 순수 로직 증가

**Verification**
- `npm test`

**Visualization**
- 1.1 스크린샷으로 편집 페이지(로그인 패널 등) 회귀 확인

---

## 5) 최상 영향 범위(아키텍처/데이터모델) — 지도 엔진 교체, 경로(route) 지원, 데이터 스냅샷

### 5.1 지도 API 교체 기술 검토(OpenLayers ↔ Kakao Map / Naver Map)

**Impact scope**: 설계/문서 + (후속) `app.js` 지도 계층 전반  
**Deliverables**: 비교 문서 + “POC 범위” 정의 + 위험/비용/정책 정리

- [ ] 기능 요구사항(현 기능 + route 확장) 정리
- [ ] Kakao/Naver 정책/기능/성능 비교표 작성(문서)
- [ ] `MapProvider` 어댑터 설계(최소 변경으로 POC 가능하도록)

**Verification**
- 문서 리뷰 + POC 체크리스트

**Visualization**
- POC 브랜치에서 1.1 스크린샷으로 OL vs (Kakao/Naver) UI 비교

### 5.2 Firestore hotspot 데이터 스냅샷(data/ 사본)로 테스트 커버 고도화

**Impact scope**: `data/`(민감), `tests/`, (선택) `scripts/`  
**Deliverables**: 익명화된 스냅샷 + 정규화/그룹핑 회귀 테스트

- [ ] export 방식 결정(`firebase-admin` 덤프 vs GCP export)
- [ ] PII 익명화 규칙 수립 + 커밋 정책 결정(기본: repo에 커밋하지 않고 제외)
- [ ] snapshot 기반 테스트 추가(순수 함수 분리 포함)

**Verification**
- `npm test` + 스냅샷 기반 단위 테스트 통과

**Visualization**
- 스냅샷 케이스 기반 “그룹 보기/라벨 규칙”이 1.1에서 안정적으로 캡처되는지 확인

### 5.3 Route/Trajectory(경로/궤적) 지원

**Impact scope**: Firestore 모델 + 지도 편집 UI + 렌더/팝업/필터 전반  
**Deliverables**: 컬렉션/스키마/편집 UI/렌더/테스트

- [ ] 데이터 모델/권한 규칙 확정(점 vs 선 분리 권장)
- [ ] edit 페이지에 LineString draw/modify UI 추가(OL 기준)
- [ ] dong 메타 정책(대표 1개 vs 통과 동 집합) 확정
- [ ] 최소 E2E(열람/선택/줌/팝업) + 시각 캡처(1.1) 추가

**Verification**
- `npm test` + (스태이징) 실제 Firestore 쓰기/읽기 점검

**Visualization**
- route 선택 전/후 스크린샷 + diff

---

## 실행 커맨드(기준)

- 테스트: `npm test`
- 로컬 서빙(수동 확인): `npm run serve` (기본 `http://localhost:5173`)
