# 지도 API 조사: Kakao Map API vs OpenLayers vs OpenStreetMap

이 문서는 Kakao Map API의 공식 명세, 사용 가이드, 예시를 조사하고, 현재 저장소가 사용 중인 OpenLayers + OpenStreetMap(OSM) 조합과 비교한 결과를 정리합니다.

## 목적

- Kakao Map API가 제공하는 기능 범위를 확인합니다.
- OpenLayers, OSM과의 비교에서 무엇이 "같은 종류의 기능"이고 무엇이 다른 층위의 기능인지 구분합니다.
- 현재 저장소의 요구사항에 비추어 어떤 선택이 자연스러운지 판단 근거를 남깁니다.

## 비교 원칙

세 비교 대상은 성격이 다릅니다. 이를 구분하지 않으면 기능 비교가 왜곡됩니다.

- **Kakao Map API**: 지도 SDK, 장소 검색, 주소/좌표 변환, 로드뷰, 지도 URL 연계를 포함한 플랫폼입니다.
- **OpenLayers**: 웹 지도 렌더링과 인터랙션, 레이어, 포맷 처리에 강한 JavaScript 라이브러리입니다.
- **OpenStreetMap**: 오픈 지도 데이터와 타일 생태계입니다. 지도 SDK 자체가 아니라 데이터/타일 제공의 성격이 강합니다.

즉, Kakao와 OpenLayers는 일부 직접 비교가 가능하지만, OSM은 주로 "배경지도/데이터/운영 정책" 관점에서 비교해야 합니다.

## 현재 저장소 기준 전제

현재 저장소는 OpenLayers 위에 OSM 타일을 올리고, GeoJSON/WFS XML 경계와 Firestore 데이터를 중첩하는 구조입니다.

- 지도 엔진: OpenLayers
- 배경지도: OSM 기본 타일
- 주요 오버레이: 동 경계, hotspot, 인구/교통 오버레이
- 데이터 포맷: GeoJSON, WFS XML, CSV, JSON

이 구조는 "지도 엔진"과 "배경지도 공급자"를 분리해 두고 있다는 점이 중요합니다.

## Kakao Map API 조사 요약

### 도입 및 설정

Kakao Map JavaScript API 사용에는 다음 준비가 필요합니다.

- Kakao Developers 앱 생성
- JavaScript Key 발급
- JavaScript SDK 도메인 등록
- 카카오맵 사용 설정 활성화
- 필요 시 추가 라이브러리(`services`, `clusterer`, `drawing`) 로드

실행 방식은 단순합니다. SDK 스크립트를 로드한 뒤 `kakao.maps.Map(container, options)`로 지도를 생성합니다. 동적 로딩이 필요한 경우 `autoload=false`와 `kakao.maps.load(callback)`를 사용할 수 있습니다.

### 기본 지도 SDK 기능

공식 명세 기준으로 다음 기능이 제공됩니다.

- 지도 생성, 중심 이동, 레벨 변경, bounds 맞춤, 컨트롤 추가
- 이벤트 처리: click, dblclick, drag, zoom, idle, tilesloaded 등
- 오버레이: Marker, InfoWindow, CustomOverlay, AbstractOverlay
- 도형: Polyline, Polygon, Circle, Ellipse, Rectangle
- 정적 지도: StaticMap
- 로드뷰: Roadview, RoadviewClient, RoadviewOverlay
- 타일셋 확장: Tileset, custom tileset

Kakao SDK의 특징은 "지도 위 오버레이"와 "카카오 플랫폼 서비스"가 하나의 문서 체계 안에 묶여 있다는 점입니다.

### 부가 라이브러리

기본 SDK 외에 공식 라이브러리가 존재합니다.

- `services`: 장소 검색, 주소-좌표 변환, 좌표계 변환
- `clusterer`: 마커 클러스터링
- `drawing`: 마커/도형 그리기, 수정, 삭제, undo/redo

특히 `drawing` 라이브러리는 관리자 화면에서 빠르게 편집 UI를 구현할 때 유용합니다. DrawingManager와 Toolbox가 함께 제공되며, 그려진 데이터를 `getData()`로 내보낼 수 있습니다.

### Kakao Local API

Kakao Local API는 지도 SDK와 별도로 REST API도 제공합니다. 공식 문서 기준 제공 범위는 다음과 같습니다.

- 주소로 좌표 변환
- 좌표로 행정구역정보 변환
- 좌표로 주소 변환
- 좌표계 변환
- 키워드로 장소 검색
- 카테고리로 장소 검색

이 기능은 한국 주소 체계, 장소 검색, 행정구역 코드를 직접 다루는 서비스에 특히 유리합니다.

### 지도 URL 연계

가이드 문서에는 Kakao 지도 본체로 연결하는 URL 패턴도 정리되어 있습니다.

- 지도 바로가기
- 길찾기 바로가기
- 로드뷰 바로가기
- 검색 결과 바로가기

이는 브라우저 내에서 직접 경로 계산을 수행하는 기능과는 다릅니다. 사용자에게 Kakao 지도/로드뷰/길찾기 화면을 넘기는 딥링크 성격이 강합니다.

