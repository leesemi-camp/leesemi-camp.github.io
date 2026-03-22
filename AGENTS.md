# Project: 대한민국 성남시 판교/운중/백현/대장 시의원 웹페이지

## Repository Summary

정적 웹 앱(Static Web App)이며 GitHub Pages로 배포합니다. 지도는 OpenLayers(OL) + OSM 타일을 사용하고, 인증/데이터는 Firebase Auth + Firestore를 사용합니다. 설정은 `config.js`에서 관리합니다.

## Structure (Key Paths)

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

- `/` : 공개 랜딩 (`index.html`)
- `/map/` : 현안 열람
- `/map/edit/` : 현안 편집(로그인 필요)
- `/system/` : 내부 시스템 런처

## Workflow Instructions

- No fake implementation, no stubs, no mocks.
- Include failure handling and test execution in every planning process.
- Use subagent whenever possible.
