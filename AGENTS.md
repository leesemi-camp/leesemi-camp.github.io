# Project: 대한민국 성남시 판교/운중/백현/대장 시의원 웹페이지

## Project Overview

정적 웹 앱(Static Web App)이며 GitHub Pages로 배포합니다. 지도는 OpenLayers(OL) + OSM 타일을 사용하고, 인증/데이터는 Firebase Auth + Firestore를 사용합니다. 설정은 `config.js`에서 관리합니다.

## Key Paths

```text
.
├─ .github/workflows/     # GitHub Actions: Pages 배포
├─ assets/                # 이미지, 아이콘 등 정적 리소스
├─ data/                  # GeoJSON/WFS XML/CSV 데이터
├─ map/                   # 지도 열람 화면
│  └─ edit/               # 지도 편집 화면(로그인 필요)
├─ scripts/               # 운영 스크립트
├─ system/                # 시스템 런처/로그인 관련 화면
├─ app.js                 # 지도/데이터/오버레이 핵심 로직
├─ config.js              # 실행 설정(노출됨)
├─ config.example.js      # 설정 예시
├─ index.html             # 공개 랜딩
└─ styles.css             # 공통 스타일
```

## Documentation & Diagrams (GitHub Markdown)

이 저장소의 아키텍처 다이어그램은 GitHub Markdown에서 **Mermaid**와 **GeoJSON**을 적극적으로 사용합니다.

이 문서는 "에이전트가 바로 실행 가능한" 지시서로 유지합니다.

- 저장소에 특화된 규칙/결정을 우선 기록합니다(불필요한 일반론 최소화).
- 체크리스트/템플릿 중심으로 작성해, 결정을 다시 묻지 않게 합니다.

### Primary Formats (Decided)

- Mermaid: 코드펜스 ` ```mermaid `
- GeoJSON: 코드펜스 ` ```geojson `

### Sub Diagram Split Convention (Decided)

전체를 한 장의 다이어그램으로 모으지 말고, 다음 3가지 축으로 분할합니다.

1) Ownership View: Entity/Component Ownership 경계(누가 책임지는가)
2) Layering View: 계층 구조(어디에 속하는가 / 의존 방향이 올바른가)
3) Relationship View: 유스케이스별 런타임 흐름(어떻게 상호작용하는가)

### Canonical Location (Docs Map)

아키텍처 문서는 아래 위치를 정식으로 사용합니다(없으면 생성).

- `docs/README.md`: 인덱스 + 범례 + 용어집(Owner, 약어, 색상/표기 규칙)
- `docs/ownerships.md`: Ownership 다이어그램(서비스/컴포넌트 경계)
- `docs/layers.md`: Layering 다이어그램(계층 고정 + 위로 향하는 의존 금지)
- `docs/relationships-*.md`: 유스케이스/런타임 다이어그램(파일 1개 = 유스케이스 1개)
- `docs/data-contracts.md`: 데이터 계약(IDs, 스키마, 보관/삭제, 소유권) + 링크

주의:

- 문서는 기본적으로 `docs/` 아래에 둡니다(`README.md`, `TODO.md`, `AGENTS.md` 제외).
- 다이어그램은 "읽는 사람(온보딩)" 기준으로 링크를 함께 제공합니다(노드 클릭 기능에 의존하지 않음).

### Copy/Paste Templates

#### Ownership View (Mermaid)

```mermaid
flowchart LR
  subgraph "Group A"
    A1["Service A"]
    A2["Worker A"]
  end

  subgraph "Group B"
    B1["API B"]
    B2["DB B"]
  end

  A1 -->|"HTTP 요청"| B1
  A2 -->|"Batch ingest"| B2
```

#### Layering View (Mermaid)

```mermaid
flowchart TB
  subgraph "Client"
    C1["Browser"]
  end

  subgraph "Edge"
    E1["CDN / Static Hosting"]
  end

  subgraph "App"
    A1["Frontend App"]
    A2["Auth (Firebase)"]
  end

  subgraph "Data"
    D1["Firestore"]
    D2["GeoJSON / CSV (repo)"]
  end

  C1 --> E1
  E1 --> A1
  A1 --> A2
  A1 --> D1
  A1 --> D2
```

규칙:

- 의존/호출은 기본적으로 "위 계층 -> 아래 계층" 방향으로만 그립니다(역방향 화살표 금지).
- 교차 의존이 필요하면 Relationship View(유스케이스)에서만 예외적으로 표현합니다.

#### Relationship View (Mermaid sequenceDiagram)

```mermaid
sequenceDiagram
  participant U as User
  participant W as Web App
  participant F as Firestore

  U->>W: Load /map/
  W->>F: Read hotspots
  F-->>W: hotspot list
  W-->>U: Render markers + list

  alt Read fails
    F-->>W: error
    W-->>U: Show error state
  end
```

#### GeoJSON (Minimal Example)

```geojson
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "name": "sample" },
      "geometry": { "type": "Point", "coordinates": [127.111, 37.394] }
    }
  ]
}
```

규칙:

- 큰 경계/격자 데이터는 Markdown에 인라인으로 넣지 말고 `data/*.geojson` 파일로 두고 링크합니다.

## Testing (Playwright)

이 저장소는 Playwright 기반 E2E/스모크 테스트를 사용합니다.

