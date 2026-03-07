window.APP_CONFIG = {
  auth: {
    allowedEmails: [
      "windwing987@gmail.com"
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
    boundaryGeoJsonPath: "./data/dong-boundaries.sample.geojson",
    hotspotCollection: "crowd_hotspots"
  }
};
