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
  data: {
    boundaryGeoJsonPath: "./data/dong-boundaries.sample.geojson",
    hotspotCollection: "crowd_hotspots"
  }
};
