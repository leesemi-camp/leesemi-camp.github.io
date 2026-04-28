# 외부 API 및 데이터 파일 가이드 (External API & Data Files)

## 개요 (Overview)

이 앱은 지도 타일, Firebase 백엔드, 외부 데이터 API, 로컬 데이터 파일을 조합해 동별 현안과 오버레이를 표시합니다. 모든 연결점은 `config.js`에서 제어합니다.

## 1. Firebase 백엔드 (Firebase Backend)

- 인증(Authentication): Firebase Auth + Google Sign-In
- 권한(Authorization): Custom Claim `staff=true`
- 데이터(Data): Firestore 컬렉션 `crowd_hotspots`
- 설정 위치: `config.js > firebase`

Firebase는 현안(Hotspot) 데이터의 저장/조회와 로그인 권한을 담당합니다.

## 2. 지도 타일 (OSM Tiles)

- 제공자(Provider): OSM Korea 군사시설 제외 OpenStreetMap 타일
- 설정 위치: `config.js > map.tileUrl`
- 기본 URL: `https://tiles.osm.kr/hot/{z}/{x}/{y}.png`
- 사용 위치: OpenLayers XYZ 타일 레이어

지도 배경은 OSM Korea의 군사시설 제외 한반도 타일 서버를 사용합니다. 이 서버는 커뮤니티 인프라이므로 타일 생성/응답이 느릴 수 있습니다. 대규모 트래픽이 예상되면 자체 타일 서버 또는 상용 타일 제공자 사용을 고려하세요.

## 3. 동 경계 데이터 (Boundary Data Files)

- 설정 위치: `config.js > data.boundarySources` 또는 `data.boundaryGeoJsonPath`
- 포맷: WFS XML, GeoJSON
- 로컬 예시(Local Samples):
- `data/*.wfs.xml`
- `data/dong-boundaries.sample.geojson`

앱은 위 경로를 `fetch`로 읽어 OpenLayers에서 경계 폴리곤을 렌더링합니다. `boundarySources`가 있으면 그 목록을 우선하고, 없으면 `boundaryGeoJsonPath` 또는 샘플 파일을 사용합니다.

## 4. 연동 현안 카탈로그 (Issue Catalog API)

- 목적: 외부 스프레드시트/시트 API 또는 Apps Script에서 현안 목록을 가져와 편집 폼에 연결
- 설정 위치: `config.js > data.issueCatalog`
- 주요 필드(Key Fields):
- `apiUrl`, `sourceType`(json/csv), `rowPath`, `delimiter`
- `token`, `tokenQueryKey`, `queryParams`
- `idField`, `titleField`, `categoryIdField`, `memoField`

동작 방식:

- `enabled: true`이고 `apiUrl`이 있으면 외부 API를 호출합니다.
- 데이터는 파싱 후 드롭다운에 표시되며, 선택 시 제목/내용이 자동 반영됩니다.
- API가 비어 있거나 실패하면 수동 입력(Manual Input) 모드로 동작합니다.

## 5. 교통/보행 오버레이 (Traffic Overlays API)

- 목적: 외부 교통량/보행량 데이터를 지도에 표시
- 설정 위치: `config.js > trafficOverlays`
- 구성(Entries): `vehicle`, `pedestrian`
- 주요 필드(Key Fields):
- `url`, `method`, `rowPath`
- `valueProperty`, `longitudeProperty`, `latitudeProperty`
- `token`, `tokenQueryKey`, (선택) `tokenHeaderKey`

앱은 오버레이 토글 시 외부 API를 호출하고, 응답의 좌표/값 필드를 읽어 원형 마커로 렌더링합니다. CORS 정책에 따라 프론트 직접 호출이 실패할 수 있으므로 필요하면 프록시(Proxy)를 둡니다.

## 6. 생활이동/유동인구 (Mobility Population)

- 목적: 행정동(EMD) 또는 250m 격자(Grid) 기반 인구 오버레이
- 설정 위치: `config.js > mobilityPopulation`
- 소스(Source): 로컬 CSV/JSON 또는 OpenAPI URL
- 주요 필드(Key Fields):
- `dataPath`, `sourceType`(csv/json), `rowPath`, `delimiter`
- `token`, `tokenQueryKey`, `queryParams`
- `fields`(month/hour/emdCode/population/longitude/latitude)
- `mode`(emd/grid250), `coordinateProjection`, `cellSizeMeter`

앱은 데이터 소스를 `fetch`로 불러와 파싱하고, 월/시간 필터에 맞춰 오버레이를 갱신합니다.

## 7. 로컬 데이터 파일 (Local Data Files)

- `data/pangyo-focused-month-hour.csv`: 유동 인구 샘플 CSV
- `data/capital-mobility.sample.csv`, `data/capital-mobility-grid.sample.csv`: 추가 샘플
- `data/*.wfs.xml`: 동 경계 WFS 샘플

로컬 파일을 사용할 때는 정적 서버에서 제공 가능한 경로(`/data/...`)로 연결해야 합니다.