## OpenLayers와의 비교

### 핵심 차이

OpenLayers는 플랫폼보다 엔진에 가깝습니다. Kakao가 "지도 + 검색 + 주소 + 로드뷰" 묶음이라면, OpenLayers는 "레이어 + 소스 + 인터랙션 + 포맷 + 투영" 조합에 강합니다.

공식 API와 예제 기준 OpenLayers의 강점은 다음과 같습니다.

- 레이어/소스 구조가 분리되어 있어 교체가 쉽습니다.
- Tile, Image, Vector, VectorTile, WebGLTile, Heatmap 등 표현 방식이 넓습니다.
- Draw, Modify, Select, Snap, Translate 등 편집 인터랙션 조합이 유연합니다.
- GeoJSON, KML, GPX, WFS, WKT, WKB, TopoJSON, OSMXML 등 포맷 지원 범위가 넓습니다.
- WMS, WMTS, OGC API, ArcGIS, GeoTIFF, COG 등 외부 GIS 소스 연결이 쉽습니다.
- 투영과 좌표계 변환 제어가 강합니다.

즉, OpenLayers는 국내 지도 플랫폼 기능보다 범용 GIS 웹 클라이언트 기능이 강합니다.

### Kakao 대비 OpenLayers의 우위

- WFS XML, GeoJSON 같은 현재 저장소의 경계 데이터 처리와 궁합이 좋습니다.
- 향후 route/trajectory, 벡터 편집, 분석 오버레이 확장에 유리합니다.
- 특정 타일 공급자에 덜 종속적입니다.
- OGC 계열 또는 자체 데이터 소스를 붙이기 쉽습니다.

### Kakao 대비 OpenLayers의 약점

- 장소 검색, 주소 변환, 행정동 변환, 로드뷰 같은 서비스는 내장 기능이 아닙니다.
- 관리자형 드로잉 UI도 가능하지만, Kakao `drawing`처럼 즉시형으로 묶여 있지는 않습니다.
- 한국 사용자에게 익숙한 Kakao 지도 화면/길찾기 연결 경험은 별도 구현 또는 외부 연계가 필요합니다.

## OpenStreetMap과의 비교

### OSM의 역할

OSM은 지도 렌더링 SDK가 아니라 오픈 지도 데이터와 타일 생태계입니다.

- 오픈 데이터 기반으로 벤더 종속성이 낮습니다.
- 도로, 지물, 장소 등 기초 공간정보의 출처가 됩니다.
- 다양한 타일 제공자, 벡터타일, 자체 호스팅으로 확장할 수 있습니다.

현재 저장소에서는 OSM을 "배경지도 타일 공급자"로 사용하고 있습니다.

### OSM 표준 타일 사용 시 제약

OSM 표준 타일 정책은 비교 시 중요한 운영 제약입니다.

- 출처 표기를 명확히 해야 합니다.
- 올바른 타일 URL을 사용해야 합니다.
- 캐시 정책을 준수해야 합니다.
- 대량 프리패치, 오프라인 저장, bulk download는 금지됩니다.
- 서비스 가용성은 best-effort이며 SLA가 없습니다.

즉, OSM 데이터는 개방적이지만, `tile.openstreetmap.org` 표준 타일 서버는 대규모 상용 또는 고트래픽 서비스의 안정적 백엔드로 전제하면 안 됩니다.

## 기능 비교 요약

| 비교 축 | Kakao Map API | OpenLayers | OpenStreetMap |
| --- | --- | --- | --- |
| 제품 성격 | 지도 플랫폼 + 서비스 | 지도 엔진/라이브러리 | 오픈 지도 데이터 + 타일 생태계 |
| 기본 지도 렌더링 | 제공 | 제공 | 직접 제공 아님 |
| 베이스맵 | Kakao 자체 지도/스카이뷰/하이브리드 | 외부 공급자 연결 | 표준 타일 및 파생 서비스 |
| 장소 검색 | 공식 지원 | 내장 아님 | 코어 기능 아님 |
| 주소/좌표 변환 | 공식 지원 | 내장 아님 | 코어 기능 아님 |
| 로드뷰/스트리트뷰 | 공식 지원 | 없음 | 없음 |
| 클러스터링 | 공식 라이브러리 | 지원 | 자체 렌더링 아님 |
| 드로잉/편집 | 공식 라이브러리 | 강력하지만 조합형 | 자체 렌더링 아님 |
| GeoJSON/WFS/WMS/WMTS/OGC | 제한적/비중 낮음 | 강함 | 데이터 원천과 별개 |
| 포맷/투영 제어 | 기본 수준 | 강함 | 데이터 원천과 별개 |
| 정적 지도 | 공식 지원 | 별도 조합 필요 | 별도 조합 필요 |
| 운영 정책 | 앱 키, 도메인, 쿼터 | 라이브러리 라이선스 중심 | 데이터 라이선스 + 타일 정책 |

## 기능 집합이 다른 영역

아래 영역은 단순 기능표보다 별도 설명이 필요합니다.

### 1. 장소 검색과 지오코딩

