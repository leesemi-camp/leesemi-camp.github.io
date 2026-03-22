"use strict";

(function bootstrap() {
  const config = window.APP_CONFIG;
  const state = {
    mode: resolveMapMode(),
    auth: null,
    db: null,
    map: null,
    popupOverlay: null,
    boundarySource: null,
    boundaryDefaultStyle: null,
    boundarySelectedStyle: null,
    hotspotSource: null,
    selectedCoordSource: null,
    populationSource: null,
    selectedCoordLayer: null,
    populationLayer: null,
    overlaySources: {
      vehicle: null,
      pedestrian: null
    },
    overlayLayers: {
      vehicle: null,
      pedestrian: null
    },
    currentUser: null,
    boundariesLoaded: false,
    overlayLoaded: {
      vehicle: false,
      pedestrian: false
    },
    overlayLoading: {
      vehicle: false,
      pedestrian: false
    },
    populationLoaded: false,
    populationLoading: false,
    populationStatsByPeriod: new Map(),
    populationGridByPeriod: new Map(),
    populationHoursByMonth: new Map(),
    populationMonths: [],
    populationSelectedMonth: "",
    populationSelectedHour: 8,
    populationMaxByPeriod: new Map(),
    hotspotData: new Map(),
    hotspotStyleCache: new Map(),
    availableDongs: [],
    availableDongMap: new Map(),
    issueCatalogLoaded: false,
    issueCatalogLoading: false,
    issueCatalogLoadingPromise: null,
    issueCatalogList: [],
    issueCatalogMap: new Map(),
    issues: [],
    activeDongName: "",
    overlayStyleCache: {
      vehicle: new Map(),
      pedestrian: new Map()
    },
    unsubscribeHotspots: null,
    editingHotspotId: null,
    resolvingCurrentLocation: false,
    selectedCoordFeature: null,
    autoCenteredToCurrentLocation: false
  };

  const hotspotColors = {
    1: "#2f9e44",
    2: "#74b816",
    3: "#f08c00",
    4: "#e8590c",
    5: "#c92a2a"
  };
  const issueCategories = {
    traffic_parking: "🚌 교통·주차",
    education_childcare: "🏫 교육·보육",
    environment_park: "🌳 환경·공원",
    safety_security: "🚨 안전·치안",
    housing_infra: "🏘️ 주거·인프라",
    economy_culture: "🛒 경제·문화"
  };
  const defaultCommonPledges = [
    {
      title: "교통과 주차 해결",
      description: "출퇴근 상습 정체 구간 개선과 공영주차장 확충"
    },
    {
      title: "아이 키우기 좋은 교육·보육",
      description: "과밀학급 완화, 통학안전 강화, 돌봄 인프라 확대"
    },
    {
      title: "안전하고 쾌적한 생활환경",
      description: "CCTV·가로등·보도 정비와 공원/산책로 개선"
    }
  ];
  const selectedCoordStyles = [
    new ol.style.Style({
      image: new ol.style.Circle({
        radius: 11,
        fill: new ol.style.Fill({ color: "rgba(255,255,255,0)" }),
        stroke: new ol.style.Stroke({
          color: "#ffffff",
          width: 4
        })
      })
    }),
    new ol.style.Style({
      image: new ol.style.RegularShape({
        points: 4,
        radius: 8,
        angle: Math.PI / 4,
        fill: new ol.style.Fill({ color: "#00a8ff" }),
        stroke: new ol.style.Stroke({
          color: "#003b73",
          width: 2
        })
      })
    })
  ];

  const boundaryStrokeColor = (config.data && config.data.boundaryStrokeColor)
    ? String(config.data.boundaryStrokeColor)
    : "#0b57d0";
  const boundaryStrokeWidth = readPositiveNumber(config.data && config.data.boundaryStrokeWidth, 3.2);
  const boundaryHaloColor = (config.data && config.data.boundaryHaloColor)
    ? String(config.data.boundaryHaloColor)
    : "rgba(255,255,255,0.95)";
  const boundaryHaloWidth = readPositiveNumber(config.data && config.data.boundaryHaloWidth, 6);
  const trafficOverlayConfig = config.trafficOverlays && typeof config.trafficOverlays === "object"
    ? config.trafficOverlays
    : {};
  const mobilityPopulationConfig = config.mobilityPopulation && typeof config.mobilityPopulation === "object"
    ? config.mobilityPopulation
    : {};
  const mobileLayoutQuery = window.matchMedia ? window.matchMedia("(max-width: 980px)") : null;

  const elements = {
    loginPanel: document.getElementById("login-panel"),
    appShell: document.getElementById("app-shell"),
    statusText: document.getElementById("status-text"),
    loginButton: document.getElementById("login-btn"),
    logoutButton: document.getElementById("logout-btn"),
    map: document.getElementById("map"),
    mapPopup: document.getElementById("map-popup"),
    spotFormSheet: document.getElementById("spot-form-sheet"),
    spotFormCloseButton: document.getElementById("spot-form-close-btn"),
    mobileFormBackdrop: document.getElementById("mobile-form-backdrop"),
    mobileCurrentLocationButton: document.getElementById("mobile-current-location-btn"),
    form: document.getElementById("spot-form"),
    selectedCoord: document.getElementById("selected-coord"),
    latInput: document.getElementById("spot-lat"),
    lngInput: document.getElementById("spot-lng"),
    currentLocationButton: document.getElementById("use-current-location-btn"),
    clearCoordButton: document.getElementById("clear-coord-btn"),
    spotSubmitButton: document.getElementById("spot-submit-btn"),
    cancelSpotEditButton: document.getElementById("spot-cancel-edit-btn"),
    spotDongSelect: document.getElementById("spot-dong"),
    spotIssueRefField: document.getElementById("spot-issue-ref-field"),
    spotIssueRefSelect: document.getElementById("spot-issue-ref"),
    spotIssueRefHelp: document.getElementById("spot-issue-ref-help"),
    spotList: document.getElementById("spot-list"),
    clearDongFilterButton: document.getElementById("clear-dong-filter-btn"),
    activeDongFilter: document.getElementById("active-dong-filter"),
    commonPledgeList: document.getElementById("common-pledge-list"),
    toggleVehicleFlow: document.getElementById("toggle-vehicle-flow"),
    togglePedestrianFlow: document.getElementById("toggle-pedestrian-flow"),
    overlayStatus: document.getElementById("overlay-status"),
    togglePopulationFlow: document.getElementById("toggle-population-flow"),
    populationMonth: document.getElementById("population-month"),
    populationHour: document.getElementById("population-hour"),
    populationStatus: document.getElementById("population-status")
  };

  void init();

  async function init() {
    try {
      applyModeClassName();
      validateConfig(config);
      if (!window.ol) {
        throw new Error("OpenLayers 스크립트 로드에 실패했습니다.");
      }
      bindUiEvents();
      syncIssueReferenceFieldVisibility();
      renderCommonPledges();
      initPopulationMonthOptions();
      initPopulationHourOptions();
      setStatus("인증 초기화 중...");
      initFirebase(config.firebase.config);
      if (isEditMode()) {
        state.auth.onAuthStateChanged((user) => {
          void onAuthStateChanged(user);
        });
      } else {
        state.auth.onAuthStateChanged((user) => {
          state.currentUser = user || null;
        });
        showAppShell();
        await ensureMapReady();
        await loadBoundaries();
        await ensureIssueCatalogLoaded();
        updateOverlayControls();
        updatePopulationControls();
        updateCurrentLocationButtonAvailability();
        syncSpotFormLayoutState();
        await applyDefaultOverlayVisibility();
        await applyDefaultPopulationVisibility();
        subscribeHotspots();
        void centerMapToCurrentLocation({ silent: true, minZoom: 15 });
      }
    } catch (error) {
      showFatal(error);
    }
  }

  function resolveMapMode() {
    const body = document.body;
    const rawMode = body && body.dataset ? String(body.dataset.mapMode || "") : "";
    if (rawMode.toLowerCase() === "edit") {
      return "edit";
    }
    return "view";
  }

  function applyModeClassName() {
    if (!document.body || !document.body.classList) {
      return;
    }
    document.body.classList.remove("mode-view", "mode-edit");
    document.body.classList.add(isEditMode() ? "mode-edit" : "mode-view");
  }

  function isEditMode() {
    return state.mode === "edit";
  }

  function getSystemLandingPath() {
    const configuredPath = config && config.launcher && typeof config.launcher.systemPath === "string"
      ? String(config.launcher.systemPath).trim()
      : "";
    if (configuredPath) {
      return configuredPath;
    }
    return "/system/";
  }

  function redirectToSystemLanding() {
    window.location.replace(getSystemLandingPath());
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
    if (elements.loginButton) {
      elements.loginButton.addEventListener("click", () => {
        void signIn();
      });
    }

    if (elements.logoutButton) {
      elements.logoutButton.addEventListener("click", () => {
        void signOut();
      });
    }

    if (elements.form) {
      elements.form.addEventListener("submit", (event) => {
        void handleHotspotSubmit(event);
      });
    }

    if (elements.clearCoordButton) {
      elements.clearCoordButton.addEventListener("click", () => {
        clearSelectedCoord();
      });
    }

    if (elements.currentLocationButton) {
      elements.currentLocationButton.addEventListener("click", () => {
        void useCurrentLocationForSpot(elements.currentLocationButton);
      });
    }

    if (elements.cancelSpotEditButton) {
      elements.cancelSpotEditButton.addEventListener("click", () => {
        exitHotspotEditMode(true);
      });
    }

    if (elements.spotIssueRefSelect) {
      elements.spotIssueRefSelect.addEventListener("change", () => {
        const issueRefId = String(elements.spotIssueRefSelect.value || "").trim();
        applyIssueCatalogSelection(issueRefId);
      });
    }

    if (elements.toggleVehicleFlow) {
      elements.toggleVehicleFlow.addEventListener("change", () => {
        void handleOverlayToggle("vehicle", elements.toggleVehicleFlow.checked);
      });
    }

    if (elements.togglePedestrianFlow) {
      elements.togglePedestrianFlow.addEventListener("change", () => {
        void handleOverlayToggle("pedestrian", elements.togglePedestrianFlow.checked);
      });
    }

    if (elements.togglePopulationFlow) {
      elements.togglePopulationFlow.addEventListener("change", () => {
        void handlePopulationToggle(elements.togglePopulationFlow.checked);
      });
    }

    if (elements.populationMonth) {
      elements.populationMonth.addEventListener("change", () => {
        const selectedMonth = String(elements.populationMonth.value || "").trim();
        if (!selectedMonth) {
          return;
        }
        state.populationSelectedMonth = selectedMonth;
        syncPopulationHourOptionsForMonth();
        if (isPopulationVisible()) {
          applyPopulationStylesForHour(state.populationSelectedHour);
        }
      });
    }

    if (elements.populationHour) {
      elements.populationHour.addEventListener("change", () => {
        const selectedHour = Number(elements.populationHour.value);
        if (Number.isFinite(selectedHour)) {
          state.populationSelectedHour = selectedHour;
          if (isPopulationVisible()) {
            applyPopulationStylesForHour(selectedHour);
          }
        }
      });
    }

    if (elements.spotList) {
      elements.spotList.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        const actionButton = target.closest("[data-action][data-spot-id]");
        if (actionButton) {
          const action = String(actionButton.getAttribute("data-action") || "");
          const spotId = String(actionButton.getAttribute("data-spot-id") || "");
          if (!spotId) {
            return;
          }
          if (action === "edit-spot") {
            const editSpot = state.hotspotData.get(spotId);
            if (editSpot) {
              enterHotspotEditMode(editSpot);
            }
            return;
          }
          if (action === "delete-spot") {
            void deleteHotspot(spotId);
            return;
          }
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

    if (elements.clearDongFilterButton) {
      elements.clearDongFilterButton.addEventListener("click", () => {
        setActiveDongFilter("");
      });
    }

    if (elements.mobileCurrentLocationButton) {
      elements.mobileCurrentLocationButton.addEventListener("click", () => {
        openSpotFormSheetForMobile();
        void useCurrentLocationForSpot(elements.mobileCurrentLocationButton);
      });
    }

    if (elements.spotFormCloseButton) {
      elements.spotFormCloseButton.addEventListener("click", () => {
        closeSpotFormSheetForMobile();
      });
    }

    if (elements.mobileFormBackdrop) {
      elements.mobileFormBackdrop.addEventListener("click", () => {
        closeSpotFormSheetForMobile();
      });
    }

    if (mobileLayoutQuery && typeof mobileLayoutQuery.addEventListener === "function") {
      mobileLayoutQuery.addEventListener("change", () => {
        syncSpotFormLayoutState();
      });
    } else {
      window.addEventListener("resize", () => {
        syncSpotFormLayoutState();
      });
    }

    syncSpotFormLayoutState();
    updateCurrentLocationButtonAvailability();
    updateDongFilterUi();
  }

  function renderCommonPledges() {
    if (!elements.commonPledgeList) {
      return;
    }
    const pledgeConfig = config.data && Array.isArray(config.data.commonPledges) && config.data.commonPledges.length > 0
      ? config.data.commonPledges
      : defaultCommonPledges;

    const html = pledgeConfig.map((item) => {
      const title = escapeHtml(item && item.title ? item.title : "공약");
      const description = escapeHtml(item && item.description ? item.description : "");
      return (
        "<li class='pledge-item'>" +
          "<strong>" + title + "</strong>" +
          "<p>" + description + "</p>" +
        "</li>"
      );
    });
    elements.commonPledgeList.innerHTML = html.join("");
  }

  function getIssueCatalogConfig() {
    const dataConfig = config.data && typeof config.data === "object" ? config.data : {};
    const raw = dataConfig.issueCatalog && typeof dataConfig.issueCatalog === "object"
      ? dataConfig.issueCatalog
      : {};
    const activeValues = Array.isArray(raw.activeValues) ? raw.activeValues : [];

    return {
      enabled: raw.enabled === true,
      apiUrl: String(raw.apiUrl || "").trim(),
      sourceType: String(raw.sourceType || "json").toLowerCase(),
      delimiter: String(raw.delimiter || ","),
      rowPath: String(raw.rowPath || "").trim(),
      token: String(raw.token || "").trim(),
      tokenQueryKey: String(raw.tokenQueryKey || "KEY").trim(),
      queryParams: raw.queryParams && typeof raw.queryParams === "object" ? raw.queryParams : null,
      idField: String(raw.idField || "issueId"),
      titleField: String(raw.titleField || "title"),
      memoField: String(raw.memoField || "memo"),
      categoryIdField: String(raw.categoryIdField || "categoryId"),
      categoryLabelField: String(raw.categoryLabelField || "categoryLabel"),
      dongNameField: String(raw.dongNameField || "dongName"),
      emdCodeField: String(raw.emdCodeField || "emdCode"),
      activeField: String(raw.activeField || "").trim(),
      activeValues: activeValues.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean),
      lockFormFields: raw.lockFormFields !== false,
      requireSelection: raw.requireSelection === true
    };
  }

  function syncIssueReferenceFieldVisibility() {
    if (!elements.spotIssueRefField) {
      return;
    }
    const shouldShow = isEditMode() && getIssueCatalogConfig().enabled;
    elements.spotIssueRefField.classList.toggle("hidden", !shouldShow);
  }

  async function ensureIssueCatalogLoaded() {
    const catalogConfig = getIssueCatalogConfig();
    syncIssueReferenceFieldVisibility();

    if (!catalogConfig.enabled) {
      state.issueCatalogLoaded = false;
      state.issueCatalogList = [];
      state.issueCatalogMap = new Map();
      syncIssueCatalogSelectOptions("");
      return;
    }

    if (state.issueCatalogLoaded) {
      syncIssueCatalogSelectOptions(elements.spotIssueRefSelect ? elements.spotIssueRefSelect.value : "");
      return;
    }

    if (state.issueCatalogLoading && state.issueCatalogLoadingPromise) {
      await state.issueCatalogLoadingPromise;
      return;
    }

    state.issueCatalogLoading = true;
    state.issueCatalogLoadingPromise = (async () => {
      if (!catalogConfig.apiUrl) {
        state.issueCatalogLoaded = true;
        state.issueCatalogList = [];
        state.issueCatalogMap = new Map();
        syncIssueCatalogSelectOptions("");
        if (elements.spotIssueRefHelp) {
          elements.spotIssueRefHelp.textContent = "issueCatalog.apiUrl이 비어 있어 수동 입력 모드로 동작합니다.";
        }
        return;
      }

      try {
        const requestUrl = buildIssueCatalogRequestUrl(catalogConfig);
        const response = await fetch(requestUrl, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("요청 실패 (" + response.status + ")");
        }
        const payloadText = await response.text();
        const rows = parseIssueCatalogRows(payloadText, catalogConfig);
        const normalized = normalizeIssueCatalogRows(rows, catalogConfig);
        state.issueCatalogList = normalized.list;
        state.issueCatalogMap = normalized.map;
        state.issueCatalogLoaded = true;
        syncIssueCatalogSelectOptions(elements.spotIssueRefSelect ? elements.spotIssueRefSelect.value : "");
      } catch (error) {
        state.issueCatalogLoaded = true;
        state.issueCatalogList = [];
        state.issueCatalogMap = new Map();
        syncIssueCatalogSelectOptions("");
        if (elements.spotIssueRefHelp) {
          elements.spotIssueRefHelp.textContent = "연동 현안을 불러오지 못했습니다: " + toMessage(error);
        }
        console.error("[issue-catalog]", toMessage(error));
      }
    })();

    try {
      await state.issueCatalogLoadingPromise;
    } finally {
      state.issueCatalogLoading = false;
      state.issueCatalogLoadingPromise = null;
    }
  }

  function buildIssueCatalogRequestUrl(catalogConfig) {
    const parsedUrl = new URL(catalogConfig.apiUrl, window.location.href);
    if (catalogConfig.token && catalogConfig.tokenQueryKey && !parsedUrl.searchParams.has(catalogConfig.tokenQueryKey)) {
      parsedUrl.searchParams.set(catalogConfig.tokenQueryKey, catalogConfig.token);
    }
    if (catalogConfig.queryParams) {
      Object.keys(catalogConfig.queryParams).forEach((key) => {
        const rawValue = catalogConfig.queryParams[key];
        if (rawValue === null || rawValue === undefined) {
          return;
        }
        parsedUrl.searchParams.set(key, String(rawValue));
      });
    }
    return parsedUrl.toString();
  }

  function parseIssueCatalogRows(payloadText, catalogConfig) {
    const trimmed = String(payloadText || "").trim();
    if (!trimmed) {
      throw new Error("빈 응답입니다.");
    }
    const sourceType = String(catalogConfig.sourceType || "json").toLowerCase();
    if (sourceType === "csv") {
      return parseCsvRows(trimmed, catalogConfig.delimiter || ",");
    }

    if (trimmed.startsWith("<")) {
      const htmlSummary = summarizeHtmlText(trimmed);
      const suffix = htmlSummary ? " (" + htmlSummary + ")" : "";
      throw new Error("JSON 대신 HTML 응답을 받았습니다" + suffix);
    }

    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      throw new Error("JSON 파싱 실패: " + toMessage(error));
    }

    return extractPopulationRows(parsed, catalogConfig.rowPath);
  }

  function normalizeIssueCatalogRows(rows, catalogConfig) {
    const map = new Map();
    const activeField = catalogConfig.activeField;
    const activeValues = catalogConfig.activeValues;

    rows.forEach((row) => {
      if (!row || typeof row !== "object") {
        return;
      }

      const issueId = normalizeIssueCatalogId(row[catalogConfig.idField]);
      if (!issueId || map.has(issueId)) {
        return;
      }

      if (activeField && activeValues.length > 0) {
        const statusValue = String(row[activeField] || "").trim().toLowerCase();
        if (!activeValues.includes(statusValue)) {
          return;
        }
      }

      const title = String(row[catalogConfig.titleField] || "").trim();
      const memo = String(row[catalogConfig.memoField] || "").trim();
      const rawCategoryId = row[catalogConfig.categoryIdField];
      const categoryId = normalizeCategoryId(rawCategoryId);
      const categoryLabel = resolveCategoryLabel(categoryId, row[catalogConfig.categoryLabelField] || rawCategoryId);
      const dongName = String(row[catalogConfig.dongNameField] || "").trim();
      const emdCode = normalizeEmdCode(row[catalogConfig.emdCodeField]);

      map.set(issueId, {
        id: issueId,
        title: title || "현안 " + issueId,
        memo,
        categoryId,
        categoryLabel,
        dongName,
        emdCode,
        raw: row
      });
    });

    const list = Array.from(map.values()).sort((a, b) => {
      const aDong = String(a.dongName || "");
      const bDong = String(b.dongName || "");
      if (aDong !== bDong) {
        return aDong.localeCompare(bDong, "ko");
      }
      return String(a.title || "").localeCompare(String(b.title || ""), "ko");
    });

    return { list, map };
  }

  function normalizeIssueCatalogId(value) {
    return String(value === null || value === undefined ? "" : value).trim();
  }

  function normalizeCategoryId(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "";
    }
    if (issueCategories[raw]) {
      return raw;
    }

    const normalizedRaw = sanitizeCategoryText(raw);
    const categoryKeys = Object.keys(issueCategories);
    for (const key of categoryKeys) {
      if (sanitizeCategoryText(key) === normalizedRaw) {
        return key;
      }
      if (sanitizeCategoryText(issueCategories[key]) === normalizedRaw) {
        return key;
      }
    }
    return "";
  }

  function sanitizeCategoryText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "");
  }

  function syncIssueCatalogSelectOptions(preferredIssueRefId) {
    if (!elements.spotIssueRefSelect) {
      return;
    }

    const catalogConfig = getIssueCatalogConfig();
    const select = elements.spotIssueRefSelect;
    select.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "직접 입력";
    select.appendChild(defaultOption);

    if (!catalogConfig.enabled || state.issueCatalogList.length === 0) {
      select.value = "";
      select.disabled = !catalogConfig.enabled;
      applyIssueCatalogSelection("");
      if (elements.spotIssueRefHelp && catalogConfig.enabled && state.issueCatalogLoaded) {
        elements.spotIssueRefHelp.textContent = "연동 가능한 현안이 없습니다. 직접 입력 모드로 저장합니다.";
      }
      return;
    }

    state.issueCatalogList.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      const title = item.title || item.id;
      option.textContent = item.dongName
        ? "[" + item.dongName + "] " + title
        : title;
      select.appendChild(option);
    });

    const preferred = String(preferredIssueRefId || "").trim();
    if (preferred && state.issueCatalogMap.has(preferred)) {
      select.value = preferred;
    } else if (catalogConfig.requireSelection) {
      const firstItem = state.issueCatalogList[0];
      select.value = firstItem ? firstItem.id : "";
    } else {
      select.value = "";
    }

    select.disabled = false;
    applyIssueCatalogSelection(select.value);

    if (elements.spotIssueRefHelp) {
      elements.spotIssueRefHelp.textContent =
        "연동 현안 " + String(state.issueCatalogList.length) + "건을 불러왔습니다.";
    }
  }

  function applyIssueCatalogSelection(issueRefId) {
    if (!isEditMode()) {
      return;
    }

    const catalogConfig = getIssueCatalogConfig();
    const normalizedIssueRefId = normalizeIssueCatalogId(issueRefId);
    const selectedIssue = normalizedIssueRefId ? state.issueCatalogMap.get(normalizedIssueRefId) : null;
    const titleInput = elements.form ? elements.form.querySelector("#spot-title") : null;
    const memoInput = elements.form ? elements.form.querySelector("#spot-memo") : null;
    const categoryInput = elements.form ? elements.form.querySelector("#spot-category") : null;
    const shouldLockFormFields = Boolean(selectedIssue) && catalogConfig.lockFormFields;

    if (titleInput) {
      titleInput.readOnly = shouldLockFormFields;
    }
    if (memoInput) {
      memoInput.readOnly = shouldLockFormFields;
    }

    if (!selectedIssue) {
      if (elements.spotIssueRefHelp && catalogConfig.enabled) {
        elements.spotIssueRefHelp.textContent = "직접 입력 모드입니다. 필요 시 연동 현안을 선택하세요.";
      }
      return;
    }

    if (titleInput && selectedIssue.title) {
      titleInput.value = selectedIssue.title;
    }
    if (memoInput && selectedIssue.memo) {
      memoInput.value = selectedIssue.memo;
    }
    if (categoryInput && selectedIssue.categoryId && issueCategories[selectedIssue.categoryId]) {
      categoryInput.value = selectedIssue.categoryId;
    }
    if (elements.spotIssueRefHelp) {
      elements.spotIssueRefHelp.textContent =
        "선택한 연동 현안의 제목/분류/내용을 사용합니다. 좌표만 선택해 저장하세요.";
    }
  }

  async function onAuthStateChanged(user) {
    if (!user) {
      state.currentUser = null;
      exitHotspotEditMode(true);
      stopHotspotSubscription();
      clearHotspotFeatures();
      state.issues = [];
      resetOverlayState();
      resetPopulationState();
      if (isEditMode()) {
        redirectToSystemLanding();
        return;
      }
      showLoginPanel("로그인이 필요합니다.");
      updateOverlayControls();
      updatePopulationControls();
      updateCurrentLocationButtonAvailability();
      syncSpotFormLayoutState();
      return;
    }

    const email = normalizeEmail(user.email);
    if (!isAllowedStaff(email)) {
      await state.auth.signOut();
      if (isEditMode()) {
        redirectToSystemLanding();
      } else {
        showLoginPanel("허용되지 않은 계정입니다: " + email, true);
      }
      return;
    }

    state.currentUser = user;
    showAppShell();
    await ensureMapReady();
    await loadBoundaries();
    await ensureIssueCatalogLoaded();
    updateOverlayControls();
    updatePopulationControls();
    updateCurrentLocationButtonAvailability();
    syncSpotFormLayoutState();
    await applyDefaultOverlayVisibility();
    await applyDefaultPopulationVisibility();
    subscribeHotspots();
  }

  function showLoginPanel(message, isError) {
    if (elements.loginPanel) {
      elements.loginPanel.classList.remove("hidden");
    }
    if (elements.appShell) {
      elements.appShell.classList.add("hidden");
    }
    closeSpotFormSheetForMobile();
    closePopup();
    setStatus(message || "", isError === true);
  }

  function showAppShell() {
    if (elements.loginPanel) {
      elements.loginPanel.classList.add("hidden");
    }
    if (elements.appShell) {
      elements.appShell.classList.remove("hidden");
    }
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
      if (isEditMode()) {
        redirectToSystemLanding();
        return;
      }
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
    state.selectedCoordSource = new ol.source.Vector();
    state.populationSource = new ol.source.Vector();
    state.overlaySources.vehicle = new ol.source.Vector();
    state.overlaySources.pedestrian = new ol.source.Vector();

    state.selectedCoordLayer = new ol.layer.Vector({
      source: state.selectedCoordSource
    });

    state.populationLayer = new ol.layer.Vector({
      source: state.populationSource,
      visible: false
    });

    state.overlayLayers.vehicle = new ol.layer.Vector({
      source: state.overlaySources.vehicle,
      visible: false
    });
    state.overlayLayers.pedestrian = new ol.layer.Vector({
      source: state.overlaySources.pedestrian,
      visible: false
    });

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
        state.populationLayer,
        state.overlayLayers.vehicle,
        state.overlayLayers.pedestrian,
        boundaryLayer,
        hotspotLayer,
        state.selectedCoordLayer
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
      if (isEditMode() && state.currentUser) {
        setSelectedCoord(Number(lonLat[1]), Number(lonLat[0]));
      }

      const hitFeature = state.map.forEachFeatureAtPixel(
        event.pixel,
        (feature, layer) => {
          if (layer === state.selectedCoordLayer) {
            return undefined;
          }
          return feature;
        }
      );
      if (!hitFeature) {
        closePopup();
        if (!isEditMode() && state.activeDongName) {
          setActiveDongFilter("");
        }
        return;
      }

      const kind = hitFeature.get("kind");
      if (kind === "hotspot") {
        const spot = hitFeature.get("spot");
        openHotspotPopup(event.coordinate, spot);
        return;
      }

      if (kind === "boundary") {
        if (!isEditMode()) {
          const dongName = String(hitFeature.get("dongName") || "").trim();
          setActiveDongFilter(dongName);
        }
        openBoundaryPopup(event.coordinate, hitFeature);
        return;
      }

      if (kind === "traffic_overlay") {
        openTrafficOverlayPopup(
          event.coordinate,
          hitFeature.get("overlayType"),
          hitFeature.get("overlayValue")
        );
        return;
      }

      if (kind === "population_grid") {
        openPopulationGridPopup(
          event.coordinate,
          hitFeature.get("populationMonth"),
          hitFeature.get("populationHour"),
          hitFeature.get("populationValue")
        );
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

    const boundaryPaths = resolveBoundaryPaths();

    try {
      const allFeatures = [];
      const errors = [];
      for (const path of boundaryPaths) {
        try {
          const response = await fetch(path, { cache: "no-store" });
          if (!response.ok) {
            throw new Error("불러오기 실패 (" + response.status + ")");
          }

          const boundaryPayload = await response.text();
          const features = parseBoundaryFeatures(boundaryPayload);
          allFeatures.push(...features);
        } catch (innerError) {
          const message = path + ": " + toMessage(innerError);
          errors.push(message);
          console.error("[boundary-load]", message);
        }
      }

      if (allFeatures.length === 0) {
        const detail = errors.length > 0 ? " / " + errors.join(" | ") : "";
        throw new Error("표시 가능한 동 경계가 없습니다." + detail);
      }

      renderBoundaries(allFeatures);
      state.boundariesLoaded = true;
    } catch (error) {
      window.alert("동 경계 로딩 실패: " + toMessage(error));
    }
  }

  function resolveBoundaryPaths() {
    if (config.data && Array.isArray(config.data.boundarySources) && config.data.boundarySources.length > 0) {
      return config.data.boundarySources;
    }
    if (config.data && config.data.boundaryGeoJsonPath) {
      return [config.data.boundaryGeoJsonPath];
    }
    return ["./data/dong-boundaries.sample.geojson"];
  }

  function parseBoundaryFeatures(payloadText) {
    const trimmed = String(payloadText || "").trim();
    if (!trimmed) {
      throw new Error("빈 경계 데이터입니다.");
    }

    if (trimmed.startsWith("{")) {
      const geojson = JSON.parse(trimmed);
      const format = new ol.format.GeoJSON();
      return format.readFeatures(geojson, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857"
      });
    }

    if (trimmed.startsWith("<")) {
      return readFeaturesFromWfsXml(trimmed);
    }

    throw new Error("지원하지 않는 경계 데이터 형식입니다.");
  }

  function readFeaturesFromWfsXml(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");
    const parserError = xmlDoc.getElementsByTagName("parsererror")[0];
    if (parserError) {
      throw new Error("WFS XML 파싱에 실패했습니다.");
    }

    // Most Korean WFS samples in this project expose reliable lon/lat gml:posList.
    // Parse posList first to avoid axis-order ambiguity in generic WFS parsing.
    try {
      const posListFeatures = readFeaturesFromPosList(xmlDoc);
      if (hasRenderableGeometry(posListFeatures)) {
        return posListFeatures;
      }
    } catch (posListError) {
      console.warn("[boundary-xml] posList parse fallback to WFS parser:", toMessage(posListError));
    }

    const featureCollection = xmlDoc.getElementsByTagNameNS("http://www.opengis.net/wfs", "FeatureCollection")[0];
    if (!featureCollection) {
      throw new Error("WFS FeatureCollection을 찾지 못했습니다.");
    }

    const wfsFormat = new ol.format.WFS();
    const features = wfsFormat.readFeatures(featureCollection, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857"
    });
    normalizeFeatureProjection(features);

    if (!hasRenderableGeometry(features)) {
      throw new Error("WFS에서 표시 가능한 지오메트리를 찾지 못했습니다.");
    }
    return features;
  }

  function readFeaturesFromPosList(xmlDoc) {
    const features = [];
    const gmlNs = "http://www.opengis.net/gml";
    const featureMembers = Array.from(xmlDoc.getElementsByTagNameNS(gmlNs, "featureMember"));

    featureMembers.forEach((featureMember, memberIndex) => {
      const infoNode = featureMember.firstElementChild;
      const emdCode = normalizeEmdCode(readTextContent(infoNode, "emd_cd"));
      const fullName = readTextContent(infoNode, "full_nm");
      const emdKorName = readTextContent(infoNode, "emd_kor_nm");
      const posListNodes = Array.from(featureMember.getElementsByTagNameNS(gmlNs, "posList"));

      posListNodes.forEach((node, posIndex) => {
        const feature = buildPolygonFeatureFromPosList(node.textContent || "");
        if (!feature) {
          return;
        }
        if (fullName) {
          feature.set("full_nm", fullName);
        }
        if (emdKorName) {
          feature.set("emd_kor_nm", emdKorName);
        }
        if (emdCode) {
          feature.set("emd_cd", emdCode);
        }
        if (!fullName && !emdKorName) {
          feature.set("name", "동 경계 " + String(memberIndex + 1) + "-" + String(posIndex + 1));
        }
        features.push(feature);
      });
    });

    if (features.length > 0) {
      return features;
    }

    const posListNodes = Array.from(xmlDoc.getElementsByTagNameNS(gmlNs, "posList"));
    posListNodes.forEach((node, index) => {
      const feature = buildPolygonFeatureFromPosList(node.textContent || "");
      if (!feature) {
        return;
      }
      feature.set("name", "동 경계 " + String(index + 1));
      features.push(feature);
    });

    if (features.length === 0) {
      throw new Error("WFS posList에서 경계 좌표를 찾지 못했습니다.");
    }
    return features;
  }

  function buildPolygonFeatureFromPosList(posListText) {
    const ringLonLat = parsePosList(posListText);
    if (ringLonLat.length < 3) {
      return null;
    }
    if (!isClosedRing(ringLonLat)) {
      ringLonLat.push([ringLonLat[0][0], ringLonLat[0][1]]);
    }

    const projectedRing = ringLonLat.map((coord) => ol.proj.fromLonLat(coord));
    return new ol.Feature({
      geometry: new ol.geom.Polygon([projectedRing])
    });
  }

  function readTextContent(rootNode, tagName) {
    if (!rootNode || !tagName) {
      return "";
    }
    const element = rootNode.getElementsByTagName(tagName)[0];
    if (!element || !element.textContent) {
      return "";
    }
    return element.textContent.trim();
  }

  function parsePosList(posListText) {
    const rawValues = String(posListText || "")
      .trim()
      .split(/\s+/)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    const coords = [];
    for (let index = 0; index + 1 < rawValues.length; index += 2) {
      coords.push([rawValues[index], rawValues[index + 1]]);
    }
    return coords;
  }

  function renderBoundaries(features) {
    if (!state.boundarySource || !state.map) {
      return;
    }

    state.boundarySource.clear();

    const drawableFeatures = features.filter((feature) => Boolean(feature.getGeometry()));
    const boundaryStyle = createBoundaryStyle({
      strokeColor: boundaryStrokeColor,
      strokeWidth: boundaryStrokeWidth,
      haloColor: boundaryHaloColor,
      haloWidth: boundaryHaloWidth,
      fillColor: "rgba(0,0,0,0)"
    });
    const boundarySelectedStyle = createBoundaryStyle({
      strokeColor: "#083a7a",
      strokeWidth: boundaryStrokeWidth + 0.8,
      haloColor: "rgba(255,255,255,1)",
      haloWidth: boundaryHaloWidth + 0.8,
      fillColor: createBoundaryHatchPattern({
        backgroundColor: "rgba(11,87,208,0.10)",
        stripeColor: "rgba(11,87,208,0.36)",
        cellSize: 10,
        stripeWidth: 1.2
      }) || "rgba(11,87,208,0.10)"
    });

    const loadedDongNames = [];
    const dongMap = new Map();

    drawableFeatures.forEach((feature, featureIndex) => {
      const properties = feature.getProperties();
      const dongName = resolveDongName(properties, featureIndex + 1);
      const emdCode = normalizeEmdCode(properties.emd_cd || properties.emdCode || properties.dong_code);
      loadedDongNames.push(dongName);
      const dongKey = buildDongKey(emdCode, dongName);
      if (!dongMap.has(dongKey)) {
        dongMap.set(dongKey, {
          key: dongKey,
          dongName,
          emdCode
        });
      }

      feature.set("kind", "boundary");
      feature.set("dongName", dongName);
      if (emdCode) {
        feature.set("emd_cd", emdCode);
      }
    });

    if (drawableFeatures.length === 0) {
      throw new Error("경계 지오메트리를 찾지 못했습니다.");
    }

    state.boundarySource.addFeatures(drawableFeatures);
    state.boundaryDefaultStyle = boundaryStyle;
    state.boundarySelectedStyle = boundarySelectedStyle;
    updateBoundaryHighlightStyles();
    state.availableDongs = Array.from(dongMap.values()).sort((a, b) => {
      return String(a.dongName).localeCompare(String(b.dongName), "ko");
    });
    state.availableDongMap = new Map(state.availableDongs.map((item) => [item.key, item]));
    syncDongSelectOptions();
    if (getPopulationConfig().mode === "emd") {
      syncPopulationSourceWithBoundaries(drawableFeatures);
      if (isPopulationVisible()) {
        applyPopulationStylesForHour(state.populationSelectedHour);
      }
    }

    console.info("[boundary-load] rendered:", Array.from(new Set(loadedDongNames)));

    const extent = state.boundarySource.getExtent();
    if (extent && Number.isFinite(extent[0]) && Number.isFinite(extent[2])) {
      state.map.getView().fit(extent, {
        padding: [22, 22, 22, 22],
        duration: 250,
        maxZoom: 16
      });
    }
  }

  function createBoundaryStyle(options) {
    const strokeColor = options && options.strokeColor ? options.strokeColor : "#0b57d0";
    const strokeWidth = readPositiveNumber(options && options.strokeWidth, 3.2);
    const haloColor = options && options.haloColor ? options.haloColor : "rgba(255,255,255,0.95)";
    const haloWidth = readPositiveNumber(options && options.haloWidth, 6);
    const fillColor = options && Object.prototype.hasOwnProperty.call(options, "fillColor")
      ? options.fillColor
      : "rgba(0,0,0,0)";

    return [
      new ol.style.Style({
        zIndex: 9,
        stroke: new ol.style.Stroke({
          color: haloColor,
          width: haloWidth,
          lineCap: "round",
          lineJoin: "round"
        }),
        fill: new ol.style.Fill({
          color: fillColor
        })
      }),
      new ol.style.Style({
        zIndex: 10,
        stroke: new ol.style.Stroke({
          color: strokeColor,
          width: strokeWidth,
          lineCap: "round",
          lineJoin: "round"
        }),
        fill: new ol.style.Fill({
          color: fillColor
        })
      })
    ];
  }

  function createBoundaryHatchPattern(options) {
    if (typeof document === "undefined") {
      return null;
    }
    const cellSize = Math.max(6, Math.round(readPositiveNumber(options && options.cellSize, 10)));
    const stripeWidth = readPositiveNumber(options && options.stripeWidth, 1.2);
    const backgroundColor = options && options.backgroundColor
      ? String(options.backgroundColor)
      : "rgba(11,87,208,0.10)";
    const stripeColor = options && options.stripeColor
      ? String(options.stripeColor)
      : "rgba(11,87,208,0.34)";

    const canvas = document.createElement("canvas");
    canvas.width = cellSize;
    canvas.height = cellSize;
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, cellSize, cellSize);
    context.strokeStyle = stripeColor;
    context.lineWidth = stripeWidth;

    context.beginPath();
    context.moveTo(-cellSize * 0.2, cellSize);
    context.lineTo(cellSize, -cellSize * 0.2);
    context.moveTo(0, cellSize);
    context.lineTo(cellSize, 0);
    context.moveTo(cellSize * 0.2, cellSize);
    context.lineTo(cellSize, cellSize * 0.2);
    context.stroke();

    return context.createPattern(canvas, "repeat");
  }

  function updateBoundaryHighlightStyles() {
    if (!state.boundarySource) {
      return;
    }
    const activeDong = String(state.activeDongName || "").trim();
    const defaultStyle = state.boundaryDefaultStyle;
    const selectedStyle = state.boundarySelectedStyle || defaultStyle;

    state.boundarySource.getFeatures().forEach((feature) => {
      const dongName = String(feature.get("dongName") || "").trim();
      const isSelected = Boolean(activeDong) && dongName === activeDong;
      feature.setStyle(isSelected ? selectedStyle : defaultStyle);
    });
  }

  function readPositiveNumber(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }
    return parsed;
  }

  function resolveDongName(properties, fallbackIndex) {
    return (
      properties.full_nm ||
      properties.emd_kor_nm ||
      properties.dong_name ||
      properties.name ||
      "동 경계 " + fallbackIndex
    );
  }

  function buildDongKey(emdCode, dongName) {
    const normalizedCode = normalizeEmdCode(emdCode);
    if (normalizedCode) {
      return "emd:" + normalizedCode;
    }
    const normalizedName = String(dongName || "").trim();
    if (!normalizedName) {
      return "";
    }
    return "name:" + normalizedName;
  }

  function resolveCategoryLabel(categoryId, fallbackLabel) {
    const normalizedId = String(categoryId || "").trim();
    if (normalizedId && issueCategories[normalizedId]) {
      return issueCategories[normalizedId];
    }
    const normalizedFallback = String(fallbackLabel || "").trim();
    if (normalizedFallback) {
      return normalizedFallback;
    }
    return "미분류";
  }

  function resolveDongMetaByKey(dongKey) {
    const key = String(dongKey || "").trim();
    if (!key || key === "__auto__") {
      return null;
    }
    if (!state.availableDongMap || !state.availableDongMap.has(key)) {
      return null;
    }
    return state.availableDongMap.get(key);
  }

  function syncDongSelectOptions(preferredKey) {
    if (!elements.spotDongSelect) {
      return;
    }

    const select = elements.spotDongSelect;
    const selectedKey = String(preferredKey || select.value || "__auto__").trim() || "__auto__";
    const options = [
      "<option value='__auto__'>좌표 기준 자동 판별</option>"
    ];

    state.availableDongs.forEach((dong) => {
      const label = dong.emdCode
        ? escapeHtml(dong.dongName + " (" + dong.emdCode + ")")
        : escapeHtml(dong.dongName);
      options.push("<option value='" + escapeHtml(dong.key) + "'>" + label + "</option>");
    });

    select.innerHTML = options.join("");
    const hasPreferred = state.availableDongMap.has(selectedKey);
    select.value = hasPreferred ? selectedKey : "__auto__";
  }

  function initPopulationMonthOptions() {
    if (!elements.populationMonth) {
      return;
    }

    elements.populationMonth.innerHTML = "";
    const option = document.createElement("option");
    option.value = "__all__";
    option.textContent = "전체 월";
    elements.populationMonth.appendChild(option);

    const configuredDefault = readMonthValue(mobilityPopulationConfig.defaultMonth);
    state.populationSelectedMonth = configuredDefault || "__all__";
    elements.populationMonth.value = state.populationSelectedMonth;
  }

  function initPopulationHourOptions() {
    if (!elements.populationHour) {
      return;
    }

    elements.populationHour.innerHTML = "";
    for (let hour = 0; hour <= 24; hour += 1) {
      const option = document.createElement("option");
      option.value = String(hour);
      option.textContent = formatPopulationHourLabel(hour);
      elements.populationHour.appendChild(option);
    }

    const defaultHour = readHourValue(mobilityPopulationConfig.defaultHour);
    state.populationSelectedHour = Number.isFinite(defaultHour) ? defaultHour : 8;
    elements.populationHour.value = String(state.populationSelectedHour);
  }

  function syncPopulationMonthOptions() {
    if (!elements.populationMonth) {
      return;
    }

    const previous = state.populationSelectedMonth || "__all__";
    const months = Array.isArray(state.populationMonths) ? state.populationMonths.slice() : [];
    elements.populationMonth.innerHTML = "";

    if (months.length > 0) {
      months.forEach((month) => {
        const option = document.createElement("option");
        option.value = month;
        option.textContent = formatMonthLabel(month);
        elements.populationMonth.appendChild(option);
      });

      const defaultMonth = readMonthValue(mobilityPopulationConfig.defaultMonth);
      const preferred = defaultMonth && months.includes(defaultMonth)
        ? defaultMonth
        : (months.includes(previous) ? previous : months[months.length - 1]);
      state.populationSelectedMonth = preferred;
      elements.populationMonth.value = preferred;
      elements.populationMonth.disabled = false;
      return;
    }

    const option = document.createElement("option");
    option.value = "__all__";
    option.textContent = "전체 월";
    elements.populationMonth.appendChild(option);
    state.populationSelectedMonth = "__all__";
    elements.populationMonth.value = "__all__";
    elements.populationMonth.disabled = true;
  }

  function syncPopulationHourOptionsForMonth() {
    if (!elements.populationHour) {
      return;
    }

    const month = state.populationSelectedMonth || "__all__";
    const hourSet = state.populationHoursByMonth.get(month);
    if (!(hourSet instanceof Set) || hourSet.size === 0) {
      return;
    }

    const sortedHours = Array.from(hourSet).sort((a, b) => a - b);
    elements.populationHour.innerHTML = "";
    sortedHours.forEach((hour) => {
      const option = document.createElement("option");
      option.value = String(hour);
      option.textContent = formatPopulationHourLabel(hour);
      elements.populationHour.appendChild(option);
    });

    const preferredHour = sortedHours.includes(state.populationSelectedHour)
      ? state.populationSelectedHour
      : sortedHours[0];
    state.populationSelectedHour = preferredHour;
    elements.populationHour.value = String(preferredHour);
  }

  function updatePopulationControls() {
    const populationConfig = getPopulationConfig();
    const isLoggedIn = Boolean(state.currentUser);

    if (elements.togglePopulationFlow) {
      elements.togglePopulationFlow.disabled = !isLoggedIn || !populationConfig.enabled;
      if (!isLoggedIn || !populationConfig.enabled) {
        elements.togglePopulationFlow.checked = false;
        if (state.populationLayer) {
          state.populationLayer.setVisible(false);
        }
      }
    }

    if (elements.populationHour) {
      elements.populationHour.disabled = !isLoggedIn || !populationConfig.enabled;
      elements.populationHour.value = String(state.populationSelectedHour);
    }

    if (elements.populationMonth) {
      const hasMonths = Array.isArray(state.populationMonths) && state.populationMonths.length > 0;
      elements.populationMonth.disabled = !isLoggedIn || !populationConfig.enabled || !hasMonths;
      if (state.populationSelectedMonth) {
        elements.populationMonth.value = state.populationSelectedMonth;
      }
    }

    if (!populationConfig.enabled) {
      setPopulationStatus("수도권 생활이동 오버레이가 설정에서 비활성화되어 있습니다.");
      return;
    }
    if (!isLoggedIn) {
      setPopulationStatus("로그인 후 생활이동 오버레이를 사용할 수 있습니다.");
      return;
    }
    setPopulationStatus("");
  }

  async function applyDefaultPopulationVisibility() {
    const populationConfig = getPopulationConfig();
    if (!elements.togglePopulationFlow) {
      return;
    }
    elements.togglePopulationFlow.checked = populationConfig.visibleByDefault && populationConfig.enabled;
    if (elements.togglePopulationFlow.checked) {
      await handlePopulationToggle(true);
    }
  }

  function resetPopulationState() {
    if (state.populationSource) {
      state.populationSource.clear();
    }
    if (state.populationLayer) {
      state.populationLayer.setVisible(false);
    }
    state.populationStatsByPeriod.clear();
    state.populationGridByPeriod.clear();
    state.populationHoursByMonth.clear();
    state.populationMonths = [];
    state.populationMaxByPeriod.clear();
    state.populationLoaded = false;
    state.populationLoading = false;
    state.populationSelectedMonth = readMonthValue(mobilityPopulationConfig.defaultMonth) || "__all__";
    state.populationSelectedHour = Number.isFinite(readHourValue(mobilityPopulationConfig.defaultHour))
      ? readHourValue(mobilityPopulationConfig.defaultHour)
      : 8;
    if (elements.togglePopulationFlow) {
      elements.togglePopulationFlow.checked = false;
    }
    initPopulationMonthOptions();
    initPopulationHourOptions();
    setPopulationStatus("");
  }

  async function handlePopulationToggle(shouldShow) {
    const populationConfig = getPopulationConfig();
    if (!state.populationLayer || !state.populationSource) {
      return;
    }

    if (!state.currentUser) {
      state.populationLayer.setVisible(false);
      setPopulationStatus("로그인 후 생활이동 오버레이를 사용할 수 있습니다.", true);
      if (elements.togglePopulationFlow) {
        elements.togglePopulationFlow.checked = false;
      }
      return;
    }

    if (!populationConfig.enabled) {
      state.populationLayer.setVisible(false);
      setPopulationStatus("생활이동 오버레이가 비활성화되어 있습니다.", true);
      if (elements.togglePopulationFlow) {
        elements.togglePopulationFlow.checked = false;
      }
      return;
    }

    if (!shouldShow) {
      state.populationLayer.setVisible(false);
      setPopulationStatus("");
      return;
    }

    if (!populationConfig.dataPath) {
      state.populationLayer.setVisible(false);
      setPopulationStatus("생활이동 데이터 경로가 설정되지 않았습니다.", true);
      if (elements.togglePopulationFlow) {
        elements.togglePopulationFlow.checked = false;
      }
      return;
    }

    if (!state.populationLoaded) {
      await loadPopulationData(populationConfig);
    }
    if (!state.populationLoaded) {
      if (elements.togglePopulationFlow) {
        elements.togglePopulationFlow.checked = false;
      }
      return;
    }

    if (populationConfig.mode === "emd" && state.populationSource.getFeatures().length === 0 && state.boundarySource) {
      syncPopulationSourceWithBoundaries(state.boundarySource.getFeatures());
    }

    applyPopulationStylesForHour(state.populationSelectedHour);
    state.populationLayer.setVisible(true);
  }

  async function loadPopulationData(populationConfig) {
    if (state.populationLoading) {
      return;
    }
    state.populationLoading = true;
    setPopulationStatus("생활이동 데이터 불러오는 중...");

    try {
      const requestUrl = buildPopulationRequestUrl(populationConfig);
      const response = await fetch(requestUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("요청 실패 (" + response.status + ")");
      }

      const payloadText = await response.text();
      const rows = parsePopulationRows(payloadText, populationConfig);
      if (populationConfig.mode === "grid250") {
        const gridResult = aggregatePopulationRowsToGrid(rows, populationConfig);
        state.populationStatsByPeriod = new Map();
        state.populationGridByPeriod = gridResult.gridByPeriod;
        state.populationMaxByPeriod = gridResult.maxByPeriod;
        state.populationMonths = gridResult.months;
        state.populationHoursByMonth = gridResult.hoursByMonth;
      } else {
        const emdResult = aggregatePopulationRowsByEmd(rows, populationConfig);
        state.populationStatsByPeriod = emdResult.statsByPeriod;
        state.populationGridByPeriod = new Map();
        state.populationMaxByPeriod = emdResult.maxByPeriod;
        state.populationMonths = emdResult.months;
        state.populationHoursByMonth = emdResult.hoursByMonth;
      }
      syncPopulationMonthOptions();
      syncPopulationHourOptionsForMonth();
      state.populationLoaded = true;
      updatePopulationControls();
      setPopulationStatus("생활이동 데이터 로딩 완료");
    } catch (error) {
      state.populationLoaded = false;
      state.populationStatsByPeriod.clear();
      state.populationGridByPeriod.clear();
      state.populationHoursByMonth.clear();
      state.populationMonths = [];
      state.populationMaxByPeriod.clear();
      setPopulationStatus("생활이동 데이터 로딩 실패: " + toMessage(error), true);
      console.error("[population-load]", toMessage(error));
    } finally {
      state.populationLoading = false;
    }
  }

  function parsePopulationRows(payloadText, populationConfig) {
    const trimmed = String(payloadText || "").trim();
    if (!trimmed) {
      throw new Error("빈 응답입니다.");
    }

    const expectsJson = populationConfig.sourceType === "json"
      || trimmed.startsWith("{")
      || trimmed.startsWith("[");
    if (expectsJson) {
      if (trimmed.startsWith("<")) {
        const htmlSummary = summarizeHtmlText(trimmed);
        const messageSuffix = htmlSummary ? " (" + htmlSummary + ")" : "";
        throw new Error(
          "JSON 대신 HTML 응답이 내려왔습니다" +
          messageSuffix +
          ". API 키/접근 권한/CORS 설정을 확인하세요."
        );
      }

      let parsed;
      try {
        parsed = JSON.parse(trimmed);
      } catch (error) {
        throw new Error("JSON 파싱 실패: " + toMessage(error));
      }
      return extractPopulationRows(parsed, populationConfig.rowPath);
    }

    return parseCsvRows(trimmed, populationConfig.delimiter);
  }

  function extractPopulationRows(parsedData, rowPath) {
    if (Array.isArray(parsedData)) {
      const rowsFromServiceArray = extractRowsFromServiceNode(parsedData);
      return rowsFromServiceArray || parsedData;
    }
    if (!parsedData || typeof parsedData !== "object") {
      throw new Error("지원하지 않는 JSON 구조입니다.");
    }

    if (rowPath) {
      const rowValue = readPath(parsedData, rowPath);
      if (Array.isArray(rowValue)) {
        return rowValue;
      }
    }

    const candidates = [
      "rows",
      "items",
      "data",
      "list",
      "row",
      "result.rows",
      "result.items",
      "result.data",
      "result.list",
      "response.body.items",
      "response.items",
      "body.items"
    ];
    for (const candidate of candidates) {
      const rowValue = readPath(parsedData, candidate);
      if (Array.isArray(rowValue)) {
        return rowValue;
      }
    }

    for (const key of Object.keys(parsedData)) {
      const rowsFromServiceNode = extractRowsFromServiceNode(parsedData[key]);
      if (rowsFromServiceNode) {
        return rowsFromServiceNode;
      }
    }

    const discoveredRows = findFirstObjectArray(parsedData, 0, new Set());
    if (discoveredRows) {
      return discoveredRows;
    }

    throw new Error("JSON에서 행 배열을 찾지 못했습니다. rowPath 설정을 확인하세요.");
  }

  function extractRowsFromServiceNode(node) {
    if (!node) {
      return null;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        if (!item || typeof item !== "object") {
          continue;
        }
        if (Array.isArray(item.row)) {
          return item.row;
        }
        if (Array.isArray(item.rows)) {
          return item.rows;
        }
        if (Array.isArray(item.list)) {
          return item.list;
        }
      }
      if (node.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
        return node;
      }
      return null;
    }

    if (typeof node !== "object") {
      return null;
    }
    if (Array.isArray(node.row)) {
      return node.row;
    }
    if (Array.isArray(node.rows)) {
      return node.rows;
    }
    if (Array.isArray(node.list)) {
      return node.list;
    }
    return null;
  }

  function findFirstObjectArray(node, depth, visited) {
    if (!node || typeof node !== "object" || depth > 5 || visited.has(node)) {
      return null;
    }
    visited.add(node);

    const directRows = extractRowsFromServiceNode(node);
    if (directRows) {
      return directRows;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        const found = findFirstObjectArray(item, depth + 1, visited);
        if (found) {
          return found;
        }
      }
      return null;
    }

    const keys = Object.keys(node);
    for (const key of keys) {
      const found = findFirstObjectArray(node[key], depth + 1, visited);
      if (found) {
        return found;
      }
    }
    return null;
  }

  function buildPopulationRequestUrl(populationConfig) {
    const rawUrl = String(populationConfig.dataPath || "").trim();
    if (!rawUrl) {
      return "";
    }

    const parsedUrl = new URL(rawUrl, window.location.href);
    if (populationConfig.token && populationConfig.tokenQueryKey && !parsedUrl.searchParams.has(populationConfig.tokenQueryKey)) {
      parsedUrl.searchParams.set(populationConfig.tokenQueryKey, populationConfig.token);
    }

    const queryParams = populationConfig.queryParams;
    if (queryParams && typeof queryParams === "object") {
      Object.keys(queryParams).forEach((key) => {
        const rawValue = queryParams[key];
        if (rawValue === null || rawValue === undefined) {
          return;
        }
        parsedUrl.searchParams.set(key, String(rawValue));
      });
    }

    return parsedUrl.toString();
  }

  function aggregatePopulationRowsByEmd(rows, populationConfig) {
    const monthField = populationConfig.fields.month;
    const hourField = populationConfig.fields.hour;
    const emdField = populationConfig.fields.emdCode;
    const valueField = populationConfig.fields.population;
    const statsByPeriod = new Map();
    const maxByPeriod = new Map();
    const months = new Set();
    const hoursByMonth = new Map();

    rows.forEach((row) => {
      if (!row || typeof row !== "object") {
        return;
      }

      const month = readMonthValue(row[monthField]) || "__all__";
      const hour = readHourValue(row[hourField]);
      if (!Number.isFinite(hour)) {
        return;
      }

      const emdCode = normalizeEmdCode(row[emdField]);
      if (!emdCode) {
        return;
      }

      const value = Number(row[valueField]);
      if (!Number.isFinite(value)) {
        return;
      }

      months.add(month);
      ensureSet(hoursByMonth, month).add(hour);

      const periodKey = buildPopulationPeriodKey(month, hour);
      const periodMap = ensureMap(statsByPeriod, periodKey);
      const nextValue = (periodMap.get(emdCode) || 0) + value;
      periodMap.set(emdCode, nextValue);

      const currentMax = maxByPeriod.get(periodKey) || 0;
      if (nextValue > currentMax) {
        maxByPeriod.set(periodKey, nextValue);
      }
    });

    return {
      statsByPeriod,
      maxByPeriod,
      months: sortPopulationMonths(Array.from(months)),
      hoursByMonth
    };
  }

  function aggregatePopulationRowsToGrid(rows, populationConfig) {
    const monthField = populationConfig.fields.month;
    const hourField = populationConfig.fields.hour;
    const valueField = populationConfig.fields.population;
    const gridByPeriod = new Map();
    const maxByPeriod = new Map();
    const months = new Set();
    const hoursByMonth = new Map();
    const cellSize = populationConfig.cellSizeMeter;

    rows.forEach((row) => {
      if (!row || typeof row !== "object") {
        return;
      }

      const month = readMonthValue(row[monthField]) || "__all__";
      const hour = readHourValue(row[hourField]);
      if (!Number.isFinite(hour)) {
        return;
      }

      const value = Number(row[valueField]);
      if (!Number.isFinite(value)) {
        return;
      }

      const projected = resolvePopulationProjectedCoord(row, populationConfig);
      if (!projected) {
        return;
      }

      const x = projected[0];
      const y = projected[1];
      const gx = Math.floor(x / cellSize);
      const gy = Math.floor(y / cellSize);
      const cellKey = String(gx) + ":" + String(gy);
      months.add(month);
      ensureSet(hoursByMonth, month).add(hour);

      const periodKey = buildPopulationPeriodKey(month, hour);
      const periodMap = ensureMap(gridByPeriod, periodKey);

      let cell = periodMap.get(cellKey);
      if (!cell) {
        cell = {
          centerX: (gx + 0.5) * cellSize,
          centerY: (gy + 0.5) * cellSize,
          value: 0
        };
      }
      cell.value += value;
      periodMap.set(cellKey, cell);

      const currentMax = maxByPeriod.get(periodKey) || 0;
      if (cell.value > currentMax) {
        maxByPeriod.set(periodKey, cell.value);
      }
    });

    return {
      gridByPeriod,
      maxByPeriod,
      months: sortPopulationMonths(Array.from(months)),
      hoursByMonth
    };
  }

  function parseCsvRows(csvText, delimiter) {
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      return [];
    }
    const header = splitCsvLine(lines[0], delimiter);
    const rows = [];
    for (let index = 1; index < lines.length; index += 1) {
      const tokens = splitCsvLine(lines[index], delimiter);
      const row = {};
      header.forEach((key, keyIndex) => {
        row[String(key || "").trim()] = String(tokens[keyIndex] || "").trim();
      });
      rows.push(row);
    }
    return rows;
  }

  function splitCsvLine(line, delimiter) {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === "\"") {
        const next = line[index + 1];
        if (inQuotes && next === "\"") {
          current += "\"";
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (char === delimiter && !inQuotes) {
        result.push(current);
        current = "";
        continue;
      }
      current += char;
    }
    result.push(current);
    return result;
  }

  function syncPopulationSourceWithBoundaries(boundaryFeatures) {
    if (!state.populationSource) {
      return;
    }

    state.populationSource.clear();
    const features = [];
    boundaryFeatures.forEach((boundaryFeature) => {
      const geometry = boundaryFeature.getGeometry();
      if (!geometry) {
        return;
      }
      const emdCode = normalizeEmdCode(boundaryFeature.get("emd_cd"));
      const dongName = boundaryFeature.get("dongName") || resolveDongName(boundaryFeature.getProperties(), 0);

      const feature = new ol.Feature({
        geometry: geometry.clone()
      });
      feature.set("kind", "population_area");
      feature.set("emd_cd", emdCode);
      feature.set("dongName", dongName);
      features.push(feature);
    });
    state.populationSource.addFeatures(features);
  }

  function resolvePopulationProjectedCoord(row, populationConfig) {
    const fields = populationConfig.fields;
    if (populationConfig.coordinateProjection === "EPSG:3857") {
      const x = resolveCoordinate(row, [fields.x, "x", "coord_x"]);
      const y = resolveCoordinate(row, [fields.y, "y", "coord_y"]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
      }
      return [x, y];
    }

    const lon = resolveCoordinate(row, [fields.longitude, fields.x, "lon", "lng", "longitude", "x"]);
    const lat = resolveCoordinate(row, [fields.latitude, fields.y, "lat", "latitude", "y"]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return null;
    }
    return ol.proj.fromLonLat([lon, lat]);
  }

  function buildGridCellFeature(centerX, centerY, cellSize, value, hour, month) {
    const half = cellSize / 2;
    const ring = [
      [centerX - half, centerY - half],
      [centerX + half, centerY - half],
      [centerX + half, centerY + half],
      [centerX - half, centerY + half],
      [centerX - half, centerY - half]
    ];

    const feature = new ol.Feature({
      geometry: new ol.geom.Polygon([ring])
    });
    feature.set("kind", "population_grid");
    feature.set("populationValue", value);
    feature.set("populationHour", hour);
    feature.set("populationMonth", month);
    feature.set("populationMode", "grid250");
    return feature;
  }

  function applyPopulationStylesForHour(hour) {
    if (!state.populationSource) {
      return;
    }
    const populationConfig = getPopulationConfig();
    const normalizedHour = Number.isFinite(hour) ? hour : state.populationSelectedHour;
    state.populationSelectedHour = normalizedHour;
    const selectedMonth = resolveSelectedPopulationMonth();
    const periodKey = buildPopulationPeriodKey(selectedMonth, normalizedHour);
    if (elements.populationHour) {
      elements.populationHour.value = String(normalizedHour);
    }
    if (elements.populationMonth && selectedMonth) {
      elements.populationMonth.value = selectedMonth;
    }

    if (populationConfig.mode === "grid250") {
      const hourGrid = state.populationGridByPeriod.get(periodKey) || new Map();
      const maxValue = state.populationMaxByPeriod.get(periodKey) || 0;
      const gridFeatures = [];
      hourGrid.forEach((cell) => {
        if (!cell || !Number.isFinite(cell.value) || cell.value <= 0) {
          return;
        }
        const feature = buildGridCellFeature(
          cell.centerX,
          cell.centerY,
          populationConfig.cellSizeMeter,
          cell.value,
          normalizedHour,
          selectedMonth
        );
        feature.setStyle(createPopulationStyle(cell.value, maxValue));
        gridFeatures.push(feature);
      });

      state.populationSource.clear();
      state.populationSource.addFeatures(gridFeatures);

      if (isPopulationVisible()) {
        const maxLabel = maxValue > 0 ? maxValue.toLocaleString("ko-KR") : "0";
        const monthLabel = formatMonthLabel(selectedMonth);
        const hourLabel = formatPopulationHourLabel(normalizedHour);
        setPopulationStatus(
          monthLabel + " " +
          hourLabel +
          " 기준 250m 격자 인구 오버레이 (" +
          String(gridFeatures.length) +
          "개 셀, 최대 " +
          maxLabel +
          ")"
        );
      }
      return;
    }

    const hourStats = state.populationStatsByPeriod.get(periodKey) || new Map();
    const maxValue = state.populationMaxByPeriod.get(periodKey) || 0;
    const nonZeroValues = Array.from(hourStats.values()).filter((value) => Number.isFinite(value) && value > 0);
    const minValue = nonZeroValues.length > 0 ? Math.min(...nonZeroValues) : 0;
    const isUniform = nonZeroValues.length > 1 && minValue === maxValue;
    const features = state.populationSource.getFeatures();
    let matchedCount = 0;

    features.forEach((feature) => {
      const emdCode = normalizeEmdCode(feature.get("emd_cd"));
      const value = hourStats.get(emdCode) || 0;
      if (value > 0) {
        matchedCount += 1;
      }
      feature.set("populationValue", value);
      feature.set("populationHour", normalizedHour);
      feature.set("populationMonth", selectedMonth);
      feature.set("populationMode", "emd");
      feature.setStyle(createPopulationStyle(value, maxValue));
    });

    if (isPopulationVisible()) {
      const maxLabel = maxValue > 0 ? maxValue.toLocaleString("ko-KR") : "0";
      const monthLabel = formatMonthLabel(selectedMonth);
      const hourLabel = formatPopulationHourLabel(normalizedHour);
      const uniformNote = isUniform
        ? ", 동별 값 동일(색 농도 동일)"
        : "";
      setPopulationStatus(
        monthLabel + " " +
        hourLabel +
        " 기준 인구 오버레이 (" +
        String(matchedCount) +
        "개 동, 최대 " +
        maxLabel +
        uniformNote +
        ")"
      );
    }
  }

  function createPopulationStyle(value, maxValue) {
    if (!Number.isFinite(value) || value <= 0 || maxValue <= 0) {
      return new ol.style.Style({
        fill: new ol.style.Fill({ color: "rgba(0,0,0,0)" }),
        stroke: new ol.style.Stroke({ color: "rgba(0,0,0,0)", width: 0 })
      });
    }

    const normalized = Math.max(0, Math.min(1, value / maxValue));
    const color = interpolateHexColor("#fff1a8", "#d92d20", normalized);
    const alpha = 0.2 + normalized * 0.45;

    return new ol.style.Style({
      fill: new ol.style.Fill({ color: toRgba(color, alpha) }),
      stroke: new ol.style.Stroke({
        color: toRgba(color, Math.min(0.95, alpha + 0.15)),
        width: 1.2
      })
    });
  }

  function getPopulationConfig() {
    const fields = mobilityPopulationConfig.fields && typeof mobilityPopulationConfig.fields === "object"
      ? mobilityPopulationConfig.fields
      : {};
    const modeRaw = String(mobilityPopulationConfig.mode || "emd").toLowerCase();
    const mode = modeRaw === "grid250" ? "grid250" : "emd";

    return {
      enabled: mobilityPopulationConfig.enabled !== false,
      mode,
      dataPath: String(mobilityPopulationConfig.dataPath || ""),
      sourceType: String(mobilityPopulationConfig.sourceType || "csv").toLowerCase(),
      delimiter: String(mobilityPopulationConfig.delimiter || ","),
      rowPath: typeof mobilityPopulationConfig.rowPath === "string"
        ? mobilityPopulationConfig.rowPath.trim()
        : "",
      token: String(mobilityPopulationConfig.token || "").trim(),
      tokenQueryKey: String(mobilityPopulationConfig.tokenQueryKey || "KEY").trim(),
      queryParams: mobilityPopulationConfig.queryParams && typeof mobilityPopulationConfig.queryParams === "object"
        ? mobilityPopulationConfig.queryParams
        : null,
      coordinateProjection: String(mobilityPopulationConfig.coordinateProjection || "EPSG:4326").toUpperCase(),
      cellSizeMeter: readPositiveNumber(mobilityPopulationConfig.cellSizeMeter, 250),
      fields: {
        month: String(fields.month || "month"),
        hour: String(fields.hour || "hour"),
        emdCode: String(fields.emdCode || "emd_cd"),
        population: String(fields.population || "population"),
        longitude: String(fields.longitude || "lon"),
        latitude: String(fields.latitude || "lat"),
        x: String(fields.x || "x"),
        y: String(fields.y || "y")
      },
      hourLabels: mobilityPopulationConfig.hourLabels && typeof mobilityPopulationConfig.hourLabels === "object"
        ? mobilityPopulationConfig.hourLabels
        : {},
      visibleByDefault: mobilityPopulationConfig.visibleByDefault === true
    };
  }

  function readHourValue(value) {
    if (value === null || value === undefined) {
      return NaN;
    }
    const raw = String(value).trim();
    if (!raw) {
      return NaN;
    }

    if (/^\d{1,2}$/.test(raw)) {
      const hour = Number(raw);
      return hour >= 0 && hour <= 24 ? hour : NaN;
    }

    const hourMatch = raw.match(/(\d{1,2})/);
    if (!hourMatch) {
      return NaN;
    }
    const parsed = Number(hourMatch[1]);
    return parsed >= 0 && parsed <= 24 ? parsed : NaN;
  }

  function readMonthValue(value) {
    if (value === null || value === undefined) {
      return "";
    }
    const raw = String(value).trim();
    if (!raw || raw.toUpperCase() === "ALL") {
      return "";
    }

    const digits = raw.replace(/[^\d]/g, "");
    if (digits.length >= 6) {
      return digits.slice(0, 6);
    }
    return raw;
  }

  function formatMonthLabel(monthValue) {
    const raw = String(monthValue || "").trim();
    if (!raw || raw === "__all__") {
      return "전체 월";
    }
    if (/^\d{6}$/.test(raw)) {
      return raw.slice(0, 4) + "-" + raw.slice(4, 6);
    }
    return raw;
  }

  function formatPopulationHourLabel(hourValue) {
    const numericHour = Number(hourValue);
    const labels = getPopulationConfig().hourLabels;
    const mapped = labels[String(numericHour)];
    if (mapped) {
      return String(mapped);
    }
    if (Number.isFinite(numericHour) && numericHour >= 0 && numericHour <= 24) {
      return String(numericHour).padStart(2, "0") + ":00";
    }
    return String(hourValue || "");
  }

  function sortPopulationMonths(months) {
    return months.sort((a, b) => String(a).localeCompare(String(b), "ko"));
  }

  function buildPopulationPeriodKey(month, hour) {
    return String(month || "__all__") + "|" + String(hour);
  }

  function resolveSelectedPopulationMonth() {
    const month = String(state.populationSelectedMonth || "__all__");
    if (month !== "__all__") {
      return month;
    }
    if (state.populationMonths.length > 0) {
      return state.populationMonths[state.populationMonths.length - 1];
    }
    return "__all__";
  }

  function normalizeEmdCode(value) {
    const raw = String(value || "").replace(/[^\d]/g, "");
    if (!raw) {
      return "";
    }
    if (raw.length >= 8) {
      return raw.slice(0, 8);
    }
    return raw;
  }

  function ensureMap(map, key) {
    if (!map.has(key)) {
      map.set(key, new Map());
    }
    return map.get(key);
  }

  function ensureSet(map, key) {
    if (!map.has(key)) {
      map.set(key, new Set());
    }
    return map.get(key);
  }

  function interpolateHexColor(startHex, endHex, ratio) {
    const start = hexToRgb(startHex);
    const end = hexToRgb(endHex);
    if (!start || !end) {
      return endHex;
    }
    const normalized = Math.max(0, Math.min(1, ratio));
    const r = Math.round(start.r + (end.r - start.r) * normalized);
    const g = Math.round(start.g + (end.g - start.g) * normalized);
    const b = Math.round(start.b + (end.b - start.b) * normalized);
    return rgbToHex(r, g, b);
  }

  function hexToRgb(hexColor) {
    const match = String(hexColor || "").trim().match(/^#([0-9a-fA-F]{6})$/);
    if (!match) {
      return null;
    }
    const raw = match[1];
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16)
    };
  }

  function rgbToHex(r, g, b) {
    const clamp = (value) => Math.max(0, Math.min(255, value));
    const toHex = (value) => clamp(value).toString(16).padStart(2, "0");
    return "#" + toHex(r) + toHex(g) + toHex(b);
  }

  function setPopulationStatus(message, isError) {
    if (!elements.populationStatus) {
      return;
    }
    elements.populationStatus.textContent = message || "";
    elements.populationStatus.style.color = isError ? "var(--danger)" : "";
  }

  function isPopulationVisible() {
    return Boolean(state.populationLayer && state.populationLayer.getVisible());
  }

  function updateOverlayControls() {
    const isLoggedIn = Boolean(state.currentUser);
    const vehicleConfig = getOverlayConfig("vehicle");
    const pedestrianConfig = getOverlayConfig("pedestrian");

    if (elements.toggleVehicleFlow) {
      elements.toggleVehicleFlow.disabled = !isLoggedIn || !vehicleConfig.enabled;
      if (!isLoggedIn || !vehicleConfig.enabled) {
        elements.toggleVehicleFlow.checked = false;
        if (state.overlayLayers.vehicle) {
          state.overlayLayers.vehicle.setVisible(false);
        }
      }
    }
    if (elements.togglePedestrianFlow) {
      elements.togglePedestrianFlow.disabled = !isLoggedIn || !pedestrianConfig.enabled;
      if (!isLoggedIn || !pedestrianConfig.enabled) {
        elements.togglePedestrianFlow.checked = false;
        if (state.overlayLayers.pedestrian) {
          state.overlayLayers.pedestrian.setVisible(false);
        }
      }
    }

    if (!elements.overlayStatus) {
      return;
    }

    if (trafficOverlayConfig.enabled === false) {
      setOverlayStatus("교통 오버레이가 설정에서 비활성화되어 있습니다.");
      return;
    }
    if (!isLoggedIn) {
      setOverlayStatus("로그인 후 교통 오버레이를 사용할 수 있습니다.");
      return;
    }
    setOverlayStatus("");
  }

  async function applyDefaultOverlayVisibility() {
    const vehicleConfig = getOverlayConfig("vehicle");
    const pedestrianConfig = getOverlayConfig("pedestrian");

    if (elements.toggleVehicleFlow) {
      elements.toggleVehicleFlow.checked = vehicleConfig.visibleByDefault && vehicleConfig.enabled;
      if (elements.toggleVehicleFlow.checked) {
        await handleOverlayToggle("vehicle", true);
      }
    }

    if (elements.togglePedestrianFlow) {
      elements.togglePedestrianFlow.checked = pedestrianConfig.visibleByDefault && pedestrianConfig.enabled;
      if (elements.togglePedestrianFlow.checked) {
        await handleOverlayToggle("pedestrian", true);
      }
    }
  }

  function resetOverlayState() {
    ["vehicle", "pedestrian"].forEach((kind) => {
      if (state.overlaySources[kind]) {
        state.overlaySources[kind].clear();
      }
      if (state.overlayLayers[kind]) {
        state.overlayLayers[kind].setVisible(false);
      }
      state.overlayLoaded[kind] = false;
      state.overlayLoading[kind] = false;
      state.overlayStyleCache[kind].clear();
    });

    if (elements.toggleVehicleFlow) {
      elements.toggleVehicleFlow.checked = false;
    }
    if (elements.togglePedestrianFlow) {
      elements.togglePedestrianFlow.checked = false;
    }
  }

  async function handleOverlayToggle(kind, shouldShow) {
    const layer = state.overlayLayers[kind];
    const source = state.overlaySources[kind];
    const overlayConfig = getOverlayConfig(kind);
    if (!layer || !source) {
      return;
    }

    if (!state.currentUser) {
      layer.setVisible(false);
      setOverlayStatus("로그인 후 교통 오버레이를 사용할 수 있습니다.", true);
      syncOverlayCheckbox(kind, false);
      return;
    }

    if (!overlayConfig.enabled) {
      layer.setVisible(false);
      setOverlayStatus(overlayConfig.label + " 오버레이가 비활성화되어 있습니다.", true);
      syncOverlayCheckbox(kind, false);
      return;
    }

    if (!shouldShow) {
      layer.setVisible(false);
      setOverlayStatus("");
      return;
    }

    if (!overlayConfig.url) {
      layer.setVisible(false);
      setOverlayStatus(overlayConfig.label + " 데이터 URL이 설정되지 않았습니다.", true);
      syncOverlayCheckbox(kind, false);
      return;
    }

    if (!state.overlayLoaded[kind]) {
      await loadOverlayLayer(kind, overlayConfig);
    }

    if (state.overlayLoaded[kind]) {
      layer.setVisible(true);
      const total = source.getFeatures().length;
      setOverlayStatus(overlayConfig.label + " 표시 중 (" + String(total) + "개)");
      return;
    }

    syncOverlayCheckbox(kind, false);
  }

  async function loadOverlayLayer(kind, overlayConfig) {
    const source = state.overlaySources[kind];
    const layer = state.overlayLayers[kind];
    if (!source || !layer || state.overlayLoading[kind]) {
      return;
    }

    state.overlayLoading[kind] = true;
    setOverlayStatus(overlayConfig.label + " 데이터를 불러오는 중...");

    try {
      const requestUrl = buildOverlayRequestUrl(overlayConfig);
      const response = await fetch(requestUrl, {
        method: overlayConfig.method,
        headers: overlayConfig.headers,
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error("요청 실패 (" + response.status + ")");
      }

      const payloadText = await response.text();
      const parseResult = parseOverlayFeatures(payloadText, overlayConfig);
      const features = parseResult.features;
      const maxValue = parseResult.maxValue;
      if (!hasRenderableGeometry(features)) {
        throw new Error("표시 가능한 좌표 데이터가 없습니다.");
      }

      const styleFn = createOverlayStyleFunction(kind, maxValue, overlayConfig);
      source.clear();
      features.forEach((feature) => {
        const value = resolveOverlayValue(feature.getProperties(), overlayConfig.valueProperty);
        feature.set("kind", "traffic_overlay");
        feature.set("overlayType", overlayConfig.label);
        feature.set("overlayValue", value);
        feature.setStyle(styleFn);
      });
      source.addFeatures(features);
      layer.setVisible(true);
      state.overlayLoaded[kind] = true;
      setOverlayStatus(overlayConfig.label + " 표시 중 (" + String(features.length) + "개)");
    } catch (error) {
      source.clear();
      layer.setVisible(false);
      state.overlayLoaded[kind] = false;
      console.error("[overlay-load]", kind, toMessage(error));
      setOverlayStatus(overlayConfig.label + " 로딩 실패: " + toMessage(error), true);
    } finally {
      state.overlayLoading[kind] = false;
    }
  }

  function parseOverlayFeatures(payloadText, overlayConfig) {
    const trimmed = String(payloadText || "").trim();
    if (!trimmed) {
      throw new Error("빈 응답입니다.");
    }

    let parsed;
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      parsed = JSON.parse(trimmed);
    } else {
      throw new Error("JSON/GeoJSON 형식만 지원합니다.");
    }

    let features = [];
    const geojsonFormat = new ol.format.GeoJSON();
    if (parsed && typeof parsed === "object" && (parsed.type === "FeatureCollection" || parsed.type === "Feature")) {
      features = geojsonFormat.readFeatures(parsed, {
        dataProjection: overlayConfig.dataProjection,
        featureProjection: "EPSG:3857"
      });
      normalizeFeatureProjection(features);
    } else {
      const rows = extractOverlayRows(parsed, overlayConfig.rowPath);
      features = buildPointFeaturesFromRows(rows, overlayConfig);
    }

    let maxValue = 0;
    features.forEach((feature) => {
      const value = resolveOverlayValue(feature.getProperties(), overlayConfig.valueProperty);
      if (value > maxValue) {
        maxValue = value;
      }
      feature.set("overlayValue", value);
    });

    return { features, maxValue };
  }

  function extractOverlayRows(parsedData, rowPath) {
    if (Array.isArray(parsedData)) {
      return parsedData;
    }
    if (!parsedData || typeof parsedData !== "object") {
      throw new Error("지원하지 않는 데이터 구조입니다.");
    }

    if (rowPath) {
      const rowValue = readPath(parsedData, rowPath);
      if (Array.isArray(rowValue)) {
        return rowValue;
      }
    }

    const candidates = ["rows", "items", "data", "list", "result.items", "result.rows", "result.data"];
    for (const candidate of candidates) {
      const rowValue = readPath(parsedData, candidate);
      if (Array.isArray(rowValue)) {
        return rowValue;
      }
    }

    throw new Error("행 데이터 배열을 찾지 못했습니다. rowPath 설정을 확인하세요.");
  }

  function buildPointFeaturesFromRows(rows, overlayConfig) {
    const features = [];
    rows.forEach((row) => {
      if (!row || typeof row !== "object") {
        return;
      }
      const lon = resolveCoordinate(row, [overlayConfig.longitudeProperty, "lon", "lng", "x", "longitude"]);
      const lat = resolveCoordinate(row, [overlayConfig.latitudeProperty, "lat", "y", "latitude"]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
        return;
      }

      const feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat]))
      });
      Object.keys(row).forEach((key) => {
        feature.set(key, row[key]);
      });
      features.push(feature);
    });
    return features;
  }

  function buildOverlayRequestUrl(overlayConfig) {
    const rawUrl = overlayConfig.url;
    const token = overlayConfig.token;
    const tokenQueryKey = overlayConfig.tokenQueryKey;
    if (!token || !tokenQueryKey) {
      return rawUrl;
    }

    const parsedUrl = new URL(rawUrl, window.location.href);
    if (!parsedUrl.searchParams.has(tokenQueryKey)) {
      parsedUrl.searchParams.set(tokenQueryKey, token);
    }
    return parsedUrl.toString();
  }

  function createOverlayStyleFunction(kind, maxValue, overlayConfig) {
    const cache = state.overlayStyleCache[kind];
    const baseColor = overlayConfig.color;
    const outlineColor = overlayConfig.outlineColor;

    return (feature) => {
      const geometry = feature.getGeometry();
      if (!geometry) {
        return null;
      }
      const value = Number(feature.get("overlayValue")) || 0;
      const normalized = maxValue > 0 ? Math.max(0, Math.min(1, value / maxValue)) : 0.5;
      const bucket = Math.round(normalized * 10);
      const geometryType = geometry.getType();
      const key = geometryType + ":" + String(bucket);
      if (cache.has(key)) {
        return cache.get(key);
      }

      const pointRadius = overlayConfig.pointRadiusMin + (overlayConfig.pointRadiusMax - overlayConfig.pointRadiusMin) * (bucket / 10);
      const lineWidth = overlayConfig.lineWidthMin + (overlayConfig.lineWidthMax - overlayConfig.lineWidthMin) * (bucket / 10);
      const fillColor = toRgba(baseColor, 0.18 + (bucket / 10) * 0.22);

      let style;
      if (geometryType === "Point" || geometryType === "MultiPoint") {
        style = new ol.style.Style({
          image: new ol.style.Circle({
            radius: pointRadius,
            fill: new ol.style.Fill({ color: toRgba(baseColor, 0.75) }),
            stroke: new ol.style.Stroke({
              color: outlineColor,
              width: 1.8
            })
          })
        });
      } else if (geometryType === "LineString" || geometryType === "MultiLineString") {
        style = new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: toRgba(baseColor, 0.9),
            width: lineWidth,
            lineCap: "round",
            lineJoin: "round"
          })
        });
      } else {
        style = new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: toRgba(baseColor, 0.85),
            width: Math.max(2, lineWidth - 1)
          }),
          fill: new ol.style.Fill({
            color: fillColor
          })
        });
      }

      cache.set(key, style);
      return style;
    };
  }

  function getOverlayConfig(kind) {
    const defaultColor = kind === "vehicle" ? "#d92d20" : "#155eef";
    const defaultLabel = kind === "vehicle" ? "차량 통행" : "보행 유동";
    const entry = trafficOverlayConfig && typeof trafficOverlayConfig[kind] === "object"
      ? trafficOverlayConfig[kind]
      : {};
    const headers = {};
    if (trafficOverlayConfig.headers && typeof trafficOverlayConfig.headers === "object") {
      Object.assign(headers, trafficOverlayConfig.headers);
    }
    if (entry.headers && typeof entry.headers === "object") {
      Object.assign(headers, entry.headers);
    }

    const token = String(entry.token || trafficOverlayConfig.token || "").trim();
    const tokenHeaderKey = String(entry.tokenHeaderKey || trafficOverlayConfig.tokenHeaderKey || "").trim();
    if (token && tokenHeaderKey && !headers[tokenHeaderKey]) {
      headers[tokenHeaderKey] = token;
    }

    return {
      enabled: trafficOverlayConfig.enabled !== false && entry.enabled !== false,
      label: String(entry.label || defaultLabel),
      url: String(entry.url || "").trim(),
      method: String(entry.method || "GET").toUpperCase(),
      dataProjection: String(entry.dataProjection || "EPSG:4326"),
      rowPath: String(entry.rowPath || "").trim(),
      valueProperty: String(entry.valueProperty || "value"),
      longitudeProperty: String(entry.longitudeProperty || "lng"),
      latitudeProperty: String(entry.latitudeProperty || "lat"),
      token,
      tokenQueryKey: String(entry.tokenQueryKey || trafficOverlayConfig.tokenQueryKey || "").trim(),
      color: String(entry.color || defaultColor),
      outlineColor: String(entry.outlineColor || "#ffffff"),
      pointRadiusMin: readPositiveNumber(entry.pointRadiusMin, 4),
      pointRadiusMax: readPositiveNumber(entry.pointRadiusMax, 11),
      lineWidthMin: readPositiveNumber(entry.lineWidthMin, 2),
      lineWidthMax: readPositiveNumber(entry.lineWidthMax, 7),
      visibleByDefault: entry.visibleByDefault === true,
      headers
    };
  }

  function syncOverlayCheckbox(kind, checked) {
    if (kind === "vehicle" && elements.toggleVehicleFlow) {
      elements.toggleVehicleFlow.checked = checked;
      return;
    }
    if (kind === "pedestrian" && elements.togglePedestrianFlow) {
      elements.togglePedestrianFlow.checked = checked;
    }
  }

  function setOverlayStatus(message, isError) {
    if (!elements.overlayStatus) {
      return;
    }
    elements.overlayStatus.textContent = message || "";
    elements.overlayStatus.style.color = isError ? "var(--danger)" : "";
  }

  function resolveCoordinate(record, candidates) {
    for (const key of candidates) {
      if (!key) {
        continue;
      }
      const value = Number(record[key]);
      if (Number.isFinite(value)) {
        return value;
      }
    }
    return NaN;
  }

  function resolveOverlayValue(properties, valueProperty) {
    if (!properties || typeof properties !== "object") {
      return 0;
    }

    const candidates = [valueProperty, "value", "volume", "count", "traffic", "pedestrian"];
    for (const key of candidates) {
      if (!key) {
        continue;
      }
      const value = Number(properties[key]);
      if (Number.isFinite(value)) {
        return value;
      }
    }
    return 0;
  }

  function readPath(source, path) {
    if (!source || typeof source !== "object" || !path) {
      return undefined;
    }
    const segments = path.split(".");
    let cursor = source;
    for (const segment of segments) {
      if (!cursor || typeof cursor !== "object" || !(segment in cursor)) {
        return undefined;
      }
      cursor = cursor[segment];
    }
    return cursor;
  }

  function summarizeHtmlText(htmlText) {
    const raw = String(htmlText || "");
    if (!raw) {
      return "";
    }
    const text = raw
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) {
      return "";
    }
    if (text.length > 100) {
      return text.slice(0, 100) + "...";
    }
    return text;
  }

  function toRgba(color, alpha) {
    const fallback = "rgba(21,94,239," + String(alpha) + ")";
    if (typeof color !== "string") {
      return fallback;
    }
    const hex = color.trim();
    const match = hex.match(/^#([0-9a-fA-F]{6})$/);
    if (!match) {
      return color;
    }
    const raw = match[1];
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    return "rgba(" + String(r) + "," + String(g) + "," + String(b) + "," + String(alpha) + ")";
  }

  function subscribeHotspots() {
    if (!state.db) {
      return;
    }

    stopHotspotSubscription();
    const collectionName = getIssueCollectionName();

    state.unsubscribeHotspots = state.db.collection(collectionName).onSnapshot(
      (snapshot) => {
        void processHotspotSnapshot(snapshot);
      },
      (error) => {
        clearHotspotFeatures();
        state.issues = [];
        renderHotspotList([]);
        if (isFirestorePermissionError(error)) {
          console.warn("[hotspot-subscribe] insufficient permissions");
          return;
        }
        console.error("[hotspot-subscribe]", toMessage(error));
      }
    );
  }

  async function processHotspotSnapshot(snapshot) {
    await ensureIssueCatalogLoaded();
    const hotspots = [];
    snapshot.forEach((doc) => {
      const value = doc.data() || {};
      const lat = Number(value.lat);
      const lng = Number(value.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      const issueRefId = normalizeIssueCatalogId(value.issueRefId || value.issue_id);
      const catalogIssue = issueRefId && state.issueCatalogMap.has(issueRefId)
        ? state.issueCatalogMap.get(issueRefId)
        : null;
      const boundaryMeta = resolveBoundaryMetaForLonLat(lng, lat);
      const dongName = String(
        value.dongName ||
        value.dong_name ||
        (catalogIssue ? catalogIssue.dongName : "") ||
        boundaryMeta.dongName ||
        ""
      ).trim();
      const emdCode = normalizeEmdCode(
        value.emdCode ||
        value.emd_cd ||
        (catalogIssue ? catalogIssue.emdCode : "") ||
        boundaryMeta.emdCode
      );
      const storedDongKey = String(value.dongKey || "").trim();
      const computedDongKey = buildDongKey(emdCode, dongName);
      const categoryId = normalizeCategoryId(
        (catalogIssue ? catalogIssue.categoryId : "") ||
        value.categoryId ||
        value.category_id
      );
      const categoryLabel = resolveCategoryLabel(
        categoryId,
        (catalogIssue ? catalogIssue.categoryLabel : "") ||
        value.categoryLabel ||
        value.category_label
      );

      hotspots.push({
        id: doc.id,
        issueRefId,
        title: String(
          (catalogIssue ? catalogIssue.title : "") ||
          value.title ||
          "현안 제목 없음"
        ),
        memo: String(
          (catalogIssue ? catalogIssue.memo : "") ||
          value.memo ||
          ""
        ),
        level: Number(value.level) || 3,
        categoryId,
        categoryLabel,
        lat,
        lng,
        dongName,
        emdCode,
        dongSelectionMode: value.dongSelectionMode === "manual" ? "manual" : "auto",
        dongKey: storedDongKey || computedDongKey,
        updatedBy: value.updatedBy || "",
        updatedAt: value.updatedAt || null
      });
    });

    hotspots.sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
    state.issues = hotspots;
    renderHotspots(hotspots);
    renderHotspotList(applyIssueFilter(hotspots));
    updateDongFilterUi();
  }

  function isFirestorePermissionError(error) {
    if (!error || typeof error !== "object") {
      return false;
    }
    const code = String(error.code || "").toLowerCase();
    if (code === "permission-denied") {
      return true;
    }
    const message = toMessage(error).toLowerCase();
    return message.includes("missing or insufficient permissions");
  }

  function stopHotspotSubscription() {
    if (state.unsubscribeHotspots) {
      state.unsubscribeHotspots();
      state.unsubscribeHotspots = null;
    }
  }

  function getIssueCollectionName() {
    if (config.data && typeof config.data.issueCollection === "string" && config.data.issueCollection.trim()) {
      return config.data.issueCollection.trim();
    }
    if (config.data && typeof config.data.hotspotCollection === "string" && config.data.hotspotCollection.trim()) {
      return config.data.hotspotCollection.trim();
    }
    return "crowd_hotspots";
  }

  function applyIssueFilter(hotspots) {
    const list = Array.isArray(hotspots) ? hotspots : [];
    const activeDong = String(state.activeDongName || "").trim();
    if (!activeDong) {
      return list;
    }
    return list.filter((spot) => String(spot.dongName || "").trim() === activeDong);
  }

  function setActiveDongFilter(dongName) {
    const normalized = String(dongName || "").trim();
    if (state.activeDongName === normalized) {
      return;
    }
    state.activeDongName = normalized;
    updateDongFilterUi();
    updateBoundaryHighlightStyles();
    renderHotspotList(applyIssueFilter(state.issues));
  }

  function updateDongFilterUi() {
    if (!elements.activeDongFilter) {
      return;
    }
    const activeDong = String(state.activeDongName || "").trim();
    if (!activeDong) {
      elements.activeDongFilter.classList.add("hidden");
      elements.activeDongFilter.textContent = "";
      if (elements.clearDongFilterButton) {
        elements.clearDongFilterButton.classList.add("hidden");
      }
      return;
    }

    elements.activeDongFilter.classList.remove("hidden");
    elements.activeDongFilter.textContent = activeDong + "만 보기";
    if (elements.clearDongFilterButton) {
      elements.clearDongFilterButton.classList.remove("hidden");
    }
  }

  function resolveBoundaryMetaForLonLat(lng, lat) {
    if (!state.boundarySource || !Number.isFinite(lng) || !Number.isFinite(lat)) {
      return { dongName: "", emdCode: "" };
    }
    const projected = ol.proj.fromLonLat([lng, lat]);
    const features = state.boundarySource.getFeatures();
    for (const feature of features) {
      const geometry = feature.getGeometry();
      if (!geometry || typeof geometry.intersectsCoordinate !== "function") {
        continue;
      }
      if (geometry.intersectsCoordinate(projected)) {
        return {
          dongName: String(feature.get("dongName") || "").trim(),
          emdCode: normalizeEmdCode(feature.get("emd_cd"))
        };
      }
    }
    return { dongName: "", emdCode: "" };
  }

  async function centerMapToCurrentLocation(options) {
    const mapView = state.map ? state.map.getView() : null;
    if (!mapView) {
      return;
    }
    if (!navigator.geolocation || typeof navigator.geolocation.getCurrentPosition !== "function") {
      return;
    }

    const silent = options && options.silent === true;
    const minZoom = readPositiveNumber(options && options.minZoom, 15);
    try {
      const position = await getCurrentGeolocation();
      const lat = Number(position.coords && position.coords.latitude);
      const lng = Number(position.coords && position.coords.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }
      const currentZoom = mapView.getZoom();
      const targetZoom = Number.isFinite(currentZoom) && currentZoom > minZoom ? currentZoom : minZoom;
      mapView.animate({
        center: ol.proj.fromLonLat([lng, lat]),
        zoom: targetZoom,
        duration: 260
      });
      state.autoCenteredToCurrentLocation = true;
    } catch (error) {
      if (!silent) {
        window.alert("현재 위치 불러오기 실패: " + toMessage(error));
      }
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
      feature.set("dongName", spot.dongName || "");
      feature.set("emd_cd", spot.emdCode || "");
      feature.set("spot", spot);
      feature.setStyle(getHotspotStyle(spot.level));
      state.hotspotSource.addFeature(feature);
      state.hotspotData.set(spot.id, spot);
    });

    if (state.editingHotspotId && !state.hotspotData.has(state.editingHotspotId)) {
      exitHotspotEditMode(true);
    }
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
    if (!elements.spotList) {
      return;
    }

    if (hotspots.length === 0) {
      if (state.activeDongName) {
        const safeDongName = escapeHtml(state.activeDongName);
        elements.spotList.innerHTML = "<li class='empty'>" + safeDongName + "에 등록된 현안이 없습니다.</li>";
      } else {
        elements.spotList.innerHTML = "<li class='empty'>등록된 지역 현안이 없습니다.</li>";
      }
      return;
    }

    const showEditorActions = isEditMode();
    const items = hotspots.map((spot) => {
      const title = escapeHtml(spot.title);
      const memo = escapeHtml(spot.memo || "메모 없음");
      const dongName = escapeHtml(spot.dongName || "동 정보 없음");
      const categoryLabel = escapeHtml(resolveCategoryLabel(spot.categoryId, spot.categoryLabel));
      const color = hotspotColors[spot.level] || hotspotColors[3];
      const safeId = escapeHtml(spot.id);
      let actionsHtml = "";
      if (showEditorActions) {
        actionsHtml = (
          "<div class='spot-item-actions'>" +
            "<button type='button' class='btn-secondary btn-small spot-action-btn' data-action='edit-spot' data-spot-id='" + safeId + "'>수정</button>" +
            "<button type='button' class='btn-secondary btn-small spot-action-btn danger' data-action='delete-spot' data-spot-id='" + safeId + "'>삭제</button>" +
          "</div>"
        );
      }

      return (
        "<li class='spot-item' data-spot-id='" + safeId + "'>" +
          "<div class='spot-item-top'>" +
            "<strong>" + title + "</strong>" +
            "<span class='spot-badge' style='background:" + color + ";'>중요도 " + String(spot.level) + "</span>" +
          "</div>" +
          "<div class='spot-category'>" + categoryLabel + "</div>" +
          "<div class='spot-dong'>" + dongName + "</div>" +
          "<div class='spot-memo'>" + memo + "</div>" +
          actionsHtml +
        "</li>"
      );
    });

    elements.spotList.innerHTML = items.join("");
  }

  async function handleHotspotSubmit(event) {
    event.preventDefault();
    if (!isEditMode()) {
      return;
    }
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
    const categoryId = String(formData.get("categoryId") || "").trim();
    const issueRefId = normalizeIssueCatalogId(formData.get("issueRefId"));
    const issueCatalogConfig = getIssueCatalogConfig();
    const catalogIssue = issueRefId && state.issueCatalogMap.has(issueRefId)
      ? state.issueCatalogMap.get(issueRefId)
      : null;

    if (issueCatalogConfig.enabled && issueCatalogConfig.requireSelection && !catalogIssue) {
      window.alert("연동 현안을 먼저 선택하세요.");
      return;
    }

    const resolvedTitle = String(catalogIssue && catalogIssue.title ? catalogIssue.title : title).trim();
    const resolvedMemo = String(catalogIssue && catalogIssue.memo ? catalogIssue.memo : memo).trim();
    const resolvedCategoryId = normalizeCategoryId(
      categoryId ||
      (catalogIssue ? catalogIssue.categoryId : "")
    );
    const categoryLabel = resolveCategoryLabel(
      resolvedCategoryId,
      catalogIssue ? catalogIssue.categoryLabel : ""
    );

    if (!resolvedTitle) {
      window.alert("현안명을 입력하세요.");
      return;
    }

    const boundaryMeta = resolveBoundaryMetaForLonLat(lng, lat);
    const selectedDongKey = String(formData.get("dongKey") || "__auto__").trim();
    const selectedDongMeta = resolveDongMetaByKey(selectedDongKey);
    const usingManualDong = Boolean(selectedDongMeta);
    const finalDongName = usingManualDong
      ? String(selectedDongMeta.dongName || "").trim()
      : String(boundaryMeta.dongName || "").trim();
    const finalEmdCode = usingManualDong
      ? normalizeEmdCode(selectedDongMeta.emdCode)
      : normalizeEmdCode(boundaryMeta.emdCode);

    if (!finalDongName) {
      window.alert("동을 판별하지 못했습니다. '동 선택'에서 직접 지정하세요.");
      return;
    }

    const payload = {
      title: resolvedTitle,
      memo: resolvedMemo,
      level: level >= 1 && level <= 5 ? level : 3,
      categoryId: issueCategories[resolvedCategoryId] ? resolvedCategoryId : "",
      categoryLabel,
      issueRefId: catalogIssue ? catalogIssue.id : issueRefId,
      lat,
      lng,
      dongName: finalDongName,
      emdCode: finalEmdCode || "",
      dongSelectionMode: usingManualDong ? "manual" : "auto",
      dongKey: usingManualDong ? String(selectedDongMeta.key || "") : "",
      updatedBy: normalizeEmail(state.currentUser.email),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const collectionName = getIssueCollectionName();
    const editingSpotId = state.editingHotspotId;

    try {
      if (editingSpotId) {
        await state.db.collection(collectionName).doc(editingSpotId).update(payload);
      } else {
        await state.db.collection(collectionName).add(payload);
      }
      exitHotspotEditMode(true);
    } catch (error) {
      window.alert("현안 저장 실패: " + toMessage(error));
    }
  }

  function enterHotspotEditMode(spot) {
    if (!spot || !elements.form) {
      return;
    }

    state.editingHotspotId = spot.id || null;
    const titleInput = elements.form.querySelector("#spot-title");
    const levelInput = elements.form.querySelector("#spot-level");
    const categoryInput = elements.form.querySelector("#spot-category");
    const memoInput = elements.form.querySelector("#spot-memo");
    const issueRefSelect = elements.form.querySelector("#spot-issue-ref");

    if (titleInput) {
      titleInput.value = spot.title || "";
      titleInput.readOnly = false;
    }
    if (levelInput) {
      levelInput.value = String(Number(spot.level) || 3);
    }
    if (categoryInput) {
      const normalizedCategoryId = String(spot.categoryId || "").trim();
      categoryInput.value = issueCategories[normalizedCategoryId]
        ? normalizedCategoryId
        : "traffic_parking";
    }
    if (memoInput) {
      memoInput.value = spot.memo || "";
      memoInput.readOnly = false;
    }
    if (issueRefSelect) {
      syncIssueCatalogSelectOptions(spot.issueRefId || "");
    }

    if (elements.spotDongSelect) {
      let preferredDongKey = "__auto__";
      if (spot.dongSelectionMode === "manual") {
        const explicitKey = String(spot.dongKey || "").trim();
        if (explicitKey && state.availableDongMap.has(explicitKey)) {
          preferredDongKey = explicitKey;
        } else {
          const fallbackKey = buildDongKey(spot.emdCode, spot.dongName);
          if (fallbackKey && state.availableDongMap.has(fallbackKey)) {
            preferredDongKey = fallbackKey;
          }
        }
      }
      syncDongSelectOptions(preferredDongKey);
    }

    if (Number.isFinite(spot.lat) && Number.isFinite(spot.lng)) {
      setSelectedCoord(Number(spot.lat), Number(spot.lng));
    }

    if (elements.spotSubmitButton) {
      elements.spotSubmitButton.textContent = "수정 저장";
    }
    if (elements.cancelSpotEditButton) {
      elements.cancelSpotEditButton.classList.remove("hidden");
    }
    openSpotFormSheetForMobile();
  }

  function exitHotspotEditMode(resetForm) {
    state.editingHotspotId = null;
    if (elements.spotSubmitButton) {
      elements.spotSubmitButton.textContent = "현안 저장";
    }
    if (elements.cancelSpotEditButton) {
      elements.cancelSpotEditButton.classList.add("hidden");
    }
    if (resetForm) {
      if (elements.form) {
        elements.form.reset();
      }
      if (elements.spotIssueRefSelect) {
        syncIssueCatalogSelectOptions("");
      } else {
        applyIssueCatalogSelection("");
      }
      syncDongSelectOptions("__auto__");
      clearSelectedCoord();
      closeSpotFormSheetForMobile();
    }
  }

  async function deleteHotspot(spotId) {
    if (!isEditMode()) {
      return;
    }
    if (!state.currentUser) {
      window.alert("로그인 상태가 아닙니다.");
      return;
    }
    const targetId = String(spotId || "");
    if (!targetId) {
      return;
    }

    const spot = state.hotspotData.get(targetId);
    const title = spot && spot.title ? String(spot.title) : "이 현안";
    const confirmed = window.confirm("'" + title + "' 현안을 삭제할까요?");
    if (!confirmed) {
      return;
    }

    const collectionName = getIssueCollectionName();
    try {
      await state.db.collection(collectionName).doc(targetId).delete();
      if (state.editingHotspotId === targetId) {
        exitHotspotEditMode(true);
      }
    } catch (error) {
      window.alert("현안 삭제 실패: " + toMessage(error));
    }
  }

  function setSelectedCoord(lat, lng) {
    if (!elements.latInput || !elements.lngInput || !elements.selectedCoord) {
      return;
    }
    elements.latInput.value = lat.toFixed(6);
    elements.lngInput.value = lng.toFixed(6);
    elements.selectedCoord.textContent = "선택 좌표: " + lat.toFixed(6) + ", " + lng.toFixed(6);
    renderSelectedCoordOnMap(lat, lng);
    openSpotFormSheetForMobile();
  }

  function clearSelectedCoord() {
    if (elements.latInput) {
      elements.latInput.value = "";
    }
    if (elements.lngInput) {
      elements.lngInput.value = "";
    }
    if (elements.selectedCoord) {
      elements.selectedCoord.textContent = "좌표 미선택";
    }
    clearSelectedCoordOnMap();
  }

  function renderSelectedCoordOnMap(lat, lng) {
    if (!state.selectedCoordSource) {
      return;
    }

    const projected = ol.proj.fromLonLat([lng, lat]);
    if (!state.selectedCoordFeature) {
      state.selectedCoordFeature = new ol.Feature({
        geometry: new ol.geom.Point(projected)
      });
      state.selectedCoordFeature.set("kind", "selected_coord");
      state.selectedCoordFeature.setStyle(selectedCoordStyles);
      state.selectedCoordSource.addFeature(state.selectedCoordFeature);
      return;
    }

    const geometry = state.selectedCoordFeature.getGeometry();
    if (geometry instanceof ol.geom.Point) {
      geometry.setCoordinates(projected);
    } else {
      state.selectedCoordFeature.setGeometry(new ol.geom.Point(projected));
    }
  }

  function clearSelectedCoordOnMap() {
    if (state.selectedCoordSource) {
      state.selectedCoordSource.clear();
    }
    state.selectedCoordFeature = null;
  }

  function isMobileLayout() {
    if (mobileLayoutQuery) {
      return mobileLayoutQuery.matches;
    }
    return window.innerWidth <= 980;
  }

  function syncSpotFormLayoutState() {
    if (!isMobileLayout()) {
      if (elements.spotFormSheet) {
        elements.spotFormSheet.classList.remove("open");
      }
      if (elements.mobileFormBackdrop) {
        elements.mobileFormBackdrop.classList.add("hidden");
      }
      document.body.classList.remove("modal-open");
    }
  }

  function openSpotFormSheetForMobile() {
    if (!isMobileLayout()) {
      return;
    }
    if (elements.spotFormSheet) {
      elements.spotFormSheet.classList.add("open");
    }
    if (elements.mobileFormBackdrop) {
      elements.mobileFormBackdrop.classList.remove("hidden");
    }
    document.body.classList.add("modal-open");
  }

  function closeSpotFormSheetForMobile() {
    if (!isMobileLayout()) {
      return;
    }
    if (elements.spotFormSheet) {
      elements.spotFormSheet.classList.remove("open");
    }
    if (elements.mobileFormBackdrop) {
      elements.mobileFormBackdrop.classList.add("hidden");
    }
    document.body.classList.remove("modal-open");
  }

  function updateCurrentLocationButtonAvailability() {
    const disabled = !isEditMode() || !state.currentUser || state.resolvingCurrentLocation;
    if (elements.currentLocationButton) {
      elements.currentLocationButton.disabled = disabled;
    }
    if (elements.mobileCurrentLocationButton) {
      elements.mobileCurrentLocationButton.disabled = disabled;
    }
  }

  async function useCurrentLocationForSpot(triggerButton) {
    if (!isEditMode()) {
      return;
    }
    if (!state.currentUser) {
      window.alert("로그인 후 사용할 수 있습니다.");
      return;
    }
    if (!navigator.geolocation || typeof navigator.geolocation.getCurrentPosition !== "function") {
      window.alert("이 브라우저는 현재 위치 기능을 지원하지 않습니다.");
      return;
    }
    if (state.resolvingCurrentLocation) {
      return;
    }

    const actionButton = triggerButton instanceof HTMLElement
      ? triggerButton
      : elements.currentLocationButton;
    const defaultLabel = "내 위치 불러오기";
    const originalLabel = actionButton
      ? actionButton.textContent || defaultLabel
      : defaultLabel;

    openSpotFormSheetForMobile();
    state.resolvingCurrentLocation = true;
    if (actionButton) {
      actionButton.textContent = "위치 확인 중...";
    }
    updateCurrentLocationButtonAvailability();

    try {
      const position = await getCurrentGeolocation();
      const lat = Number(position.coords && position.coords.latitude);
      const lng = Number(position.coords && position.coords.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("좌표 형식이 올바르지 않습니다.");
      }

      setSelectedCoord(lat, lng);
      if (state.map) {
        const view = state.map.getView();
        const currentZoom = view.getZoom();
        const nextZoom = Number.isFinite(currentZoom) && currentZoom > 16 ? currentZoom : 16;
        view.animate({
          center: ol.proj.fromLonLat([lng, lat]),
          zoom: nextZoom,
          duration: 260
        });
      }
    } catch (error) {
      window.alert("현재 위치 불러오기 실패: " + toMessage(error));
    } finally {
      state.resolvingCurrentLocation = false;
      if (actionButton) {
        actionButton.textContent = originalLabel || defaultLabel;
      }
      updateCurrentLocationButtonAvailability();
    }
  }

  function getCurrentGeolocation() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(position);
        },
        (error) => {
          reject(new Error(toGeolocationErrorMessage(error)));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  function toGeolocationErrorMessage(error) {
    const code = Number(error && error.code);
    if (code === 1) {
      return "브라우저 위치 권한이 거부되었습니다. 주소창의 사이트 권한에서 위치 허용 후 다시 시도하세요.";
    }
    if (code === 2) {
      return "현재 위치를 확인할 수 없습니다. 네트워크/GPS 상태를 확인 후 다시 시도하세요.";
    }
    if (code === 3) {
      return "현재 위치 확인 시간이 초과되었습니다. 다시 시도하세요.";
    }
    return "현재 위치 정보를 가져오지 못했습니다.";
  }

  function openBoundaryPopup(coordinate, boundaryFeature) {
    const dongName = boundaryFeature ? boundaryFeature.get("dongName") : "";
    const safeName = escapeHtml(dongName || "동 경계");
    const emdCode = boundaryFeature ? normalizeEmdCode(boundaryFeature.get("emd_cd")) : "";
    const populationLabel = buildPopulationPopupText(emdCode);
    openPopup(
      coordinate,
      "<strong>" + safeName + "</strong><br>동 경계 영역" + populationLabel
    );
  }

  function buildPopulationPopupText(emdCode) {
    if (!isPopulationVisible() || !emdCode || getPopulationConfig().mode !== "emd") {
      return "";
    }
    const month = resolveSelectedPopulationMonth();
    const periodKey = buildPopulationPeriodKey(month, state.populationSelectedHour);
    const hourStats = state.populationStatsByPeriod.get(periodKey);
    if (!hourStats) {
      return "";
    }
    const value = hourStats.get(emdCode);
    if (!Number.isFinite(value)) {
      return "";
    }
    const monthLabel = formatMonthLabel(month);
    const hourLabel = formatPopulationHourLabel(state.populationSelectedHour);
    return "<div>" + monthLabel + " " + hourLabel + " 인구지표: " + value.toLocaleString("ko-KR") + "</div>";
  }

  function openTrafficOverlayPopup(coordinate, overlayType, overlayValue) {
    const safeType = escapeHtml(overlayType || "교통 오버레이");
    const numericValue = Number(overlayValue);
    const safeValue = Number.isFinite(numericValue) ? numericValue.toLocaleString("ko-KR") : "-";
    openPopup(
      coordinate,
      "<strong>" + safeType + "</strong><br>지표값: " + safeValue
    );
  }

  function openPopulationGridPopup(coordinate, month, hour, value) {
    const numericValue = Number(value);
    const safeValue = Number.isFinite(numericValue) ? numericValue.toLocaleString("ko-KR") : "-";
    const safeHour = formatPopulationHourLabel(
      Number.isFinite(Number(hour)) ? Number(hour) : state.populationSelectedHour
    );
    const safeMonth = formatMonthLabel(month || resolveSelectedPopulationMonth());

    openPopup(
      coordinate,
      "<strong>250m 격자 인구</strong><br>" +
      "<div>월: " + safeMonth + "</div>" +
      "<div>시간대: " + safeHour + "</div>" +
      "<div>인구지표: " + safeValue + "</div>"
    );
  }

  function openHotspotPopup(coordinate, spot) {
    if (!spot) {
      return;
    }
    const safeTitle = escapeHtml(spot.title);
    const safeMemo = escapeHtml(spot.memo || "-");
    const safeCategory = escapeHtml(resolveCategoryLabel(spot.categoryId, spot.categoryLabel));
    const safeDong = escapeHtml(spot.dongName || "-");
    const safeUser = escapeHtml(spot.updatedBy || "-");
    const safeTime = escapeHtml(formatTimestamp(spot.updatedAt));

    const editorInfo = isEditMode()
      ? "<div>수정자: " + safeUser + "</div><div>수정시각: " + safeTime + "</div>"
      : "";
    openPopup(
      coordinate,
      "<strong>" + safeTitle + "</strong>" +
      "<div>분류: " + safeCategory + "</div>" +
      "<div>소속 동: " + safeDong + "</div>" +
      "<div>중요도: " + String(spot.level) + "</div>" +
      "<div>내용: " + safeMemo + "</div>" +
      editorInfo
    );
  }

  function openPopup(coordinate, html) {
    if (!state.popupOverlay || !elements.mapPopup) {
      return;
    }
    elements.mapPopup.innerHTML = html;
    elements.mapPopup.classList.remove("hidden");
    state.popupOverlay.setPosition(coordinate);
  }

  function closePopup() {
    if (!state.popupOverlay || !elements.mapPopup) {
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
    if (!elements.statusText) {
      return;
    }
    elements.statusText.textContent = message;
    elements.statusText.style.color = isError ? "var(--danger)" : "";
  }

  function showFatal(error) {
    const message = "초기화 실패: " + toMessage(error);
    if (isEditMode()) {
      showLoginPanel(message, true);
      if (elements.loginButton) {
        elements.loginButton.disabled = true;
      }
    } else {
      window.alert(message);
    }
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

  function hasRenderableGeometry(features) {
    if (!Array.isArray(features) || features.length === 0) {
      return false;
    }

    return features.some((feature) => {
      const geometry = feature.getGeometry();
      if (!geometry) {
        return false;
      }
      const extent = geometry.getExtent();
      if (!extent || extent.length !== 4) {
        return false;
      }
      const allFinite = extent.every((value) => Number.isFinite(value));
      if (!allFinite) {
        return false;
      }
      return Math.abs(extent[2] - extent[0]) > 0 || Math.abs(extent[3] - extent[1]) > 0;
    });
  }

  function isClosedRing(ringLonLat) {
    if (ringLonLat.length < 2) {
      return false;
    }
    const first = ringLonLat[0];
    const last = ringLonLat[ringLonLat.length - 1];
    return first[0] === last[0] && first[1] === last[1];
  }

  function normalizeFeatureProjection(features) {
    if (!Array.isArray(features)) {
      return;
    }

    features.forEach((feature) => {
      const geometry = feature.getGeometry();
      if (!geometry) {
        return;
      }

      const extent = geometry.getExtent();
      if (!extent || extent.length !== 4) {
        return;
      }

      const looksLikeLonLat =
        extent[0] >= -180 && extent[2] <= 180 &&
        extent[1] >= -90 && extent[3] <= 90;

      if (looksLikeLonLat) {
        geometry.transform("EPSG:4326", "EPSG:3857");
      }
    });
  }
})();
