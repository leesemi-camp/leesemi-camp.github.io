# 선거사무원 지도 대시보드 (GitHub Pages + OSM/OpenLayers)

선거구 동 경계와 현장 혼잡 지점을 공유하기 위한 기본 골격입니다.

## 현재 포함된 기능

1. 선거사무원만 로그인 허용 (Firebase Auth + 이메일 allowlist)
2. OSM 타일 + OpenLayers 지도 연동
3. 동 경계(GeoJSON/WFS XML) 표시
4. 혼잡 지점 마커 등록/실시간 공유(Firestore)
5. 교통 오버레이 토글(차량 통행/보행 유동, 원격 JSON/GeoJSON)
6. 수도권 생활이동 시간대 인구 오버레이(행정동 기준)

## 1) OSM/OpenLayers 준비

1. 별도 API 키 없이 기본 OSM 타일을 사용합니다.
2. 대규모 트래픽이 예상되면 자체 타일 서버 또는 상용 타일 제공자 사용을 검토하세요.

## 2) Firebase 준비

1. Firebase 프로젝트 생성
2. Authentication > Sign-in method에서 Google 로그인 활성화
3. Authentication > Settings > Authorized domains에 GitHub Pages 도메인 추가
4. Firestore Database 생성(Production/Region 선택)
5. 프로젝트 루트의 `firestore.rules` 규칙 적용
6. Firestore에 allowlist 문서 생성
   - 컬렉션: `meta`
   - 문서 ID: `staff_allowlist`
   - 필드: `emails` (Array)
   - 값 예시: `["staff1@example.com", "staff2@example.com"]`

## 3) 설정 파일 입력

1. `config.js`에 아래 값 입력
   - `firebase.config` 값들
   - `auth.allowedEmails`
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

## 4) GitHub Pages 배포

1. 코드를 `main` 브랜치에 푸시
2. GitHub 저장소 Settings > Pages > Source를 GitHub Actions로 설정
3. `.github/workflows/deploy-pages.yml`가 자동 배포 수행

## 5) View-T 데이터 오버레이 연결

1. View-T(Open API)에서 토큰키를 발급받습니다.
   - 접속: https://viewt.ktdb.go.kr/cong/map/page.do (상단 `Open API` 메뉴)
2. `config.js > trafficOverlays.token`에 토큰을 입력합니다.
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
