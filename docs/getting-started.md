# 온보딩 가이드 (Onboarding Guide)

## 프로젝트 요약 (Project Overview)

이 저장소는 GitHub Pages 기반 정적 웹 앱(Static Web App)이며, 지도 화면은 OpenLayers + OSM Korea의 군사시설 제외 OpenStreetMap 타일을 사용하고, 인증/데이터는 Firebase Auth/Firestore로 처리합니다. 주요 설정은 `config.js`에 모여 있습니다.

## 기술 스택 (Tech Stack)

- 정적 웹 프론트엔드: HTML/CSS/JavaScript
- 지도 엔진: OpenLayers (OL)
- 지도 타일: OSM Korea 군사시설 제외 타일 (`tiles.osm.kr`)
- 인증: Firebase Auth (Google Sign-In, Custom Claim `staff`)
- 데이터 저장: Firebase Firestore
- 보안 옵션: Firebase App Check (reCAPTCHA v3)
- 배포: GitHub Pages + GitHub Actions
- 데이터 포맷: GeoJSON, WFS XML, CSV

## 로컬 실행 (Local Run with npx)

1. Node.js LTS 버전을 준비합니다.
2. 아래 명령으로 정적 서버(Static Server)를 실행합니다.

```bash
npx serve . -l 5173
```

1. 브라우저에서 아래 주소로 접속합니다.

- `http://localhost:5173/` (메인)
- `http://localhost:5173/map/` (현안 열람)
- `http://localhost:5173/map/edit/` (현안 수정)

`serve`가 동작하지 않으면 아래 대체 명령을 사용합니다.

```bash
npx http-server . -p 5173 -c-1
```

## 설정 파일 (Configuration)

- `config.js`가 실제 실행 설정(Production/Dev)을 담습니다.
- 형식은 `config.example.js`를 참고합니다.
- 정적 호스팅 특성상 `config.js`는 브라우저에 노출됩니다. API 토큰(Token)이나 비밀키(Secret)는 프론트에 직접 넣지 말고 프록시(Proxy)나 서버 측 저장소로 이동하세요.

## 인증/권한 (Auth/Authorization)

- `/map/edit/`는 Firebase Auth 로그인 후 `staff=true` 커스텀 클레임(Custom Claim)이 있는 사용자만 접근 가능합니다.
- 로컬에서 로그인이 필요하면 Firebase Console에서 `localhost`를 Authorized Domains에 추가하세요.
- 권한 부여 예시는 아래와 같습니다.

```bash
node scripts/set-staff-claim.cjs --service-account /abs/path/service-account.json --email staff@example.com --staff true
```

## 기본 경로 (Key Paths)

- `index.html`: 공개 랜딩 페이지
- `map/`: 현안 열람 지도(View)
- `map/edit/`: 현안 수정 지도(Edit)
- `app.js`: 핵심 로직
- `config.js`: 환경 설정
- `data/`: 동 경계, 유동 인구 등 로컬 데이터