Kakao는 지도 SDK와 Local API 안에 장소 검색, 주소 검색, 행정구역 변환이 들어 있습니다. 반면 OpenLayers는 이런 기능을 직접 제공하지 않으므로 외부 geocoder 또는 검색 API를 조합해야 합니다. OSM도 원천 데이터는 제공하지만, 저장소 수준에서 바로 같은 방식의 서비스 API를 제공하는 것은 아닙니다.

따라서 "한국 주소/장소 탐색"이 핵심 요구라면 Kakao가 유리합니다.

### 2. 로드뷰

Kakao는 Roadview 객체, RoadviewClient, 관련 오버레이를 공식 지원합니다. OpenLayers와 OSM에는 동등한 내장 기능이 없습니다.

따라서 거리 시점 보기 또는 현장 검증 UX가 중요하면 Kakao는 명확한 강점을 가집니다.

### 3. 길찾기와 내비게이션

Kakao 가이드에는 길찾기 URL 패턴이 정리되어 있고, 내비게이션은 Kakao Navi 또는 Kakao Mobility 영역과 연계됩니다. 하지만 브라우저 내 지도 SDK 자체가 범용 경로 계산 엔진 역할을 한다고 보기는 어렵습니다.

OpenLayers도 자체 경로 계산 기능은 없습니다. 외부 라우팅 엔진이 필요합니다.

즉, "경로 계산"은 두 진영 모두 별도 서비스 의존성이 있으며, Kakao는 딥링크 연계가 더 자연스럽다는 차이가 있습니다.

### 4. GIS 포맷과 표준 서비스

OpenLayers는 WFS, WMS, WMTS, GeoJSON, KML, GeoTIFF, OGC API 등과의 결합이 자연스럽습니다. 현재 저장소처럼 WFS XML 경계와 GeoJSON, CSV를 조합하는 구조에도 잘 맞습니다.

Kakao는 지도 서비스 플랫폼으로는 강하지만, 범용 GIS 클라이언트로서의 폭은 OpenLayers보다 좁습니다.

### 5. 타일 공급자와 운영 유연성

OpenLayers는 타일 공급자를 라이브러리 밖에서 선택합니다. 따라서 OSM, WMTS, XYZ, ArcGIS, 자체 타일 서버 등으로 유연하게 이동할 수 있습니다.

Kakao는 Kakao 지도를 쓰는 방향으로 결합도가 높습니다. 일관된 사용자 경험을 주는 장점이 있지만, 공급자 교체 자유도는 낮습니다.

## 현재 저장소 관점에서의 해석

현재 저장소 요구는 다음과 더 가깝습니다.

- 경계 데이터 로딩
- 벡터 오버레이 중첩
- 지도 클릭 기반 hotspot 편집
- GeoJSON/WFS XML/CSV 등 외부 데이터 조합
- 향후 route/trajectory 확장 가능성

이 기준에서는 OpenLayers가 자연스럽습니다. 특히 범용 레이어/포맷/편집 구조가 현재 데이터 구조와 잘 맞습니다.

반대로 다음 요구가 중심으로 올라오면 Kakao 전환 또는 혼합 구성이 검토 대상이 됩니다.

- 한국 장소 검색과 주소 변환이 핵심 기능이 되는 경우
- 로드뷰 연동이 중요한 경우
- Kakao 지도/길찾기 본체로 보내는 UX가 중요한 경우
- 관리자용 드로잉 UI를 빠르게 붙여야 하는 경우

## 결론

정리하면 세 대상의 역할은 다음과 같습니다.

- Kakao Map API는 "국내 지도 플랫폼"입니다.
- OpenLayers는 "지도 엔진"입니다.
- OpenStreetMap은 "오픈 지도 데이터와 타일 생태계"입니다.

현재 저장소처럼 경계 데이터, 커스텀 오버레이, 포맷 다양성, 향후 벡터 편집 확장이 중요한 경우에는 OpenLayers 유지가 논리적으로 더 자연스럽습니다. 반대로 한국형 검색, 주소 변환, 로드뷰, 카카오맵 딥링크가 제품의 중심 가치가 되면 Kakao Map API의 도입 가치가 커집니다.

## 참고자료

### Kakao Map API

1. Kakao Maps API Guide
   - https://apis.map.kakao.com/web/guide/
2. Kakao Maps API Documentation
   - https://apis.map.kakao.com/web/documentation/
3. Kakao Maps API Samples
   - https://apis.map.kakao.com/web/sample/

### Kakao Local API

1. Kakao Local API 소개
   - https://developers.kakao.com/docs/latest/ko/local/common
2. Kakao Local API 개발 가이드
   - https://developers.kakao.com/docs/latest/ko/local/dev-guide

### OpenLayers

1. OpenLayers API Documentation
   - https://openlayers.org/en/latest/apidoc/
2. OpenLayers Examples
   - https://openlayers.org/en/latest/examples/

### OpenStreetMap

1. OpenStreetMap 소개
   - https://www.openstreetmap.org/about
2. OSM Standard Tile Usage Policy
   - https://operations.osmfoundation.org/policies/tiles/