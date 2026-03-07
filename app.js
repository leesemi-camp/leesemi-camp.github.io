"use strict";

(function bootstrap() {
  const config = window.APP_CONFIG;
  const state = {
    auth: null,
    db: null,
    map: null,
    popupOverlay: null,
    boundarySource: null,
    hotspotSource: null,
    currentUser: null,
    boundariesLoaded: false,
    hotspotData: new Map(),
    hotspotStyleCache: new Map(),
    unsubscribeHotspots: null
  };

  const hotspotColors = {
    1: "#2f9e44",
    2: "#74b816",
    3: "#f08c00",
    4: "#e8590c",
    5: "#c92a2a"
  };

  const boundaryPalette = ["#145da0", "#0c7b93", "#1d7874", "#0f9d58", "#2b6777"];

  const elements = {
    loginPanel: document.getElementById("login-panel"),
    appShell: document.getElementById("app-shell"),
    statusText: document.getElementById("status-text"),
    loginButton: document.getElementById("login-btn"),
    logoutButton: document.getElementById("logout-btn"),
    userEmail: document.getElementById("user-email"),
    map: document.getElementById("map"),
    mapPopup: document.getElementById("map-popup"),
    form: document.getElementById("spot-form"),
    selectedCoord: document.getElementById("selected-coord"),
    latInput: document.getElementById("spot-lat"),
    lngInput: document.getElementById("spot-lng"),
    clearCoordButton: document.getElementById("clear-coord-btn"),
    spotList: document.getElementById("spot-list")
  };

  void init();

  async function init() {
    try {
      validateConfig(config);
      if (!window.ol) {
        throw new Error("OpenLayers 스크립트 로드에 실패했습니다.");
      }
      bindUiEvents();
      setStatus("인증 초기화 중...");
      initFirebase(config.firebase.config);
      state.auth.onAuthStateChanged((user) => {
        void onAuthStateChanged(user);
      });
    } catch (error) {
      showFatal(error);
    }
  }

  function validateConfig(appConfig) {
    if (!appConfig) {
      throw new Error("config.js 파일이 없습니다.");
    }

    if (!appConfig.firebase || appConfig.firebase.enabled !== true) {
      throw new Error("보안 접근제어를 위해 firebase.enabled는 true여야 합니다.");
    }

    const firebaseKeys = ["apiKey", "authDomain", "projectId", "appId"];
    for (const key of firebaseKeys) {
      if (!appConfig.firebase.config || !appConfig.firebase.config[key]) {
        throw new Error("Firebase 설정이 누락되었습니다: " + key);
      }
    }

    if (!Array.isArray(appConfig.auth.allowedEmails) || appConfig.auth.allowedEmails.length === 0) {
      throw new Error("APP_CONFIG.auth.allowedEmails에 허용 이메일을 1개 이상 지정하세요.");
    }
  }

  function bindUiEvents() {
    elements.loginButton.addEventListener("click", () => {
      void signIn();
    });

    elements.logoutButton.addEventListener("click", () => {
      void signOut();
    });

    elements.form.addEventListener("submit", (event) => {
      void handleHotspotSubmit(event);
    });

    elements.clearCoordButton.addEventListener("click", () => {
      clearSelectedCoord();
    });

    elements.spotList.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const item = target.closest("[data-spot-id]");
      if (!item || !state.map || !state.hotspotSource) {
        return;
      }

      const spotId = item.getAttribute("data-spot-id");
      if (!spotId) {
        return;
      }

      const feature = state.hotspotSource.getFeatureById(spotId);
      const spot = state.hotspotData.get(spotId);
      if (!feature || !spot) {
        return;
      }

      const coordinate = feature.getGeometry().getCoordinates();
      state.map.getView().animate({ center: coordinate, duration: 240 });
      openHotspotPopup(coordinate, spot);
    });
  }

  async function onAuthStateChanged(user) {
    if (!user) {
      state.currentUser = null;
      stopHotspotSubscription();
      clearHotspotFeatures();
      showLoginPanel("로그인이 필요합니다.");
      return;
    }

    const email = normalizeEmail(user.email);
    if (!isAllowedStaff(email)) {
      await state.auth.signOut();
      showLoginPanel("허용되지 않은 계정입니다: " + email, true);
      return;
    }

    state.currentUser = user;
    showAppShell(email);
    await ensureMapReady();
    await loadBoundaries();
    subscribeHotspots();
  }

  function showLoginPanel(message, isError) {
    elements.loginPanel.classList.remove("hidden");
    elements.appShell.classList.add("hidden");
    elements.userEmail.textContent = "";
    closePopup();
    setStatus(message || "", isError === true);
  }

  function showAppShell(email) {
    elements.loginPanel.classList.add("hidden");
    elements.appShell.classList.remove("hidden");
    elements.userEmail.textContent = email;
    if (state.map) {
      window.setTimeout(() => state.map.updateSize(), 0);
    }
  }

  function initFirebase(firebaseConfig) {
    if (!window.firebase) {
      throw new Error("Firebase SDK 로드에 실패했습니다.");
    }

    if (firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
    }
    state.auth = firebase.auth();
    state.db = firebase.firestore();
  }

  async function signIn() {
    try {
      setStatus("로그인 처리 중...");
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await state.auth.signInWithPopup(provider);
    } catch (error) {
      setStatus("로그인 실패: " + toMessage(error), true);
    }
  }

  async function signOut() {
    try {
      await state.auth.signOut();
      showLoginPanel("로그아웃되었습니다.");
    } catch (error) {
      setStatus("로그아웃 실패: " + toMessage(error), true);
    }
  }

  async function ensureMapReady() {
    if (state.map) {
      state.map.updateSize();
      return;
    }

    const center = config.map && config.map.defaultCenter
      ? [config.map.defaultCenter.lng, config.map.defaultCenter.lat]
      : [126.978, 37.5665];
    const zoom = config.map && config.map.defaultZoom ? config.map.defaultZoom : 13;

    state.boundarySource = new ol.source.Vector();
    state.hotspotSource = new ol.source.Vector();

    const boundaryLayer = new ol.layer.Vector({
      source: state.boundarySource
    });

    const hotspotLayer = new ol.layer.Vector({
      source: state.hotspotSource
    });

    state.map = new ol.Map({
      target: elements.map,
      layers: [
        new ol.layer.Tile({
          source: new ol.source.OSM()
        }),
        boundaryLayer,
        hotspotLayer
      ],
      view: new ol.View({
        center: ol.proj.fromLonLat(center),
        zoom,
        minZoom: 8
      })
    });

    state.popupOverlay = new ol.Overlay({
      element: elements.mapPopup,
      offset: [0, -16],
      positioning: "bottom-center",
      stopEvent: false
    });
    state.map.addOverlay(state.popupOverlay);

    state.map.on("singleclick", (event) => {
      const lonLat = ol.proj.toLonLat(event.coordinate);
      if (state.currentUser) {
        setSelectedCoord(Number(lonLat[1]), Number(lonLat[0]));
      }

      const hitFeature = state.map.forEachFeatureAtPixel(event.pixel, (feature) => feature);
      if (!hitFeature) {
        closePopup();
        return;
      }

      const kind = hitFeature.get("kind");
      if (kind === "hotspot") {
        const spot = hitFeature.get("spot");
        openHotspotPopup(event.coordinate, spot);
        return;
      }

      if (kind === "boundary") {
        openBoundaryPopup(event.coordinate, hitFeature.get("dongName"));
      }
    });

    state.map.on("movestart", () => {
      closePopup();
    });
  }

  async function loadBoundaries() {
    if (state.boundariesLoaded || !state.boundarySource || !state.map) {
      return;
    }

    const boundaryPath = (config.data && config.data.boundaryGeoJsonPath)
      ? config.data.boundaryGeoJsonPath
      : "./data/dong-boundaries.sample.geojson";

    try {
      const response = await fetch(boundaryPath, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("동 경계 GeoJSON을 불러오지 못했습니다: " + response.status);
      }

      const geojson = await response.json();
      renderBoundaries(geojson);
      state.boundariesLoaded = true;
    } catch (error) {
      window.alert("동 경계 로딩 실패: " + toMessage(error));
    }
  }

  function renderBoundaries(geojson) {
    if (!state.boundarySource || !state.map) {
      return;
    }

    state.boundarySource.clear();

    const format = new ol.format.GeoJSON();
    const features = format.readFeatures(geojson, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857"
    });

    features.forEach((feature, featureIndex) => {
      const properties = feature.getProperties();
      const dongName = resolveDongName(properties, featureIndex + 1);
      const color = boundaryPalette[featureIndex % boundaryPalette.length];

      feature.set("kind", "boundary");
      feature.set("dongName", dongName);
      feature.setStyle(createBoundaryStyle(color));
    });

    state.boundarySource.addFeatures(features);

    const extent = state.boundarySource.getExtent();
    if (extent && Number.isFinite(extent[0]) && Number.isFinite(extent[2])) {
      state.map.getView().fit(extent, {
        padding: [22, 22, 22, 22],
        duration: 250,
        maxZoom: 16
      });
    }
  }

  function createBoundaryStyle(color) {
    return new ol.style.Style({
      stroke: new ol.style.Stroke({
        color,
        width: 2
      }),
      fill: new ol.style.Fill({
        color: hexToRgba(color, 0.18)
      })
    });
  }

  function resolveDongName(properties, fallbackIndex) {
    return (
      properties.dong_name ||
      properties.emd_kor_nm ||
      properties.name ||
      "동 경계 " + fallbackIndex
    );
  }

  function subscribeHotspots() {
    if (!state.db) {
      return;
    }

    stopHotspotSubscription();
    const collectionName = (config.data && config.data.hotspotCollection)
      ? config.data.hotspotCollection
      : "crowd_hotspots";

    state.unsubscribeHotspots = state.db.collection(collectionName).onSnapshot(
      (snapshot) => {
        const hotspots = [];
        snapshot.forEach((doc) => {
          const value = doc.data() || {};
          if (!Number.isFinite(value.lat) || !Number.isFinite(value.lng)) {
            return;
          }
          hotspots.push({
            id: doc.id,
            title: typeof value.title === "string" ? value.title : "제목 없음",
            memo: typeof value.memo === "string" ? value.memo : "",
            level: Number(value.level) || 3,
            lat: value.lat,
            lng: value.lng,
            updatedBy: value.updatedBy || "",
            updatedAt: value.updatedAt || null
          });
        });

        hotspots.sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
        renderHotspots(hotspots);
        renderHotspotList(hotspots);
      },
      (error) => {
        window.alert("혼잡 지점 조회 실패: " + toMessage(error));
      }
    );
  }

  function stopHotspotSubscription() {
    if (state.unsubscribeHotspots) {
      state.unsubscribeHotspots();
      state.unsubscribeHotspots = null;
    }
  }

  function renderHotspots(hotspots) {
    if (!state.hotspotSource) {
      return;
    }

    clearHotspotFeatures();

    hotspots.forEach((spot) => {
      const feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([spot.lng, spot.lat]))
      });

      feature.setId(spot.id);
      feature.set("kind", "hotspot");
      feature.set("spot", spot);
      feature.setStyle(getHotspotStyle(spot.level));
      state.hotspotSource.addFeature(feature);
      state.hotspotData.set(spot.id, spot);
    });
  }

  function clearHotspotFeatures() {
    if (state.hotspotSource) {
      state.hotspotSource.clear();
    }
    state.hotspotData.clear();
  }

  function getHotspotStyle(level) {
    const normalized = level >= 1 && level <= 5 ? level : 3;
    if (state.hotspotStyleCache.has(normalized)) {
      return state.hotspotStyleCache.get(normalized);
    }

    const color = hotspotColors[normalized];
    const style = new ol.style.Style({
      image: new ol.style.Circle({
        radius: 7,
        fill: new ol.style.Fill({ color }),
        stroke: new ol.style.Stroke({
          color: "#ffffff",
          width: 2
        })
      })
    });

    state.hotspotStyleCache.set(normalized, style);
    return style;
  }

  function renderHotspotList(hotspots) {
    if (hotspots.length === 0) {
      elements.spotList.innerHTML = "<li class='empty'>등록된 혼잡 지점이 없습니다.</li>";
      return;
    }

    const items = hotspots.map((spot) => {
      const title = escapeHtml(spot.title);
      const memo = escapeHtml(spot.memo || "메모 없음");
      const color = hotspotColors[spot.level] || hotspotColors[3];
      return (
        "<li class='spot-item' data-spot-id='" + escapeHtml(spot.id) + "'>" +
          "<div class='spot-item-top'>" +
            "<strong>" + title + "</strong>" +
            "<span class='spot-badge' style='background:" + color + ";'>Lv." + String(spot.level) + "</span>" +
          "</div>" +
          "<div class='spot-memo'>" + memo + "</div>" +
        "</li>"
      );
    });

    elements.spotList.innerHTML = items.join("");
  }

  async function handleHotspotSubmit(event) {
    event.preventDefault();
    if (!state.currentUser) {
      window.alert("로그인 상태가 아닙니다.");
      return;
    }

    const lat = Number(elements.latInput.value);
    const lng = Number(elements.lngInput.value);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      window.alert("지도에서 좌표를 먼저 선택하세요.");
      return;
    }

    const formData = new FormData(elements.form);
    const title = String(formData.get("title") || "").trim();
    const memo = String(formData.get("memo") || "").trim();
    const level = Number(formData.get("level") || 3);

    if (!title) {
      window.alert("지점명을 입력하세요.");
      return;
    }

    const payload = {
      title,
      memo,
      level: level >= 1 && level <= 5 ? level : 3,
      lat,
      lng,
      updatedBy: normalizeEmail(state.currentUser.email),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const collectionName = (config.data && config.data.hotspotCollection)
      ? config.data.hotspotCollection
      : "crowd_hotspots";

    try {
      await state.db.collection(collectionName).add(payload);
      elements.form.reset();
      clearSelectedCoord();
    } catch (error) {
      window.alert("지점 저장 실패: " + toMessage(error));
    }
  }

  function setSelectedCoord(lat, lng) {
    elements.latInput.value = lat.toFixed(6);
    elements.lngInput.value = lng.toFixed(6);
    elements.selectedCoord.textContent = "선택 좌표: " + lat.toFixed(6) + ", " + lng.toFixed(6);
  }

  function clearSelectedCoord() {
    elements.latInput.value = "";
    elements.lngInput.value = "";
    elements.selectedCoord.textContent = "좌표 미선택";
  }

  function openBoundaryPopup(coordinate, dongName) {
    const safeName = escapeHtml(dongName || "동 경계");
    openPopup(
      coordinate,
      "<strong>" + safeName + "</strong><br>동 경계 영역"
    );
  }

  function openHotspotPopup(coordinate, spot) {
    if (!spot) {
      return;
    }
    const safeTitle = escapeHtml(spot.title);
    const safeMemo = escapeHtml(spot.memo || "-");
    const safeUser = escapeHtml(spot.updatedBy || "-");
    const safeTime = escapeHtml(formatTimestamp(spot.updatedAt));

    openPopup(
      coordinate,
      "<strong>" + safeTitle + "</strong>" +
      "<div>혼잡도: " + String(spot.level) + "</div>" +
      "<div>메모: " + safeMemo + "</div>" +
      "<div>수정자: " + safeUser + "</div>" +
      "<div>수정시각: " + safeTime + "</div>"
    );
  }

  function openPopup(coordinate, html) {
    if (!state.popupOverlay) {
      return;
    }
    elements.mapPopup.innerHTML = html;
    elements.mapPopup.classList.remove("hidden");
    state.popupOverlay.setPosition(coordinate);
  }

  function closePopup() {
    if (!state.popupOverlay) {
      return;
    }
    elements.mapPopup.classList.add("hidden");
    state.popupOverlay.setPosition(undefined);
  }

  function isAllowedStaff(email) {
    const normalizedTarget = normalizeEmail(email);
    return config.auth.allowedEmails
      .map((value) => normalizeEmail(value))
      .includes(normalizedTarget);
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function setStatus(message, isError) {
    elements.statusText.textContent = message;
    elements.statusText.style.color = isError ? "var(--danger)" : "";
  }

  function showFatal(error) {
    const message = "초기화 실패: " + toMessage(error);
    showLoginPanel(message, true);
    elements.loginButton.disabled = true;
  }

  function toMessage(error) {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  function toMillis(value) {
    if (!value) {
      return 0;
    }
    if (typeof value.toMillis === "function") {
      return value.toMillis();
    }
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.getTime() : 0;
  }

  function formatTimestamp(value) {
    if (!value) {
      return "-";
    }
    if (typeof value.toDate === "function") {
      return value.toDate().toLocaleString("ko-KR");
    }
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
      return "-";
    }
    return date.toLocaleString("ko-KR");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function hexToRgba(hex, alpha) {
    const normalized = String(hex || "").replace("#", "");
    if (normalized.length !== 6) {
      return "rgba(20, 93, 160, " + String(alpha) + ")";
    }
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  }
})();
