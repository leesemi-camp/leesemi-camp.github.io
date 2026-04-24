# 선거사무원 지도 대시보드 (GitHub Pages + OSM/OpenLayers)

선거구 동 경계와 현장 혼잡 지점을 공유하기 위한 기본 골격입니다.

## 문서(Documentation)

문서는 루트의 `README.md`, `TODO.md`를 제외하고 `docs/` 폴더에 모아둡니다.

아래 문서들은 목적에 따라 3가지로 분류합니다.

### 1) 현재 상태를 기록하는 문서

- [TODO.md](TODO.md): `app.js`를 테스트 기반으로 점진 리팩터링하기 위한 작업 계획/우선순위
- [docs/user-scenarios.md](docs/user-scenarios.md): 실제 사용자 시나리오와 `app.js` 구현/테스트 매핑(커버리지 공백 포함)

### 2) 구현 중인 요구사항/명세를 개괄적으로 설명하는 비-기술자용 문서

- [docs/project-brief.md](docs/project-brief.md): “누가 무엇을 할 수 있는지” 중심의 서비스 개요(비-기술자용)

### 3) 기술자를 위한 문서

- [docs/getting-started.md](docs/getting-started.md): 로컬 실행/설정/권한 부여 등 온보딩
- [docs/external-api.md](docs/external-api.md): 외부 API 및 로컬 데이터 파일 연결(설정 키 중심)
- [docs/data-hotspots-and-routes.md](docs/data-hotspots-and-routes.md): `data/` 파일 사용처 + Firestore hotspot 관리 + route/trajectory 확장 조사(초안)
- [docs/cost-guard-telegram.md](docs/cost-guard-telegram.md): Blaze 안전장치(예산 100% 시 billing off + 텔레그램 알림) 자동화

## 현재 포함된 기능

1. 선거사무원만 로그인 허용 (Firebase Auth + custom claim `staff`)
2. OSM 타일 + OpenLayers 지도 연동
3. 동 경계(GeoJSON/WFS XML) 표시
4. 혼잡 지점 마커 등록/공유(Firestore, 열람 화면은 1회 조회 / 수정 화면은 실시간 동기화)
5. 교통 오버레이(차량 통행/보행 유동, 원격 JSON/GeoJSON) (코드상 구현 / UI는 정리 필요)
6. 수도권 생활이동 시간대 인구 오버레이(행정동 기준) (코드상 구현 / UI는 정리 필요)

## 1) OSM/OpenLayers 준비

1. 별도 API 키 없이 기본 OSM 타일을 사용합니다.
2. 대규모 트래픽이 예상되면 자체 타일 서버 또는 상용 타일 제공자 사용을 검토하세요.

## 2) Firebase 준비

1. Firebase 프로젝트 생성
2. Authentication > Sign-in method에서 Google 로그인 활성화
3. Authentication > Settings > Authorized domains에 GitHub Pages 도메인 추가
4. Firestore Database 생성(Production/Region 선택)
5. Firebase Storage 버킷 생성(기본 버킷 사용 가능)
6. 프로젝트 루트의 `firestore.rules` 규칙 적용
7. 프로젝트 루트의 `storage.rules` 규칙 적용
8. 지도 수정 권한을 줄 계정에 Firebase custom claim을 부여
   - claim key: `staff`
   - claim value: `true`
   - 방법: `scripts/set-staff-claim.cjs` 사용(아래 절차 참고)

### staff 권한 부여 절차 (custom claim)

1. Firebase Console > Project settings > Service accounts > `Generate new private key`로 서비스계정 JSON 다운로드
2. 터미널에서 `firebase-admin` 설치
   - 예: `npm i firebase-admin`
3. 아래 명령으로 사용자 권한 부여
   - `node scripts/set-staff-claim.cjs --service-account /절대경로/service-account.json --email staff@example.com --staff true`
4. 권한 제거가 필요하면
   - `node scripts/set-staff-claim.cjs --service-account /절대경로/service-account.json --email staff@example.com --staff false`
5. 권한 변경 후 사용자는 로그아웃/재로그인(또는 토큰 갱신)해야 반영됩니다.

### 보안 강화 체크리스트 (권장)

1. Firebase Web API key 제한
   - Google Cloud Console > APIs & Services > Credentials > 해당 API key
   - `Application restrictions`: HTTP referrers(웹사이트)로 제한
   - `API restrictions`: 필요한 API만 허용(Identity Toolkit, Firebase Installations 등)
2. App Check 활성화
   - Firebase Console > Build > App Check > Web 앱 등록(reCAPTCHA v3)
   - 발급된 site key를 `config.js > firebase.appCheck.siteKey`에 입력 후 `enabled: true`로 변경
   - Firestore/Functions 등 백엔드 리소스에 App Check 강제(enforce) 적용
3. 외부 API 토큰은 프론트(config.js)에 직접 넣지 않기
   - 정적 페이지 특성상 `config.js` 값은 사용자 브라우저에 공개됩니다.
   - 토큰이 필요한 호출은 Cloud Functions/Cloud Run/Worker 프록시에서 처리하고,
     토큰은 Secret Manager 등 서버측 비밀 저장소에 보관하세요.

## 3) 설정 파일 입력

1. `config.js`에 아래 값 입력
   - `firebase.config` 값들
   - `map.defaultCenter`, `map.defaultZoom`(선택)
   - `data.boundaryStrokeColor`, `data.boundaryStrokeWidth`, `data.boundaryHaloColor`, `data.boundaryHaloWidth`(선택)
   - `trafficOverlays.vehicle`, `trafficOverlays.pedestrian` URL/필드 설정(선택)
