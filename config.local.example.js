window.APP_CONFIG = {
  ...window.APP_CONFIG,
  firebase: {
    ...window.APP_CONFIG.firebase,
    config: {
      ...window.APP_CONFIG.firebase.config,
      apiKey: "YOUR_FIREBASE_API_KEY",
      authDomain: "YOUR_PROJECT.firebaseapp.com",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_PROJECT.appspot.com",
      messagingSenderId: "YOUR_SENDER_ID",
      appId: "YOUR_APP_ID"
    }
  },
  trafficOverlays: {
    ...window.APP_CONFIG.trafficOverlays,
    token: "YOUR_VIEWT_TOKEN"
  },
  mobilityPopulation: {
    ...window.APP_CONFIG.mobilityPopulation,
    token: "YOUR_GG_API_KEY"
  }
};
