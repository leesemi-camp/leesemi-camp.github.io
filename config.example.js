window.APP_CONFIG = {
  auth: {
    // 로그인 허용할 선거사무원 이메일 목록
    allowedEmails: [
      "staff1@example.com",
      "staff2@example.com"
    ]
  },
  firebase: {
    enabled: true,
    config: {
      apiKey: "YOUR_FIREBASE_API_KEY",
      authDomain: "YOUR_PROJECT.firebaseapp.com",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_PROJECT.appspot.com",
      messagingSenderId: "YOUR_SENDER_ID",
      appId: "YOUR_APP_ID"
    }
  },
  map: {
    provider: "osm",
    defaultCenter: { lat: 37.5665, lng: 126.9780 },
    defaultZoom: 13
  },
  launcher: {
    systemPath: "/system/",
    // 루트 랜딩 페이지에서 보여줄 서비스 버튼 목록
    services: [
      {
        label: "선거구 지도 서비스",
        description: "동 경계와 지역 현안 조회/수정",
        href: "/map/edit/",
        tone: "slate"
      },
      {
        label: "당원 명부 전화 시스템",
        description: "당원 명부 기반 전화 지원",
        href: "https://script.google.com/macros/s/AKfycbyX-psBvoVHiYpdQKlRT4og6kCQCNsiWdhPoAr5wVz-Iz7LZF5RT5pylnxGe0D4JYU/exec",
        tone: "sage"
      },
      {
        label: "후원회 명부 전화 시스템",
        description: "후원회 명부 기반 전화 지원",
        href: "https://script.google.com/macros/s/AKfycbySVaEO1wTe-TgYTCp7Uqg5F5LdwBVnTV71HKNUJ0WQCx0oN1Onxs585LGRidX5hTI_/exec",
        tone: "sand"
      },
      {
        label: "블로그 글 작성 도우미",
        description: "정책/현안 글 작성 지원 도구",
        href: "https://leesemi114.pythonanywhere.com/",
        newTab: true,
        tone: "slate"
      },
      {
        label: "추가 서비스 예시",
        description: "다른 내부 서비스 링크를 여기에 추가",
        href: "https://example.com",
        newTab: true,
        tone: "slate"
      }
    ]
  },
  data: {
    boundarySources: [
      "/data/daejangdong.wfs.xml",
      "/data/baekhyeondong.wfs.xml",
      "/data/seogundong.wfs.xml",
      "/data/unjungdong.wfs.xml",
      "/data/pangyodong.wfs.xml",
      "/data/hasanundong.wfs.xml"
    ],
    commonPledges: [
      {
        title: "🚌 교통·주차 공약",
        description: "출퇴근 정체구간 개선, 버스 체계 개편, 공영주차장 확충"
      },
      {
        title: "🏫 교육·보육 공약",
        description: "통학 안전 강화, 돌봄 인프라 확충, 과밀학급 완화 지원"
      },
      {
        title: "🌳 환경·안전 공약",
        description: "공원/산책로 정비, CCTV·스마트 가로등 확충, 침수 취약지 개선"
      },
      {
        title: "🏘️ 주거·경제 공약",
        description: "노후 인프라 정비, 골목상권 활성화, 생활밀착 문화공간 확대"
      }
    ],
    boundaryStrokeColor: "#0b57d0",
    boundaryStrokeWidth: 3.2,
    boundaryHaloColor: "rgba(255,255,255,0.95)",
    boundaryHaloWidth: 6,
    issueCatalog: {
      // true면 /map/edit에서 "연동 현안 선택" 드롭다운을 표시합니다.
      enabled: false,
      // Apps Script Web App(JSON) 또는 시트 연계 API URL
      apiUrl: "",
      sourceType: "json", // "json" | "csv"
      rowPath: "", // 예: "rows" 또는 "result.items"
      delimiter: ",", // CSV일 때 사용
      token: "",
      tokenQueryKey: "KEY",
      queryParams: {},
      // API 컬럼 매핑
      idField: "issue_id",
      titleField: "title",
      memoField: "memo",
      categoryIdField: "category_id",
      categoryLabelField: "category_label",
      dongNameField: "dong_name",
      emdCodeField: "emd_cd",
      // 상태 필터를 쓰려면 activeField + activeValues 설정
      activeField: "",
      activeValues: ["Y", "1", "active", "진행중"],
      // true면 연동 현안을 선택한 경우 제목/내용을 편집 잠금
      lockFormFields: true,
      // true면 좌표 저장 시 연동 현안 선택을 필수화
      requireSelection: false
    },
    issueCollection: "crowd_hotspots"
  },
  trafficOverlays: {
    // View-T Open API 토큰키(쿼리 파라미터) 사용 시 입력
    enabled: true,
    token: "YOUR_VIEWT_TOKEN",
    tokenQueryKey: "tokenKey",
    vehicle: {
      label: "차량 통행",
      // View-T 차량 통행량 API URL 입력
      url: "",
      method: "GET",
      // JSON 응답에서 행 배열 위치. 예: "result.rows"
      rowPath: "",
      // 통행량 수치 필드명
      valueProperty: "value",
      longitudeProperty: "lon",
      latitudeProperty: "lat",
      color: "#d92d20",
      outlineColor: "#ffffff",
      visibleByDefault: false
    },
    pedestrian: {
      label: "보행 유동",
      // View-T 보행 유동 API URL 입력
      url: "",
      method: "GET",
      rowPath: "",
      valueProperty: "value",
      longitudeProperty: "lon",
      latitudeProperty: "lat",
      color: "#155eef",
      outlineColor: "#ffffff",
      visibleByDefault: false
    }
  },
  mobilityPopulation: {
    // 수도권 생활이동 CSV/JSON 파일 경로 또는 OpenAPI URL
    enabled: true,
    // "emd": 행정동 경계 채움 / "grid250": 250m 격자 칸 채움
    mode: "emd",
    sourceType: "json", // "csv" | "json"
    // 예시1) 로컬 샘플: "/data/capital-mobility.sample.csv"
    // 예시1-2) 판교 대상 필터 샘플: "/data/pangyo-focused-month-hour.csv"
    // 예시2) 경기도 OpenAPI: "https://openapi.gg.go.kr/YOUR_SERVICE_NAME"
    dataPath: "https://openapi.gg.go.kr/YOUR_SERVICE_NAME",
    // OpenAPI 키를 별도 파라미터로 붙일 때 사용
    token: "YOUR_GG_API_KEY",
    tokenQueryKey: "KEY",
    // URL 쿼리 고정 파라미터 (필요 시)
    queryParams: {
      Type: "json",
      pIndex: 1,
      pSize: 1000
    },
    // 좌표값 투영체계 (보통 lon/lat는 EPSG:4326)
    coordinateProjection: "EPSG:4326",
    // mode=grid250일 때 격자 크기(미터)
    cellSizeMeter: 250,
    delimiter: ",",
    // JSON인 경우 행 배열 경로(예: "result.rows" 또는 "서비스명.1.row")
    // 비우면 구조 자동 감지
    rowPath: "",
    fields: {
      // 월 필드(예: 202506)
      month: "STD_YM",
      // 시간 필드(0~23 또는 "08:00" 형태)
      hour: "시간대코드",
      // 행정동 코드(8자리)
      emdCode: "행정동코드",
      // 인구/이동량 수치 필드
      population: "유동인구수",
      // mode=grid250일 때 중심 좌표
      longitude: "lon",
      latitude: "lat",
      // coordinateProjection=EPSG:3857일 때는 x/y 사용
      x: "x",
      y: "y"
    },
    // 시간 코드 라벨 매핑(예: TZ 구간형 데이터)
    hourLabels: {
      1: "TZ01",
      2: "TZ02",
      3: "TZ03",
      4: "TZ04",
      5: "TZ05",
      6: "TZ06",
      7: "TZ07",
      8: "TZ08",
      9: "TZ09",
      10: "TZ10"
    },
    defaultMonth: "202506",
    defaultHour: 8,
    visibleByDefault: false
  }
};
