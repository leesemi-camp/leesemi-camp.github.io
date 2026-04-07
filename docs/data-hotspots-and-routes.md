# data/ 파일 사용처 + Hotspot 관리 + Route(경로/궤적) 확장 조사 (as of 2026-03-30)

이 문서는 다음 2가지를 “조사 시작” 관점에서 정리합니다.

1) `data/` 폴더의 파일이 **언제/어디에서** 사용되는지  
2) Hotspot(점) 외에 Route/Trajectory(선/궤적) 데이터를 지원하려면 **무엇을 준비해야 하는지**

Hotspot(현안 지점) 데이터의 요구사항/명세는 [docs/spec-hotspot.md](spec-hotspot.md)로 이동했습니다.
Route(경로/궤적) 기능의 요구사항/데이터 계약/테스트는 [docs/spec-route.md](spec-route.md)에서 관리합니다.

---

## 1) `data/` 폴더 파일이 언제 사용되는가

### 1.1 파일 인벤토리(현재 저장소에 존재)

| 파일 | 포맷 | 기본 설정(`config.js`) | 런타임에서 실제 사용 | 테스트에서 사용 |
|---|---|---|---|---|
| `data/daejangdong.wfs.xml` | WFS XML | `data.boundarySources` | 사용(지도 진입 시 경계 로딩) | 간접(엔드포인트 테스트) |
| `data/baekhyeondong.wfs.xml` | WFS XML | `data.boundarySources` | 사용 | 간접 |
| `data/seogundong.wfs.xml` | WFS XML | `data.boundarySources` | 사용 | 간접 |
| `data/unjungdong.wfs.xml` | WFS XML | `data.boundarySources` | 사용 | 간접 |
| `data/pangyodong.wfs.xml` | WFS XML | `data.boundarySources` | 사용 | 간접 |
| `data/hasanundong.wfs.xml` | WFS XML | `data.boundarySources` | 사용 | 간접 |
| `data/dong-boundaries.sample.geojson` | GeoJSON | (fallback) | 기본 설정에서는 미사용(경계가 비어있을 때만) | 단위테스트 fallback 경로로 사용 |
| `data/pangyo-focused-month-hour.csv` | CSV | `mobilityPopulation.dataPath` | **현재 UI로는 미사용**(토글 DOM 없음) | 사용(엔드포인트 테스트) |
| `data/capital-mobility.sample.csv` | CSV | (샘플) | 미사용 | 미사용 |
| `data/capital-mobility-grid.sample.csv` | CSV | (샘플) | 미사용 | 미사용 |

### 1.2 실제 로딩 타이밍(코드 기준)

- **동 경계(WFS XML/GeoJSON)**
  - 진입 페이지: `/map/`, `/map/edit/` (edit는 staff 로그인 성공 후)
  - 호출: `app.js#L1367 loadBoundaries()`가 `config.data.boundarySources`를 순회하며 `fetch(path)`로 로드
  - 포맷 처리:
    - XML: `app.js#L1440~`에서 `gml:posList` 기반 파싱(`emd_cd`, `emd_kor_nm`, `full_nm` 등을 사용)
    - GeoJSON: `app.js#L1570 renderBoundaries()`에서 feature properties로 `dongName`/`emdCode` 추출

- **유동인구/생활이동 CSV/JSON**
  - 로딩 조건: `app.js#L2310 handlePopulationToggle(true)`가 호출될 때만 `fetch(buildPopulationRequestUrl(...))`
  - 현재 상태: `map/index.html`, `map/edit/index.html`에 `toggle-population-flow` 등 관련 DOM id가 없어 UI로는 토글할 수 없습니다.
  - 테스트: `tests/api-files.spec.js`가 `config.js`를 읽어 `mobilityPopulation.dataPath`로 브라우저 `fetch()`를 수행합니다.

---

## 2) Route/Trajectory(경로/궤적) 지원을 위해 필요한 준비

Hotspot은 Point(점) 기반입니다. Route/Trajectory는 LineString(선) 또는 MultiLineString(복수 선)로 다뤄야 합니다.

### 2.1 데이터 모델(권장 초안)

1) **별도 컬렉션 분리(권장)**: `crowd_routes` (또는 `config.data.routeCollection`)
2) 저장 필드 예시
   - `name`(string), `memo`(string), `categoryId`(string)
   - `externalUrl`(string, 선택): 외부 링크 메타데이터(Hotspot과 동일한 규칙으로 재사용)
   - `geometryType`: `"LineString" | "MultiLineString"`
   - `coordinates`: `[[lng, lat], ...]` (EPSG:4326 고정) 또는 polyline 인코딩 문자열
   - `bbox`: `[minLng, minLat, maxLng, maxLat]` (검색/줌 최적화)
   - `dongs`: `[{ dongName, emdCode }, ...]` (경로가 지나가는 동 목록; 선택)
   - `updatedBy`, `updatedAt`

보안 규칙도 hotspot과 동일 패턴(공개 read, staff write)으로 확장할지 여부를 먼저 결정해야 합니다.

### 2.2 UI/지도 기능(OpenLayers) 준비

- 열람(`/map/`)
  - route 레이어(벡터) 추가 + 스타일(선 색/두께/강조)
  - 리스트 UI(또는 필터)에서 route 선택 시
    - 지도 `fit(extent)`으로 줌/센터 이동
    - 해당 route 강조 및 팝업 표시
- 편집(`/map/edit/`)
  - Draw interaction: `ol.interaction.Draw({ type: "LineString" })`
  - Modify interaction: `ol.interaction.Modify({ source })`
  - 저장/수정/삭제 버튼 및 “편집 모드(지점 vs 경로)” 전환 UI

### 2.3 동(경계) 연동: route의 dong 메타 계산

점은 `intersectsCoordinate`로 “한 동”을 고르기 쉽지만, 선은 복수 동을 통과할 수 있습니다.

필요한 정책 결정(둘 중 하나, 또는 병행):

- A) **대표 동 1개만 저장**
  - 예: 경로 중간점(centroid/중앙 인덱스)을 기준으로 판별
  - 장점: 필터 UI 단순
  - 단점: 실제 통과 동 정보 손실
- B) **통과 동 목록을 저장**
  - 경로의 segment 샘플링(예: N개 점) + `intersectsCoordinate`로 dong 집합 계산
  - 또는(정확) OL geometry intersect 기반(복잡)
  - 장점: 필터 정확
  - 단점: 계산 비용/복잡도 증가

### 2.4 마이그레이션/호환성

기존 hotspot과 route를 한 화면에서 함께 다루려면:

- 공통 추상화(추천): “지도 피처 = {kind, id, geometry, meta}”
  - `kind: "hotspot" | "route"`로 클릭/팝업 분기
- 리스트/그룹핑 규칙을 분리
  - hotspot 그룹(현안 그룹)과 route 그룹(노선/구간) 규칙이 다를 가능성이 큼

### 2.5 테스트 전략(현재 플레이북에 맞춘 최소 확장)

현재 테스트는 Playwright 기반이며, Firebase 통합을 강하게 요구하지 않는 범위로 유지하는 편이 안정적입니다.

- 단위(추천): “payload 생성/정규화/동 판별 정책”을 순수 함수로 추출해 테스트
- E2E(최소): route 리스트 렌더링/선택 시 지도 이동/강조 같은 UI 계약을 테스트
- Firestore write 통합 테스트는 CI에서 환경 의존이 크므로, 스태이징 프로젝트를 분리하거나 수동 체크리스트로 운영하는 편이 현실적입니다.

