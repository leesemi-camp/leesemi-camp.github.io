window.APP_CONFIG = {
  auth: {},
  firebase: {
    enabled: true,
    config: {
      apiKey: "AIzaSyBmrncjyNH3SpUxTndhNII9o1CQQWB5vK0",
      authDomain: "semi-campaign-map.firebaseapp.com",
      projectId: "semi-campaign-map",
      storageBucket: "semi-campaign-map.firebasestorage.app",
      messagingSenderId: "999294814733",
      appId: "1:999294814733:web:9d9543b33ed01b6d272344"
    },
    appCheck: {
      enabled: false,
      siteKey: "",
      autoRefresh: true
    }
  },
  map: {
    provider: "osm",
    defaultCenter: { lat: 37.5665, lng: 126.9780 },
    defaultZoom: 13
  },
  launcher: {
    systemPath: "/system/",
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
      enabled: false,
      apiUrl: "",
      sourceType: "json",
      rowPath: "",
      delimiter: ",",
      token: "",
      tokenQueryKey: "KEY",
      queryParams: {},
      idField: "issue_id",
      titleField: "title",
      memoField: "memo",
      categoryIdField: "category_id",
      categoryLabelField: "category_label",
      dongNameField: "dong_name",
      emdCodeField: "emd_cd",
      activeField: "",
      activeValues: ["Y", "1", "active", "진행중"],
      lockFormFields: true,
      requireSelection: false
    },
    issueCollection: "crowd_hotspots"
  },
  trafficOverlays: {
    enabled: true,
    token: "",
    tokenQueryKey: "tokenKey",
    vehicle: {
      label: "차량 통행",
      url: "",
      method: "GET",
      rowPath: "",
      valueProperty: "value",
      longitudeProperty: "lon",
      latitudeProperty: "lat",
      color: "#d92d20",
      outlineColor: "#ffffff",
      visibleByDefault: false
    },
    pedestrian: {
      label: "보행 유동",
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
    enabled: true,
    mode: "emd",
    sourceType: "csv",
    dataPath: "/data/pangyo-focused-month-hour.csv",
    coordinateProjection: "EPSG:4326",
    cellSizeMeter: 250,
    delimiter: ",",
    fields: {
      month: "month",
      hour: "hour",
      emdCode: "emd_cd",
      population: "population",
      longitude: "lon",
      latitude: "lat"
    },
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
