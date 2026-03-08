window.APP_CONFIG = {
  auth: {
    allowedEmails: [
      "flyingjae@gmail.com",
      "kyjune1014@gmail.com",
      "beautiful.semi@gmail.com",
      "luncliff@gmail.com",
      "windwing987@gmail.com",
      "jhjin2527@gmail.com",
      "sudeki72@gmail.com",
      "mtgoat9705@gmail.com"
    ]
  },
  firebase: {
    enabled: true,
    config: {
      apiKey: "AIzaSyBmrncjyNH3SpUxTndhNII9o1CQQWB5vK0",
      authDomain: "semi-campaign-map.firebaseapp.com",
      projectId: "semi-campaign-map",
      storageBucket: "semi-campaign-map.firebasestorage.app",
      messagingSenderId: "999294814733",
      appId: "1:999294814733:web:9d9543b33ed01b6d272344"
    }
  },
  map: {
    provider: "osm",
    defaultCenter: { lat: 37.5665, lng: 126.9780 },
    defaultZoom: 13
  },
  data: {
    boundarySources: [
      "./data/daejangdong.wfs.xml",
      "./data/baekhyeondong.wfs.xml",
      "./data/seogundong.wfs.xml",
      "./data/unjungdong.wfs.xml",
      "./data/pangyodong.wfs.xml",
      "./data/hasanundong.wfs.xml"
    ],
    boundaryStrokeColor: "#0b57d0",
    boundaryStrokeWidth: 3.2,
    boundaryHaloColor: "rgba(255,255,255,0.95)",
    boundaryHaloWidth: 6,
    hotspotCollection: "crowd_hotspots"
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
    dataPath: "./data/pangyo-focused-month-hour.csv",
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