- 실행: `npm test`
- 설정: `playwright.config.js` (기본 webServer로 `npm run serve`, 기본 URL `http://localhost:5173`)
- 주요 아티팩트 루트(권장 탐색 경로):
  - `test-results/`
  - `playwright-report/`

### CI Regression Policy (Decided)

GitHub Actions의 `CI` 워크플로(`npm test`, Chromium/Chrome/Edge/WebKit 포함)를 최종 통과 기준으로 봅니다.

- 지도, 팝업, 사진 슬라이드쇼, 포커스, 애니메이션, `requestAnimationFrame`, 이미지 로딩을 건드리는 변경은 로컬 Chromium 통과만으로 완료하지 않습니다. 커밋/푸시 요청이 있거나 CI 실패를 고치는 작업이면 푸시 후 GitHub Actions `CI`가 끝날 때까지 확인합니다.
- CI 실패를 고칠 때는 먼저 `gh run list`와 `gh run view <run_id> --log-failed`로 실제 실패 로그를 읽고, 원인을 제품 버그 / 테스트 동기화 문제 / CI 환경 차이 중 하나로 분류한 뒤 수정합니다.
- 테스트를 약화시키는 방향으로 바로 바꾸지 않습니다. 단, WebKit에서 OpenLayers 캔버스 좌표, 지도 애니메이션, 팝업 재배치처럼 브라우저별 이벤트 순서가 흔들리는 부분은 Chromium/Edge에서 정밀 동작을 검증하고 WebKit에서는 사용자에게 보이는 최종 상태를 검증하도록 나눌 수 있습니다.
- 팝업 테스트는 `hidden`/`map-popup-closing` 상태가 아니고 필요한 DOM이 렌더링된 뒤 검증합니다. 고정 sleep 대신 `waitForFunction` 또는 `expect.poll`로 사용자에게 보이는 안정 상태를 기다립니다.
- 팝업 사진 슬라이드쇼 테스트는 팝업 렌더링, 슬라이드쇼 등록, 슬라이드 이동 사이의 비동기 간격을 만들지 않습니다. 상태가 재렌더/닫힘 이벤트로 무효화될 수 있으면 준비 확인, 동작, 결과 확인을 같은 브라우저 컨텍스트 함수 안에서 처리합니다.
- 포커스 복귀 테스트는 대상 카드가 필터/재렌더로 사라질 수 있는지 먼저 확인합니다. DOM 노드를 오래 들고 있지 말고, 닫힘 이후 다시 locator 기준으로 확인합니다.

### Final Report: Screenshot Path Listing (Decided)

테스트 실행 결과로 스크린샷이 생성된 경우, 최종 보고에 **모든 스크린샷 파일 경로**를 포함합니다(비교/검토를 쉽게 하기 위함).

수집 규칙(결정 완료):

- 검색 루트: `test-results/`, `playwright-report/`
- 확장자: `.png`, `.jpg`, `.jpeg`, `.webp`
- 정렬: 경로 기준 안정적 사전순 정렬
- 그룹핑: "즉시 부모 폴더(보통 Playwright의 테스트별 output dir)" 단위로 묶고,
  폴더명에서 spec/test 이름을 유추할 수 있으면 함께 표기(불가하면 폴더명만 표기)
- 부가 출력: `playwright-report/index.html`이 존재하면 해당 경로도 함께 출력

## Security Notes

- `config.js`는 정적 호스팅 특성상 사용자 브라우저에 노출됩니다. 토큰/비밀키를 직접 넣지 않습니다.
- 외부 API 토큰이 필요하면 프록시/서버측 비밀 저장소(예: Secret Manager)로 이동하는 방식을 우선 고려합니다.

## Technical Notes

- Static Hosting: GitHub Pages에서 정적 파일 서빙.
- Map Engine: OpenLayers(OL) CDN 로드 + OSM 타일.
- Auth: Firebase Auth(Google Sign-In), staff 커스텀 클레임으로 편집 권한 제어.
- Data Store: Firestore 컬렉션 `crowd_hotspots` 사용.
- External Data:
  - 동 경계: WFS XML/GeoJSON (`data/*.wfs.xml`, `data/dong-boundaries.sample.geojson`).
  - 유동 인구: CSV/JSON 또는 OpenAPI (`data/*.csv`, `mobilityPopulation` 설정).
  - 교통/보행 오버레이: 외부 API (`trafficOverlays` 설정).
  - 외부 현안 카탈로그: `data.issueCatalog` 설정.
- Security: App Check 옵션 존재(기본 비활성), API 토큰은 프론트에 직접 노출 금지 권장.

## Entry Pages

Update this section if new entry points are added or removed. This helps testing and onboarding.

- `/` : 공개 랜딩 (`index.html`)
- `/map/` : 현안 열람
- `/map/edit/` : 현안 편집(로그인 필요)
- `/system/` : 내부 시스템 런처

## Implementation Policies

- No fake implementation, no stubs, no mocks.

### Test Files

- 테스트 파일은 최소한으로 유지하고, 불필요한 헬퍼 추가를 지양합니다. 테스트 커버리지를 높이는 것보다, 핵심 기능이 망가지지 않는다는 것을 확인하는 것이 중요합니다.
- 테스트 제목은 짧고 이해하기 쉽게 작성합니다.
- 테스트 코드 주석은 한국어로 작성합니다.