2. 필요하면 `config.example.js`를 참고해 형식 확인
3. 실제 동 경계 데이터로 교체
   - 기본 샘플: `data/dong-boundaries.sample.geojson`
   - 다중 파일: `config.js`의 `data.boundarySources` 배열 사용
   - 단일 파일: `config.js`의 `data.boundaryGeoJsonPath` 사용
4. 생활이동 인구 데이터 연결
   - 행정동 샘플: `data/capital-mobility.sample.csv`
   - 판교/운중권 월·시간 샘플: `data/pangyo-focused-month-hour.csv`
   - 250m 격자 샘플: `data/capital-mobility-grid.sample.csv`
   - 설정: `config.js`의 `mobilityPopulation` (`mode`, `dataPath`, `fields`, `cellSizeMeter`)
5. (선택) 스프레드시트/외부 API 현안 원문 연동
   - 설정: `config.js`의 `data.issueCatalog`
   - `enabled: true`로 켜면 `/map/edit`에 `연동 현안 선택(시트)` 드롭다운이 표시됩니다.
   - 저장 시 좌표는 Firestore에 저장하고, 제목/분류/내용은 연동 API 데이터를 우선 사용합니다.
   - 핵심 필드: `apiUrl`, `sourceType`, `rowPath`, `idField`, `titleField`, `categoryIdField`

## 4) GitHub Pages 배포

1. 코드를 `main` 브랜치에 푸시
2. GitHub 저장소 Settings > Pages > Source를 GitHub Actions로 설정
3. `.github/workflows/deploy-pages.yml`가 자동 배포 수행

## 5) View-T 데이터 오버레이 연결

1. View-T(Open API)에서 토큰키를 발급받습니다.
   - 접속: https://viewt.ktdb.go.kr/cong/map/page.do (상단 `Open API` 메뉴)
2. (권장) 토큰은 `config.js`에 직접 넣지 말고 프록시 백엔드에서 주입하세요.
   - 개발/임시 테스트만 `config.js > trafficOverlays.token` 직접 입력
3. `trafficOverlays.vehicle.url`, `trafficOverlays.pedestrian.url`에 API URL을 입력합니다.
4. 응답 구조에 따라 `rowPath`, `valueProperty`, `longitudeProperty`, `latitudeProperty`를 맞춥니다.
5. 로그인 후 사이드패널의 토글(차량 통행 많은 곳 / 보행 유동 많은 곳)로 레이어를 켭니다.

참고:
- 현재 구현은 JSON/GeoJSON 응답을 지원합니다.
- API가 CORS를 허용하지 않으면 GitHub Pages에서 직접 호출이 실패할 수 있습니다. 이 경우 프록시(예: Cloudflare Worker)가 필요합니다.

## 6) 수도권 생활이동/유동인구 시간대 오버레이

1. `mobilityPopulation.dataPath`를 수도권 생활이동 CSV/JSON 경로로 설정합니다.
2. `mobilityPopulation.mode`를 선택합니다.
   - `emd`: 행정동 경계 채움
   - `grid250`: 250m 격자 칸 채움
3. 데이터 컬럼명을 `mobilityPopulation.fields`에 맞춥니다.
   - `month`: 월(예: 202506)
   - `hour`: 시간(0~23 또는 08:00 형식)
   - `population`: 인구/이동량 수치
   - `emd` 모드: `emdCode`(예: 41135108)
   - `grid250` 모드: `longitude`/`latitude`(또는 `x`/`y`)
   - 구간형 시간코드(TZ01~TZ10)를 쓰면 `hourLabels`로 라벨을 지정할 수 있습니다.
4. 로그인 후 사이드패널의 `시간대 인구 많은 지역 보기` 토글을 켭니다.
5. 월/시간대 선택값을 바꾸면 오버레이가 즉시 갱신됩니다.

### 경기도 유동인구 OpenAPI 연결 예시

경기도 데이터드림 OpenAPI(행정동별 유동인구)를 붙일 때는 `mode: "emd"`로 두고 JSON 필드를 매핑하면 됩니다.

```js
mobilityPopulation: {
  enabled: true,
  mode: "emd",
  sourceType: "json",
  dataPath: "https://openapi.gg.go.kr/YOUR_SERVICE_NAME",
  token: "YOUR_GG_API_KEY",
  tokenQueryKey: "KEY",
  queryParams: {
    Type: "json",
    pIndex: 1,
    pSize: 1000
  },
  rowPath: "", // 비우면 구조 자동 감지
  fields: {
    month: "STD_YM",
    hour: "시간대코드",
    emdCode: "행정동코드",
    population: "유동인구수"
  },
  defaultMonth: "202506",
  defaultHour: 8,
  visibleByDefault: true
}
```

주의:
- 실제 서비스명(`YOUR_SERVICE_NAME`)과 필드명은 데이터드림 API 문서 기준으로 맞춰야 합니다.
- API가 HTML 차단 페이지를 반환하면(보안정책/권한/CORS) 앱 상태창에 에러가 표시됩니다.

## 운영 시 주의사항

- GitHub Pages는 정적 호스팅이라 페이지 자체 URL은 공개될 수 있습니다.
- 현재 템플릿은 인증되지 않은 사용자가 데이터(Firestore)를 읽지 못하도록 보호합니다.
- "페이지 자체 접근까지 완전히 차단"이 필요하면 Cloudflare Access 같은 별도 게이트를 앞단에 두는 것을 권장합니다.
