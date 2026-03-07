# 선거사무원 지도 대시보드 (GitHub Pages + OSM/OpenLayers)

선거구 동 경계와 현장 혼잡 지점을 공유하기 위한 기본 골격입니다.

## 현재 포함된 기능

1. 선거사무원만 로그인 허용 (Firebase Auth + 이메일 allowlist)
2. OSM 타일 + OpenLayers 지도 연동
3. 동 경계(GeoJSON) 표시
4. 혼잡 지점 마커 등록/실시간 공유(Firestore)

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
2. 필요하면 `config.example.js`를 참고해 형식 확인
3. 실제 동 경계 GeoJSON으로 교체
   - 기본 샘플: `data/dong-boundaries.sample.geojson`
   - 교체 시 `config.js`의 `data.boundaryGeoJsonPath`도 같이 변경 가능

## 4) GitHub Pages 배포

1. 코드를 `main` 브랜치에 푸시
2. GitHub 저장소 Settings > Pages > Source를 GitHub Actions로 설정
3. `.github/workflows/deploy-pages.yml`가 자동 배포 수행

## 운영 시 주의사항

- GitHub Pages는 정적 호스팅이라 페이지 자체 URL은 공개될 수 있습니다.
- 현재 템플릿은 인증되지 않은 사용자가 데이터(Firestore)를 읽지 못하도록 보호합니다.
- "페이지 자체 접근까지 완전히 차단"이 필요하면 Cloudflare Access 같은 별도 게이트를 앞단에 두는 것을 권장합니다.
