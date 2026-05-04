import APP_CONFIG from './config.js';

(function bootstrap() {
  const config = APP_CONFIG;
  const state = {
    mode: resolveMapMode(),
    auth: null,
    db: null,
    storage: null,
    map: null,
    popupOverlay: null,
    currentLocationSource: null,
    currentLocationLayer: null,
    currentLocationFeature: null,
    boundarySource: null,
    boundaryMaskSource: null,
    boundaryMaskLayer: null,
    boundaryDefaultStyle: null,
    boundarySelectedStyle: null,
    hotspotSource: null,
    hotspotLayer: null,
    hotspotAggregateSource: null,
    hotspotAggregateLayer: null,
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
    boundaryLoadingPromise: null,
    boundaryMaskFallbackApplied: false,
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
    hotspotAggregateStyleCache: new Map(),
    highlightedHotspotIds: new Set(),
    selectedHotspotId: "",
    availableDongs: [],
    availableDongMap: new Map(),
    issueCatalogLoaded: false,
    issueCatalogLoading: false,
    issueCatalogLoadingPromise: null,
    issueCatalogList: [],
    issueCatalogMap: new Map(),
    issues: [],
    commonIssueTagMap: new Map(),
    activeIssueFilter: {
      type: "",
      key: "",
      label: ""
    },
    spotPhotoDataUrls: [],
    spotPhotoProcessingInProgress: false,
    photoSlideshowSerial: 0,
    photoSlideshows: new Map(),
    activePhotoLightbox: {
      slideshowId: "",
      index: 0,
      slides: []
    },
    photoLightboxCloseTimer: null,
    overlayStyleCache: {
      vehicle: new Map(),
      pedestrian: new Map()
    },
    unsubscribeHotspots: null,
    editingHotspotId: null,
    resolvingCurrentLocation: false,
    hotspotSubmitInProgress: false,
    selectedCoordFeature: null,
    autoCenteredToCurrentLocation: false,
    suppressPopupCloseOnNextMoveStart: false,
    suppressPopupCloseGuardTimer: null,
    mapPopupCloseTimer: null,
    mapPopupDismissClearsDongFilter: false,
    mapPopupClearsHotspotSelection: false,
    mapPopupReturnFocusElement: null,
    spotListRefreshTimer: null,
    hotspotStyleAnimations: new Set(),
    hotspotStyleAnimationFrame: null,
    hotspotMarkerDisplayMode: "",
    hotspotMarkerTransitionFrame: null,
    mobileSheetActiveTab: "stats",
    mobileSheetExpanded: true,
    mobileSheetPointerStartY: null,
    mobileSheetPointerCurrentY: null,
    mobileSheetDragHandled: false,
    issueHelperCloseTimer: null,
    issueHelperOpenTimer: null,
    issueHelperAutoCollapseTimer: null
  };

  const DONG_AUTO_KEY = "__auto__";
  const DONG_COMMON_KEY = "__common__";
  const DONG_COMMON_NAME = "공통";
  const DONG_COMMON_LABEL = "공통 (전체 동)";
  const DONG_DISPLAY_ORDER = [
    DONG_COMMON_NAME,
    "백현동",
    "판교동",
    "운중동",
    "대장동"
  ];
  const DONG_STATS_MERGE_MAP = {
    운중동: "운중동",
    하산운동: "운중동",
    석운동: "운중동"
  };

  const issueCategories = {
    traffic_parking: "🚌 교통·주차",
    education_childcare: "🏫 교육·보육",
    environment_park: "🌳 환경·공원",
    safety_security: "🚨 안전·치안",
    housing_infra: "🏘️ 주거·인프라",
    economy_culture: "🛒 경제·문화"
  };
  const issueCategoryMeta = {
    traffic_parking: { icon: "🚌", color: "#2f6fb8" },
    education_childcare: { icon: "🏫", color: "#b8860b" },
    environment_park: { icon: "🌳", color: "#2b8a3e" },
    safety_security: { icon: "🚨", color: "#d9480f" },
    housing_infra: { icon: "🏘️", color: "#8d6e63" },
    economy_culture: { icon: "🛒", color: "#c2255c" }
  };
  const fallbackCategoryPalette = [
    "#2f6fb8",
    "#b8860b",
    "#2b8a3e",
    "#d9480f",
    "#8d6e63",
    "#c2255c"
  ];
  const defaultIssueCategoryColor = "#4263eb";
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
  const currentLocationStyles = [
    new ol.style.Style({
      zIndex: 39,
      image: new ol.style.Circle({
        radius: 12,
        fill: new ol.style.Fill({ color: "rgba(44,123,246,0.22)" }),
        stroke: new ol.style.Stroke({
          color: "rgba(44,123,246,0.48)",
          width: 1.5
        })
      })
    }),
    new ol.style.Style({
      zIndex: 40,
      image: new ol.style.Circle({
        radius: 6,
        fill: new ol.style.Fill({ color: "#2c7bf6" }),
        stroke: new ol.style.Stroke({
          color: "#ffffff",
          width: 2
        })
      })
    })
  ];
  const defaultTileAttributions = [
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  ];

  const boundaryStrokeColor = (config.data && config.data.boundaryStrokeColor)
    ? String(config.data.boundaryStrokeColor)
    : "#0b57d0";
  const boundaryStrokeWidth = readPositiveNumber(config.data && config.data.boundaryStrokeWidth, 3.2);
  const boundaryHaloColor = (config.data && config.data.boundaryHaloColor)
    ? String(config.data.boundaryHaloColor)
    : "rgba(255,255,255,0.95)";
  const boundaryHaloWidth = readPositiveNumber(config.data && config.data.boundaryHaloWidth, 6);
  const outsideBoundaryMaskColor = (config.data && config.data.outsideBoundaryMaskColor)
    ? String(config.data.outsideBoundaryMaskColor)
    : "rgba(8, 26, 56, 0.40)";
  const trafficOverlayConfig = config.trafficOverlays && typeof config.trafficOverlays === "object"
    ? config.trafficOverlays
    : {};
  const mobilityPopulationConfig = config.mobilityPopulation && typeof config.mobilityPopulation === "object"
    ? config.mobilityPopulation
    : {};
  const mobileLayoutQuery = window.matchMedia ? window.matchMedia("(max-width: 980px)") : null;
  const MAP_POPUP_CLOSE_ANIMATION_MS = 160;
  const PHOTO_LIGHTBOX_CLOSE_ANIMATION_MS = 180;
  const SPOT_LIST_REFRESH_ANIMATION_MS = 220;
  const HOTSPOT_STYLE_ANIMATION_MS = 220;
  const HOTSPOT_MARKER_MODE_TRANSITION_MS = 180;
  const MAP_VIEW_CENTER_ANIMATION_MS = 420;
  const MAP_VIEW_FIT_ANIMATION_MS = 520;
  const BOUNDARY_MASK_RENDER_BUFFER_PX = 4096;
  const MOBILE_SHEET_COLLAPSED_HEIGHT_PX = 42;
  const MOBILE_SHEET_MOTION_TRACK_MS = 340;
  const HOTSPOT_AGGREGATE_MAX_ZOOM = 13.05;
  const ISSUE_HELPER_CLOSE_ANIMATION_MS = 180;
  const ISSUE_HELPER_OPEN_ANIMATION_MS = 180;
  const ISSUE_HELPER_MOBILE_AUTO_COLLAPSE_MS = 6500;

  const elements = {
    loginPanel: document.getElementById("login-panel"),
    appShell: document.getElementById("app-shell"),
    statusText: document.getElementById("status-text"),
    loginButton: document.getElementById("login-btn"),
    logoutButton: document.getElementById("logout-btn"),
    sidePanel: document.querySelector(".side-panel"),
    mapWrap: document.querySelector(".map-wrap"),
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
    spotPhotoFileInput: document.getElementById("spot-photo-file"),
    spotPhotoDataInput: document.getElementById("spot-photo-data-urls"),
    spotPhotoPreviewWrap: document.getElementById("spot-photo-preview-wrap"),
    spotPhotoPreviewSlideshow: document.getElementById("spot-photo-preview-slideshow"),
    spotPhotoRemoveCurrentButton: document.getElementById("spot-photo-remove-current-btn"),
    spotPhotoRemoveButton: document.getElementById("spot-photo-remove-btn"),
    spotPhotoReprocessButton: document.getElementById("spot-photo-reprocess-btn"),
    spotPhotoReprocessStatus: document.getElementById("spot-photo-reprocess-status"),
    spotSaveStatus: document.getElementById("spot-save-status"),
    issueListPanel: document.getElementById("issue-list-panel"),
    issueListTitle: document.getElementById("issue-list-title"),
    spotList: document.getElementById("spot-list"),
    issueStatsSummary: document.getElementById("issue-stats-summary"),
    issueListClearFilterButton: document.getElementById("issue-list-clear-filter-btn"),
    totalIssueCount: document.getElementById("total-issue-count"),
    commonPledgeList: document.getElementById("common-pledge-list"),
    mobileSheetTabs: Array.from(document.querySelectorAll("[data-mobile-sheet-tab]")),
    mobileSheetSections: Array.from(document.querySelectorAll("[data-mobile-sheet-section]")),
    mobileSheetToggle: document.getElementById("mobile-sheet-toggle"),
    issueHelper: document.querySelector(".issue-helper"),
    issueHelperBubble: document.getElementById("issue-helper-bubble"),
    issueHelperCloseButton: document.getElementById("issue-helper-close-btn"),
    issueHelperToggleButton: document.getElementById("issue-helper-toggle"),
    toggleVehicleFlow: document.getElementById("toggle-vehicle-flow"),
    togglePedestrianFlow: document.getElementById("toggle-pedestrian-flow"),
    overlayStatus: document.getElementById("overlay-status"),
    togglePopulationFlow: document.getElementById("toggle-population-flow"),
    populationMonth: document.getElementById("population-month"),
    populationHour: document.getElementById("population-hour"),
    populationStatus: document.getElementById("population-status"),
    photoLightbox: null,
    photoLightboxDialog: null,
    photoLightboxImage: null,
    photoLightboxLoading: null,
    photoLightboxCloseButton: null,
    photoLightboxPrevButton: null,
    photoLightboxNextButton: null,
    photoLightboxCounter: null
  };

  const hotspotPhotoConfig = {
    maxPhotoCount: 8,
    maxWidth: 800,
    watermarkWidth: 200,
    watermarkSrc: "/assets/leesemi_watermark.png",
    processingVersion: 3,
    jpegQuality: 0.82,
    storagePathPrefix: "hotspot-photos"
  };
  let hotspotWatermarkImagePromise = null;
  const defaultBoundarySourcePaths = [
    "/data/daejangdong.wfs.xml",
    "/data/baekhyeondong.wfs.xml",
    "/data/seogundong.wfs.xml",
    "/data/unjungdong.wfs.xml",
    "/data/pangyodong.wfs.xml",
    "/data/hasanundong.wfs.xml"
  ];
  const optimizedBoundarySourcePath = "/data/dong-boundaries.optimized.geojson";
  // Simplified from the configured WFS boundaries so the outside-region mask can
  // be drawn before the heavier boundary XML files finish loading.
  const staticBoundaryMaskLonLatRings = [
    [[127.060662,37.380946],[127.061535,37.380227],[127.063391,37.379416],[127.064342,37.379442],[127.064477,37.379628],[127.065219,37.379833],[127.06613,37.379437],[127.066958,37.37957],[127.067682,37.379416],[127.067931,37.379245],[127.068446,37.379155],[127.069666,37.378756],[127.070726,37.378254],[127.071222,37.377824],[127.071897,37.377627],[127.072578,37.37731],[127.073348,37.37722],[127.074048,37.376069],[127.074303,37.375405],[127.075347,37.37519],[127.075471,37.375586],[127.076032,37.375375],[127.076649,37.374921],[127.077566,37.374593],[127.078048,37.374546],[127.078329,37.374374],[127.079104,37.374761],[127.079778,37.37379],[127.080795,37.373518],[127.080638,37.372704],[127.080375,37.372667],[127.07979,37.372242],[127.07986,37.371688],[127.079522,37.371328],[127.080135,37.370266],[127.08012,37.369907],[127.079821,37.369306],[127.079763,37.368618],[127.079835,37.368271],[127.079173,37.368072],[127.07804,37.367496],[127.077645,37.367109],[127.077519,37.366759],[127.077276,37.366577],[127.077611,37.366255],[127.077931,37.365394],[127.078126,37.365127],[127.078004,37.364962],[127.078009,37.36459],[127.076717,37.363311],[127.076261,37.362484],[127.076008,37.362354],[127.075943,37.362171],[127.075997,37.361947],[127.075835,37.361443],[127.075125,37.36087],[127.075166,37.360374],[127.07439,37.359704],[127.074177,37.35927],[127.074322,37.3588],[127.0721,37.357212],[127.071838,37.357396],[127.069964,37.358233],[127.067281,37.359049],[127.0666,37.359352],[127.064934,37.359771],[127.063186,37.360441],[127.062031,37.360393],[127.061058,37.360685],[127.060377,37.360771],[127.058134,37.360746],[127.057721,37.360702],[127.056851,37.360421],[127.055727,37.359954],[127.054289,37.360126],[127.053659,37.360484],[127.053093,37.360924],[127.052957,37.361352],[127.052896,37.362136],[127.053184,37.36264],[127.053181,37.363197],[127.052398,37.364017],[127.050891,37.364866],[127.050863,37.365237],[127.051131,37.365544],[127.051289,37.365879],[127.051141,37.3667],[127.050885,37.367184],[127.051157,37.367539],[127.051369,37.368213],[127.051281,37.368378],[127.051263,37.368739],[127.051349,37.369283],[127.051259,37.369417],[127.051388,37.36952],[127.051391,37.369932],[127.05108,37.371015],[127.051397,37.371428],[127.05132,37.373486],[127.051714,37.374682],[127.052281,37.375265],[127.052275,37.376156],[127.052647,37.376588],[127.052391,37.376965],[127.052434,37.377449],[127.052306,37.377928],[127.052501,37.378524],[127.053422,37.379003],[127.056213,37.38009],[127.056678,37.379857],[127.057965,37.379601],[127.058413,37.379963],[127.058615,37.379999],[127.058883,37.380653],[127.05951,37.380987],[127.059934,37.381059],[127.060662,37.380946]],
    [[127.100311,37.383733],[127.100325,37.382892],[127.100473,37.382859],[127.100529,37.382756],[127.100594,37.382235],[127.100426,37.382242],[127.100412,37.382108],[127.101916,37.382101],[127.103059,37.381643],[127.103063,37.384764],[127.102228,37.389509],[127.101541,37.391644],[127.101544,37.393773],[127.10115,37.394588],[127.101784,37.395052],[127.101711,37.395273],[127.101782,37.395325],[127.102307,37.395354],[127.103357,37.39481],[127.104337,37.394576],[127.104761,37.395069],[127.106125,37.394262],[127.106088,37.394414],[127.106562,37.394999],[127.106996,37.395721],[127.107383,37.395772],[127.107424,37.396046],[127.107115,37.396057],[127.107245,37.396537],[127.10739,37.396393],[127.109366,37.396365],[127.109365,37.396049],[127.110449,37.396073],[127.110636,37.395927],[127.111816,37.395922],[127.112028,37.396071],[127.112644,37.396073],[127.112724,37.396009],[127.112722,37.394927],[127.116636,37.394923],[127.116666,37.3952],[127.118353,37.395199],[127.118353,37.394922],[127.120329,37.39492],[127.120367,37.39311],[127.120082,37.391824],[127.119714,37.390797],[127.118489,37.389128],[127.116354,37.38695],[127.113057,37.383307],[127.109049,37.383746],[127.106899,37.381059],[127.106226,37.3813],[127.105538,37.382436],[127.104743,37.38279],[127.103508,37.382967],[127.103443,37.379953],[127.10364,37.377376],[127.103628,37.376912],[127.103515,37.376913],[127.103448,37.37622],[127.103457,37.374977],[127.103,37.375221],[127.102487,37.37536],[127.102291,37.375225],[127.102172,37.375261],[127.102142,37.376289],[127.102055,37.376605],[127.101859,37.376781],[127.101854,37.376723],[127.10172,37.377204],[127.101756,37.376771],[127.10154,37.376744],[127.101089,37.376946],[127.100791,37.376931],[127.099875,37.376432],[127.09944,37.376422],[127.09875,37.376258],[127.097953,37.376442],[127.096776,37.376179],[127.096466,37.376171],[127.096156,37.376335],[127.095709,37.376307],[127.094554,37.376023],[127.094377,37.37595],[127.094097,37.375508],[127.093679,37.375495],[127.093397,37.375773],[127.093219,37.376309],[127.092856,37.376409],[127.092599,37.376773],[127.092106,37.376956],[127.090601,37.376862],[127.089596,37.377458],[127.088738,37.377133],[127.088375,37.376865],[127.087746,37.37671],[127.087126,37.376732],[127.086755,37.376487],[127.085152,37.376305],[127.084936,37.376203],[127.084668,37.375727],[127.083812,37.375459],[127.083473,37.375126],[127.083392,37.374835],[127.082792,37.374529],[127.081884,37.37384],[127.081451,37.373657],[127.080795,37.373518],[127.079778,37.37379],[127.079409,37.374395],[127.078688,37.375245],[127.078458,37.376123],[127.078783,37.376421],[127.079116,37.378048],[127.079539,37.37818],[127.079838,37.378479],[127.079827,37.378865],[127.080235,37.379207],[127.080896,37.379992],[127.082253,37.381326],[127.083896,37.382472],[127.084081,37.382418],[127.084786,37.382646],[127.085509,37.382658],[127.086417,37.383193],[127.087102,37.383368],[127.088432,37.383251],[127.088692,37.383401],[127.088778,37.383569],[127.089257,37.383744],[127.089546,37.383726],[127.089315,37.383906],[127.090196,37.384878],[127.090457,37.384806],[127.090883,37.384916],[127.09116,37.384697],[127.091623,37.384671],[127.091866,37.384405],[127.092354,37.384536],[127.092909,37.384359],[127.093434,37.384649],[127.0945,37.384826],[127.094871,37.384671],[127.095258,37.384636],[127.096073,37.3849],[127.096545,37.384539],[127.096968,37.384408],[127.098188,37.384289],[127.098441,37.384067],[127.09862,37.383655],[127.098936,37.383617],[127.099438,37.383894],[127.100275,37.383714],[127.100311,37.383733]],
    [[127.043548,37.38896],[127.043704,37.388888],[127.044305,37.388917],[127.045472,37.388583],[127.045936,37.388129],[127.046862,37.387561],[127.04698,37.387267],[127.047819,37.386993],[127.048977,37.38691],[127.049317,37.386596],[127.050012,37.386247],[127.051599,37.386574],[127.051714,37.385673],[127.05215,37.385115],[127.052426,37.385009],[127.052594,37.384459],[127.053055,37.38404],[127.053826,37.384071],[127.054556,37.384433],[127.055144,37.383962],[127.055193,37.383151],[127.055522,37.382738],[127.056145,37.382502],[127.056163,37.382113],[127.056788,37.3813],[127.057094,37.381348],[127.057719,37.380897],[127.058883,37.380653],[127.058615,37.379999],[127.058413,37.379963],[127.057965,37.379601],[127.056678,37.379857],[127.056213,37.38009],[127.053422,37.379003],[127.052501,37.378524],[127.052306,37.377928],[127.052434,37.377449],[127.052391,37.376965],[127.052647,37.376588],[127.052275,37.376156],[127.052281,37.375265],[127.051714,37.374682],[127.05132,37.373486],[127.051397,37.371428],[127.05108,37.371015],[127.051391,37.369932],[127.051388,37.36952],[127.051259,37.369417],[127.051349,37.369283],[127.051263,37.368739],[127.051281,37.368378],[127.051369,37.368213],[127.051157,37.367539],[127.050885,37.367184],[127.051141,37.3667],[127.051289,37.365879],[127.051131,37.365544],[127.050863,37.365237],[127.050891,37.364866],[127.050303,37.364911],[127.050118,37.365176],[127.0495,37.365322],[127.049051,37.365714],[127.048574,37.365988],[127.04724,37.366566],[127.046838,37.367108],[127.046722,37.367458],[127.046353,37.367929],[127.046293,37.368186],[127.046082,37.368297],[127.045703,37.368297],[127.045094,37.368545],[127.044834,37.36882],[127.044084,37.368789],[127.043328,37.369024],[127.042339,37.369035],[127.041082,37.369365],[127.039501,37.369385],[127.038955,37.369578],[127.038331,37.369675],[127.03748,37.370192],[127.03726,37.370183],[127.036652,37.370425],[127.035984,37.37049],[127.035454,37.37067],[127.035152,37.370535],[127.034912,37.370535],[127.034664,37.370681],[127.034465,37.370984],[127.032474,37.371498],[127.03222,37.371532],[127.032096,37.371464],[127.031571,37.371748],[127.030938,37.371821],[127.030716,37.371916],[127.030577,37.372077],[127.030369,37.372122],[127.029652,37.372131],[127.02926,37.37232],[127.029086,37.372125],[127.028641,37.371942],[127.027913,37.371965],[127.027705,37.372848],[127.027905,37.374092],[127.027915,37.375614],[127.028005,37.376006],[127.028345,37.376657],[127.027994,37.377155],[127.028038,37.378272],[127.028175,37.378497],[127.028192,37.379173],[127.029276,37.379551],[127.031405,37.379362],[127.031943,37.3796],[127.031897,37.380028],[127.032174,37.380362],[127.032277,37.381424],[127.032058,37.382198],[127.033134,37.383118],[127.033113,37.383614],[127.033191,37.383903],[127.033812,37.384623],[127.033959,37.385871],[127.03494,37.385988],[127.035529,37.386605],[127.035383,37.386867],[127.035184,37.387929],[127.034672,37.388794],[127.035355,37.388812],[127.035761,37.38892],[127.0361,37.389271],[127.036846,37.389379],[127.037297,37.389577],[127.037975,37.390271],[127.038416,37.390505],[127.039378,37.390421],[127.039936,37.389829],[127.040891,37.389608],[127.041208,37.389426],[127.042237,37.389269],[127.04266,37.389096],[127.043339,37.389047],[127.043548,37.38896]],
    [[127.044998,37.40349],[127.045602,37.403436],[127.046437,37.403493],[127.047095,37.403663],[127.04776,37.403492],[127.05068,37.4035],[127.05088,37.403363],[127.051502,37.403219],[127.052834,37.402697],[127.053325,37.402604],[127.054086,37.402634],[127.054434,37.40241],[127.054948,37.402229],[127.056148,37.40243],[127.057561,37.401507],[127.058287,37.401255],[127.058627,37.401271],[127.059483,37.40097],[127.059569,37.400667],[127.060379,37.399961],[127.061173,37.399645],[127.061643,37.39932],[127.063194,37.398507],[127.063626,37.398658],[127.06456,37.398636],[127.064736,37.398613],[127.065703,37.39807],[127.066188,37.398339],[127.067871,37.397984],[127.068109,37.398143],[127.068383,37.398194],[127.069368,37.397978],[127.069753,37.397782],[127.07053,37.39786],[127.071737,37.397807],[127.072141,37.397982],[127.07281,37.398105],[127.07369,37.398031],[127.074207,37.397755],[127.074634,37.397739],[127.074764,37.397522],[127.075848,37.397277],[127.075869,37.396918],[127.076328,37.396416],[127.076362,37.395606],[127.077095,37.395817],[127.077624,37.396165],[127.078117,37.396263],[127.07832,37.39643],[127.078575,37.396447],[127.078516,37.396549],[127.078648,37.396637],[127.079049,37.396743],[127.079006,37.396912],[127.079201,37.397177],[127.079928,37.397582],[127.081254,37.398108],[127.082095,37.397507],[127.082576,37.397597],[127.082919,37.397518],[127.083507,37.397069],[127.084156,37.397115],[127.084304,37.39721],[127.085988,37.392929],[127.085579,37.39132],[127.085384,37.390875],[127.085234,37.390806],[127.085075,37.390468],[127.085165,37.390363],[127.085011,37.389835],[127.084229,37.387654],[127.083114,37.387673],[127.082067,37.387967],[127.081435,37.388008],[127.080479,37.387867],[127.080332,37.387683],[127.080077,37.387609],[127.08003,37.387818],[127.080085,37.388081],[127.079731,37.388069],[127.079581,37.388179],[127.079518,37.388564],[127.077214,37.389002],[127.076261,37.388628],[127.075555,37.38768],[127.075699,37.387654],[127.07568,37.387586],[127.075896,37.38739],[127.075511,37.387319],[127.075217,37.387169],[127.074933,37.38667],[127.074934,37.385513],[127.074765,37.384861],[127.074641,37.384765],[127.074528,37.384453],[127.074682,37.384345],[127.074709,37.384121],[127.07472,37.383568],[127.074565,37.383079],[127.074821,37.38259],[127.072854,37.382568],[127.071414,37.383503],[127.069252,37.383746],[127.068624,37.384089],[127.06862,37.385157],[127.067917,37.384967],[127.065272,37.38513],[127.064377,37.384826],[127.063296,37.38483],[127.062262,37.384357],[127.06153,37.383829],[127.061146,37.383262],[127.060729,37.382993],[127.060123,37.382411],[127.059894,37.381065],[127.05951,37.380987],[127.058883,37.380653],[127.057719,37.380897],[127.057094,37.381348],[127.056788,37.3813],[127.056163,37.382113],[127.056145,37.382502],[127.055522,37.382738],[127.055193,37.383151],[127.055144,37.383962],[127.054556,37.384433],[127.053826,37.384071],[127.053055,37.38404],[127.052819,37.384248],[127.052594,37.384459],[127.052426,37.385009],[127.05215,37.385115],[127.051714,37.385673],[127.051599,37.386574],[127.050012,37.386247],[127.049317,37.386596],[127.048977,37.38691],[127.047819,37.386993],[127.04698,37.387267],[127.046862,37.387561],[127.045936,37.388129],[127.045472,37.388583],[127.044305,37.388917],[127.043704,37.388888],[127.043339,37.389047],[127.04266,37.389096],[127.042237,37.389269],[127.041208,37.389426],[127.040891,37.389608],[127.039936,37.389829],[127.039378,37.390421],[127.038416,37.390505],[127.038439,37.390857],[127.038733,37.391938],[127.038496,37.392226],[127.038507,37.392686],[127.038214,37.393686],[127.038181,37.394208],[127.038452,37.394488],[127.038192,37.394767],[127.038102,37.395245],[127.038227,37.396101],[127.038069,37.397245],[127.038137,37.398209],[127.037483,37.399678],[127.0371,37.4013],[127.03745,37.401759],[127.038026,37.402065],[127.03893,37.402344],[127.03998,37.402326],[127.04102,37.402722],[127.041765,37.403181],[127.042003,37.403425],[127.042567,37.403695],[127.043245,37.403884],[127.044283,37.403784],[127.044998,37.40349]],
    [[127.094379,37.405186],[127.096929,37.40342],[127.099651,37.400793],[127.100821,37.395269],[127.101544,37.393773],[127.101541,37.391644],[127.102228,37.389509],[127.103063,37.384764],[127.103059,37.381643],[127.101916,37.382101],[127.100412,37.382108],[127.100426,37.382242],[127.100594,37.382235],[127.100529,37.382756],[127.100473,37.382859],[127.100325,37.382892],[127.100311,37.383733],[127.099438,37.383894],[127.098936,37.383617],[127.09862,37.383655],[127.098441,37.384067],[127.098188,37.384289],[127.096968,37.384408],[127.096545,37.384539],[127.096073,37.3849],[127.095258,37.384636],[127.094871,37.384671],[127.0945,37.384826],[127.093434,37.384649],[127.092909,37.384359],[127.092354,37.384536],[127.091866,37.384405],[127.091623,37.384671],[127.09116,37.384697],[127.090883,37.384916],[127.090457,37.384806],[127.090196,37.384878],[127.089315,37.383906],[127.089546,37.383726],[127.089257,37.383744],[127.088778,37.383569],[127.088692,37.383401],[127.088432,37.383251],[127.087102,37.383368],[127.087204,37.383403],[127.087073,37.383474],[127.086827,37.384115],[127.086852,37.384261],[127.085501,37.384188],[127.085459,37.384105],[127.085366,37.384185],[127.085414,37.384335],[127.085487,37.384304],[127.085455,37.384453],[127.085594,37.38452],[127.085605,37.384615],[127.085893,37.384717],[127.085954,37.385068],[127.085841,37.385251],[127.084911,37.385423],[127.085059,37.385813],[127.084715,37.38619],[127.08502,37.387102],[127.084329,37.387659],[127.084229,37.387654],[127.085011,37.389835],[127.085165,37.390363],[127.085075,37.390468],[127.085234,37.390806],[127.085384,37.390875],[127.085579,37.39132],[127.085988,37.392929],[127.084304,37.39721],[127.084602,37.397534],[127.084411,37.397944],[127.084728,37.398373],[127.08524,37.398537],[127.085399,37.398666],[127.085405,37.398858],[127.085911,37.399218],[127.086402,37.399943],[127.08721,37.400372],[127.08747,37.400263],[127.088647,37.400619],[127.08884,37.401256],[127.088692,37.402504],[127.089062,37.403087],[127.089821,37.403486],[127.09011,37.403726],[127.090537,37.403766],[127.091805,37.404288],[127.092436,37.404101],[127.092645,37.404302],[127.092693,37.40463],[127.092951,37.405004],[127.094191,37.405368],[127.094379,37.405186]],
    [[127.084229,37.387654],[127.084329,37.387659],[127.08502,37.387102],[127.084715,37.38619],[127.085059,37.385813],[127.084911,37.385423],[127.085841,37.385251],[127.085954,37.385068],[127.085893,37.384717],[127.085605,37.384615],[127.085594,37.38452],[127.085455,37.384453],[127.085487,37.384304],[127.085414,37.384335],[127.085366,37.384185],[127.085417,37.384104],[127.085501,37.384188],[127.086852,37.384261],[127.086827,37.384115],[127.087073,37.383474],[127.087204,37.383403],[127.086417,37.383193],[127.085509,37.382658],[127.084786,37.382646],[127.084081,37.382418],[127.083896,37.382472],[127.08373,37.382406],[127.082253,37.381326],[127.080896,37.379992],[127.080235,37.379207],[127.079827,37.378865],[127.079838,37.378479],[127.079539,37.37818],[127.079116,37.378048],[127.078783,37.376421],[127.078458,37.376123],[127.078688,37.375245],[127.079104,37.374761],[127.078329,37.374374],[127.078048,37.374546],[127.077566,37.374593],[127.076649,37.374921],[127.076032,37.375375],[127.075471,37.375586],[127.075347,37.37519],[127.074303,37.375405],[127.074048,37.376069],[127.073348,37.37722],[127.072578,37.37731],[127.071897,37.377627],[127.071222,37.377824],[127.070726,37.378254],[127.069666,37.378756],[127.068446,37.379155],[127.067931,37.379245],[127.067682,37.379416],[127.066958,37.37957],[127.06613,37.379437],[127.065219,37.379833],[127.064477,37.379628],[127.064342,37.379442],[127.063391,37.379416],[127.061535,37.380227],[127.060662,37.380946],[127.059894,37.381065],[127.060123,37.382411],[127.060729,37.382993],[127.061146,37.383262],[127.06153,37.383829],[127.062262,37.384357],[127.063296,37.38483],[127.064377,37.384826],[127.065272,37.38513],[127.067917,37.384967],[127.06862,37.385157],[127.068624,37.384089],[127.069252,37.383746],[127.071414,37.383503],[127.072854,37.382568],[127.074821,37.38259],[127.074565,37.383079],[127.07472,37.383568],[127.074709,37.384121],[127.074682,37.384345],[127.074528,37.384453],[127.074641,37.384765],[127.074765,37.384861],[127.074934,37.385513],[127.074933,37.38667],[127.075217,37.387169],[127.075511,37.387319],[127.075896,37.38739],[127.07568,37.387586],[127.075699,37.387654],[127.075555,37.38768],[127.076261,37.388628],[127.077214,37.389002],[127.079518,37.388564],[127.079581,37.388179],[127.079731,37.388069],[127.080085,37.388081],[127.08003,37.387818],[127.080077,37.387609],[127.080332,37.387683],[127.080479,37.387867],[127.081435,37.388008],[127.082067,37.387967],[127.083114,37.387673],[127.083961,37.38764],[127.084229,37.387654]]
  ];

  void init();

  async function init() {
    try {
      applyModeClassName();
      validateConfig(config);
      if (!window.ol) {
        throw new Error("OpenLayers 스크립트 로드에 실패했습니다.");
      }
      setupPhotoLightbox();
      bindUiEvents();
      syncIssueReferenceFieldVisibility();
      renderCommonPledges();
      initPopulationMonthOptions();
      initPopulationHourOptions();
      if (isEditMode()) {
        setStatus("인증 초기화 중...");
        initFirebase(config.firebase.config);
        state.auth.onAuthStateChanged((user) => {
          void onAuthStateChanged(user);
        });
      } else {
        setStatus("초기화 중...");
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

    if (elements.spotPhotoFileInput) {
      elements.spotPhotoFileInput.addEventListener("change", () => {
        void handleSpotPhotoFileSelection();
      });
    }

    if (elements.spotPhotoRemoveButton) {
      elements.spotPhotoRemoveButton.addEventListener("click", () => {
        clearSpotPhotoSelection();
      });
    }

    if (elements.spotPhotoRemoveCurrentButton) {
      elements.spotPhotoRemoveCurrentButton.addEventListener("click", () => {
        removeCurrentSpotPhotoSelection();
      });
    }

    if (elements.spotPhotoReprocessButton) {
      elements.spotPhotoReprocessButton.addEventListener("click", () => {
        void reprocessStoredHotspotPhotos();
      });
    }

    if (elements.spotPhotoPreviewWrap) {
      elements.spotPhotoPreviewWrap.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        if (tryHandlePhotoSlideControlClick(target)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        const previewPhoto = target.closest(".spot-photo-preview, .photo-slide-image");
        if (!(previewPhoto instanceof HTMLImageElement)) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        openPhotoLightboxFromImage(previewPhoto);
      });
    }

    if (elements.mapPopup) {
      elements.mapPopup.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        const actionButton = target.closest("[data-action]");
        if (actionButton) {
          const action = String(actionButton.getAttribute("data-action") || "");
          if (action === "close-popup") {
            event.preventDefault();
            event.stopPropagation();
            dismissMapPopup();
            return;
          }
          if (action === "edit-spot" || action === "delete-spot") {
            const spotId = String(actionButton.getAttribute("data-spot-id") || "").trim();
            if (!spotId) {
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            if (action === "edit-spot") {
              const editSpot = state.hotspotData.get(spotId);
              if (editSpot) {
                enterHotspotEditMode(editSpot);
                closePopup();
              }
              return;
            }
            void deleteHotspot(spotId);
            closePopup();
            return;
          }
        }
        if (tryHandlePhotoSlideControlClick(target)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        const popupPhoto = target.closest(".map-popup-photo, .photo-slide-image");
        if (!(popupPhoto instanceof HTMLImageElement)) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        openPhotoLightboxFromImage(popupPhoto);
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

        if (tryHandlePhotoSlideControlClick(target)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        const spotPhoto = target.closest(".spot-photo-thumb, .photo-slide-image");
        if (spotPhoto instanceof HTMLImageElement) {
          event.preventDefault();
          event.stopPropagation();
          openPhotoLightboxFromImage(spotPhoto);
          return;
        }

        const actionButton = target.closest("[data-action]");
        if (actionButton) {
          const action = String(actionButton.getAttribute("data-action") || "");
          if (action === "edit-spot" || action === "delete-spot") {
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
            void deleteHotspot(spotId);
            return;
          }
        }

        const item = target.closest("[data-spot-id]");
        activateSpotListItem(item);
      });

      elements.spotList.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        const item = target.closest("[data-spot-id]");
        if (!item) {
          return;
        }
        event.preventDefault();
        activateSpotListItem(item, {
          focusItem: true
        });
      });
    }

    if (elements.issueStatsSummary) {
      elements.issueStatsSummary.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        const actionButton = target.closest("[data-action='filter-issues']");
        if (actionButton instanceof HTMLElement) {
          const filterType = String(actionButton.getAttribute("data-filter-type") || "").trim();
          const filterKey = String(actionButton.getAttribute("data-filter-key") || "").trim();
          const filterLabel = String(actionButton.getAttribute("data-filter-label") || "").trim();
          if (filterType === "dong") {
            focusDongIssues(filterLabel || filterKey, {
              boundaryFeature: findBoundaryFeatureByDongName(filterLabel || filterKey)
            });
            animateSpotListRefresh();
            return;
          }
          if (filterType === "category") {
            focusCategoryIssues(filterKey, {
              label: filterLabel,
              animateList: true
            });
            return;
          }
          setActiveIssueFilter(filterType, filterKey, {
            label: filterLabel,
            animateList: true
          });
          return;
        }
        const clearButton = target.closest("[data-action='clear-issue-filter']");
        if (clearButton instanceof HTMLElement) {
          clearActiveIssueFilter({
            animateList: true,
            resetMapToRegion: true
          });
        }
      });
    }

    if (elements.issueListClearFilterButton) {
      elements.issueListClearFilterButton.addEventListener("click", () => {
        clearActiveIssueFilter({
          animateList: true,
          resetMapToRegion: true
        });
        setMobileSheetExpanded(true, {
          userInitiated: true
        });
      });
    }

    if (elements.commonPledgeList) {
      elements.commonPledgeList.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        const actionButton = target.closest("[data-action='focus-common-tag'][data-common-tag]");
        if (!actionButton) {
          return;
        }
        const commonTag = String(actionButton.getAttribute("data-common-tag") || "").trim();
        if (!commonTag) {
          return;
        }
        focusCommonIssueTag(commonTag);
      });
    }

    if (Array.isArray(elements.mobileSheetTabs) && elements.mobileSheetTabs.length > 0) {
      elements.mobileSheetTabs.forEach((tabButton) => {
        tabButton.addEventListener("click", () => {
          const tabName = String(tabButton.getAttribute("data-mobile-sheet-tab") || "").trim();
          setMobileSheetTab(tabName, {
            userInitiated: true
          });
        });
      });
    }

    if (elements.mobileSheetToggle) {
      elements.mobileSheetToggle.addEventListener("pointerdown", (event) => {
        state.mobileSheetPointerStartY = event.clientY;
        state.mobileSheetPointerCurrentY = event.clientY;
        state.mobileSheetDragHandled = false;
        elements.sidePanel && elements.sidePanel.classList.add("mobile-sheet-dragging");
        if (typeof elements.mobileSheetToggle.setPointerCapture === "function") {
          elements.mobileSheetToggle.setPointerCapture(event.pointerId);
        }
      });
      elements.mobileSheetToggle.addEventListener("pointermove", (event) => {
        if (!Number.isFinite(state.mobileSheetPointerStartY)) {
          return;
        }
        state.mobileSheetPointerCurrentY = event.clientY;
        const deltaY = event.clientY - state.mobileSheetPointerStartY;
        if (Math.abs(deltaY) >= 8) {
          state.mobileSheetDragHandled = true;
        }
      });
      elements.mobileSheetToggle.addEventListener("pointerup", (event) => {
        if (!Number.isFinite(state.mobileSheetPointerStartY)) {
          return;
        }
        const deltaY = event.clientY - state.mobileSheetPointerStartY;
        state.mobileSheetPointerStartY = null;
        state.mobileSheetPointerCurrentY = null;
        elements.sidePanel && elements.sidePanel.classList.remove("mobile-sheet-dragging");
        if (Math.abs(deltaY) < 28) {
          return;
        }
        event.preventDefault();
        state.mobileSheetDragHandled = true;
        setMobileSheetExpanded(deltaY < 0, {
          refocusActiveFilter: true,
          userInitiated: true
        });
      });
      elements.mobileSheetToggle.addEventListener("pointercancel", () => {
        state.mobileSheetPointerStartY = null;
        state.mobileSheetPointerCurrentY = null;
        state.mobileSheetDragHandled = false;
        elements.sidePanel && elements.sidePanel.classList.remove("mobile-sheet-dragging");
      });
      elements.mobileSheetToggle.addEventListener("click", (event) => {
        if (state.mobileSheetDragHandled) {
          event.preventDefault();
          state.mobileSheetDragHandled = false;
          return;
        }
        setMobileSheetExpanded(!state.mobileSheetExpanded, {
          refocusActiveFilter: true,
          userInitiated: true
        });
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

    if (elements.issueHelper && elements.issueHelperBubble && elements.issueHelperToggleButton) {
      let isIssueHelperExpanded = !elements.issueHelper.classList.contains("issue-helper-collapsed");
      const clearIssueHelperCloseTimer = () => {
        if (!state.issueHelperCloseTimer) {
          return;
        }
        window.clearTimeout(state.issueHelperCloseTimer);
        state.issueHelperCloseTimer = null;
      };
      const clearIssueHelperOpenTimer = () => {
        if (!state.issueHelperOpenTimer) {
          return;
        }
        window.clearTimeout(state.issueHelperOpenTimer);
        state.issueHelperOpenTimer = null;
      };
      const clearIssueHelperAutoCollapseTimer = () => {
        if (!state.issueHelperAutoCollapseTimer) {
          return;
        }
        window.clearTimeout(state.issueHelperAutoCollapseTimer);
        state.issueHelperAutoCollapseTimer = null;
      };
      let issueHelperDockFrame = 0;
      let issueHelperDockTrackingFrame = 0;
      let issueHelperDockTrackingUntil = 0;
      const syncIssueHelperMobileDock = () => {
        if (issueHelperDockFrame) {
          return;
        }
        issueHelperDockFrame = window.requestAnimationFrame(() => {
          issueHelperDockFrame = 0;
          if (!elements.issueHelper || !elements.mapWrap || document.body.dataset.mapMode !== "view" || !isMobileLayout()) {
            elements.issueHelper.style.removeProperty("--issue-helper-mobile-bottom");
            return;
          }

          const mapRect = elements.mapWrap.getBoundingClientRect();
          const characterRect = elements.issueHelperToggleButton.getBoundingClientRect();
          const sheetRect = elements.sidePanel && elements.sidePanel.getBoundingClientRect
            ? elements.sidePanel.getBoundingClientRect()
            : null;
          const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
          const inset = window.innerWidth <= 540 ? 8 : 10;
          const mapGap = window.innerWidth <= 540 ? 10 : 12;
          const minimumVisibleBottom = mapRect.top + characterRect.height + mapGap;
          const sheetTop = sheetRect && sheetRect.height > 0 && sheetRect.top > mapRect.top
            ? sheetRect.top
            : mapRect.bottom;
          const visibleMapBottom = Math.min(
            viewportHeight - inset,
            Math.max(minimumVisibleBottom, sheetTop)
          );
          const helperBottom = Math.max(inset, viewportHeight - visibleMapBottom + mapGap);
          elements.issueHelper.style.setProperty("--issue-helper-mobile-bottom", Math.round(helperBottom) + "px");
        });
      };
      const runIssueHelperDockTracking = () => {
        issueHelperDockTrackingFrame = 0;
        syncIssueHelperMobileDock();
        if (window.performance.now() >= issueHelperDockTrackingUntil) {
          return;
        }
        issueHelperDockTrackingFrame = window.requestAnimationFrame(runIssueHelperDockTracking);
      };
      const trackIssueHelperMobileDock = (duration) => {
        const numericDuration = Number(duration);
        const trackDuration = Number.isFinite(numericDuration) && numericDuration >= 0
          ? numericDuration
          : MOBILE_SHEET_MOTION_TRACK_MS;
        issueHelperDockTrackingUntil = Math.max(
          issueHelperDockTrackingUntil,
          window.performance.now() + trackDuration
        );
        if (!issueHelperDockTrackingFrame) {
          issueHelperDockTrackingFrame = window.requestAnimationFrame(runIssueHelperDockTracking);
        }
      };
      const scheduleIssueHelperMobileAutoCollapse = () => {
        clearIssueHelperAutoCollapseTimer();
        if (
          !isIssueHelperExpanded ||
          document.body.dataset.mapMode !== "view" ||
          !isMobileLayout() ||
          prefersReducedMotion()
        ) {
          return;
        }
        state.issueHelperAutoCollapseTimer = window.setTimeout(() => {
          state.issueHelperAutoCollapseTimer = null;
          if (!isIssueHelperExpanded || document.body.dataset.mapMode !== "view" || !isMobileLayout()) {
            return;
          }
          isIssueHelperExpanded = false;
          applyIssueHelperExpandedState();
        }, ISSUE_HELPER_MOBILE_AUTO_COLLAPSE_MS);
      };
      const finishIssueHelperClose = () => {
        elements.issueHelper.classList.add("issue-helper-collapsed");
        elements.issueHelper.classList.remove("issue-helper-closing", "issue-helper-opening");
        state.issueHelperCloseTimer = null;
        syncIssueHelperMobileDock();
      };
      const finishIssueHelperOpen = () => {
        elements.issueHelper.classList.remove("issue-helper-opening");
        state.issueHelperOpenTimer = null;
        syncIssueHelperMobileDock();
      };
      const applyIssueHelperExpandedState = (options) => {
        const immediate = Boolean(options && options.immediate);
        elements.issueHelperToggleButton.setAttribute("aria-expanded", isIssueHelperExpanded ? "true" : "false");
        elements.issueHelperBubble.setAttribute("aria-hidden", isIssueHelperExpanded ? "false" : "true");
        elements.issueHelperToggleButton.setAttribute(
          "aria-label",
          isIssueHelperExpanded ? "현안 안내 메시지 닫기" : "현안 안내 메시지 열기"
        );

        clearIssueHelperCloseTimer();
        clearIssueHelperOpenTimer();
        if (isIssueHelperExpanded) {
          elements.issueHelper.classList.remove("issue-helper-collapsed", "issue-helper-closing", "issue-helper-opening");
          if (immediate || prefersReducedMotion()) {
            return;
          }
          elements.issueHelper.classList.add("issue-helper-opening");
          state.issueHelperOpenTimer = window.setTimeout(finishIssueHelperOpen, ISSUE_HELPER_OPEN_ANIMATION_MS);
          return;
        }
        if (immediate || prefersReducedMotion()) {
          finishIssueHelperClose();
          return;
        }
        elements.issueHelper.classList.remove("issue-helper-collapsed", "issue-helper-opening");
        elements.issueHelper.classList.add("issue-helper-closing");
        state.issueHelperCloseTimer = window.setTimeout(finishIssueHelperClose, ISSUE_HELPER_CLOSE_ANIMATION_MS);
      };

      elements.issueHelperToggleButton.addEventListener("click", (event) => {
        clearIssueHelperAutoCollapseTimer();
        isIssueHelperExpanded = !isIssueHelperExpanded;
        applyIssueHelperExpandedState();
        if (event && event.detail > 0) {
          window.setTimeout(() => {
            elements.issueHelperToggleButton.blur();
          }, 0);
        }
      });

      if (elements.issueHelperCloseButton) {
        elements.issueHelperCloseButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!isIssueHelperExpanded) {
            return;
          }
          clearIssueHelperAutoCollapseTimer();
          isIssueHelperExpanded = false;
          applyIssueHelperExpandedState();
          elements.issueHelperToggleButton.focus({ preventScroll: true });
        });
      }

      window.addEventListener("map-popup-opened", () => {
        if (
          !isIssueHelperExpanded ||
          document.body.dataset.mapMode !== "view" ||
          !isMobileLayout()
        ) {
          return;
        }
        clearIssueHelperAutoCollapseTimer();
        isIssueHelperExpanded = false;
        applyIssueHelperExpandedState();
      });

      applyIssueHelperExpandedState({ immediate: true });
      syncIssueHelperMobileDock();
      scheduleIssueHelperMobileAutoCollapse();
      window.addEventListener("scroll", syncIssueHelperMobileDock, { passive: true });
      window.addEventListener("resize", syncIssueHelperMobileDock);
      window.addEventListener("mobile-sheet-motion", (event) => {
        const duration = event && event.detail ? event.detail.duration : MOBILE_SHEET_MOTION_TRACK_MS;
        trackIssueHelperMobileDock(duration);
      });
      if (elements.sidePanel) {
        const trackSheetTransition = (event) => {
          if (
            event &&
            event.target !== elements.sidePanel &&
            !String(event.propertyName || "").includes("height")
          ) {
            return;
          }
          trackIssueHelperMobileDock(MOBILE_SHEET_MOTION_TRACK_MS);
        };
        elements.sidePanel.addEventListener("transitionrun", trackSheetTransition);
        elements.sidePanel.addEventListener("transitionstart", trackSheetTransition);
        elements.sidePanel.addEventListener("transitionend", syncIssueHelperMobileDock);
      }
      if (mobileLayoutQuery && typeof mobileLayoutQuery.addEventListener === "function") {
        mobileLayoutQuery.addEventListener("change", syncIssueHelperMobileDock);
      }
    }

    if (elements.photoLightboxCloseButton) {
      elements.photoLightboxCloseButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closePhotoLightbox();
      });
    }

    if (elements.photoLightboxPrevButton) {
      elements.photoLightboxPrevButton.addEventListener("click", () => {
        movePhotoLightbox(-1);
      });
    }

    if (elements.photoLightboxNextButton) {
      elements.photoLightboxNextButton.addEventListener("click", () => {
        movePhotoLightbox(1);
      });
    }

    if (elements.photoLightboxImage) {
      const handlePhotoLightboxImageSettled = () => {
        setPhotoLightboxLoading(false);
      };
      elements.photoLightboxImage.addEventListener("load", handlePhotoLightboxImageSettled);
      elements.photoLightboxImage.addEventListener("error", handlePhotoLightboxImageSettled);
    }

    if (elements.photoLightbox) {
      elements.photoLightbox.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }
        if (target.closest("#photo-lightbox-close-btn")) {
          event.preventDefault();
          event.stopPropagation();
          closePhotoLightbox();
          return;
        }
        if (event.target === elements.photoLightbox) {
          closePhotoLightbox();
        }
      });
    }

    document.addEventListener("load", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) {
        return;
      }
      if (!target.classList.contains("photo-slide-image")) {
        return;
      }
      const container = resolvePhotoSlideshowContainer(target);
      setPhotoSlideshowLoadState(container, "ready");
    }, true);

    document.addEventListener("error", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) {
        return;
      }
      if (!target.classList.contains("photo-slide-image")) {
        return;
      }
      const container = resolvePhotoSlideshowContainer(target);
      setPhotoSlideshowLoadState(container, "error");
    }, true);

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (isPhotoLightboxVisible()) {
          closePhotoLightbox();
          return;
        }
        if (shouldIgnoreGlobalEscape(event)) {
          return;
        }
        if (dismissMapPopup()) {
          event.preventDefault();
          return;
        }
        if (clearActiveIssueFilter({
          animateList: true
        })) {
          event.preventDefault();
        }
        return;
      }
      if (!isPhotoLightboxVisible()) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        movePhotoLightbox(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        movePhotoLightbox(1);
      }
    });

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
    syncMobileSheetTabs();
    updateCurrentLocationButtonAvailability();
    syncDongSelectOptions();
    updateIssueFilterUi();
    updateTotalIssueCountLabel();
  }

  function setupPhotoLightbox() {
    if (!document.body) {
      return;
    }

    let lightbox = document.getElementById("photo-lightbox");
    if (!lightbox) {
      lightbox = document.createElement("div");
      lightbox.id = "photo-lightbox";
      lightbox.className = "photo-lightbox hidden";
      lightbox.setAttribute("aria-hidden", "true");
      lightbox.innerHTML =
        "<div class='photo-lightbox-dialog' role='dialog' aria-modal='true' aria-label='사진 확대 보기'>" +
          "<button id='photo-lightbox-close-btn' type='button' class='photo-lightbox-close' aria-label='팝업 닫기' title='닫기'>" +
            getPhotoControlIconMarkup("close") +
          "</button>" +
          "<button id='photo-lightbox-prev-btn' type='button' class='photo-lightbox-nav photo-lightbox-nav-prev' aria-label='이전 사진' title='이전'>" +
            getPhotoControlIconMarkup("prev") +
          "</button>" +
          "<img id='photo-lightbox-image' class='photo-lightbox-image' alt='확대 사진' loading='eager'>" +
          "<div id='photo-lightbox-loading' class='photo-lightbox-loading hidden' aria-live='polite' aria-hidden='true'>" +
            "<span class='photo-lightbox-spinner' aria-hidden='true'></span>" +
            "<span class='photo-lightbox-loading-text'>이미지를 불러오는 중...</span>" +
          "</div>" +
          "<button id='photo-lightbox-next-btn' type='button' class='photo-lightbox-nav photo-lightbox-nav-next' aria-label='다음 사진' title='다음'>" +
            getPhotoControlIconMarkup("next") +
          "</button>" +
          "<div id='photo-lightbox-counter' class='photo-lightbox-counter' aria-live='polite'></div>" +
        "</div>";
      document.body.appendChild(lightbox);
    }

    elements.photoLightbox = lightbox;
    elements.photoLightboxDialog = lightbox.querySelector(".photo-lightbox-dialog");
    elements.photoLightboxImage = lightbox.querySelector("#photo-lightbox-image");
    elements.photoLightboxLoading = lightbox.querySelector("#photo-lightbox-loading");
    elements.photoLightboxCloseButton = lightbox.querySelector("#photo-lightbox-close-btn");
    elements.photoLightboxPrevButton = lightbox.querySelector("#photo-lightbox-prev-btn");
    elements.photoLightboxNextButton = lightbox.querySelector("#photo-lightbox-next-btn");
    elements.photoLightboxCounter = lightbox.querySelector("#photo-lightbox-counter");
  }

  function createPhotoSlideshowId(prefix) {
    const base = String(prefix || "photo")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "photo";
    state.photoSlideshowSerial += 1;
    return base + "-" + String(state.photoSlideshowSerial);
  }

  function clearPhotoSlideshowsByPrefix(prefix) {
    const safePrefix = String(prefix || "").trim();
    if (!safePrefix || !(state.photoSlideshows instanceof Map)) {
      return;
    }
    Array.from(state.photoSlideshows.keys()).forEach((key) => {
      if (String(key).startsWith(safePrefix)) {
        state.photoSlideshows.delete(key);
      }
    });
  }

  function normalizePhotoSlides(slides) {
    if (!Array.isArray(slides)) {
      return [];
    }
    return slides
      .map((slide) => {
        const source = String(slide && slide.src ? slide.src : "").trim();
        if (!source) {
          return null;
        }
        const alt = String(slide && slide.alt ? slide.alt : "현안 사진").trim() || "현안 사진";
        return {
          src: source,
          alt
        };
      })
      .filter((slide) => Boolean(slide));
  }

  function wrapPhotoSlideIndex(index, slideCount) {
    const count = Number(slideCount);
    if (!Number.isFinite(count) || count <= 0) {
      return 0;
    }
    const numericIndex = Number(index);
    if (!Number.isFinite(numericIndex)) {
      return 0;
    }
    const normalized = ((Math.floor(numericIndex) % count) + count) % count;
    return normalized;
  }

  function resolvePhotoSlideshowContainer(node) {
    if (!(node instanceof Element)) {
      return null;
    }
    const container = node.closest(".photo-slideshow[data-photo-slideshow-id]");
    return container instanceof HTMLElement ? container : null;
  }

  function setPhotoSlideshowLoadState(container, nextState) {
    if (!(container instanceof HTMLElement)) {
      return;
    }
    const stateValue = nextState === "ready" || nextState === "error"
      ? nextState
      : "loading";
    container.setAttribute("data-photo-load-state", stateValue);
  }

  function syncPhotoSlideImageLoadState(imageElement) {
    if (!(imageElement instanceof HTMLImageElement)) {
      return;
    }
    const container = resolvePhotoSlideshowContainer(imageElement);
    if (!container) {
      return;
    }
    if (!imageElement.complete) {
      setPhotoSlideshowLoadState(container, "loading");
      return;
    }
    if (imageElement.naturalWidth > 0 && imageElement.naturalHeight > 0) {
      setPhotoSlideshowLoadState(container, "ready");
      return;
    }
    setPhotoSlideshowLoadState(container, "error");
  }

  function syncPhotoSlideshowsInScope(scopeElement) {
    if (!(scopeElement instanceof HTMLElement)) {
      return;
    }
    const images = [];
    if (scopeElement.matches(".photo-slide-image")) {
      images.push(scopeElement);
    }
    scopeElement.querySelectorAll(".photo-slide-image").forEach((node) => {
      if (node instanceof HTMLImageElement) {
        images.push(node);
      }
    });
    images.forEach((imageElement) => {
      syncPhotoSlideImageLoadState(imageElement);
    });
  }

  function schedulePhotoSlideshowsSync(scopeElement) {
    if (!(scopeElement instanceof HTMLElement)) {
      return;
    }
    const run = () => {
      syncPhotoSlideshowsInScope(scopeElement);
    };
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(run);
      return;
    }
    window.setTimeout(run, 0);
  }

  function registerPhotoSlideshow(slideshowId, slides, initialIndex) {
    const id = String(slideshowId || "").trim();
    if (!id) {
      return;
    }
    const normalizedSlides = normalizePhotoSlides(slides);
    if (normalizedSlides.length === 0) {
      state.photoSlideshows.delete(id);
      return;
    }
    state.photoSlideshows.set(id, {
      slides: normalizedSlides,
      index: wrapPhotoSlideIndex(initialIndex, normalizedSlides.length)
    });
  }

  function buildPhotoSlideshowHtml(options) {
    const slideshowId = String(options && options.slideshowId ? options.slideshowId : "").trim();
    if (!slideshowId) {
      return "";
    }
    const slides = normalizePhotoSlides(options ? options.slides : []);
    if (slides.length === 0) {
      state.photoSlideshows.delete(slideshowId);
      return "";
    }

    const initialIndex = wrapPhotoSlideIndex(options && options.initialIndex, slides.length);
    registerPhotoSlideshow(slideshowId, slides, initialIndex);

    const wrapperClassName = String(options && options.wrapperClassName ? options.wrapperClassName : "").trim();
    const imageClassName = String(options && options.imageClassName ? options.imageClassName : "").trim();
    const loading = String(options && options.loading ? options.loading : "lazy").trim() === "eager"
      ? "eager"
      : "lazy";
    const activeSlide = slides[initialIndex];
    const hasMultiple = slides.length > 1;
    const className = ["photo-slideshow", wrapperClassName].filter(Boolean).join(" ");
    const imageClass = ["photo-slide-image", imageClassName].filter(Boolean).join(" ");

    return (
      "<div class='" + escapeHtml(className) + "' data-photo-slideshow-id='" + escapeHtml(slideshowId) + "' data-photo-count='" + String(slides.length) + "' data-photo-load-state='loading'>" +
        (hasMultiple
          ? (
            "<button type='button' class='photo-slide-arrow photo-slide-arrow-prev' data-action='photo-slide-prev' data-slideshow-id='" + escapeHtml(slideshowId) + "' aria-label='이전 사진' title='이전 사진'>" +
              getPhotoControlIconMarkup("prev") +
            "</button>"
          )
          : "") +
        "<div class='photo-slide-media'>" +
          "<img class='" + escapeHtml(imageClass) + "' src='" + escapeHtml(activeSlide.src) + "' alt='" + escapeHtml(activeSlide.alt) + "' loading='" + loading + "' data-photo-slideshow-id='" + escapeHtml(slideshowId) + "' data-photo-index='" + String(initialIndex) + "'>" +
          "<div class='photo-slide-loading' aria-hidden='true'><span class='photo-slide-spinner'></span></div>" +
        "</div>" +
        (hasMultiple
          ? (
            "<button type='button' class='photo-slide-arrow photo-slide-arrow-next' data-action='photo-slide-next' data-slideshow-id='" + escapeHtml(slideshowId) + "' aria-label='다음 사진' title='다음 사진'>" +
              getPhotoControlIconMarkup("next") +
            "</button>" +
            "<div class='photo-slide-indicator' aria-live='polite'>" + String(initialIndex + 1) + " / " + String(slides.length) + "</div>"
          )
          : "") +
      "</div>"
    );
  }

  function getPhotoControlIconMarkup(type) {
    const iconType = String(type || "").trim().toLowerCase();
    if (iconType === "close") {
      return (
        "<svg class='photo-control-icon photo-control-icon-close' viewBox='0 0 24 24' aria-hidden='true' focusable='false'>" +
          "<path d='M6 6l12 12M18 6 6 18'></path>" +
        "</svg>"
      );
    }
    if (iconType === "prev") {
      return (
        "<svg class='photo-control-icon photo-control-icon-prev' viewBox='0 0 24 24' aria-hidden='true' focusable='false'>" +
          "<path d='M14.5 5.5L8 12l6.5 6.5'></path>" +
        "</svg>"
      );
    }
    if (iconType === "next") {
      return (
        "<svg class='photo-control-icon photo-control-icon-next' viewBox='0 0 24 24' aria-hidden='true' focusable='false'>" +
          "<path d='M9.5 5.5L16 12l-6.5 6.5'></path>" +
        "</svg>"
      );
    }
    return "";
  }

  function renderPhotoSlideshow(slideshowId) {
    const id = String(slideshowId || "").trim();
    if (!id || !state.photoSlideshows.has(id)) {
      return;
    }
    const slideshow = state.photoSlideshows.get(id);
    const slides = normalizePhotoSlides(slideshow && slideshow.slides);
    if (slides.length === 0) {
      state.photoSlideshows.delete(id);
      return;
    }
    const index = wrapPhotoSlideIndex(slideshow.index, slides.length);
    slideshow.slides = slides;
    slideshow.index = index;
    const activeSlide = slides[index];
    const selector = "[data-photo-slideshow-id='" + id + "']";
    document.querySelectorAll(selector).forEach((container) => {
      if (!(container instanceof HTMLElement)) {
        return;
      }
      container.setAttribute("data-photo-count", String(slides.length));
      setPhotoSlideshowLoadState(container, "loading");
      const image = container.querySelector(".photo-slide-image");
      if (image instanceof HTMLImageElement) {
        image.src = activeSlide.src;
        image.alt = activeSlide.alt;
        image.dataset.photoSlideshowId = id;
        image.dataset.photoIndex = String(index);
        syncPhotoSlideImageLoadState(image);
      }
      const indicator = container.querySelector(".photo-slide-indicator");
      if (indicator) {
        indicator.textContent = String(index + 1) + " / " + String(slides.length);
      }
    });
  }

  function movePhotoSlideshow(slideshowId, delta) {
    const id = String(slideshowId || "").trim();
    if (!id || !state.photoSlideshows.has(id)) {
      return false;
    }
    const slideshow = state.photoSlideshows.get(id);
    if (!slideshow || !Array.isArray(slideshow.slides) || slideshow.slides.length <= 1) {
      return false;
    }
    const step = Number(delta) < 0 ? -1 : 1;
    slideshow.index = wrapPhotoSlideIndex((Number(slideshow.index) || 0) + step, slideshow.slides.length);
    renderPhotoSlideshow(id);
    return true;
  }

  function tryHandlePhotoSlideControlClick(target) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    const slideButton = target.closest("[data-action='photo-slide-prev'], [data-action='photo-slide-next']");
    if (!(slideButton instanceof HTMLElement)) {
      return false;
    }
    const slideshowId = String(slideButton.getAttribute("data-slideshow-id") || "").trim();
    if (!slideshowId) {
      return false;
    }
    const action = String(slideButton.getAttribute("data-action") || "");
    return movePhotoSlideshow(slideshowId, action === "photo-slide-prev" ? -1 : 1);
  }

  function openPhotoLightboxFromImage(imageElement) {
    if (!(imageElement instanceof HTMLImageElement)) {
      return;
    }
    const slideshowId = String(imageElement.dataset.photoSlideshowId || "").trim();
    const slideIndex = Number(imageElement.dataset.photoIndex);
    if (slideshowId && state.photoSlideshows.has(slideshowId)) {
      openPhotoLightboxBySlideshow(slideshowId, slideIndex);
      return;
    }
    const source = String(imageElement.currentSrc || imageElement.getAttribute("src") || "").trim();
    if (!source) {
      return;
    }
    const altText = String(imageElement.getAttribute("alt") || "현안 사진 확대 보기");
    openPhotoLightbox(
      [
        {
          src: source,
          alt: altText
        }
      ],
      0,
      ""
    );
  }

  function openPhotoLightboxBySlideshow(slideshowId, initialIndex) {
    const id = String(slideshowId || "").trim();
    if (!id || !state.photoSlideshows.has(id)) {
      return;
    }
    const slideshow = state.photoSlideshows.get(id);
    openPhotoLightbox(slideshow ? slideshow.slides : [], initialIndex, id);
  }

  function openPhotoLightbox(rawSlides, initialIndex, slideshowId) {
    if (!elements.photoLightbox || !elements.photoLightboxImage) {
      return;
    }
    const slides = normalizePhotoSlides(rawSlides);
    if (slides.length === 0) {
      return;
    }
    state.activePhotoLightbox = {
      slideshowId: String(slideshowId || "").trim(),
      index: wrapPhotoSlideIndex(initialIndex, slides.length),
      slides
    };
    clearPhotoLightboxCloseTimer();
    renderActivePhotoLightboxSlide();
    elements.photoLightbox.classList.remove("hidden", "photo-lightbox-closing");
    elements.photoLightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("photo-lightbox-open");
  }

  function setPhotoLightboxLoading(isLoading) {
    const loading = Boolean(isLoading);
    if (elements.photoLightboxDialog) {
      elements.photoLightboxDialog.setAttribute("aria-busy", loading ? "true" : "false");
    }
    if (elements.photoLightboxLoading) {
      elements.photoLightboxLoading.classList.toggle("hidden", !loading);
      elements.photoLightboxLoading.setAttribute("aria-hidden", loading ? "false" : "true");
    }
    if (elements.photoLightboxImage) {
      elements.photoLightboxImage.classList.toggle("photo-lightbox-image-loading", loading);
    }
  }

  function renderActivePhotoLightboxSlide() {
    if (!elements.photoLightboxImage) {
      return;
    }
    const slides = normalizePhotoSlides(state.activePhotoLightbox && state.activePhotoLightbox.slides);
    if (slides.length === 0) {
      return;
    }
    const index = wrapPhotoSlideIndex(state.activePhotoLightbox.index, slides.length);
    const activeSlide = slides[index];
    state.activePhotoLightbox.index = index;
    state.activePhotoLightbox.slides = slides;
    setPhotoLightboxLoading(true);
    elements.photoLightboxImage.src = activeSlide.src;
    elements.photoLightboxImage.alt = activeSlide.alt;
    if (elements.photoLightboxImage.complete) {
      setPhotoLightboxLoading(false);
    }

    const hasMultiple = slides.length > 1;
    if (elements.photoLightboxPrevButton) {
      elements.photoLightboxPrevButton.classList.toggle("hidden", !hasMultiple);
      elements.photoLightboxPrevButton.disabled = !hasMultiple;
    }
    if (elements.photoLightboxNextButton) {
      elements.photoLightboxNextButton.classList.toggle("hidden", !hasMultiple);
      elements.photoLightboxNextButton.disabled = !hasMultiple;
    }
    if (elements.photoLightboxCounter) {
      elements.photoLightboxCounter.textContent = hasMultiple
        ? String(index + 1) + " / " + String(slides.length)
        : "";
      elements.photoLightboxCounter.classList.toggle("hidden", !hasMultiple);
    }
  }

  function movePhotoLightbox(delta) {
    if (!isPhotoLightboxVisible() || isPhotoLightboxClosing()) {
      return;
    }
    const slides = normalizePhotoSlides(state.activePhotoLightbox && state.activePhotoLightbox.slides);
    if (slides.length <= 1) {
      return;
    }
    const step = Number(delta) < 0 ? -1 : 1;
    state.activePhotoLightbox.index = wrapPhotoSlideIndex(
      state.activePhotoLightbox.index + step,
      slides.length
    );
    state.activePhotoLightbox.slides = slides;
    renderActivePhotoLightboxSlide();
    const linkedSlideshowId = String(state.activePhotoLightbox.slideshowId || "").trim();
    if (linkedSlideshowId && state.photoSlideshows.has(linkedSlideshowId)) {
      const linkedSlideshow = state.photoSlideshows.get(linkedSlideshowId);
      linkedSlideshow.index = state.activePhotoLightbox.index;
      renderPhotoSlideshow(linkedSlideshowId);
    }
  }

  function closePhotoLightbox(options) {
    if (!elements.photoLightbox) {
      return false;
    }
    if (elements.photoLightbox.classList.contains("hidden") || isPhotoLightboxClosing()) {
      return false;
    }

    const immediate = Boolean(options && options.immediate);
    elements.photoLightbox.classList.add("photo-lightbox-closing");
    elements.photoLightbox.setAttribute("aria-hidden", "true");

    const finishClose = () => {
      if (!elements.photoLightbox) {
        return;
      }
      elements.photoLightbox.classList.add("hidden");
      elements.photoLightbox.classList.remove("photo-lightbox-closing");
      if (elements.photoLightboxImage) {
        elements.photoLightboxImage.removeAttribute("src");
      }
      setPhotoLightboxLoading(false);
      state.activePhotoLightbox = {
        slideshowId: "",
        index: 0,
        slides: []
      };
      document.body.classList.remove("photo-lightbox-open");
      state.photoLightboxCloseTimer = null;
    };

    if (immediate || prefersReducedMotion()) {
      clearPhotoLightboxCloseTimer();
      finishClose();
      return true;
    }

    clearPhotoLightboxCloseTimer();
    state.photoLightboxCloseTimer = window.setTimeout(finishClose, PHOTO_LIGHTBOX_CLOSE_ANIMATION_MS);
    return true;
  }

  function isPhotoLightboxVisible() {
    return Boolean(elements.photoLightbox && !elements.photoLightbox.classList.contains("hidden"));
  }

  function isPhotoLightboxClosing() {
    return Boolean(elements.photoLightbox && elements.photoLightbox.classList.contains("photo-lightbox-closing"));
  }

  function clearPhotoLightboxCloseTimer() {
    if (!state.photoLightboxCloseTimer) {
      return;
    }
    window.clearTimeout(state.photoLightboxCloseTimer);
    state.photoLightboxCloseTimer = null;
  }

  function handleMapPopupClickThrough(mapBrowserEvent) {
    if (!elements.mapPopup || elements.mapPopup.classList.contains("hidden")) {
      return false;
    }
    const originalEvent = mapBrowserEvent && mapBrowserEvent.originalEvent
      ? mapBrowserEvent.originalEvent
      : null;
    if (!originalEvent) {
      return false;
    }
    const clientX = Number(originalEvent.clientX);
    const clientY = Number(originalEvent.clientY);
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return false;
    }
    const popupRect = elements.mapPopup.getBoundingClientRect();
    if (!isPointInsideRect(clientX, clientY, popupRect)) {
      return false;
    }

    const popupPhoto = elements.mapPopup.querySelector(".map-popup-photo, .photo-slide-image");
    if (popupPhoto instanceof HTMLImageElement) {
      const photoRect = popupPhoto.getBoundingClientRect();
      if (isPointInsideRect(clientX, clientY, photoRect)) {
        openPhotoLightboxFromImage(popupPhoto);
      }
    }
    return true;
  }

  function isPointInsideRect(clientX, clientY, rect) {
    if (!rect) {
      return false;
    }
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  function renderCommonPledges() {
    if (!elements.commonPledgeList) {
      return;
    }
    const pledgeConfig = config.data && Array.isArray(config.data.commonPledges) && config.data.commonPledges.length > 0
      ? config.data.commonPledges
      : defaultCommonPledges;
    const commonIssueTagMap = buildCommonIssueTagMap(state.issues);
    state.commonIssueTagMap = commonIssueTagMap;
    const commonIssueTagsByCategory = buildCommonIssueTagsByCategory(state.issues);
    const usedCategoryIds = new Set();

    const html = pledgeConfig.map((item) => {
      const title = escapeHtml(item && item.title ? item.title : "현안");
      const description = escapeHtml(item && item.description ? item.description : "");
      const categoryIds = inferCategoryIdsFromCommonTitle(item && item.title ? item.title : "");
      const tags = collectCommonIssueTagsForCategories(commonIssueTagsByCategory, categoryIds);
      categoryIds.forEach((categoryId) => {
        usedCategoryIds.add(categoryId);
      });
      const tagsHtml = renderCommonIssueTagsHtml(tags, commonIssueTagMap);
      return (
        "<li class='pledge-item'>" +
          "<strong>" + title + "</strong>" +
          "<p>" + description + "</p>" +
          tagsHtml +
        "</li>"
      );
    });

    const remainingCategories = Array.from(commonIssueTagsByCategory.keys())
      .filter((categoryId) => !usedCategoryIds.has(categoryId))
      .sort(compareKoreanText);

    remainingCategories.forEach((categoryId) => {
      const tags = collectCommonIssueTagsForCategories(commonIssueTagsByCategory, [categoryId]);
      if (tags.length === 0) {
        return;
      }
      const categoryTitle = categoryId === "__uncategorized__"
        ? "기타 공통 현안"
        : resolveCategoryLabel(categoryId, "") + " 현안";
      html.push(
        "<li class='pledge-item'>" +
          "<strong>" + escapeHtml(categoryTitle) + "</strong>" +
          "<p>공통으로 제보된 현안입니다.</p>" +
          renderCommonIssueTagsHtml(tags, commonIssueTagMap) +
        "</li>"
      );
    });
    elements.commonPledgeList.innerHTML = html.join("");
    syncCommonIssueTagButtonState();
  }

  function buildCommonIssueTagMap(issues) {
    const tagMap = new Map();
    const list = Array.isArray(issues) ? issues : [];
    list.forEach((spot) => {
      const bracketTag = resolveBracketedCommonTag(spot);
      if (!bracketTag) {
        return;
      }
      if (!tagMap.has(bracketTag)) {
        tagMap.set(bracketTag, []);
      }
      tagMap.get(bracketTag).push(spot);
    });
    tagMap.forEach((spots) => {
      spots.sort(compareHotspotByTitle);
    });
    return tagMap;
  }

  function buildCommonIssueTagsByCategory(issues) {
    const tagsByCategory = new Map();
    const list = Array.isArray(issues) ? issues : [];

    list.forEach((spot) => {
      const bracketTag = resolveBracketedCommonTag(spot);
      if (!bracketTag) {
        return;
      }
      const categoryId = normalizeCategoryId(spot && spot.categoryId)
        || normalizeCategoryId(spot && spot.categoryLabel)
        || "__uncategorized__";
      if (!tagsByCategory.has(categoryId)) {
        tagsByCategory.set(categoryId, new Set());
      }
      tagsByCategory.get(categoryId).add(bracketTag);
    });

    const normalizedMap = new Map();
    tagsByCategory.forEach((tagSet, categoryId) => {
      const tags = Array.from(tagSet).sort(compareKoreanText);
      normalizedMap.set(categoryId, tags);
    });
    return normalizedMap;
  }

  function inferCategoryIdsFromCommonTitle(titleText) {
    const raw = String(titleText || "").trim();
    if (!raw) {
      return [];
    }

    const categoryIds = new Set();
    const directId = normalizeCategoryId(raw) || normalizeCategoryId(raw.replace(/\s*(현안|공약)\s*$/g, ""));
    if (directId) {
      categoryIds.add(directId);
    }

    const keywordRules = [
      { categoryId: "traffic_parking", keywords: ["교통", "주차"] },
      { categoryId: "education_childcare", keywords: ["교육", "보육", "통학"] },
      { categoryId: "environment_park", keywords: ["환경", "공원", "산책"] },
      { categoryId: "safety_security", keywords: ["안전", "치안"] },
      { categoryId: "housing_infra", keywords: ["주거", "인프라"] },
      { categoryId: "economy_culture", keywords: ["경제", "문화", "상권"] }
    ];
    keywordRules.forEach((rule) => {
      const matched = rule.keywords.some((keyword) => raw.includes(keyword));
      if (matched) {
        categoryIds.add(rule.categoryId);
      }
    });
    return Array.from(categoryIds);
  }

  function collectCommonIssueTagsForCategories(tagsByCategory, categoryIds) {
    const collected = new Set();
    const ids = Array.isArray(categoryIds) ? categoryIds : [];
    ids.forEach((categoryId) => {
      if (!tagsByCategory.has(categoryId)) {
        return;
      }
      const tags = tagsByCategory.get(categoryId);
      tags.forEach((tag) => {
        collected.add(tag);
      });
    });
    return Array.from(collected).sort(compareKoreanText);
  }

  function renderCommonIssueTagsHtml(tags, commonIssueTagMap) {
    const list = Array.isArray(tags) ? tags : [];
    if (list.length === 0) {
      return "";
    }
    return (
      "<div class='pledge-common-tags'>" +
        list.map((tag) => {
          const normalizedTag = String(tag || "").trim();
          if (!normalizedTag) {
            return "";
          }
          const safeTag = escapeHtml(normalizedTag);
          const tagSpots = commonIssueTagMap && commonIssueTagMap.has(normalizedTag)
            ? commonIssueTagMap.get(normalizedTag)
            : [];
          const spotCount = tagSpots.length;
          const categoryMeta = tagSpots.length > 0
            ? resolveIssueCategoryMeta(tagSpots[0].categoryId, tagSpots[0].categoryLabel)
            : null;
          const tagStyle = categoryMeta
            ? " style='" + buildCategoryBadgeStyle(categoryMeta.color) + "'"
            : "";
          const countStyle = categoryMeta
            ? " style='" + buildCategoryCountBadgeStyle(categoryMeta.color) + "'"
            : "";
          const countLabel = spotCount > 0
            ? "<span class='pledge-common-tag-count'" + countStyle + ">" + String(spotCount) + "</span>"
            : "";
          const isActive = isActiveIssueFilter("common", normalizeIssueFilterKey(normalizedTag));
          const activeClassName = isActive ? " pledge-common-tag-active" : "";
          const activeAttrs = isActive ? " aria-current='true'" : "";
          return (
            "<button type='button' class='pledge-common-tag" + activeClassName + "' data-action='focus-common-tag' data-common-tag='" + safeTag + "' aria-pressed='" + String(isActive) + "'" + activeAttrs + tagStyle + ">" +
              "<span>[" + safeTag + "]</span>" +
              countLabel +
            "</button>"
          );
        }).join("") +
      "</div>"
    );
  }

  function syncCommonIssueTagButtonState() {
    if (!elements.commonPledgeList) {
      return;
    }
    const activeFilter = getActiveIssueFilter();
    elements.commonPledgeList.querySelectorAll("[data-action='focus-common-tag'][data-common-tag]").forEach((button) => {
      if (!(button instanceof HTMLElement)) {
        return;
      }
      const tag = String(button.getAttribute("data-common-tag") || "").trim();
      const isActive = Boolean(activeFilter.type === "common" && normalizeIssueFilterKey(tag) === activeFilter.key);
      button.classList.toggle("pledge-common-tag-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
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
      const dongName = resolveMergedDongName(row[catalogConfig.dongNameField]);
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
      const aDong = resolveMergedDongName(a.dongName);
      const bDong = resolveMergedDongName(b.dongName);
      if (aDong !== bDong) {
        return compareDongLabelForDisplay(aDong, bDong);
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
      const loginMessage = isEditMode()
        ? "로그인이 필요합니다. 시크릿 모드에서는 쿠키/사이트데이터 차단 시 인증 상태가 유지되지 않을 수 있습니다."
        : "로그인이 필요합니다.";
      showLoginPanel(loginMessage);
      updateOverlayControls();
      updatePopulationControls();
      updateCurrentLocationButtonAvailability();
      syncSpotFormLayoutState();
      return;
    }

    const staffAccess = await resolveStaffAccess(user);
    if (!staffAccess.ok) {
      await state.auth.signOut();
      showLoginPanel("권한 확인 실패: " + staffAccess.reason, true);
      return;
    }
    if (!staffAccess.isStaff) {
      const email = normalizeEmail(user.email);
      await state.auth.signOut();
      showLoginPanel(
        "권한이 없는 계정입니다: " + email +
        " (관리자에게 Firebase custom claim staff=true 부여 요청)",
        true
      );
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
    closePhotoLightbox();
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
    initOptionalAppCheck();
    state.auth = firebase.auth();
    state.db = firebase.firestore();
    state.storage = typeof firebase.storage === "function" ? firebase.storage() : null;
  }

  function initOptionalAppCheck() {
    const firebaseConfig = config && typeof config.firebase === "object" ? config.firebase : null;
    const rawAppCheck = firebaseConfig && typeof firebaseConfig.appCheck === "object"
      ? firebaseConfig.appCheck
      : null;
    if (!rawAppCheck || rawAppCheck.enabled !== true) {
      return;
    }
    if (!window.firebase || typeof firebase.appCheck !== "function") {
      console.warn("[app-check] firebase-app-check-compat.js가 로드되지 않아 App Check를 건너뜁니다.");
      return;
    }

    const siteKey = String(rawAppCheck.siteKey || "").trim();
    if (!siteKey) {
      console.warn("[app-check] siteKey가 비어 있어 App Check를 건너뜁니다.");
      return;
    }

    try {
      const autoRefresh = rawAppCheck.autoRefresh !== false;
      firebase.appCheck().activate(siteKey, autoRefresh);
    } catch (error) {
      console.warn("[app-check] activate 실패:", toMessage(error));
    }
  }

  async function signIn() {
    try {
      setStatus("로그인 처리 중...");
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await state.auth.signInWithPopup(provider);
    } catch (error) {
      setStatus("로그인 실패: " + toAuthErrorMessage(error), true);
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

    state.currentLocationSource = new ol.source.Vector();
    state.boundarySource = new ol.source.Vector();
    state.boundaryMaskSource = new ol.source.Vector();
    state.hotspotSource = new ol.source.Vector();
    state.hotspotAggregateSource = new ol.source.Vector();
    state.selectedCoordSource = new ol.source.Vector();
    state.populationSource = new ol.source.Vector();
    state.overlaySources.vehicle = new ol.source.Vector();
    state.overlaySources.pedestrian = new ol.source.Vector();

    state.selectedCoordLayer = new ol.layer.Vector({
      source: state.selectedCoordSource
    });
    state.currentLocationLayer = new ol.layer.Vector({
      source: state.currentLocationSource,
      style: currentLocationStyles
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
    state.boundaryMaskLayer = new ol.layer.Vector({
      source: state.boundaryMaskSource,
      renderBuffer: BOUNDARY_MASK_RENDER_BUFFER_PX,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      style: new ol.style.Style({
        fill: new ol.style.Fill({
          color: outsideBoundaryMaskColor
        }),
        zIndex: 8
      })
    });

    state.hotspotLayer = new ol.layer.Vector({
      source: state.hotspotSource
    });
    state.hotspotAggregateLayer = new ol.layer.Vector({
      source: state.hotspotAggregateSource,
      style: getHotspotAggregateStyle,
      visible: false
    });

    state.map = new ol.Map({
      target: elements.map,
      layers: [
        new ol.layer.Tile({
          source: createBaseTileSource()
        }),
        state.populationLayer,
        state.overlayLayers.vehicle,
        state.overlayLayers.pedestrian,
        state.boundaryMaskLayer,
        boundaryLayer,
        state.hotspotAggregateLayer,
        state.hotspotLayer,
        state.currentLocationLayer,
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
      stopEvent: true,
      className: "map-popup-overlay"
    });
    state.map.addOverlay(state.popupOverlay);
    syncHotspotMarkerDisplayMode();
    state.map.on("moveend", () => {
      syncHotspotMarkerDisplayMode();
    });

    if (applyStaticBoundaryMaskFallback()) {
      revealMapViewport();
    }

    state.map.on("singleclick", (event) => {
      if (handleMapPopupClickThrough(event)) {
        return;
      }

      const lonLat = ol.proj.toLonLat(event.coordinate);
      if (isEditMode() && state.currentUser) {
        setSelectedCoord(Number(lonLat[1]), Number(lonLat[0]));
      }

      const hitFeature = state.map.forEachFeatureAtPixel(
        event.pixel,
        (feature, layer) => {
          if (
            layer === state.selectedCoordLayer ||
            layer === state.boundaryMaskLayer ||
            layer === state.currentLocationLayer
          ) {
            return undefined;
          }
          return feature;
        }
      );
      if (!hitFeature) {
        closePopup();
        clearHighlightedHotspots();
        if (!isEditMode() && hasActiveIssueFilter()) {
          setActiveIssueFilter("");
        }
        return;
      }

      const kind = hitFeature.get("kind");
      if (kind === "hotspot_aggregate") {
        handleHotspotAggregateClick(hitFeature, event.coordinate);
        return;
      }

      if (kind === "hotspot") {
        openHotspotFeature(hitFeature, event.coordinate);
        return;
      }

      if (kind === "boundary") {
        clearHighlightedHotspots();
        if (!isEditMode()) {
          const dongName = String(hitFeature.get("dongName") || "").trim();
          focusDongIssues(dongName, {
            fallbackCoordinate: event.coordinate,
            boundaryFeature: hitFeature
          });
          return;
        }
        openBoundaryPopup(event.coordinate, hitFeature);
        return;
      }

      if (kind === "traffic_overlay") {
        clearHighlightedHotspots();
        openTrafficOverlayPopup(
          event.coordinate,
          hitFeature.get("overlayType"),
          hitFeature.get("overlayValue")
        );
        return;
      }

      if (kind === "population_grid") {
        clearHighlightedHotspots();
        openPopulationGridPopup(
          event.coordinate,
          hitFeature.get("populationMonth"),
          hitFeature.get("populationHour"),
          hitFeature.get("populationValue")
        );
      }
    });

    state.map.on("movestart", () => {
      if (state.suppressPopupCloseOnNextMoveStart) {
        clearPopupMoveSuppression();
        return;
      }
      closePopup();
    });

    void refreshCurrentLocationIndicator();
  }

  function createBaseTileSource() {
    const mapConfig = config.map && typeof config.map === "object"
      ? config.map
      : {};
    const tileUrl = String(mapConfig.tileUrl || "").trim();
    if (!tileUrl) {
      return new ol.source.OSM();
    }

    const sourceOptions = {
      url: tileUrl,
      attributions: resolveTileAttributions(mapConfig.tileAttributions)
    };
    const tileMaxZoom = readPositiveNumber(mapConfig.tileMaxZoom, null);
    if (tileMaxZoom !== null) {
      sourceOptions.maxZoom = tileMaxZoom;
    }
    return new ol.source.XYZ(sourceOptions);
  }

  function resolveTileAttributions(rawAttributions) {
    if (Array.isArray(rawAttributions)) {
      const attributions = rawAttributions
        .map((attribution) => String(attribution || "").trim())
        .filter(Boolean);
      if (attributions.length > 0) {
        return attributions;
      }
    }
    if (typeof rawAttributions === "string") {
      const attribution = rawAttributions.trim();
      if (attribution) {
        return attribution;
      }
    }
    return defaultTileAttributions;
  }

  function applyStaticBoundaryMaskFallback() {
    if (
      !state.map ||
      !state.boundaryMaskSource ||
      state.boundariesLoaded ||
      state.boundaryMaskFallbackApplied ||
      !canUseStaticBoundaryMaskFallback()
    ) {
      return false;
    }

    const holeRings = staticBoundaryMaskLonLatRings
      .map((ring) => {
        if (!Array.isArray(ring) || ring.length < 4) {
          return null;
        }
        return ring
          .filter((coordinate) => Array.isArray(coordinate) && coordinate.length >= 2)
          .map((coordinate) => {
            return ol.proj.fromLonLat([Number(coordinate[0]), Number(coordinate[1])]);
          });
      })
      .filter((ring) => Array.isArray(ring) && ring.length >= 4);

    const maskFeature = buildOutsideBoundaryMaskFeatureFromHoleRings(holeRings);
    if (!maskFeature) {
      return false;
    }

    state.boundaryMaskSource.clear();
    maskFeature.set("maskSource", "static");
    state.boundaryMaskSource.addFeature(maskFeature);
    state.boundaryMaskFallbackApplied = true;
    fitMapToStaticBoundaryMaskExtent(holeRings);
    return true;
  }

  function canUseStaticBoundaryMaskFallback() {
    const boundaryPaths = resolveBoundaryPaths().map(normalizeBoundarySourcePath);
    if (
      boundaryPaths.length === 1 &&
      boundaryPaths[0] === normalizeBoundarySourcePath(optimizedBoundarySourcePath)
    ) {
      return true;
    }
    if (boundaryPaths.length !== defaultBoundarySourcePaths.length) {
      return false;
    }
    return defaultBoundarySourcePaths.every((path, index) => {
      return normalizeBoundarySourcePath(path) === boundaryPaths[index];
    });
  }

  function normalizeBoundarySourcePath(path) {
    const value = String(path || "").trim();
    if (!value) {
      return "";
    }
    try {
      const url = new URL(value, window.location.origin);
      if (url.origin === window.location.origin) {
        return url.pathname;
      }
      return url.href;
    } catch (error) {
      if (value.startsWith("./")) {
        return "/" + value.slice(2);
      }
      if (value.startsWith("/")) {
        return value;
      }
      return "/" + value;
    }
  }

  function fitMapToStaticBoundaryMaskExtent(holeRings) {
    if (!state.map || !Array.isArray(holeRings) || holeRings.length === 0) {
      return false;
    }
    const extent = ol.extent.createEmpty();
    holeRings.forEach((ring) => {
      ring.forEach((coordinate) => {
        if (
          Array.isArray(coordinate) &&
          Number.isFinite(coordinate[0]) &&
          Number.isFinite(coordinate[1])
        ) {
          ol.extent.extendCoordinate(extent, coordinate);
        }
      });
    });
    if (!hasUsableExtentArea(extent)) {
      return false;
    }
    return fitMapViewToExtent(state.map.getView(), extent, {
      padding: getRegionMapFocusPadding(),
      duration: 0,
      maxZoom: 16
    }, 0);
  }

  function revealMapViewport() {
    const mapWrap = elements.mapWrap || (elements.map ? elements.map.parentElement : null);
    if (mapWrap && mapWrap.classList && mapWrap.classList.contains("map-wrap-initializing")) {
      mapWrap.classList.remove("map-wrap-initializing");
    }
    if (state.map) {
      window.setTimeout(() => state.map.updateSize(), 0);
    }
  }

  async function loadBoundaries() {
    if (state.boundariesLoaded || !state.boundarySource || !state.map) {
      return;
    }
    if (state.boundaryLoadingPromise) {
      await state.boundaryLoadingPromise;
      return;
    }

    state.boundaryLoadingPromise = loadBoundariesOnce();
    try {
      await state.boundaryLoadingPromise;
    } finally {
      state.boundaryLoadingPromise = null;
    }
  }

  async function loadBoundariesOnce() {
    const boundaryPaths = resolveBoundaryPaths();

    try {
      const allFeatures = [];
      const errors = [];
      const tasks = boundaryPaths.map(async (path) => {
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(path + ": 불러오기 실패 (" + response.status + ")");
        }
        const boundaryPayload = await response.text();
        const features = parseBoundaryFeatures(boundaryPayload);
        return {
          path,
          features
        };
      });
      const settled = await Promise.allSettled(tasks);
      settled.forEach((result) => {
        if (result.status === "fulfilled") {
          allFeatures.push(...result.value.features);
          return;
        }
        const message = toMessage(result.reason);
        errors.push(message);
        console.error("[boundary-load]", message);
      });

      if (allFeatures.length === 0) {
        const detail = errors.length > 0 ? " / " + errors.join(" | ") : "";
        throw new Error("표시 가능한 동 경계가 없습니다." + detail);
      }

      renderBoundaries(allFeatures);
      state.boundariesLoaded = true;
    } catch (error) {
      window.alert("동 경계 로딩 실패: " + toMessage(error));
    } finally {
      revealMapViewport();
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
        stripeColor: "rgba(11,87,208,0.30)",
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
    updateOutsideBoundaryMask(drawableFeatures);
    state.boundaryDefaultStyle = boundaryStyle;
    state.boundarySelectedStyle = boundarySelectedStyle;
    updateBoundaryHighlightStyles();
    const sortedDongs = Array.from(dongMap.values()).sort((a, b) => {
      return compareDongLabelForDisplay(a.dongName, b.dongName);
    });
    state.availableDongs = [
      {
        key: DONG_COMMON_KEY,
        dongName: DONG_COMMON_NAME,
        emdCode: ""
      },
      ...sortedDongs
    ];
    state.availableDongMap = new Map(state.availableDongs.map((item) => [item.key, item]));
    syncDongSelectOptions();
    refreshHotspotAggregateFeatures();
    if (getPopulationConfig().mode === "emd") {
      syncPopulationSourceWithBoundaries(drawableFeatures);
      if (isPopulationVisible()) {
        applyPopulationStylesForHour(state.populationSelectedHour);
      }
    }

    console.info("[boundary-load] rendered:", Array.from(new Set(loadedDongNames)));

    fitMapToBoundaryExtent({
      padding: getRegionMapFocusPadding(),
      duration: 0,
      maxZoom: 16
    });
  }

  function updateOutsideBoundaryMask(boundaryFeatures) {
    if (!state.boundaryMaskSource) {
      return;
    }
    if (shouldKeepStaticBoundaryMask()) {
      return;
    }
    state.boundaryMaskSource.clear();

    const maskFeature = buildOutsideBoundaryMaskFeature(boundaryFeatures);
    if (maskFeature) {
      maskFeature.set("maskSource", "boundary");
      state.boundaryMaskSource.addFeature(maskFeature);
    }
  }

  function shouldKeepStaticBoundaryMask() {
    return Boolean(
      state.boundaryMaskFallbackApplied &&
      canUseStaticBoundaryMaskFallback()
    );
  }

  function buildOutsideBoundaryMaskFeature(boundaryFeatures) {
    if (!Array.isArray(boundaryFeatures) || boundaryFeatures.length === 0) {
      return null;
    }

    const holeRings = [];
    boundaryFeatures.forEach((feature) => {
      if (!feature || typeof feature.getGeometry !== "function") {
        return;
      }
      appendMaskHolesFromGeometry(feature.getGeometry(), holeRings);
    });
    return buildOutsideBoundaryMaskFeatureFromHoleRings(holeRings);
  }

  function buildOutsideBoundaryMaskFeatureFromHoleRings(holeRings) {
    if (!Array.isArray(holeRings) || holeRings.length === 0) {
      return null;
    }

    const projection = state.map && state.map.getView
      ? state.map.getView().getProjection()
      : null;
    const projectionExtent = projection && typeof projection.getExtent === "function"
      ? projection.getExtent()
      : null;
    const worldExtent = (
      Array.isArray(projectionExtent) &&
      projectionExtent.length === 4 &&
      projectionExtent.every((value) => Number.isFinite(value))
    )
      ? projectionExtent
      : [-20037508.342789244, -20037508.342789244, 20037508.342789244, 20037508.342789244];

    const outerRing = [
      [worldExtent[0], worldExtent[1]],
      [worldExtent[0], worldExtent[3]],
      [worldExtent[2], worldExtent[3]],
      [worldExtent[2], worldExtent[1]],
      [worldExtent[0], worldExtent[1]]
    ];

    const geometry = new ol.geom.Polygon([outerRing, ...holeRings]);
    const feature = new ol.Feature({
      geometry
    });
    feature.set("kind", "boundary-mask");
    return feature;
  }

  function appendMaskHolesFromGeometry(geometry, targetRings) {
    if (!geometry || !Array.isArray(targetRings)) {
      return;
    }

    if (geometry instanceof ol.geom.MultiPolygon) {
      geometry.getPolygons().forEach((polygon) => {
        appendMaskHolesFromGeometry(polygon, targetRings);
      });
      return;
    }

    if (!(geometry instanceof ol.geom.Polygon)) {
      return;
    }

    const rings = geometry.getCoordinates();
    if (!Array.isArray(rings) || rings.length === 0) {
      return;
    }
    const outerRing = normalizeMaskRing(rings[0]);
    if (outerRing) {
      targetRings.push(outerRing);
    }
  }

  function normalizeMaskRing(ring) {
    if (!Array.isArray(ring) || ring.length < 3) {
      return null;
    }

    const normalized = ring
      .map((coordinate) => {
        if (!Array.isArray(coordinate) || coordinate.length < 2) {
          return null;
        }
        const x = Number(coordinate[0]);
        const y = Number(coordinate[1]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return null;
        }
        return [x, y];
      })
      .filter((coordinate) => Boolean(coordinate));

    if (normalized.length < 3) {
      return null;
    }

    const first = normalized[0];
    const last = normalized[normalized.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      normalized.push([first[0], first[1]]);
    }

    if (normalized.length < 4) {
      return null;
    }

    return normalized;
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
    const activeDong = getActiveDongFilterName();
    const defaultStyle = state.boundaryDefaultStyle;
    const selectedStyle = state.boundarySelectedStyle || defaultStyle;

    state.boundarySource.getFeatures().forEach((feature) => {
      const dongName = resolveMergedDongName(feature.get("dongName"));
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
    if (normalizedName === DONG_COMMON_NAME) {
      return DONG_COMMON_KEY;
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

  function resolveIssueCategoryMeta(categoryId, fallbackLabel) {
    const normalizedId = normalizeCategoryId(categoryId);
    const knownMeta = normalizedId && issueCategoryMeta[normalizedId]
      ? issueCategoryMeta[normalizedId]
      : null;
    const resolvedLabel = resolveCategoryLabel(normalizedId, fallbackLabel);
    const resolvedColor = knownMeta && knownMeta.color
      ? knownMeta.color
      : resolveFallbackCategoryColor(normalizedId || resolvedLabel);
    const resolvedIcon = knownMeta && knownMeta.icon
      ? knownMeta.icon
      : resolveCategoryIcon(resolvedLabel);
    return {
      id: normalizedId,
      label: resolvedLabel,
      color: resolvedColor || defaultIssueCategoryColor,
      icon: resolvedIcon || "📍"
    };
  }

  function resolveCategoryIcon(labelText) {
    const firstToken = String(labelText || "").trim().split(/\s+/)[0];
    if (firstToken && !/^[A-Za-z0-9가-힣]+$/.test(firstToken)) {
      return firstToken;
    }
    return "📍";
  }

  function resolveFallbackCategoryColor(seedText) {
    const raw = String(seedText || "").trim();
    if (!raw) {
      return defaultIssueCategoryColor;
    }
    let hash = 0;
    for (let index = 0; index < raw.length; index += 1) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(index);
      hash |= 0;
    }
    const paletteIndex = Math.abs(hash) % fallbackCategoryPalette.length;
    return fallbackCategoryPalette[paletteIndex];
  }

  function mixHexColorWithWhite(color, ratio) {
    const normalized = String(color || "").trim();
    const match = normalized.match(/^#([0-9a-fA-F]{6})$/);
    if (!match) {
      return normalized || defaultIssueCategoryColor;
    }
    const clampedRatio = Math.max(0, Math.min(1, Number(ratio)));
    const hex = match[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const mixedR = Math.round(r + (255 - r) * clampedRatio);
    const mixedG = Math.round(g + (255 - g) * clampedRatio);
    const mixedB = Math.round(b + (255 - b) * clampedRatio);
    return "#" + [mixedR, mixedG, mixedB].map((value) => {
      return value.toString(16).padStart(2, "0");
    }).join("");
  }

  function buildCategoryBadgeStyle(color) {
    const resolved = String(color || "").trim() || defaultIssueCategoryColor;
    const borderColor = toRgba(resolved, 0.45);
    const backgroundColor = toRgba(resolved, 0.16);
    const textColor = resolved;
    return (
      "background:" + backgroundColor + ";" +
      "color:" + textColor + ";" +
      "border:1px solid " + borderColor + ";"
    );
  }

  function buildCategoryCountBadgeStyle(color) {
    const resolved = String(color || "").trim() || defaultIssueCategoryColor;
    return (
      "background:" + resolved + ";" +
      "color:#ffffff;" +
      "border:1px solid " + toRgba(resolved, 0.16) + ";"
    );
  }

  function extractBracketedCommonTag(title) {
    const rawTitle = String(title || "");
    const match = rawTitle.match(/^\s*\[([^\]]+)\]/);
    if (!match) {
      return "";
    }
    return String(match[1] || "").trim();
  }

  function resolveBracketedCommonTag(spot) {
    if (!spot || typeof spot !== "object") {
      return "";
    }
    return extractBracketedCommonTag(spot.title);
  }

  function isExplicitCommonSpot(spot) {
    if (!spot || typeof spot !== "object") {
      return false;
    }
    const mode = String(spot.dongSelectionMode || "").trim().toLowerCase();
    if (mode === "common") {
      return true;
    }
    const key = String(spot.dongKey || "").trim();
    if (key === DONG_COMMON_KEY) {
      return true;
    }
    const computedKey = buildDongKey(spot.emdCode, spot.dongName);
    if (computedKey === DONG_COMMON_KEY) {
      return true;
    }
    return String(spot.dongName || "").trim() === DONG_COMMON_NAME;
  }

  function isCommonSpot(spot) {
    return isExplicitCommonSpot(spot) || Boolean(resolveBracketedCommonTag(spot));
  }

  function formatSpotDongLabel(spot) {
    if (isExplicitCommonSpot(spot)) {
      return DONG_COMMON_NAME;
    }
    const bracketTag = resolveBracketedCommonTag(spot);
    const dongName = resolveMergedDongName(spot && spot.dongName ? spot.dongName : "");
    if (bracketTag) {
      return DONG_COMMON_NAME;
    }
    return dongName || "동 정보 없음";
  }

  function resolveMergedDongName(dongName) {
    const normalizedName = String(dongName || "").trim();
    if (!normalizedName) {
      return "";
    }
    if (
      normalizedName === DONG_COMMON_NAME ||
      normalizedName === DONG_COMMON_LABEL ||
      normalizedName.startsWith(DONG_COMMON_LABEL + " ·")
    ) {
      return DONG_COMMON_NAME;
    }
    if (Object.prototype.hasOwnProperty.call(DONG_STATS_MERGE_MAP, normalizedName)) {
      return DONG_STATS_MERGE_MAP[normalizedName];
    }
    if (normalizedName.includes("백현동")) {
      return "백현동";
    }
    if (normalizedName.includes("판교동")) {
      return "판교동";
    }
    if (
      normalizedName.includes("운중동") ||
      normalizedName.includes("석운동") ||
      normalizedName.includes("하산운동")
    ) {
      return "운중동";
    }
    if (normalizedName.includes("대장동")) {
      return "대장동";
    }
    return normalizedName;
  }

  function resolveDongStatsLabel(spot) {
    if (isExplicitCommonSpot(spot)) {
      return DONG_COMMON_NAME;
    }
    const dongName = resolveMergedDongName(spot && spot.dongName ? spot.dongName : "");
    if (dongName) {
      return dongName;
    }
    if (isCommonSpot(spot)) {
      return DONG_COMMON_NAME;
    }
    return "동 정보 없음";
  }

  function resolveSpotDongForAggregation(spot) {
    if (!spot || typeof spot !== "object") {
      return "";
    }

    const directDong = resolveMergedDongName(spot.dongName);
    if (directDong && directDong !== DONG_COMMON_NAME) {
      return directDong;
    }

    const lat = Number(spot.lat);
    const lng = Number(spot.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const boundaryMeta = resolveBoundaryMetaForLonLat(lng, lat);
      const boundaryDong = resolveMergedDongName(boundaryMeta.dongName);
      if (boundaryDong && boundaryDong !== DONG_COMMON_NAME) {
        return boundaryDong;
      }
    }

    return "";
  }

  function normalizeDongLabelForOrdering(dongLabel) {
    const normalizedLabel = String(dongLabel || "").trim();
    if (!normalizedLabel) {
      return "";
    }
    if (normalizedLabel === DONG_COMMON_NAME || normalizedLabel === DONG_COMMON_LABEL) {
      return DONG_COMMON_NAME;
    }
    if (normalizedLabel.startsWith(DONG_COMMON_LABEL + " ·")) {
      return DONG_COMMON_NAME;
    }
    return resolveMergedDongName(normalizedLabel);
  }

  function compareDongLabelForDisplay(a, b) {
    const aRaw = String(a || "").trim();
    const bRaw = String(b || "").trim();
    const aNormalized = normalizeDongLabelForOrdering(aRaw);
    const bNormalized = normalizeDongLabelForOrdering(bRaw);
    const aIndex = DONG_DISPLAY_ORDER.indexOf(aNormalized);
    const bIndex = DONG_DISPLAY_ORDER.indexOf(bNormalized);
    const aRank = aIndex >= 0 ? aIndex : DONG_DISPLAY_ORDER.length;
    const bRank = bIndex >= 0 ? bIndex : DONG_DISPLAY_ORDER.length;
    if (aRank !== bRank) {
      return aRank - bRank;
    }
    const normalizedOrder = compareKoreanText(aNormalized, bNormalized);
    if (normalizedOrder !== 0) {
      return normalizedOrder;
    }
    const aIsCanonical = aRaw === aNormalized;
    const bIsCanonical = bRaw === bNormalized;
    if (aIsCanonical !== bIsCanonical) {
      return aIsCanonical ? -1 : 1;
    }
    return compareKoreanText(aRaw, bRaw);
  }

  function updateTotalIssueCountLabel() {
    if (!elements.totalIssueCount) {
      return;
    }
    const totalCount = Array.isArray(state.issues) ? state.issues.length : 0;
    elements.totalIssueCount.textContent = "총 현안 건수: " + String(totalCount) + "건";
  }

  function compareKoreanText(a, b) {
    return String(a || "").localeCompare(String(b || ""), "ko", { sensitivity: "base" });
  }

  function isBracketLeadingTitle(value) {
    return /^\s*\[/.test(String(value || ""));
  }

  function compareIssueTitleForList(aTitle, bTitle) {
    const aIsBracketLeading = isBracketLeadingTitle(aTitle);
    const bIsBracketLeading = isBracketLeadingTitle(bTitle);
    if (aIsBracketLeading !== bIsBracketLeading) {
      return aIsBracketLeading ? 1 : -1;
    }
    return compareKoreanText(aTitle, bTitle);
  }

  function compareHotspotByTitle(a, b) {
    const titleOrder = compareIssueTitleForList(a && a.title, b && b.title);
    if (titleOrder !== 0) {
      return titleOrder;
    }
    const dongOrder = compareDongLabelForDisplay(formatSpotDongLabel(a), formatSpotDongLabel(b));
    if (dongOrder !== 0) {
      return dongOrder;
    }
    return compareKoreanText(a && a.id, b && b.id);
  }

  function resolveDongMetaByKey(dongKey) {
    const key = String(dongKey || "").trim();
    if (!key || key === DONG_AUTO_KEY) {
      return null;
    }
    if (key === DONG_COMMON_KEY) {
      return {
        key: DONG_COMMON_KEY,
        dongName: DONG_COMMON_NAME,
        emdCode: ""
      };
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
    const selectedKey = String(preferredKey || select.value || DONG_AUTO_KEY).trim() || DONG_AUTO_KEY;
    const options = [
      "<option value='" + DONG_AUTO_KEY + "'>좌표 기준 자동 판별</option>",
      "<option value='" + DONG_COMMON_KEY + "'>" + escapeHtml(DONG_COMMON_LABEL) + "</option>"
    ];
    const addedDongLabels = new Set([DONG_COMMON_NAME]);

    state.availableDongs.forEach((dong) => {
      if (!dong || dong.key === DONG_COMMON_KEY) {
        return;
      }
      const mergedDongName = resolveMergedDongName(dong.dongName);
      if (!mergedDongName || addedDongLabels.has(mergedDongName)) {
        return;
      }
      addedDongLabels.add(mergedDongName);
      const label = escapeHtml(mergedDongName);
      options.push("<option value='" + escapeHtml(dong.key) + "'>" + label + "</option>");
    });

    select.innerHTML = options.join("");
    const hasPreferred = selectedKey === DONG_COMMON_KEY || state.availableDongMap.has(selectedKey);
    select.value = hasPreferred ? selectedKey : DONG_AUTO_KEY;
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
    stopHotspotSubscription();
    if (!isEditMode()) {
      void loadHotspotsFromPublicSnapshot();
      return;
    }

    if (!state.db) {
      return;
    }

    const collectionName = getIssueCollectionName();
    const collectionRef = state.db.collection(collectionName);

    state.unsubscribeHotspots = collectionRef.onSnapshot(
      (snapshot) => {
        void processHotspotSnapshot(snapshot);
      },
      (error) => {
        clearHotspotFeatures();
        state.issues = [];
        renderCommonPledges();
        renderVisibleIssueList();
        if (isFirestorePermissionError(error)) {
          console.warn("[hotspot-subscribe] insufficient permissions");
          return;
        }
        console.error("[hotspot-subscribe]", toMessage(error));
      }
    );
  }

  async function loadHotspotsOnce(collectionRef) {
    try {
      const snapshot = await collectionRef.get();
      await processHotspotSnapshot(snapshot);
    } catch (error) {
      clearHotspotFeatures();
      state.issues = [];
      renderCommonPledges();
      renderVisibleIssueList();
      if (isFirestorePermissionError(error)) {
        console.warn("[hotspot-load] insufficient permissions");
        return;
      }
      console.error("[hotspot-load]", toMessage(error));
    }
  }

  async function loadHotspotsFromPublicSnapshot() {
    try {
      const snapshotPath = getHotspotSnapshotPath();
      const response = await fetch(snapshotPath, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error("현안 스냅샷 로드 실패 (" + String(response.status) + ")");
      }
      const payload = await response.json();
      const records = normalizeHotspotSnapshotRecords(payload);
      await processHotspotRecords(records);
    } catch (error) {
      clearHotspotFeatures();
      state.issues = [];
      renderCommonPledges();
      renderVisibleIssueList();
      console.warn("[hotspot-snapshot-load]", toMessage(error));
    }
  }

  function normalizeHotspotSnapshotRecords(payload) {
    const rawItems = Array.isArray(payload)
      ? payload
      : Array.isArray(payload && payload.hotspots)
        ? payload.hotspots
        : [];
    return rawItems
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const id = String(item.id || item.docId || item.documentId || "").trim();
        return {
          id,
          data: item
        };
      });
  }

  async function processHotspotSnapshot(snapshot) {
    const records = [];
    snapshot.forEach((doc) => {
      records.push({
        id: doc.id,
        data: doc.data() || {}
      });
    });
    await processHotspotRecords(records);
  }

  async function processHotspotRecords(records) {
    await ensureIssueCatalogLoaded();
    const hotspots = [];
    const list = Array.isArray(records) ? records : [];
    list.forEach((record) => {
      const value = record && typeof record.data === "object" ? record.data : {};
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
      const dongName = resolveMergedDongName(
        value.dongName ||
        value.dong_name ||
        (catalogIssue ? catalogIssue.dongName : "") ||
        boundaryMeta.dongName ||
        ""
      );
      const emdCode = normalizeEmdCode(
        value.emdCode ||
        value.emd_cd ||
        (catalogIssue ? catalogIssue.emdCode : "") ||
        boundaryMeta.emdCode
      );
      const rawDongSelectionMode = String(value.dongSelectionMode || "").trim().toLowerCase();
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
      const groupLabel = String(
        value.groupLabel ||
        value.group_label ||
        value.issueGroupLabel ||
        value.issue_group_label ||
        ""
      ).trim();
      const photoDataUrls = normalizeHotspotPhotoDataUrls(
        value.photoUrls ||
        value.photo_urls ||
        value.photoDataUrls ||
        value.photo_data_urls ||
        []
      );
      const legacyPhotoUrl = normalizeHotspotPhotoDataUrl(
        value.photoUrl ||
        value.photo_url
      );
      const legacyPhotoDataUrl = normalizeHotspotPhotoDataUrl(
        value.photoDataUrl ||
        value.photo_data_url
      );
      if (photoDataUrls.length === 0 && legacyPhotoUrl) {
        photoDataUrls.push(legacyPhotoUrl);
      }
      if (photoDataUrls.length === 0 && legacyPhotoDataUrl) {
        photoDataUrls.push(legacyPhotoDataUrl);
      }
      const photoStoragePaths = alignHotspotPhotoStoragePaths(
        photoDataUrls,
        normalizeHotspotPhotoStoragePaths(
          value.photoStoragePaths ||
          value.photo_storage_paths ||
          []
        )
      );

      hotspots.push({
        id: String(record && record.id ? record.id : value.id || "").trim(),
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
        dongSelectionMode: rawDongSelectionMode === "common" || rawDongSelectionMode === "manual"
          ? rawDongSelectionMode
          : "auto",
        dongKey: storedDongKey || computedDongKey,
        groupLabel,
        photoUrls: photoDataUrls,
        photoUrl: photoDataUrls.length > 0 ? photoDataUrls[0] : "",
        photoDataUrls,
        photoDataUrl: photoDataUrls.length > 0 ? photoDataUrls[0] : "",
        photoStoragePaths,
        photoProcessingVersion: Number(
          value.photoProcessingVersion ||
          value.photo_processing_version ||
          0
        ) || 0,
        updatedBy: value.updatedBy || "",
        updatedAt: value.updatedAt || null
      });
    });

    hotspots.sort(compareHotspotByTitle);
    state.issues = hotspots;
    renderCommonPledges();
    renderHotspots(hotspots);
    renderVisibleIssueList();
    updateIssueFilterUi();
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

  function getHotspotSnapshotPath() {
    if (config.data && typeof config.data.hotspotSnapshotPath === "string" && config.data.hotspotSnapshotPath.trim()) {
      return config.data.hotspotSnapshotPath.trim();
    }
    return "/data/hotspots.public.json";
  }

  function applyIssueFilter(hotspots) {
    const list = Array.isArray(hotspots) ? hotspots : [];
    const activeFilter = getActiveIssueFilter();
    if (!activeFilter.type || !activeFilter.key) {
      return list;
    }
    if (activeFilter.type === "dong") {
      return list.filter((spot) => {
        return resolveSpotDongForAggregation(spot) === activeFilter.key;
      });
    }
    if (activeFilter.type === "category") {
      return list.filter((spot) => {
        return resolveIssueCategoryFilterKey(spot) === activeFilter.key;
      });
    }
    if (activeFilter.type === "common") {
      return list.filter((spot) => {
        return resolveCommonIssueFilterKey(spot) === activeFilter.key;
      });
    }
    return list;
  }

  function normalizeIssueFilterKey(value) {
    return String(value || "").trim().toLocaleLowerCase("ko-KR");
  }

  function resolveIssueCategoryFilterKey(spot) {
    const categoryMeta = resolveIssueCategoryMeta(spot && spot.categoryId, spot && spot.categoryLabel);
    const label = String(categoryMeta.label || "").trim() || "미분류";
    return normalizeIssueFilterKey(label);
  }

  function resolveCommonIssueFilterKey(spot) {
    return normalizeIssueFilterKey(resolveBracketedCommonTag(spot));
  }

  function buildIssueFilterState(type, key, label) {
    const filterType = String(type || "").trim();
    if (!filterType) {
      return {
        type: "",
        key: "",
        label: ""
      };
    }
    if (filterType === "dong") {
      const dongName = resolveMergedDongName(label || key);
      return {
        type: dongName ? "dong" : "",
        key: dongName,
        label: dongName
      };
    }
    if (filterType === "category") {
      const rawLabel = String(label || key || "").trim();
      const categoryKey = normalizeIssueFilterKey(key || rawLabel);
      return {
        type: categoryKey ? "category" : "",
        key: categoryKey,
        label: rawLabel || "미분류"
      };
    }
    if (filterType === "common") {
      const rawLabel = String(label || key || "").trim();
      const commonKey = normalizeIssueFilterKey(rawLabel);
      return {
        type: commonKey ? "common" : "",
        key: commonKey,
        label: rawLabel
      };
    }
    return {
      type: "",
      key: "",
      label: ""
    };
  }

  function getActiveIssueFilter() {
    return buildIssueFilterState(
      state.activeIssueFilter && state.activeIssueFilter.type,
      state.activeIssueFilter && state.activeIssueFilter.key,
      state.activeIssueFilter && state.activeIssueFilter.label
    );
  }

  function hasActiveIssueFilter() {
    const activeFilter = getActiveIssueFilter();
    return Boolean(activeFilter.type && activeFilter.key);
  }

  function getActiveDongFilterName() {
    const activeFilter = getActiveIssueFilter();
    return activeFilter.type === "dong" ? activeFilter.key : "";
  }

  function isActiveIssueFilter(type, key) {
    const activeFilter = getActiveIssueFilter();
    return Boolean(activeFilter.type === type && activeFilter.key === key);
  }

  function getActiveIssueFilterLabel() {
    const activeFilter = getActiveIssueFilter();
    if (!activeFilter.type || !activeFilter.label) {
      return "";
    }
    if (activeFilter.type === "common") {
      return "[" + activeFilter.label + "]";
    }
    return activeFilter.label;
  }

  function getIssueListTitleForActiveFilter() {
    const activeFilter = getActiveIssueFilter();
    if (!activeFilter.type || !activeFilter.label) {
      return "우리동네 현안";
    }
    if (activeFilter.type === "dong") {
      return activeFilter.label + " 현안";
    }
    if (activeFilter.type === "category") {
      return activeFilter.label + " 현안";
    }
    if (activeFilter.type === "common") {
      return "[" + activeFilter.label + "] 현안";
    }
    return "선택 현안";
  }

  function setActiveIssueFilter(type, key, options) {
    const nextFilter = buildIssueFilterState(type, key, options && options.label);
    const activeFilter = getActiveIssueFilter();
    if (
      activeFilter.type === nextFilter.type &&
      activeFilter.key === nextFilter.key &&
      activeFilter.label === nextFilter.label
    ) {
      return false;
    }
    if (nextFilter.type) {
      closePopup();
      clearHighlightedHotspots();
    }
    state.activeIssueFilter = nextFilter;
    updateIssueFilterUi();
    syncCommonIssueTagButtonState();
    updateBoundaryHighlightStyles();
    renderVisibleIssueList();
    setMobileSheetTab(nextFilter.type ? "issues" : "stats");
    if (isMobileLayout()) {
      setMobileSheetExpanded(true);
    }
    if (options && options.animateList) {
      animateSpotListRefresh();
    }
    return true;
  }

  function setActiveDongFilter(dongName, options) {
    return setActiveIssueFilter("dong", dongName, {
      label: dongName,
      animateList: Boolean(options && options.animateList)
    });
  }

  function clearActiveIssueFilter(options) {
    if (!hasActiveIssueFilter()) {
      return false;
    }
    closePopup();
    clearHighlightedHotspots();
    setActiveIssueFilter("", "", {
      animateList: Boolean(options && options.animateList)
    });
    if (options && options.resetMapToRegion) {
      resetMapToRegionView({
        duration: options.duration
      });
    }
    return true;
  }

  function setIssueListPanelVisibility(isVisible) {
    if (!elements.issueListPanel) {
      return;
    }
    elements.issueListPanel.classList.toggle("issue-list-panel-hidden", !isVisible);
    elements.issueListPanel.setAttribute("aria-hidden", String(!isVisible));
    if (!isVisible && elements.spotList) {
      if (state.spotListRefreshTimer) {
        window.clearTimeout(state.spotListRefreshTimer);
        state.spotListRefreshTimer = null;
      }
      elements.spotList.classList.remove("spot-list-refreshing");
    }
    syncMobileSheetTabs();
  }

  function isIssueListPanelVisible() {
    if (!elements.issueListPanel) {
      return Boolean(elements.spotList);
    }
    return !elements.issueListPanel.classList.contains("issue-list-panel-hidden");
  }

  function isValidMobileSheetTab(tabName) {
    return tabName === "stats" || tabName === "issues";
  }

  function setMobileSheetTab(tabName, options) {
    if (!Array.isArray(elements.mobileSheetTabs) || elements.mobileSheetTabs.length === 0) {
      return false;
    }
    const requestedTab = isValidMobileSheetTab(tabName) ? tabName : "stats";
    const allowUnavailable = Boolean(options && options.allowUnavailable);
    const nextTab = requestedTab === "issues" && !isIssueListPanelVisible() && !allowUnavailable
      ? "stats"
      : requestedTab;
    state.mobileSheetActiveTab = nextTab;
    syncMobileSheetTabs();
    if (options && options.userInitiated) {
      setMobileSheetExpanded(true, {
        userInitiated: true
      });
    }
    return nextTab === requestedTab;
  }

  function setMobileSheetExpanded(isExpanded, options) {
    if (!elements.sidePanel) {
      return false;
    }
    const nextExpanded = Boolean(isExpanded);
    const didChange = state.mobileSheetExpanded !== nextExpanded;
    state.mobileSheetExpanded = nextExpanded;
    elements.sidePanel.classList.toggle("mobile-sheet-collapsed", !nextExpanded);
    if (document.body) {
      document.body.classList.toggle("mobile-sheet-is-collapsed", !nextExpanded);
    }
    if (elements.mobileSheetToggle) {
      elements.mobileSheetToggle.setAttribute("aria-expanded", String(nextExpanded));
      elements.mobileSheetToggle.setAttribute(
        "aria-label",
        nextExpanded ? "현안 정보 시트 접기" : "현안 정보 시트 펼치기"
      );
      if (options && options.userInitiated && typeof elements.mobileSheetToggle.focus === "function") {
        elements.mobileSheetToggle.focus({ preventScroll: true });
      }
    }
    if (didChange) {
      syncMobileDependentLayout();
      if (options && options.refocusActiveFilter) {
        const refocusForSheetState = () => {
          refocusActiveIssueFilterOnMap({
            duration: MAP_VIEW_FIT_ANIMATION_MS
          });
        };
        window.requestAnimationFrame(refocusForSheetState);
        window.setTimeout(refocusForSheetState, MOBILE_SHEET_MOTION_TRACK_MS);
      }
    }
    return didChange;
  }

  function syncMobileDependentLayout() {
    const sync = () => {
      window.dispatchEvent(new Event("resize"));
      if (state.map && typeof state.map.render === "function") {
        state.map.render();
      }
    };
    window.dispatchEvent(new CustomEvent("mobile-sheet-motion", {
      detail: {
        duration: MOBILE_SHEET_MOTION_TRACK_MS
      }
    }));
    window.requestAnimationFrame(sync);
    window.setTimeout(sync, 260);
  }

  function syncMobileSheetTabs() {
    if (!Array.isArray(elements.mobileSheetTabs) || elements.mobileSheetTabs.length === 0) {
      return;
    }
    const issueListVisible = isIssueListPanelVisible();
    if (state.mobileSheetActiveTab === "issues" && !issueListVisible) {
      state.mobileSheetActiveTab = "stats";
    }
    if (!isValidMobileSheetTab(state.mobileSheetActiveTab)) {
      state.mobileSheetActiveTab = "stats";
    }

    const activeTab = state.mobileSheetActiveTab;
    elements.mobileSheetTabs.forEach((tabButton) => {
      const tabName = String(tabButton.getAttribute("data-mobile-sheet-tab") || "").trim();
      const isActive = tabName === activeTab;
      const isDisabled = tabName === "issues" && !issueListVisible;
      tabButton.classList.toggle("mobile-sheet-tab-active", isActive);
      tabButton.classList.toggle("mobile-sheet-tab-disabled", isDisabled);
      tabButton.setAttribute("aria-selected", String(isActive));
      tabButton.toggleAttribute("disabled", isDisabled);
    });

    const shouldUseSheetTabs = isMobileLayout() && document.body.dataset.mapMode === "view";
    if (Array.isArray(elements.mobileSheetSections)) {
      elements.mobileSheetSections.forEach((section) => {
        const sectionName = String(section.getAttribute("data-mobile-sheet-section") || "").trim();
        const isActive = sectionName === activeTab;
        section.classList.toggle("mobile-sheet-section-active", isActive);
        section.removeAttribute("hidden");
        if (section.id !== "issue-list-panel" && shouldUseSheetTabs) {
          section.setAttribute("aria-hidden", String(!isActive));
        } else if (section.id !== "issue-list-panel") {
          section.removeAttribute("aria-hidden");
        }
      });
    }
  }

  function animateSpotListRefresh() {
    if (!elements.spotList || !isIssueListPanelVisible() || prefersReducedMotion()) {
      return;
    }
    if (state.spotListRefreshTimer) {
      window.clearTimeout(state.spotListRefreshTimer);
      state.spotListRefreshTimer = null;
    }
    elements.spotList.classList.remove("spot-list-refreshing");
    void elements.spotList.offsetWidth;
    elements.spotList.classList.add("spot-list-refreshing");
    state.spotListRefreshTimer = window.setTimeout(() => {
      if (elements.spotList) {
        elements.spotList.classList.remove("spot-list-refreshing");
      }
      state.spotListRefreshTimer = null;
    }, SPOT_LIST_REFRESH_ANIMATION_MS);
  }

  function shouldIgnoreGlobalEscape(event) {
    const target = event && event.target;
    if (!(target instanceof Element)) {
      return false;
    }
    if (target.closest("[contenteditable='true']")) {
      return true;
    }
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
      return true;
    }
    return false;
  }

  function updateIssueFilterUi() {
    const isActive = hasActiveIssueFilter();
    const activeFilter = getActiveIssueFilter();
    const activeLabel = getActiveIssueFilterLabel();
    if (elements.sidePanel) {
      elements.sidePanel.classList.toggle("side-panel-has-filter", isActive);
      elements.sidePanel.setAttribute("data-issue-filter-type", activeFilter.type || "none");
      elements.sidePanel.setAttribute("data-issue-filter-label", activeLabel);
      elements.sidePanel.setAttribute("aria-label", isActive ? "현안 정보, " + activeLabel + " 선택됨" : "현안 정보");
    }
    if (elements.issueListPanel) {
      elements.issueListPanel.setAttribute("aria-label", isActive ? getIssueListTitleForActiveFilter() : "선택 현안 목록");
    }
    if (elements.issueListTitle) {
      elements.issueListTitle.textContent = getIssueListTitleForActiveFilter();
    }
    const clearButton = document.getElementById("clear-issue-filter-btn");
    if (clearButton) {
      clearButton.classList.toggle("issue-stats-clear-btn-inactive", !isActive);
      clearButton.toggleAttribute("disabled", !isActive);
      if (isActive) {
        clearButton.removeAttribute("aria-hidden");
        clearButton.removeAttribute("tabindex");
      } else {
        clearButton.setAttribute("aria-hidden", "true");
        clearButton.setAttribute("tabindex", "-1");
      }
    }
    if (elements.issueListClearFilterButton) {
      elements.issueListClearFilterButton.classList.toggle("issue-list-clear-btn-inactive", !isActive);
      elements.issueListClearFilterButton.toggleAttribute("disabled", !isActive);
      if (isActive) {
        elements.issueListClearFilterButton.removeAttribute("aria-hidden");
        elements.issueListClearFilterButton.removeAttribute("tabindex");
      } else {
        elements.issueListClearFilterButton.setAttribute("aria-hidden", "true");
        elements.issueListClearFilterButton.setAttribute("tabindex", "-1");
      }
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

  function fitMapToBoundaryExtent(options) {
    if (!state.map || !state.boundarySource) {
      return false;
    }

    const extent = state.boundarySource.getExtent();
    if (
      !extent ||
      !Number.isFinite(extent[0]) ||
      !Number.isFinite(extent[1]) ||
      !Number.isFinite(extent[2]) ||
      !Number.isFinite(extent[3])
    ) {
      return false;
    }

    const padding = Array.isArray(options && options.padding) && options.padding.length === 4
      ? options.padding
      : getRegionMapFocusPadding(options);
    const maxZoom = readPositiveNumber(options && options.maxZoom, 16);
    const fitOptions = {
      padding,
      maxZoom,
      duration: resolveMapAnimationDuration(options && options.duration, MAP_VIEW_FIT_ANIMATION_MS),
      easing: easeOutCubic
    };

    state.map.getView().fit(extent, fitOptions);
    return true;
  }

  function resetMapToRegionView(options) {
    return fitMapToBoundaryExtent({
      padding: getRegionMapFocusPadding(options),
      duration: options && options.duration,
      maxZoom: 16
    });
  }

  function resolveMapAnimationDuration(duration, fallbackDuration) {
    if (prefersReducedMotion()) {
      return 0;
    }
    const numericDuration = Number(duration);
    if (Number.isFinite(numericDuration) && numericDuration >= 0) {
      return numericDuration;
    }
    return Number.isFinite(fallbackDuration) && fallbackDuration >= 0
      ? fallbackDuration
      : MAP_VIEW_CENTER_ANIMATION_MS;
  }

  function buildSmoothMapAnimationOptions(options, fallbackDuration) {
    return {
      ...(options || {}),
      duration: resolveMapAnimationDuration(options && options.duration, fallbackDuration),
      easing: easeOutCubic
    };
  }

  function animateMapView(view, options, fallbackDuration, callback) {
    if (!view || typeof view.animate !== "function") {
      return false;
    }
    view.animate(buildSmoothMapAnimationOptions(options, fallbackDuration), callback);
    return true;
  }

  function fitMapViewToExtent(view, extent, options, fallbackDuration, callback) {
    if (!view || typeof view.fit !== "function") {
      return false;
    }
    const fitOptions = buildSmoothMapAnimationOptions(options, fallbackDuration);
    if (typeof callback === "function") {
      fitOptions.callback = callback;
    }
    view.fit(extent, fitOptions);
    return true;
  }

  function clearPopupMoveSuppression() {
    if (state.suppressPopupCloseGuardTimer) {
      window.clearTimeout(state.suppressPopupCloseGuardTimer);
      state.suppressPopupCloseGuardTimer = null;
    }
    state.suppressPopupCloseOnNextMoveStart = false;
  }

  function suppressPopupCloseForNextMapMove(duration) {
    clearPopupMoveSuppression();
    state.suppressPopupCloseOnNextMoveStart = true;
    const guardDuration = resolveMapAnimationDuration(duration, MAP_VIEW_FIT_ANIMATION_MS) + 140;
    state.suppressPopupCloseGuardTimer = window.setTimeout(() => {
      clearPopupMoveSuppression();
    }, guardDuration);
  }

  async function refreshCurrentLocationIndicator() {
    if (!state.currentLocationSource) {
      return;
    }
    if (!navigator.geolocation || typeof navigator.geolocation.getCurrentPosition !== "function") {
      return;
    }

    try {
      const position = await getCurrentGeolocation();
      const lat = Number(position.coords && position.coords.latitude);
      const lng = Number(position.coords && position.coords.longitude);
      setCurrentLocationIndicator(lat, lng);
    } catch (error) {
      // 위치 권한 거부/실패는 조용히 무시하고 지도 사용 흐름을 유지합니다.
    }
  }

  function setCurrentLocationIndicator(lat, lng) {
    if (!state.currentLocationSource) {
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    const projected = ol.proj.fromLonLat([lng, lat]);
    if (!state.currentLocationFeature) {
      state.currentLocationFeature = new ol.Feature({
        geometry: new ol.geom.Point(projected)
      });
      state.currentLocationFeature.set("kind", "current-location");
      state.currentLocationSource.addFeature(state.currentLocationFeature);
      return;
    }

    const geometry = state.currentLocationFeature.getGeometry();
    if (geometry && typeof geometry.setCoordinates === "function") {
      geometry.setCoordinates(projected);
    }
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
      setCurrentLocationIndicator(lat, lng);
      const hasBoundaryData = Boolean(
        state.boundariesLoaded &&
        state.boundarySource &&
        state.boundarySource.getFeatures().length > 0
      );
      if (hasBoundaryData) {
        const boundaryMeta = resolveBoundaryMetaForLonLat(lng, lat);
        const isOutsideBoundary = !boundaryMeta.dongName && !boundaryMeta.emdCode;
        if (isOutsideBoundary) {
          const fitted = fitMapToBoundaryExtent({
            padding: getRegionMapFocusPadding(),
            duration: MAP_VIEW_FIT_ANIMATION_MS,
            maxZoom: 16
          });
          if (fitted) {
            state.autoCenteredToCurrentLocation = false;
            return;
          }
        }
      }
      const currentZoom = mapView.getZoom();
      const targetZoom = Number.isFinite(currentZoom) && currentZoom > minZoom ? currentZoom : minZoom;
      animateMapView(mapView, {
        center: ol.proj.fromLonLat([lng, lat]),
        zoom: targetZoom,
        duration: MAP_VIEW_CENTER_ANIMATION_MS
      }, MAP_VIEW_CENTER_ANIMATION_MS);
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
      feature.setStyle(getHotspotStyle(spot, "normal"));
      feature.set("hotspotEmphasisMode", "normal");
      feature.set("hotspotVisualMode", "normal");
      state.hotspotSource.addFeature(feature);
      state.hotspotData.set(spot.id, spot);
    });

    refreshHotspotAggregateFeatures();
    syncHotspotMarkerDisplayMode();
    applyHotspotHighlightStyles();

    if (state.editingHotspotId && !state.hotspotData.has(state.editingHotspotId)) {
      exitHotspotEditMode(true);
    }
  }

  function clearHotspotFeatures() {
    clearHotspotStyleAnimations();
    if (state.hotspotSource) {
      state.hotspotSource.clear();
    }
    state.hotspotData.clear();
    refreshHotspotAggregateFeatures();
    syncHotspotMarkerDisplayMode();
  }

  function resolveAggregateIssueList() {
    if (!Array.isArray(state.issues)) {
      return [];
    }
    const activeFilter = getActiveIssueFilter();
    if (activeFilter.type === "dong") {
      return [];
    }
    return applyIssueFilter(state.issues).filter((spot) => {
      return Number.isFinite(Number(spot && spot.lat)) && Number.isFinite(Number(spot && spot.lng));
    });
  }

  function resolveDongAggregateCoordinate(dongName, spots) {
    const boundaryExtent = resolveBoundaryExtentByDongName(dongName);
    if (boundaryExtent && hasUsableExtentArea(boundaryExtent)) {
      return ol.extent.getCenter(boundaryExtent);
    }
    const extentMeta = resolveHotspotExtentMeta(spots);
    return extentMeta && extentMeta.center ? extentMeta.center : null;
  }

  function refreshHotspotAggregateFeatures() {
    if (!state.hotspotAggregateSource) {
      return;
    }

    state.hotspotAggregateSource.clear();
    const groupedByDong = new Map();
    resolveAggregateIssueList().forEach((spot) => {
      const dongName = resolveSpotDongForAggregation(spot);
      if (!dongName) {
        return;
      }
      if (!groupedByDong.has(dongName)) {
        groupedByDong.set(dongName, []);
      }
      groupedByDong.get(dongName).push(spot);
    });

    const aggregateFeatures = [];
    groupedByDong.forEach((spots, dongName) => {
      if (!Array.isArray(spots) || spots.length === 0) {
        return;
      }
      const coordinate = resolveDongAggregateCoordinate(dongName, spots);
      if (!coordinate) {
        return;
      }
      const feature = new ol.Feature({
        geometry: new ol.geom.Point(coordinate)
      });
      feature.set("kind", "hotspot_aggregate");
      feature.set("dongName", dongName);
      feature.set("count", spots.length);
      feature.set("spots", spots);
      aggregateFeatures.push(feature);
    });

    if (aggregateFeatures.length > 0) {
      state.hotspotAggregateSource.addFeatures(aggregateFeatures);
    }
    if (state.hotspotAggregateSource && typeof state.hotspotAggregateSource.changed === "function") {
      state.hotspotAggregateSource.changed();
    }
  }

  function shouldShowHotspotAggregates() {
    if (!state.map || isEditMode()) {
      return false;
    }
    if (state.selectedHotspotId) {
      return false;
    }
    const activeFilter = getActiveIssueFilter();
    if (activeFilter.type === "dong") {
      return false;
    }
    const view = state.map.getView();
    const zoom = view && typeof view.getZoom === "function" ? Number(view.getZoom()) : 0;
    return Number.isFinite(zoom) && zoom < HOTSPOT_AGGREGATE_MAX_ZOOM;
  }

  function syncHotspotMarkerDisplayMode() {
    const showAggregates = shouldShowHotspotAggregates();
    const nextMode = showAggregates ? "aggregate" : "hotspot";
    const aggregateLayer = state.hotspotAggregateLayer;
    const hotspotLayer = state.hotspotLayer;
    if (!aggregateLayer || !hotspotLayer) {
      return;
    }

    if (state.hotspotMarkerDisplayMode === nextMode) {
      return;
    }

    const shouldAnimate = Boolean(state.hotspotMarkerDisplayMode) && !prefersReducedMotion();
    if (!shouldAnimate) {
      clearHotspotMarkerModeTransition();
      state.hotspotMarkerDisplayMode = nextMode;
      applyHotspotMarkerDisplayMode(nextMode);
      return;
    }

    transitionHotspotMarkerDisplayMode(nextMode);
  }

  function applyHotspotMarkerDisplayMode(mode) {
    const aggregateVisible = mode === "aggregate";
    setLayerVisibilityAndOpacity(state.hotspotAggregateLayer, aggregateVisible, aggregateVisible ? 1 : 0);
    setLayerVisibilityAndOpacity(state.hotspotLayer, !aggregateVisible, aggregateVisible ? 0 : 1);
  }

  function setLayerVisibilityAndOpacity(layer, visible, opacity) {
    if (!layer) {
      return;
    }
    if (typeof layer.setVisible === "function") {
      layer.setVisible(Boolean(visible));
    }
    if (typeof layer.setOpacity === "function") {
      layer.setOpacity(Math.max(0, Math.min(1, Number(opacity))));
    }
  }

  function readLayerOpacity(layer, fallback) {
    if (layer && typeof layer.getOpacity === "function") {
      const opacity = Number(layer.getOpacity());
      if (Number.isFinite(opacity)) {
        return opacity;
      }
    }
    return fallback;
  }

  function clearHotspotMarkerModeTransition() {
    if (!state.hotspotMarkerTransitionFrame) {
      return;
    }
    if (typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(state.hotspotMarkerTransitionFrame);
    } else {
      window.clearTimeout(state.hotspotMarkerTransitionFrame);
    }
    state.hotspotMarkerTransitionFrame = null;
  }

  function transitionHotspotMarkerDisplayMode(nextMode) {
    const aggregateLayer = state.hotspotAggregateLayer;
    const hotspotLayer = state.hotspotLayer;
    const fromAggregateOpacity = readLayerOpacity(aggregateLayer, nextMode === "aggregate" ? 0 : 1);
    const fromHotspotOpacity = readLayerOpacity(hotspotLayer, nextMode === "hotspot" ? 0 : 1);
    const toAggregateOpacity = nextMode === "aggregate" ? 1 : 0;
    const toHotspotOpacity = nextMode === "hotspot" ? 1 : 0;
    const start = typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();

    clearHotspotMarkerModeTransition();
    state.hotspotMarkerDisplayMode = nextMode;
    setLayerVisibilityAndOpacity(aggregateLayer, true, fromAggregateOpacity);
    setLayerVisibilityAndOpacity(hotspotLayer, true, fromHotspotOpacity);

    const step = (timestamp) => {
      const now = Number.isFinite(timestamp) ? timestamp : Date.now();
      const progress = Math.max(0, Math.min(1, (now - start) / HOTSPOT_MARKER_MODE_TRANSITION_MS));
      const eased = easeOutCubic(progress);
      setLayerVisibilityAndOpacity(
        aggregateLayer,
        true,
        lerpNumber(fromAggregateOpacity, toAggregateOpacity, eased)
      );
      setLayerVisibilityAndOpacity(
        hotspotLayer,
        true,
        lerpNumber(fromHotspotOpacity, toHotspotOpacity, eased)
      );

      if (progress >= 1) {
        state.hotspotMarkerTransitionFrame = null;
        applyHotspotMarkerDisplayMode(nextMode);
        return;
      }

      if (typeof window.requestAnimationFrame === "function") {
        state.hotspotMarkerTransitionFrame = window.requestAnimationFrame(step);
      } else {
        state.hotspotMarkerTransitionFrame = window.setTimeout(() => step(Date.now()), 16);
      }
    };

    if (typeof window.requestAnimationFrame === "function") {
      state.hotspotMarkerTransitionFrame = window.requestAnimationFrame(step);
    } else {
      state.hotspotMarkerTransitionFrame = window.setTimeout(() => step(Date.now()), 16);
    }
  }

  function setHighlightedHotspots(spotIds, options) {
    const ids = Array.isArray(spotIds)
      ? spotIds.map((id) => String(id || "").trim()).filter(Boolean)
      : [];
    state.highlightedHotspotIds = new Set(ids);
    const selectedHotspotId = String(options && options.selectedHotspotId || "").trim();
    state.selectedHotspotId = selectedHotspotId && state.highlightedHotspotIds.has(selectedHotspotId)
      ? selectedHotspotId
      : "";
    syncHotspotMarkerDisplayMode();
    applyHotspotHighlightStyles();
  }

  function clearHighlightedHotspots() {
    if ((!state.highlightedHotspotIds || state.highlightedHotspotIds.size === 0) && !state.selectedHotspotId) {
      return;
    }
    state.highlightedHotspotIds = new Set();
    state.selectedHotspotId = "";
    syncHotspotMarkerDisplayMode();
    applyHotspotHighlightStyles();
  }

  function applyHotspotHighlightStyles() {
    if (!state.hotspotSource) {
      syncSpotListHighlightState();
      return;
    }
    const features = state.hotspotSource.getFeatures();
    let highlightSet = state.highlightedHotspotIds instanceof Set
      ? state.highlightedHotspotIds
      : new Set();

    if (highlightSet.size > 0) {
      const presentIds = new Set();
      features.forEach((feature) => {
        const spot = feature.get("spot");
        const spotId = String(feature.getId() || (spot && spot.id) || "").trim();
        if (spotId) {
          presentIds.add(spotId);
        }
      });
      highlightSet = new Set(Array.from(highlightSet).filter((id) => presentIds.has(id)));
    }
    state.highlightedHotspotIds = highlightSet;
    if (state.selectedHotspotId && !highlightSet.has(state.selectedHotspotId)) {
      state.selectedHotspotId = "";
    }
    const hasHighlight = highlightSet.size > 0;

    features.forEach((feature) => {
      const spot = feature.get("spot");
      const spotId = String(feature.getId() || (spot && spot.id) || "").trim();
      const emphasisMode = hasHighlight
        ? (highlightSet.has(spotId) ? "focus" : "dim")
        : "normal";
      setHotspotFeatureEmphasis(feature, spot, emphasisMode);
    });
    if (state.hotspotAggregateSource && typeof state.hotspotAggregateSource.changed === "function") {
      state.hotspotAggregateSource.changed();
    }
    syncHotspotMarkerDisplayMode();
    syncSpotListHighlightState();
  }

  function syncSpotListHighlightState() {
    if (!elements.spotList) {
      return;
    }
    const highlightSet = state.highlightedHotspotIds instanceof Set
      ? state.highlightedHotspotIds
      : new Set();
    elements.spotList.querySelectorAll("[data-spot-id]").forEach((item) => {
      const spotId = String(item.getAttribute("data-spot-id") || "").trim();
      const isHighlighted = Boolean(spotId && highlightSet.has(spotId));
      item.classList.toggle("spot-item-highlighted", isHighlighted);
      item.classList.toggle("spot-item-selected", Boolean(isHighlighted && state.selectedHotspotId === spotId));
    });
  }

  function normalizeHotspotEmphasisMode(emphasisMode) {
    return emphasisMode === "focus" || emphasisMode === "dim" ? emphasisMode : "normal";
  }

  function getHotspotStyleMetrics(emphasisMode) {
    const mode = normalizeHotspotEmphasisMode(emphasisMode);
    const normalHaloRadius = 22;
    const normalCoreRadius = 18;
    const normalIconFontSize = 22;
    if (mode === "focus") {
      const focusScale = 1.5;
      return {
        haloRadius: Math.round(normalHaloRadius * focusScale),
        coreRadius: Math.round(normalCoreRadius * focusScale),
        iconFontSize: Math.round(normalIconFontSize * focusScale)
      };
    }
    if (mode === "dim") {
      return {
        haloRadius: normalHaloRadius,
        coreRadius: normalCoreRadius,
        iconFontSize: 20
      };
    }
    return {
      haloRadius: normalHaloRadius,
      coreRadius: normalCoreRadius,
      iconFontSize: normalIconFontSize
    };
  }

  function easeOutCubic(progress) {
    const t = Math.max(0, Math.min(1, Number(progress)));
    return 1 - Math.pow(1 - t, 3);
  }

  function lerpNumber(start, end, progress) {
    return Number(start) + ((Number(end) - Number(start)) * progress);
  }

  function interpolateHotspotStyleMetrics(fromMode, toMode, progress) {
    const eased = easeOutCubic(progress);
    const fromMetrics = getHotspotStyleMetrics(fromMode);
    const toMetrics = getHotspotStyleMetrics(toMode);
    return {
      haloRadius: lerpNumber(fromMetrics.haloRadius, toMetrics.haloRadius, eased),
      coreRadius: lerpNumber(fromMetrics.coreRadius, toMetrics.coreRadius, eased),
      iconFontSize: lerpNumber(fromMetrics.iconFontSize, toMetrics.iconFontSize, eased),
      progress: eased
    };
  }

  function getHotspotFocusRingOpacity(fromMode, toMode, progress) {
    const eased = easeOutCubic(progress);
    if (toMode === "focus") {
      return eased;
    }
    if (fromMode === "focus") {
      return 1 - eased;
    }
    return 0;
  }

  function setHotspotFeatureEmphasis(feature, spot, emphasisMode) {
    if (!feature) {
      return;
    }
    const nextMode = normalizeHotspotEmphasisMode(emphasisMode);
    const currentMode = normalizeHotspotEmphasisMode(feature.get("hotspotEmphasisMode"));
    if (currentMode === nextMode && !state.hotspotStyleAnimations.has(feature)) {
      feature.setStyle(getHotspotStyle(spot, nextMode));
      return;
    }

    const visualMode = normalizeHotspotEmphasisMode(feature.get("hotspotVisualMode") || currentMode);
    feature.set("hotspotEmphasisMode", nextMode);

    if (prefersReducedMotion() || currentMode === nextMode) {
      clearHotspotFeatureAnimation(feature);
      feature.set("hotspotVisualMode", nextMode);
      feature.setStyle(getHotspotStyle(spot, nextMode));
      return;
    }

    const now = typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
    feature.set("hotspotAnimationFromMode", visualMode);
    feature.set("hotspotAnimationToMode", nextMode);
    feature.set("hotspotAnimationStart", now);
    feature.set("hotspotAnimationSpot", spot || feature.get("spot"));
    state.hotspotStyleAnimations.add(feature);
    scheduleHotspotStyleAnimation();
  }

  function scheduleHotspotStyleAnimation() {
    if (state.hotspotStyleAnimationFrame || state.hotspotStyleAnimations.size === 0) {
      return;
    }
    const run = (timestamp) => {
      state.hotspotStyleAnimationFrame = null;
      stepHotspotStyleAnimations(Number.isFinite(timestamp) ? timestamp : Date.now());
      if (state.hotspotStyleAnimations.size > 0) {
        scheduleHotspotStyleAnimation();
      }
    };
    if (typeof window.requestAnimationFrame === "function") {
      state.hotspotStyleAnimationFrame = window.requestAnimationFrame(run);
      return;
    }
    state.hotspotStyleAnimationFrame = window.setTimeout(() => run(Date.now()), 16);
  }

  function stepHotspotStyleAnimations(timestamp) {
    Array.from(state.hotspotStyleAnimations).forEach((feature) => {
      if (!feature) {
        state.hotspotStyleAnimations.delete(feature);
        return;
      }
      const fromMode = normalizeHotspotEmphasisMode(feature.get("hotspotAnimationFromMode"));
      const toMode = normalizeHotspotEmphasisMode(feature.get("hotspotAnimationToMode"));
      const start = Number(feature.get("hotspotAnimationStart"));
      const spot = feature.get("hotspotAnimationSpot") || feature.get("spot");
      const elapsed = Number.isFinite(start) ? timestamp - start : HOTSPOT_STYLE_ANIMATION_MS;
      const progress = Math.max(0, Math.min(1, elapsed / HOTSPOT_STYLE_ANIMATION_MS));
      if (progress >= 1) {
        feature.set("hotspotVisualMode", toMode);
        feature.setStyle(getHotspotStyle(spot, toMode));
        clearHotspotFeatureAnimation(feature);
        return;
      }
      feature.setStyle(getHotspotTransitionStyle(spot, fromMode, toMode, progress));
    });
  }

  function clearHotspotFeatureAnimation(feature) {
    if (!feature) {
      return;
    }
    state.hotspotStyleAnimations.delete(feature);
    feature.unset("hotspotAnimationFromMode", true);
    feature.unset("hotspotAnimationToMode", true);
    feature.unset("hotspotAnimationStart", true);
    feature.unset("hotspotAnimationSpot", true);
  }

  function clearHotspotStyleAnimations() {
    if (state.hotspotStyleAnimationFrame) {
      if (typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(state.hotspotStyleAnimationFrame);
      } else {
        window.clearTimeout(state.hotspotStyleAnimationFrame);
      }
      state.hotspotStyleAnimationFrame = null;
    }
    state.hotspotStyleAnimations.forEach((feature) => {
      clearHotspotFeatureAnimation(feature);
    });
    state.hotspotStyleAnimations.clear();
  }

  function getHotspotStyle(spot, emphasisMode) {
    const categoryMeta = resolveIssueCategoryMeta(spot && spot.categoryId, spot && spot.categoryLabel);
    const baseColor = categoryMeta.color || defaultIssueCategoryColor;
    const markerIcon = categoryMeta.icon || "📍";
    const mode = normalizeHotspotEmphasisMode(emphasisMode);
    const cacheKey = String(categoryMeta.id || "") + "|" + baseColor + "|" + markerIcon + "|" + mode;

    if (state.hotspotStyleCache.has(cacheKey)) {
      return state.hotspotStyleCache.get(cacheKey);
    }

    const style = createHotspotStyle(spot, mode, getHotspotStyleMetrics(mode), mode === "focus" ? 1 : 0);
    state.hotspotStyleCache.set(cacheKey, style);
    return style;
  }

  function getHotspotTransitionStyle(spot, fromMode, toMode, progress) {
    const targetMode = normalizeHotspotEmphasisMode(toMode);
    const sourceMode = normalizeHotspotEmphasisMode(fromMode);
    const metrics = interpolateHotspotStyleMetrics(sourceMode, targetMode, progress);
    const ringOpacity = getHotspotFocusRingOpacity(sourceMode, targetMode, progress);
    return createHotspotStyle(spot, targetMode, metrics, ringOpacity);
  }

  function createHotspotStyle(spot, emphasisMode, metrics, focusRingOpacity) {
    const categoryMeta = resolveIssueCategoryMeta(spot && spot.categoryId, spot && spot.categoryLabel);
    const baseColor = categoryMeta.color || defaultIssueCategoryColor;
    const markerColor = mixHexColorWithWhite(baseColor, 0.34);
    const markerBorderColor = mixHexColorWithWhite(baseColor, 0.10);
    const markerIcon = categoryMeta.icon || "📍";
    const mode = normalizeHotspotEmphasisMode(emphasisMode);
    const isDim = mode === "dim";
    const isFocus = mode === "focus";
    const haloRadius = Math.max(1, Number(metrics && metrics.haloRadius) || 22);
    const coreRadius = Math.max(1, Number(metrics && metrics.coreRadius) || 18);
    const iconFontSize = Math.max(1, Number(metrics && metrics.iconFontSize) || 22);
    const haloFillColor = isDim
      ? "rgba(255,255,255,0.44)"
      : isFocus
      ? "rgba(255,255,255,0.98)"
      : "rgba(255,255,255,0.90)";
    const haloStrokeColor = isDim
      ? "rgba(15,23,42,0.14)"
      : isFocus
      ? toRgba(baseColor, 0.58)
      : "rgba(15,23,42,0.22)";
    const coreFillColor = isDim ? toRgba(markerColor, 0.30) : markerColor;
    const coreStrokeColor = isDim ? toRgba(markerBorderColor, 0.56) : markerBorderColor;
    const textFillColor = isDim ? "rgba(15,23,42,0.52)" : "#0f172a";
    const textStrokeColor = isDim ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.95)";
    const ringOpacity = Math.max(0, Math.min(1, Number(focusRingOpacity) || 0));
    const style = [];

    if (ringOpacity > 0.01) {
      style.push(
        new ol.style.Style({
          zIndex: 24,
          image: new ol.style.Circle({
            radius: haloRadius + 3,
            fill: new ol.style.Fill({ color: "rgba(255,255,255,0)" }),
            stroke: new ol.style.Stroke({
              color: toRgba(baseColor, 0.46 * ringOpacity),
              width: 3
            })
          })
        })
      );
    }

    style.push(
      new ol.style.Style({
        zIndex: isFocus ? 25 : isDim ? 10 : 20,
        image: new ol.style.Circle({
          radius: haloRadius,
          fill: new ol.style.Fill({ color: haloFillColor }),
          stroke: new ol.style.Stroke({
            color: haloStrokeColor,
            width: 1.4
          })
        })
      })
    );

    style.push(
      new ol.style.Style({
        zIndex: isFocus ? 26 : isDim ? 11 : 21,
        image: new ol.style.Circle({
          radius: coreRadius,
          fill: new ol.style.Fill({ color: coreFillColor }),
          stroke: new ol.style.Stroke({
            color: coreStrokeColor,
            width: 2.8
          })
        }),
        text: new ol.style.Text({
          text: markerIcon,
          placement: "point",
          justify: "center",
          textAlign: "center",
          textBaseline: "middle",
          offsetX: 0,
          offsetY: 1,
          font: "700 " + String(Math.round(iconFontSize)) + "px \"Pretendard\", \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Noto Color Emoji\", sans-serif",
          fill: new ol.style.Fill({
            color: textFillColor
          }),
          stroke: new ol.style.Stroke({
            color: textStrokeColor,
            width: 2
          })
        })
      })
    );

    return style;
  }

  function getHotspotAggregateStyle(feature) {
    if (!feature || typeof feature.get !== "function") {
      return null;
    }
    const dongName = String(feature.get("dongName") || "").trim();
    const count = Math.max(1, Number(feature.get("count")) || 1);
    const activeFilter = getActiveIssueFilter();
    const isFiltered = activeFilter.type === "category" || activeFilter.type === "common";
    const mode = isFiltered ? "focus" : "normal";
    const cacheKey = String(count) + "|" + mode;
    if (state.hotspotAggregateStyleCache.has(cacheKey)) {
      return state.hotspotAggregateStyleCache.get(cacheKey);
    }

    const style = createHotspotAggregateStyle(count, mode);
    state.hotspotAggregateStyleCache.set(cacheKey, style);
    return style;
  }

  function createHotspotAggregateStyle(count, mode) {
    const safeCount = Math.max(1, Number(count) || 1);
    const isFocus = mode === "focus";
    const label = safeCount > 99 ? "99+" : String(safeCount);
    const baseColor = isFocus ? "#2563eb" : "#2f6fb7";
    const haloRadius = isFocus ? 35 : 31;
    const coreRadius = isFocus ? 27 : 24;

    return [
      new ol.style.Style({
        zIndex: isFocus ? 27 : 23,
        image: new ol.style.Circle({
          radius: haloRadius,
          fill: new ol.style.Fill({ color: "rgba(255,255,255,0.94)" }),
          stroke: new ol.style.Stroke({
            color: isFocus ? "rgba(37,99,235,0.62)" : "rgba(24,59,103,0.24)",
            width: isFocus ? 2.6 : 1.5
          })
        })
      }),
      new ol.style.Style({
        zIndex: isFocus ? 28 : 24,
        image: new ol.style.Circle({
          radius: coreRadius,
          fill: new ol.style.Fill({
            color: isFocus ? "rgba(37,99,235,0.92)" : "rgba(69,132,202,0.90)"
          }),
          stroke: new ol.style.Stroke({
            color: baseColor,
            width: isFocus ? 3.4 : 2.8
          })
        }),
        text: new ol.style.Text({
          text: label,
          placement: "point",
          justify: "center",
          textAlign: "center",
          textBaseline: "middle",
          offsetY: 0,
          font: "900 16px \"Pretendard\", sans-serif",
          fill: new ol.style.Fill({ color: "#ffffff" }),
          stroke: new ol.style.Stroke({
            color: "rgba(24,59,103,0.72)",
            width: 3.5
          })
        })
      })
    ];
  }

  function openHotspotFeature(feature, fallbackCoordinate) {
    if (!feature || typeof feature.get !== "function") {
      return false;
    }
    const spot = feature.get("spot");
    const geometry = typeof feature.getGeometry === "function" ? feature.getGeometry() : null;
    const coordinate = geometry && typeof geometry.getCoordinates === "function"
      ? geometry.getCoordinates()
      : fallbackCoordinate;
    if (!spot || !Array.isArray(coordinate)) {
      clearHighlightedHotspots();
      return false;
    }

    if (spot.id) {
      setHighlightedHotspots([spot.id], {
        selectedHotspotId: spot.id
      });
    } else {
      clearHighlightedHotspots();
    }
    animateMapToHotspotSelection(coordinate, spot);
    openHotspotPopup(coordinate, spot);
    return true;
  }

  function handleHotspotAggregateClick(feature, fallbackCoordinate) {
    if (!feature || typeof feature.get !== "function") {
      return false;
    }
    const dongName = String(feature.get("dongName") || "").trim();
    if (!dongName) {
      return false;
    }

    closePopup();
    clearHighlightedHotspots();
    focusDongIssues(dongName, {
      fallbackCoordinate,
      boundaryFeature: findBoundaryFeatureByDongName(dongName)
    });
    return true;
  }

  function renderVisibleIssueList() {
    updateTotalIssueCountLabel();
    const filtered = applyIssueFilter(state.issues);
    renderIssueStatsSummary(state.issues);
    const shouldShowList = hasActiveIssueFilter();
    refreshHotspotAggregateFeatures();
    syncHotspotMarkerDisplayMode();
    setIssueListPanelVisibility(shouldShowList);
    renderHotspotList(shouldShowList ? filtered : [], {
      preservePanelVisibility: true
    });
    if (shouldShowList) {
      setHighlightedHotspots(filtered.map((spot) => spot.id));
    }
  }

  function renderIssueStatsSummary(hotspots) {
    if (!elements.issueStatsSummary) {
      return;
    }

    const list = Array.isArray(hotspots) ? hotspots : [];
    if (list.length === 0) {
      elements.issueStatsSummary.innerHTML = "<div class='issue-stats-empty'>표시할 현안 통계가 없습니다.</div>";
      return;
    }

    const activeFilter = getActiveIssueFilter();
    const scopeLabel = activeFilter.type === "category"
      ? "카테고리: " + activeFilter.label
      : (activeFilter.type === "dong"
        ? "동: " + activeFilter.label
        : (activeFilter.type === "common" ? "공통 현안: [" + activeFilter.label + "]" : "전체 기준"));
    const isFiltered = hasActiveIssueFilter();
    const clearButtonClassName = isFiltered
      ? "issue-stats-clear-btn"
      : "issue-stats-clear-btn issue-stats-clear-btn-inactive";
    const clearButtonAttrs = isFiltered
      ? ""
      : " disabled aria-hidden='true' tabindex='-1'";
    const clearButtonMarkup =
      "<button id='clear-issue-filter-btn' type='button' class='" + clearButtonClassName + "' data-action='clear-issue-filter'" + clearButtonAttrs + ">" +
        "전체 보기" +
      "</button>";
    const categoryStats = buildIssueCategoryStats(list);
    const dongStats = buildIssueDongStats(list);

    const categoryItems = categoryStats.map((item) => {
      const safeLabel = escapeHtml(item.label);
      const safeKey = escapeHtml(item.key);
      const countLabel = String(item.count) + "건";
      const chipStyle = buildCategoryBadgeStyle(item.color);
      const isActive = isActiveIssueFilter("category", item.key);
      const activeClassName = isActive ? " issue-stats-filter-btn-active" : "";
      const activeAttrs = isActive ? " aria-current='true'" : "";
      const buttonLabel = escapeHtml(item.label + " " + countLabel + " 보기");
      return (
        "<li class='issue-stats-item'>" +
          "<button type='button' class='issue-stats-filter-btn" + activeClassName + "' data-action='filter-issues' data-filter-type='category' data-filter-key='" + safeKey + "' data-filter-label='" + safeLabel + "' aria-label='" + buttonLabel + "' aria-pressed='" + String(isActive) + "'" + activeAttrs + ">" +
            "<span class='issue-stats-chip issue-stats-chip-category' style='" + chipStyle + "'>" + safeLabel + "</span>" +
            "<span class='issue-stats-count'>" + countLabel + "</span>" +
            "<span class='issue-stats-open-indicator' aria-hidden='true'>›</span>" +
          "</button>" +
        "</li>"
      );
    });

    const dongItems = dongStats.map((item) => {
      const safeLabel = escapeHtml(item.label);
      const safeKey = escapeHtml(item.key);
      const countLabel = String(item.count) + "건";
      const sourceNames = Array.isArray(item.sourceNames) ? item.sourceNames : [];
      const mergeHint = sourceNames.length > 1
        ? "<div class='issue-stats-hint'>" + escapeHtml(sourceNames.join(" · ") + " 묶음") + "</div>"
        : "";
      const isActive = isActiveIssueFilter("dong", item.key);
      const activeClassName = isActive ? " issue-stats-filter-btn-active" : "";
      const activeAttrs = isActive ? " aria-current='true'" : "";
      const buttonLabel = escapeHtml(item.label + " " + countLabel + " 보기");
      return (
        "<li class='issue-stats-item'>" +
          "<button type='button' class='issue-stats-filter-btn" + activeClassName + "' data-action='filter-issues' data-filter-type='dong' data-filter-key='" + safeKey + "' data-filter-label='" + safeLabel + "' aria-label='" + buttonLabel + "' aria-pressed='" + String(isActive) + "'" + activeAttrs + ">" +
            "<span class='issue-stats-chip issue-stats-chip-dong'>" + safeLabel + "</span>" +
            "<span class='issue-stats-count'>" + countLabel + "</span>" +
            "<span class='issue-stats-open-indicator' aria-hidden='true'>›</span>" +
          "</button>" +
          mergeHint +
        "</li>"
      );
    });

    elements.issueStatsSummary.innerHTML =
      "<div class='issue-stats-head'>" +
        "<span class='issue-stats-title'>현안 통계 <span class='issue-stats-scope'>(" + scopeLabel + ")</span></span>" +
        clearButtonMarkup +
      "</div>" +
      "<div class='issue-stats-grid'>" +
        "<section class='issue-stats-block'>" +
          "<h4>동별 총 건수</h4>" +
          "<ul class='issue-stats-list'>" + dongItems.join("") + "</ul>" +
        "</section>" +
        "<section class='issue-stats-block'>" +
          "<h4>카테고리별 총 건수</h4>" +
          "<ul class='issue-stats-list'>" + categoryItems.join("") + "</ul>" +
        "</section>" +
      "</div>";
  }

  function buildIssueCategoryStats(hotspots) {
    const list = Array.isArray(hotspots) ? hotspots : [];
    const statsByLabel = new Map();

    list.forEach((spot) => {
      const categoryMeta = resolveIssueCategoryMeta(spot.categoryId, spot.categoryLabel);
      const label = String(categoryMeta.label || "").trim() || "미분류";
      const key = normalizeIssueFilterKey(label);
      if (!statsByLabel.has(key)) {
        statsByLabel.set(key, {
          key,
          label,
          color: categoryMeta.color || defaultIssueCategoryColor,
          count: 0
        });
      }
      statsByLabel.get(key).count += 1;
    });

    return Array.from(statsByLabel.values()).sort((a, b) => {
      if (a.count !== b.count) {
        return b.count - a.count;
      }
      return compareKoreanText(a.label, b.label);
    });
  }

  function buildIssueDongStats(hotspots) {
    const list = Array.isArray(hotspots) ? hotspots : [];
    const statsByDong = new Map();
    const dongTargets = DONG_DISPLAY_ORDER.filter((dongName) => dongName !== DONG_COMMON_NAME);

    dongTargets.forEach((dongName) => {
      statsByDong.set(dongName, {
        key: dongName,
        label: dongName,
        count: 0,
        sourceNames: new Set([dongName])
      });
    });

    list.forEach((spot) => {
      const targetDong = resolveSpotDongForAggregation(spot);
      if (!targetDong || !statsByDong.has(targetDong)) {
        return;
      }
      const stat = statsByDong.get(targetDong);
      stat.count += 1;
      stat.sourceNames.add(targetDong);
    });

    return Array.from(statsByDong.values())
      .map((item) => {
        return {
          key: item.label,
          label: item.label,
          count: item.count,
          sourceNames: Array.from(item.sourceNames).sort(compareDongLabelForDisplay)
        };
      })
      .sort((a, b) => {
        return compareDongLabelForDisplay(a.label, b.label);
      });
  }

  function getActiveIssueFilterEmptyMessage() {
    const activeFilter = getActiveIssueFilter();
    if (activeFilter.type === "dong") {
      return activeFilter.label + "에 등록된 현안이 없습니다.";
    }
    if (activeFilter.type === "category") {
      return activeFilter.label + " 카테고리에 등록된 현안이 없습니다.";
    }
    return "등록된 지역 현안이 없습니다.";
  }

  function activateSpotListItem(item, options) {
    if (!(item instanceof HTMLElement) || !state.map || !state.hotspotSource) {
      return false;
    }

    const spotId = String(item.getAttribute("data-spot-id") || "").trim();
    if (!spotId) {
      return false;
    }

    const feature = state.hotspotSource.getFeatureById(spotId);
    const spot = state.hotspotData.get(spotId);
    if (!feature || !spot) {
      return false;
    }

    const geometry = typeof feature.getGeometry === "function" ? feature.getGeometry() : null;
    const coordinate = geometry && typeof geometry.getCoordinates === "function"
      ? geometry.getCoordinates()
      : null;
    if (!Array.isArray(coordinate)) {
      return false;
    }

    if (options && options.focusItem && typeof item.focus === "function") {
      item.focus({ preventScroll: true });
    }
    setHighlightedHotspots([spot.id], {
      selectedHotspotId: spot.id
    });
    animateMapToHotspotSelection(coordinate, spot);
    openHotspotPopup(coordinate, spot, {
      returnFocusElement: item,
      focusPopup: Boolean(options && options.focusItem)
    });
    return true;
  }

  function renderHotspotList(hotspots, options) {
    if (!elements.spotList) {
      return;
    }

    if (!(options && options.preservePanelVisibility)) {
      setIssueListPanelVisibility(true);
    }
    clearPhotoSlideshowsByPrefix("spot-list-");
    const list = Array.isArray(hotspots) ? hotspots : [];

    if (list.length === 0) {
      elements.spotList.innerHTML = "<li class='empty'>" + escapeHtml(getActiveIssueFilterEmptyMessage()) + "</li>";
      return;
    }

    const showEditorActions = isEditMode();
    const items = list.map((spot) => {
      const rawTitle = String(spot.title || "").trim() || "현안";
      const title = escapeHtml(rawTitle);
      const memoRaw = typeof spot.memo === "string" ? spot.memo.trim() : "";
      const memo = memoRaw ? escapeHtml(memoRaw) : "";
      const photoDataUrls = getSpotPhotoDataUrls(spot);
      const titleWithPhotoBadge = photoDataUrls.length > 0
        ? title + " <span class='spot-title-photo-badge' aria-label='사진 첨부'>🖼️</span>"
        : title;
      const photoSlides = buildSpotPhotoSlides(photoDataUrls, rawTitle + " 사진");
      const slideshowId = photoSlides.length > 0
        ? createPhotoSlideshowId("spot-list")
        : "";
      const photoPreviewHtml = photoSlides.length > 0
        ? buildPhotoSlideshowHtml({
          slideshowId,
          slides: photoSlides,
          wrapperClassName: "spot-photo-thumb-wrap",
          imageClassName: "spot-photo-thumb",
          loading: "lazy"
        })
        : "";
      const spotId = String(spot.id || "").trim();
      const highlightSet = state.highlightedHotspotIds instanceof Set
        ? state.highlightedHotspotIds
        : new Set();
      const isHighlighted = Boolean(spotId && highlightSet.has(spotId));
      const isSelected = Boolean(isHighlighted && state.selectedHotspotId === spotId);
      const spotItemClassName =
        "spot-item" +
        (memo ? "" : " spot-item--no-memo") +
        (isHighlighted ? " spot-item-highlighted" : "") +
        (isSelected ? " spot-item-selected" : "");
      const dongName = escapeHtml(formatSpotDongLabel(spot));
      const categoryLabel = escapeHtml(resolveCategoryLabel(spot.categoryId, spot.categoryLabel));
      const categoryMeta = resolveIssueCategoryMeta(spot.categoryId, spot.categoryLabel);
      const categoryStyle = buildCategoryBadgeStyle(categoryMeta.color);
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
        "<li class='" + spotItemClassName + "' data-spot-id='" + safeId + "' role='button' tabindex='0' aria-label='" + escapeHtml(rawTitle + " 위치 보기") + "'>" +
          "<div class='spot-item-top'>" +
            "<strong>" + titleWithPhotoBadge + "</strong>" +
          "</div>" +
          "<div class='spot-category' style='" + categoryStyle + "'>" + categoryLabel + "</div>" +
          "<div class='spot-dong'>" + dongName + "</div>" +
          (memo ? "<div class='spot-memo'>" + memo + "</div>" : "") +
          photoPreviewHtml +
          actionsHtml +
        "</li>"
      );
    });

    elements.spotList.innerHTML = items.join("");
    schedulePhotoSlideshowsSync(elements.spotList);
    syncSpotListHighlightState();
  }

  function exposeSpotListTestHooks() {
    if (typeof window === "undefined" || !navigator.webdriver) {
      return;
    }
    window.__spotListTestHooks = {
      renderHotspotList,
      renderIssueStatsSummary,
      setActiveDongFilter,
      setActiveIssueFilter,
      setMobileSheetExpanded,
      getIssueMapFocusPadding,
      getRegionMapFocusPadding,
      getPopupAwareCenterDelta(options) {
        if (!state.map || typeof state.map.getView !== "function") {
          return null;
        }
        const view = state.map.getView();
        const center = view && typeof view.getCenter === "function" ? view.getCenter() : null;
        if (!Array.isArray(center)) {
          return null;
        }
        const adjusted = resolvePopupAwareCenterCoordinate(center, options);
        return {
          deltaX: adjusted[0] - center[0],
          deltaY: adjusted[1] - center[1]
        };
      },
      focusDongIssues,
      focusCategoryIssues,
      renderVisibleIssueListWithData(issues) {
        state.issues = Array.isArray(issues) ? issues : [];
        renderVisibleIssueList();
      },
      getHighlightedHotspotIds() {
        return Array.from(state.highlightedHotspotIds || []);
      },
      getSelectedHotspotId() {
        return state.selectedHotspotId || "";
      },
      getHotspotStyleAnimationCount() {
        return state.hotspotStyleAnimations instanceof Set
          ? state.hotspotStyleAnimations.size
          : 0;
      },
      setMapZoomForTest(zoom) {
        if (!state.map || typeof state.map.getView !== "function") {
          return null;
        }
        const view = state.map.getView();
        if (!view || typeof view.setZoom !== "function") {
          return null;
        }
        view.setZoom(Number(zoom));
        syncHotspotMarkerDisplayMode();
        return typeof view.getZoom === "function" ? view.getZoom() : null;
      },
      getHotspotAggregateState() {
        if (!state.hotspotAggregateSource) {
          return null;
        }
        const aggregateFeatures = typeof state.hotspotAggregateSource.getFeatures === "function"
          ? state.hotspotAggregateSource.getFeatures()
          : [];
        const aggregates = aggregateFeatures.map((feature) => ({
          dongName: String(feature.get("dongName") || ""),
          count: Number(feature.get("count")) || 0
        })).filter((entry) => entry.dongName && entry.count > 0)
          .sort((a, b) => a.dongName.localeCompare(b.dongName, "ko"));
        return {
          visible: Boolean(
            state.hotspotAggregateLayer &&
            typeof state.hotspotAggregateLayer.getVisible === "function" &&
            state.hotspotAggregateLayer.getVisible()
          ),
          aggregateOpacity: readLayerOpacity(state.hotspotAggregateLayer, 0),
          hotspotVisible: Boolean(
            state.hotspotLayer &&
            typeof state.hotspotLayer.getVisible === "function" &&
            state.hotspotLayer.getVisible()
          ),
          hotspotOpacity: readLayerOpacity(state.hotspotLayer, 0),
          transitionActive: Boolean(state.hotspotMarkerTransitionFrame),
          featureCount: state.hotspotSource && typeof state.hotspotSource.getFeatures === "function"
            ? state.hotspotSource.getFeatures().length
            : 0,
          aggregateCount: aggregates.length,
          aggregates
        };
      },
      isIssueListPanelVisible,
      getMapViewState() {
        if (!state.map || typeof state.map.getView !== "function") {
          return null;
        }
        const view = state.map.getView();
        const center = view && typeof view.getCenter === "function" ? view.getCenter() : null;
        const lonLat = Array.isArray(center) ? ol.proj.toLonLat(center) : null;
        return {
          center: lonLat,
          zoom: view && typeof view.getZoom === "function" ? view.getZoom() : null,
          animating: Boolean(view && typeof view.getAnimating === "function" && view.getAnimating())
        };
      },
      getMapVisibleExtentState() {
        if (!state.map || typeof state.map.getView !== "function") {
          return null;
        }
        const view = state.map.getView();
        const size = typeof state.map.getSize === "function" ? state.map.getSize() : null;
        if (!view || typeof view.calculateExtent !== "function" || !Array.isArray(size)) {
          return null;
        }
        const extent = view.calculateExtent(size);
        const bottomLeft = ol.proj.toLonLat([extent[0], extent[1]]);
        const topRight = ol.proj.toLonLat([extent[2], extent[3]]);
        return {
          west: bottomLeft[0],
          south: bottomLeft[1],
          east: topRight[0],
          north: topRight[1]
        };
      },
      getBoundaryExtentCenter() {
        if (!state.boundarySource) {
          return null;
        }
        const extent = state.boundarySource.getExtent();
        if (
          !extent ||
          extent.length !== 4 ||
          !extent.every((value) => Number.isFinite(value))
        ) {
          return null;
        }
        return ol.proj.toLonLat(ol.extent.getCenter(extent));
      },
      getBoundaryMaskState() {
        if (!state.boundaryMaskSource) {
          return null;
        }
        const features = state.boundaryMaskSource.getFeatures();
        const firstFeature = features.length > 0 ? features[0] : null;
        const layer = state.boundaryMaskLayer;
        const readLayerOption = (methodName, propertyName, fallbackValue) => {
          if (!layer) {
            return fallbackValue;
          }
          if (typeof layer[methodName] === "function") {
            return layer[methodName]();
          }
          if (typeof layer.get === "function") {
            const value = layer.get(propertyName);
            if (value !== undefined) {
              return value;
            }
          }
          return fallbackValue;
        };
        return {
          count: features.length,
          source: firstFeature && typeof firstFeature.get === "function"
            ? String(firstFeature.get("maskSource") || "")
            : "",
          staticApplied: Boolean(state.boundaryMaskFallbackApplied),
          renderBuffer: readLayerOption("getRenderBuffer", "renderBuffer", BOUNDARY_MASK_RENDER_BUFFER_PX),
          updateWhileAnimating: Boolean(readLayerOption("getUpdateWhileAnimating", "updateWhileAnimating", true)),
          updateWhileInteracting: Boolean(readLayerOption("getUpdateWhileInteracting", "updateWhileInteracting", true))
        };
      },
      getDongBoundaryExtentState(dongName) {
        const extent = resolveBoundaryExtentByDongName(dongName);
        if (!extent) {
          return null;
        }
        const bottomLeft = ol.proj.toLonLat([extent[0], extent[1]]);
        const topRight = ol.proj.toLonLat([extent[2], extent[3]]);
        return {
          center: ol.proj.toLonLat(ol.extent.getCenter(extent)),
          west: bottomLeft[0],
          south: bottomLeft[1],
          east: topRight[0],
          north: topRight[1]
        };
      }
    };
  }

  function resolvePopupAwareCenterCoordinate(coordinate, options) {
    if (!isMobileLayout()) {
      return coordinate;
    }
    if (!state.map || !Array.isArray(coordinate) || coordinate.length < 2) {
      return coordinate;
    }

    const view = state.map.getView();
    const size = state.map.getSize();
    if (!view || !Array.isArray(size) || size.length < 2) {
      return coordinate;
    }

    const coordinateX = Number(coordinate[0]);
    const coordinateY = Number(coordinate[1]);
    const mapHeight = Number(size[1]);
    const resolution = Number(view.getResolution());
    if (
      !Number.isFinite(coordinateX) ||
      !Number.isFinite(coordinateY) ||
      !Number.isFinite(mapHeight) ||
      mapHeight <= 0 ||
      !Number.isFinite(resolution) ||
      resolution <= 0
    ) {
      return coordinate;
    }

    const hasPhoto = Boolean(options && options.hasPhoto);
    const defaultPopupHeight = getMapPopupRenderedHeight(hasPhoto ? 248 : 132);
    const popupHeightPx = readPositiveNumber(
      options && options.popupHeightPx,
      defaultPopupHeight
    );
    const sheetHeight = getMobileBottomSheetCoveredHeight(options);
    const bottomCoveredPx = sheetHeight > 0 ? sheetHeight + 22 : 0;
    const visibleBottomY = Math.max(80, mapHeight - bottomCoveredPx);
    const centerY = mapHeight / 2;
    const visibleCenterY = visibleBottomY / 2;
    const popupAnchorGapPx = 26;
    const topMarginPx = hasPhoto ? 20 : 14;
    const bottomMarginPx = sheetHeight > 0 ? 16 : 20;
    const minMarkerY = popupHeightPx + popupAnchorGapPx + topMarginPx;
    const maxMarkerY = Math.max(minMarkerY, visibleBottomY - bottomMarginPx);
    let desiredMarkerY = visibleCenterY + (popupHeightPx / 2) + popupAnchorGapPx;
    if (desiredMarkerY < minMarkerY) {
      desiredMarkerY = minMarkerY;
    }
    if (desiredMarkerY > maxMarkerY) {
      desiredMarkerY = maxMarkerY;
    }

    const pixelOffsetY = desiredMarkerY - centerY;
    if (!Number.isFinite(pixelOffsetY) || Math.abs(pixelOffsetY) <= 0.5) {
      return coordinate;
    }

    return [coordinateX, coordinateY + (pixelOffsetY * resolution)];
  }

  function isMapPopupVisible() {
    return Boolean(
      elements.mapPopup &&
      !elements.mapPopup.classList.contains("hidden") &&
      !elements.mapPopup.classList.contains("map-popup-closing")
    );
  }

  function getOpenMapPopupCoordinate() {
    if (!state.popupOverlay || typeof state.popupOverlay.getPosition !== "function") {
      return null;
    }
    const coordinate = state.popupOverlay.getPosition();
    return Array.isArray(coordinate) && coordinate.length >= 2
      ? coordinate
      : null;
  }

  function getOpenMapPopupHasPhoto() {
    return Boolean(
      isMapPopupVisible() &&
      elements.mapPopup &&
      elements.mapPopup.querySelector(".map-popup-photo, .map-popup-photo-wrap")
    );
  }

  function getMapPopupRenderedHeight(fallbackHeight) {
    const fallback = readPositiveNumber(fallbackHeight, 132);
    if (!isMapPopupVisible() || !elements.mapPopup || !elements.mapPopup.getBoundingClientRect) {
      return fallback;
    }
    const rect = elements.mapPopup.getBoundingClientRect();
    return Number.isFinite(rect.height) && rect.height > 0
      ? rect.height
      : fallback;
  }

  function resolveRenderedPopupAlignedCenter(options) {
    if (!isMobileLayout() || !state.map || !isMapPopupVisible()) {
      return null;
    }
    const view = state.map.getView();
    const currentCenter = view && typeof view.getCenter === "function" ? view.getCenter() : null;
    const size = typeof state.map.getSize === "function" ? state.map.getSize() : null;
    if (!view || !Array.isArray(currentCenter) || !Array.isArray(size) || size.length < 2) {
      return null;
    }
    if (!elements.mapPopup || !elements.mapPopup.getBoundingClientRect || !elements.mapWrap || !elements.mapWrap.getBoundingClientRect) {
      return null;
    }

    const resolution = Number(view.getResolution());
    const mapHeight = Number(size[1]);
    if (!Number.isFinite(resolution) || resolution <= 0 || !Number.isFinite(mapHeight) || mapHeight <= 0) {
      return null;
    }

    const popupRect = elements.mapPopup.getBoundingClientRect();
    const mapRect = elements.mapWrap.getBoundingClientRect();
    if (
      !Number.isFinite(popupRect.top) ||
      !Number.isFinite(popupRect.bottom) ||
      !Number.isFinite(mapRect.top)
    ) {
      return null;
    }

    const sheetHeight = getMobileBottomSheetCoveredHeight(options);
    const bottomCoveredPx = sheetHeight > 0 ? sheetHeight + 22 : 0;
    const visibleBottomY = Math.max(80, mapHeight - bottomCoveredPx);
    const visibleCenterPageY = mapRect.top + (visibleBottomY / 2);
    const popupCenterPageY = (popupRect.top + popupRect.bottom) / 2;
    const pixelOffsetY = visibleCenterPageY - popupCenterPageY;
    if (!Number.isFinite(pixelOffsetY) || Math.abs(pixelOffsetY) <= 0.5) {
      return currentCenter;
    }

    return [
      currentCenter[0],
      currentCenter[1] + (pixelOffsetY * resolution)
    ];
  }

  function alignMapToPopupCoordinate(coordinate, options) {
    if (!state.map || !Array.isArray(coordinate) || coordinate.length < 2) {
      return false;
    }
    const view = state.map.getView();
    if (!view) {
      return false;
    }

    const hasPhoto = options && Object.prototype.hasOwnProperty.call(options, "hasPhoto")
      ? Boolean(options.hasPhoto)
      : getOpenMapPopupHasPhoto();
    const popupHeightPx = readPositiveNumber(
      options && options.popupHeightPx,
      getMapPopupRenderedHeight(hasPhoto ? 248 : 132)
    );
    const estimatedTargetCenter = resolvePopupAwareCenterCoordinate(coordinate, {
      hasPhoto,
      popupHeightPx,
      mobileSheetState: options && options.mobileSheetState
    });
    const renderedTargetCenter = resolveRenderedPopupAlignedCenter({
      mobileSheetState: options && options.mobileSheetState
    });
    const targetCenter = renderedTargetCenter
      ? [estimatedTargetCenter[0], renderedTargetCenter[1]]
      : estimatedTargetCenter;
    if (!Array.isArray(targetCenter) || targetCenter.length < 2) {
      return true;
    }

    const currentZoom = view.getZoom();
    const animateOptions = {
      center: targetCenter,
      duration: options && options.duration
    };
    if (Number.isFinite(currentZoom)) {
      animateOptions.zoom = currentZoom;
    }

    const currentCenter = typeof view.getCenter === "function" ? view.getCenter() : null;
    const moved = !Array.isArray(currentCenter) ||
      Math.abs(Number(currentCenter[0]) - Number(targetCenter[0])) > 0.5 ||
      Math.abs(Number(currentCenter[1]) - Number(targetCenter[1])) > 0.5;
    if (!moved) {
      return true;
    }

    const duration = resolveMapAnimationDuration(options && options.duration, MAP_VIEW_CENTER_ANIMATION_MS);
    suppressPopupCloseForNextMapMove(duration);
    return animateMapView(view, animateOptions, MAP_VIEW_CENTER_ANIMATION_MS, () => {
      clearPopupMoveSuppression();
    });
  }

  function alignOpenMapPopupToVisibleCenter(options) {
    const coordinate = getOpenMapPopupCoordinate();
    if (!coordinate || !isMapPopupVisible()) {
      return false;
    }
    return alignMapToPopupCoordinate(coordinate, options);
  }

  function animateMapToHotspotSelection(coordinate, spot, options) {
    if (!state.map || !Array.isArray(coordinate) || coordinate.length < 2) {
      return;
    }
    const mapView = state.map.getView();
    if (!mapView) {
      return;
    }
    const hasPhoto = getSpotPhotoDataUrls(spot).length > 0;
    const targetCenter = resolvePopupAwareCenterCoordinate(coordinate, {
      hasPhoto,
      mobileSheetState: options && options.mobileSheetState
    });
    const currentZoom = mapView.getZoom();
    const animateOptions = {
      center: targetCenter,
      duration: options && options.duration
    };
    if (Number.isFinite(currentZoom)) {
      animateOptions.zoom = currentZoom;
    }
    const duration = resolveMapAnimationDuration(options && options.duration, MAP_VIEW_CENTER_ANIMATION_MS);
    suppressPopupCloseForNextMapMove(duration);
    animateMapView(mapView, animateOptions, MAP_VIEW_CENTER_ANIMATION_MS, () => {
      clearPopupMoveSuppression();
    });
  }

  function resolveBoundaryCenterCoordinate(boundaryFeature) {
    const extent = resolveBoundaryFeatureExtent(boundaryFeature);
    return extent ? ol.extent.getCenter(extent) : null;
  }

  function resolveBoundaryFeatureExtent(boundaryFeature) {
    if (!boundaryFeature || typeof boundaryFeature.getGeometry !== "function") {
      return null;
    }
    const geometry = boundaryFeature.getGeometry();
    if (!geometry || typeof geometry.getExtent !== "function") {
      return null;
    }
    const extent = geometry.getExtent();
    if (!extent || extent.length !== 4 || !extent.every((value) => Number.isFinite(value))) {
      return null;
    }
    return extent;
  }

  function resolveBoundaryExtentByDongName(dongName, fallbackFeature) {
    const normalizedDong = resolveMergedDongName(dongName);
    if (!normalizedDong) {
      return resolveBoundaryFeatureExtent(fallbackFeature);
    }

    const combinedExtent = ol.extent.createEmpty();
    let matchCount = 0;
    if (state.boundarySource) {
      state.boundarySource.getFeatures().forEach((feature) => {
        const featureDong = resolveMergedDongName(feature && feature.get ? feature.get("dongName") : "");
        if (featureDong !== normalizedDong) {
          return;
        }
        const featureExtent = resolveBoundaryFeatureExtent(feature);
        if (!featureExtent) {
          return;
        }
        ol.extent.extend(combinedExtent, featureExtent);
        matchCount += 1;
      });
    }

    if (matchCount > 0) {
      return combinedExtent;
    }
    return resolveBoundaryFeatureExtent(fallbackFeature);
  }

  function findBoundaryFeatureByDongName(dongName) {
    const normalizedDong = resolveMergedDongName(dongName);
    if (!normalizedDong || !state.boundarySource) {
      return null;
    }
    const features = state.boundarySource.getFeatures();
    return features.find((feature) => {
      return resolveMergedDongName(feature && feature.get ? feature.get("dongName") : "") === normalizedDong;
    }) || null;
  }

  function resolveIssuesByDongName(dongName) {
    const normalizedDong = resolveMergedDongName(dongName);
    if (!normalizedDong) {
      return [];
    }
    return state.issues.filter((spot) => resolveSpotDongForAggregation(spot) === normalizedDong);
  }

  function resolveIssuesByCategoryFilter(categoryKey, categoryLabel) {
    const filter = buildIssueFilterState("category", categoryKey, categoryLabel);
    if (!filter.key) {
      return [];
    }
    return state.issues.filter((spot) => resolveIssueCategoryFilterKey(spot) === filter.key);
  }

  function openDongIssueSummaryPopup(coordinate, dongName, count, options) {
    if (!coordinate) {
      return;
    }
    const safeDong = escapeHtml(resolveMergedDongName(dongName) || "동 정보 없음");
    const safeCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;
    openPopup(
      coordinate,
      "<strong>" + safeDong + "</strong>" +
      "<div>현안 건수: " + String(safeCount) + "건</div>",
      {
        dismissClearsDongFilter: true,
        alignToVisibleCenter: Boolean(options && options.alignToVisibleCenter),
        alignDuration: options && options.alignDuration
      }
    );
  }

  function normalizeMobileSheetFocusState(value) {
    const stateName = String(value || "").trim().toLowerCase();
    if (stateName === "expanded" || stateName === "collapsed" || stateName === "current") {
      return stateName;
    }
    return state.mobileSheetExpanded ? "expanded" : "collapsed";
  }

  function getMobileViewportHeight() {
    const visualViewportHeight = window.visualViewport && Number.isFinite(window.visualViewport.height)
      ? window.visualViewport.height
      : 0;
    if (visualViewportHeight > 0) {
      return visualViewportHeight;
    }
    return window.innerHeight || document.documentElement.clientHeight || 0;
  }

  function getMobileMapViewportHeight() {
    const mapRect = elements.mapWrap && elements.mapWrap.getBoundingClientRect
      ? elements.mapWrap.getBoundingClientRect()
      : null;
    if (mapRect && Number.isFinite(mapRect.height) && mapRect.height > 0) {
      return mapRect.height;
    }
    return getMobileViewportHeight();
  }

  function getMobileSheetExpandedTargetHeight() {
    const viewportHeight = getMobileViewportHeight();
    const mapHeight = getMobileMapViewportHeight();
    const preferredHeight = Math.min(viewportHeight * 0.54, 520);
    const maxHeight = Math.max(MOBILE_SHEET_COLLAPSED_HEIGHT_PX, mapHeight - 86);
    const minHeight = Math.min(344, maxHeight);
    const targetHeight = Math.min(maxHeight, Math.max(preferredHeight, minHeight));
    return Number.isFinite(targetHeight) && targetHeight > 0
      ? Math.round(targetHeight)
      : 0;
  }

  function getMobileSheetCollapsedTargetHeight() {
    if (elements.sidePanel && elements.sidePanel.classList.contains("mobile-sheet-collapsed")) {
      const computedMaxHeight = window.getComputedStyle
        ? Number.parseFloat(window.getComputedStyle(elements.sidePanel).maxHeight)
        : 0;
      if (Number.isFinite(computedMaxHeight) && computedMaxHeight > 0 && computedMaxHeight <= 120) {
        return computedMaxHeight;
      }
    }
    return MOBILE_SHEET_COLLAPSED_HEIGHT_PX;
  }

  function getMobileBottomSheetCoveredHeight(options) {
    if (!isMobileLayout() || document.body.dataset.mapMode !== "view") {
      return 0;
    }
    const sheetState = normalizeMobileSheetFocusState(options && (options.mobileSheetState || options.sheetState));
    if (sheetState === "expanded") {
      return getMobileSheetExpandedTargetHeight();
    }
    if (sheetState === "collapsed") {
      return getMobileSheetCollapsedTargetHeight();
    }
    if (!elements.sidePanel || !elements.sidePanel.getBoundingClientRect) {
      return 0;
    }
    const sheetRect = elements.sidePanel.getBoundingClientRect();
    return Number.isFinite(sheetRect.height) && sheetRect.height > 0
      ? sheetRect.height
      : 0;
  }

  function getRegionMapFocusPadding(options) {
    if (!isMobileLayout()) {
      return [22, 22, 22, 22];
    }
    const mapHeight = elements.mapWrap && elements.mapWrap.getBoundingClientRect
      ? elements.mapWrap.getBoundingClientRect().height
      : 0;
    const sheetHeight = getMobileBottomSheetCoveredHeight(options);
    const sheetState = normalizeMobileSheetFocusState(options && (options.mobileSheetState || options.sheetState));
    const top = Math.round(Math.max(42, Math.min(72, mapHeight * 0.1)));
    const bottom = sheetHeight > 0
      ? (
        sheetState === "collapsed"
          ? Math.round(Math.max(70, Math.min(108, sheetHeight + 28)))
          : Math.round(Math.max(140, Math.min(mapHeight * 0.68, sheetHeight + 28)))
      )
      : Math.round(Math.max(56, Math.min(96, mapHeight * 0.14)));
    return [top, 24, bottom, 24];
  }

  function getIssueMapFocusPadding(options) {
    if (!isMobileLayout()) {
      return [96, 96, 112, 96];
    }
    const mapHeight = elements.mapWrap && elements.mapWrap.getBoundingClientRect
      ? elements.mapWrap.getBoundingClientRect().height
      : 0;
    const sheetHeight = getMobileBottomSheetCoveredHeight(options);
    const top = Math.round(Math.max(56, Math.min(92, mapHeight * 0.14)));
    const coveredBottom = sheetHeight > 0 ? sheetHeight + 22 : mapHeight * 0.18;
    const bottom = Math.round(Math.max(120, Math.min(mapHeight * 0.64, coveredBottom)));
    return [top, 34, bottom, 34];
  }

  function resolvePaddedCenterCoordinate(coordinate, padding, zoom) {
    if (!state.map || !Array.isArray(coordinate) || coordinate.length < 2) {
      return coordinate;
    }
    const size = typeof state.map.getSize === "function" ? state.map.getSize() : null;
    const view = typeof state.map.getView === "function" ? state.map.getView() : null;
    if (!Array.isArray(size) || size.length < 2 || !view) {
      return coordinate;
    }
    const safePadding = Array.isArray(padding) && padding.length === 4
      ? padding
      : [0, 0, 0, 0];
    const targetZoom = Number.isFinite(zoom)
      ? zoom
      : (typeof view.getZoom === "function" ? view.getZoom() : null);
    const resolution = Number.isFinite(targetZoom) && typeof view.getResolutionForZoom === "function"
      ? view.getResolutionForZoom(targetZoom)
      : (typeof view.getResolution === "function" ? view.getResolution() : null);
    if (!Number.isFinite(resolution) || resolution <= 0) {
      return coordinate;
    }
    const horizontalOffsetPx = (safePadding[3] - safePadding[1]) / 2;
    const verticalOffsetPx = (safePadding[0] - safePadding[2]) / 2;
    return [
      coordinate[0] - horizontalOffsetPx * resolution,
      coordinate[1] + verticalOffsetPx * resolution
    ];
  }

  function hasUsableExtentArea(extent) {
    if (!extent || extent.length !== 4) {
      return false;
    }
    const width = ol.extent.getWidth(extent);
    const height = ol.extent.getHeight(extent);
    return Number.isFinite(width) && Number.isFinite(height) && (width > 1 || height > 1);
  }

  function focusMapOnIssueSpots(spots, options) {
    if (!state.map) {
      return false;
    }
    const extentMeta = resolveHotspotExtentMeta(spots);
    if (!extentMeta) {
      return false;
    }

    const view = state.map.getView();
    if (!view) {
      return false;
    }

    const callback = typeof (options && options.callback) === "function"
      ? options.callback
      : undefined;
    const maxZoom = readPositiveNumber(options && options.maxZoom, 16);
    const focusPadding = getIssueMapFocusPadding(options);
    if (extentMeta.count > 1 && hasUsableExtentArea(extentMeta.extent)) {
      return fitMapViewToExtent(view, extentMeta.extent, {
        padding: focusPadding,
        maxZoom,
        duration: options && options.duration
      }, MAP_VIEW_FIT_ANIMATION_MS, callback);
    }

    const currentZoom = view.getZoom();
    const minZoom = readPositiveNumber(options && options.singlePointMinZoom, null);
    const targetZoom = Number.isFinite(currentZoom)
      ? (minZoom === null ? currentZoom : Math.min(Math.max(currentZoom, minZoom), maxZoom))
      : (minZoom === null ? null : Math.min(minZoom, maxZoom));
    const animateOptions = {
      center: resolvePaddedCenterCoordinate(extentMeta.center, focusPadding, targetZoom),
      duration: options && options.duration
    };
    if (Number.isFinite(targetZoom)) {
      animateOptions.zoom = targetZoom;
    }
    return animateMapView(view, animateOptions, MAP_VIEW_CENTER_ANIMATION_MS, callback);
  }

  function focusMapOnBoundaryFeature(boundaryFeature, options) {
    const extent = resolveBoundaryFeatureExtent(boundaryFeature);
    return focusMapOnBoundaryExtent(extent, options);
  }

  function focusMapOnBoundaryExtent(extent, options) {
    if (!state.map) {
      return false;
    }
    if (!extent) {
      return false;
    }
    const view = state.map.getView();
    if (!view) {
      return false;
    }
    const maxZoom = readPositiveNumber(options && options.maxZoom, 15);
    const callback = typeof (options && options.callback) === "function"
      ? options.callback
      : undefined;
    if (hasUsableExtentArea(extent)) {
      return fitMapViewToExtent(view, extent, {
        padding: getIssueMapFocusPadding(options),
        maxZoom,
        duration: options && options.duration
      }, MAP_VIEW_FIT_ANIMATION_MS, callback);
    }
    return animateMapView(view, {
      center: ol.extent.getCenter(extent),
      duration: options && options.duration
    }, MAP_VIEW_CENTER_ANIMATION_MS, callback);
  }

  function focusDongIssues(dongName, options) {
    const normalizedDong = resolveMergedDongName(dongName);
    if (!normalizedDong || !state.map) {
      return;
    }

    if (!isEditMode()) {
      setActiveDongFilter(normalizedDong);
    }

    const spots = resolveIssuesByDongName(normalizedDong);
    setHighlightedHotspots(spots.map((spot) => spot.id));
    const extentMeta = resolveHotspotExtentMeta(spots);
    const boundaryFeature = options && options.boundaryFeature ? options.boundaryFeature : null;
    const boundaryExtent = resolveBoundaryExtentByDongName(normalizedDong, boundaryFeature);
    const boundaryCenter = boundaryExtent ? ol.extent.getCenter(boundaryExtent) : null;
    const fallbackCoordinate = options && options.fallbackCoordinate
      ? options.fallbackCoordinate
      : null;
    const targetCoordinate = boundaryCenter || (extentMeta ? extentMeta.center : fallbackCoordinate);

    const shouldOpenSummaryPopup = Boolean(targetCoordinate && !(options && options.skipPopup));
    const finishDongFocus = () => {
      clearPopupMoveSuppression();
      if (!shouldOpenSummaryPopup) {
        return;
      }
      window.requestAnimationFrame(() => {
        alignOpenMapPopupToVisibleCenter({
          duration: MAP_VIEW_CENTER_ANIMATION_MS
        });
      });
    };

    if (targetCoordinate) {
      suppressPopupCloseForNextMapMove(MAP_VIEW_FIT_ANIMATION_MS);
      if (shouldOpenSummaryPopup) {
        openDongIssueSummaryPopup(targetCoordinate, normalizedDong, spots.length);
      }
      let didScheduleFocus = false;
      const didFocusBoundary = focusMapOnBoundaryExtent(boundaryExtent, {
        duration: MAP_VIEW_FIT_ANIMATION_MS,
        maxZoom: 15,
        callback: finishDongFocus
      });
      didScheduleFocus = didScheduleFocus || didFocusBoundary;
      if (!didFocusBoundary) {
        const didFocusSpots = focusMapOnIssueSpots(spots, {
          duration: MAP_VIEW_FIT_ANIMATION_MS,
          maxZoom: 16,
          singlePointMinZoom: 15,
          callback: finishDongFocus
        });
        didScheduleFocus = didScheduleFocus || didFocusSpots;
        if (!didFocusSpots) {
          const view = state.map.getView();
          const currentZoom = view && view.getZoom ? view.getZoom() : null;
          const animateOptions = {
            center: targetCoordinate,
            duration: MAP_VIEW_CENTER_ANIMATION_MS
          };
          if (Number.isFinite(currentZoom)) {
            animateOptions.zoom = currentZoom;
          }
          didScheduleFocus = animateMapView(view, animateOptions, MAP_VIEW_CENTER_ANIMATION_MS, finishDongFocus);
        }
      }
      if (!didScheduleFocus) {
        finishDongFocus();
      }
    }
  }

  function refocusActiveIssueFilterOnMap(options) {
    if (alignOpenMapPopupToVisibleCenter({
      duration: options && options.duration
    })) {
      return true;
    }

    if (state.selectedHotspotId && state.hotspotSource && state.hotspotData) {
      const selectedFeature = state.hotspotSource.getFeatureById(state.selectedHotspotId);
      const selectedSpot = state.hotspotData.get(state.selectedHotspotId);
      const selectedGeometry = selectedFeature && typeof selectedFeature.getGeometry === "function"
        ? selectedFeature.getGeometry()
        : null;
      if (selectedGeometry && typeof selectedGeometry.getCoordinates === "function" && selectedSpot) {
        animateMapToHotspotSelection(selectedGeometry.getCoordinates(), selectedSpot, {
          duration: options && options.duration
        });
        return true;
      }
    }

    const activeFilter = getActiveIssueFilter();
    if (!activeFilter.type || !state.map) {
      if (!activeFilter.type && state.map && isMobileLayout() && document.body.dataset.mapMode === "view") {
        return resetMapToRegionView({
          duration: options && options.duration
        });
      }
      return false;
    }
    const focusOptions = {
      duration: options && options.duration,
      maxZoom: 16,
      singlePointMinZoom: 15
    };
    if (activeFilter.type === "dong") {
      focusDongIssues(activeFilter.key, {
        boundaryFeature: findBoundaryFeatureByDongName(activeFilter.key),
        duration: focusOptions.duration,
        maxZoom: 15,
        skipPopup: true
      });
      return true;
    }
    if (activeFilter.type === "category") {
      const spots = resolveIssuesByCategoryFilter(activeFilter.key, activeFilter.label);
      setHighlightedHotspots(spots.map((spot) => spot.id));
      return focusMapOnIssueSpots(spots, focusOptions);
    }
    if (activeFilter.type === "common") {
      const spots = state.commonIssueTagMap && state.commonIssueTagMap.has(activeFilter.label)
        ? state.commonIssueTagMap.get(activeFilter.label)
        : state.issues.filter((spot) => resolveBracketedCommonTag(spot) === activeFilter.label);
      setHighlightedHotspots(spots.map((spot) => spot.id));
      return focusMapOnIssueSpots(spots, focusOptions);
    }
    return false;
  }

  function focusCategoryIssues(categoryKey, options) {
    const nextFilter = buildIssueFilterState("category", categoryKey, options && options.label);
    if (!nextFilter.key || !state.map) {
      return false;
    }

    const didChangeFilter = setActiveIssueFilter("category", nextFilter.key, {
      label: nextFilter.label
    });
    if (!didChangeFilter) {
      closePopup();
      clearHighlightedHotspots();
    }

    const spots = resolveIssuesByCategoryFilter(nextFilter.key, nextFilter.label);
    setHighlightedHotspots(spots.map((spot) => spot.id));
    focusMapOnIssueSpots(spots, {
      duration: MAP_VIEW_FIT_ANIMATION_MS,
      maxZoom: 16,
      singlePointMinZoom: 15
    });

    if (options && options.animateList) {
      animateSpotListRefresh();
    }
    return true;
  }

  function focusCommonIssueTag(commonTag) {
    const normalizedTag = String(commonTag || "").trim();
    if (!normalizedTag || !state.map) {
      return false;
    }
    const nextFilter = buildIssueFilterState("common", normalizedTag, normalizedTag);
    const didChangeFilter = setActiveIssueFilter("common", nextFilter.key, {
      label: nextFilter.label
    });
    if (!didChangeFilter) {
      closePopup();
      clearHighlightedHotspots();
    }
    const spots = state.commonIssueTagMap && state.commonIssueTagMap.has(normalizedTag)
      ? state.commonIssueTagMap.get(normalizedTag)
      : state.issues.filter((spot) => resolveBracketedCommonTag(spot) === normalizedTag);
    setHighlightedHotspots(spots.map((spot) => spot.id));
    focusMapOnIssueSpots(spots, {
      duration: MAP_VIEW_FIT_ANIMATION_MS,
      maxZoom: 16,
      singlePointMinZoom: 15
    });
    animateSpotListRefresh();
    return true;
  }

  function resolveHotspotExtentMeta(spots) {
    if (!Array.isArray(spots) || spots.length === 0) {
      return null;
    }

    const extent = ol.extent.createEmpty();
    let count = 0;
    spots.forEach((spot) => {
      const lat = Number(spot && spot.lat);
      const lng = Number(spot && spot.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }
      const projected = ol.proj.fromLonLat([lng, lat]);
      ol.extent.extend(extent, [projected[0], projected[1], projected[0], projected[1]]);
      count += 1;
    });

    if (count === 0) {
      return null;
    }
    return {
      extent,
      center: ol.extent.getCenter(extent),
      count
    };
  }

  async function handleSpotPhotoFileSelection() {
    if (!elements.spotPhotoFileInput) {
      return;
    }
    if (state.spotPhotoProcessingInProgress) {
      setSpotSaveStatus("사진을 처리하는 중입니다. 완료될 때까지 잠시만 기다려 주세요.", false);
      return;
    }
    const files = Array.from(elements.spotPhotoFileInput.files || []);
    if (files.length === 0) {
      return;
    }
    state.spotPhotoProcessingInProgress = true;
    setSpotPhotoProcessingUi(
      true,
      "사진 1 / " + String(files.length) + " 처리 중입니다. 워터마크와 크기를 조정하고 있습니다."
    );
    try {
      const optimizedDataUrls = [];
      for (let index = 0; index < files.length; index += 1) {
        setSpotSaveStatus(
          "사진 " + String(index + 1) + " / " + String(files.length) + " 처리 중입니다. 워터마크와 크기를 조정하고 있습니다.",
          false
        );
        const file = files[index];
        const optimizedDataUrl = await optimizeHotspotPhotoFile(file);
        optimizedDataUrls.push(optimizedDataUrl);
      }
      const mergedDataUrls = state.spotPhotoDataUrls.concat(optimizedDataUrls);
      const result = setSpotPhotoDataUrls(mergedDataUrls);
      if (result.trimmedByCount) {
        window.alert("사진은 최대 " + String(hotspotPhotoConfig.maxPhotoCount) + "장까지 첨부할 수 있습니다.");
      }
    } catch (error) {
      window.alert("사진 처리 실패: " + toMessage(error));
    } finally {
      state.spotPhotoProcessingInProgress = false;
      setSpotPhotoProcessingUi(false, "");
      clearSpotPhotoFileInput();
    }
  }

  function clearSpotPhotoSelection() {
    setSpotPhotoDataUrls([]);
    clearSpotPhotoFileInput();
  }

  function removeCurrentSpotPhotoSelection() {
    if (!Array.isArray(state.spotPhotoDataUrls) || state.spotPhotoDataUrls.length === 0) {
      return;
    }
    let removeIndex = state.spotPhotoDataUrls.length - 1;
    const slideshowElement = elements.spotPhotoPreviewSlideshow
      ? elements.spotPhotoPreviewSlideshow.querySelector("[data-photo-slideshow-id]")
      : null;
    if (slideshowElement instanceof HTMLElement) {
      const slideshowId = String(slideshowElement.getAttribute("data-photo-slideshow-id") || "").trim();
      if (slideshowId && state.photoSlideshows.has(slideshowId)) {
        const slideshow = state.photoSlideshows.get(slideshowId);
        removeIndex = wrapPhotoSlideIndex(slideshow ? slideshow.index : 0, state.spotPhotoDataUrls.length);
      }
    }
    const nextPhotoDataUrls = state.spotPhotoDataUrls.filter((_photoDataUrl, index) => {
      return index !== removeIndex;
    });
    setSpotPhotoDataUrls(nextPhotoDataUrls);
    clearSpotPhotoFileInput();
  }

  function clearSpotPhotoFileInput() {
    if (elements.spotPhotoFileInput) {
      elements.spotPhotoFileInput.value = "";
    }
  }

  function setSpotPhotoDataUrls(dataUrls) {
    const result = applyHotspotPhotoDataUrlLimits(dataUrls);
    const normalized = result.photoDataUrls;
    state.spotPhotoDataUrls = normalized;
    if (elements.spotPhotoDataInput) {
      elements.spotPhotoDataInput.value = normalized.length > 0
        ? JSON.stringify(normalized)
        : "";
    }
    renderSpotPhotoPreview(normalized);
    return result;
  }

  function setSpotPhotoReprocessStatus(message, isError) {
    if (!elements.spotPhotoReprocessStatus) {
      return;
    }
    const text = String(message || "").trim();
    elements.spotPhotoReprocessStatus.textContent = text;
    elements.spotPhotoReprocessStatus.classList.toggle("hidden", !text);
    elements.spotPhotoReprocessStatus.classList.toggle("error", Boolean(text) && Boolean(isError));
  }

  function getSpotSubmitIdleText() {
    return state.editingHotspotId ? "수정 저장" : "현안 저장";
  }

  function countHotspotPhotoUploads(photoRefs) {
    return normalizeHotspotPhotoDataUrls(photoRefs)
      .slice(0, hotspotPhotoConfig.maxPhotoCount)
      .filter((photoRef) => isHotspotPhotoDataUrl(photoRef))
      .length;
  }

  function buildHotspotSavingMessage(uploadCount) {
    const count = Number(uploadCount) || 0;
    if (count > 0) {
      return "사진 " + String(count) + "장을 업로드한 뒤 현안을 저장합니다. 완료될 때까지 잠시만 기다려 주세요.";
    }
    return "현안 내용을 저장하는 중입니다. 완료될 때까지 잠시만 기다려 주세요.";
  }

  function setSpotSaveStatus(message, isError) {
    if (!elements.spotSaveStatus) {
      return;
    }
    const text = String(message || "").trim();
    elements.spotSaveStatus.textContent = text;
    elements.spotSaveStatus.classList.toggle("hidden", !text);
    elements.spotSaveStatus.classList.toggle("error", Boolean(text) && Boolean(isError));
  }

  function setHotspotSubmitUi(isSaving, message, isError) {
    const saving = Boolean(isSaving);
    if (elements.form) {
      elements.form.classList.toggle("is-saving", saving);
      if (saving) {
        elements.form.setAttribute("aria-busy", "true");
      } else {
        elements.form.removeAttribute("aria-busy");
      }
    }
    if (elements.spotSubmitButton) {
      elements.spotSubmitButton.disabled = saving;
      elements.spotSubmitButton.classList.toggle("is-loading", saving);
      elements.spotSubmitButton.textContent = saving ? "저장 중" : getSpotSubmitIdleText();
    }
    setSpotSaveStatus(message, isError);
  }

  function setSpotPhotoProcessingUi(isProcessing, message) {
    const processing = Boolean(isProcessing);
    if (elements.form) {
      elements.form.classList.toggle("is-processing", processing);
    }
    if (elements.spotSubmitButton && !state.hotspotSubmitInProgress) {
      elements.spotSubmitButton.disabled = processing;
      elements.spotSubmitButton.classList.toggle("is-loading", processing);
      elements.spotSubmitButton.textContent = processing ? "사진 처리 중" : getSpotSubmitIdleText();
    }
    setSpotSaveStatus(message, false);
  }

  async function makeOptimizedPhotos(spot) {
    const originalPhotos = normalizeHotspotPhotoDataUrls(getSpotPhotoDataUrls(spot));
    const currentStoragePaths = getSpotPhotoStoragePaths(spot);
    const hasLegacyDataUrl = originalPhotos.some((photo) => isHotspotPhotoDataUrl(photo));
    const hasMissingStoragePath = originalPhotos.some((_photo, index) => {
      return !normalizeHotspotPhotoStoragePath(currentStoragePaths[index]);
    });
    const alreadyLatest = (
      Number(spot.photoProcessingVersion || 0) >= hotspotPhotoConfig.processingVersion &&
      !hasLegacyDataUrl &&
      !hasMissingStoragePath
    );
    if (alreadyLatest) {
      console.info("[photo-reprocess-photo]", spot && spot.id ? spot.id : "-", "이미 최신 처리 버전입니다.");
      return [];
    }
    const optimizedPhotos = [];
    for (let sourceIndex = 0; sourceIndex < originalPhotos.length; sourceIndex += 1) {
      const source = originalPhotos[sourceIndex];
      const preferredStoragePath = normalizeHotspotPhotoStoragePath(currentStoragePaths[sourceIndex]);
      try {
        const optimizedPhoto = await optimizeHotspotPhotoReference(source, {
          preferredStoragePath
        });
        optimizedPhotos.push(optimizedPhoto);
      } catch (error) {
        console.warn("[photo-reprocess-photo]", spot && spot.id ? spot.id : "-", toMessage(error));
        return [];
      }
    }
    return optimizedPhotos;
  }

  async function reprocessStoredHotspotPhotos() {
    if (!isEditMode()) {
      return;
    }
    if (!state.currentUser || !state.db) {
      window.alert("로그인 상태를 확인한 뒤 다시 시도하세요.");
      return;
    }
    if (!state.storage) {
      window.alert("Firebase Storage가 초기화되지 않아 재처리를 진행할 수 없습니다.");
      return;
    }

    const spotsWithPhotos = Array.from(state.hotspotData.values()).filter((spot) => {
      return getSpotPhotoDataUrls(spot).length > 0;
    });
    if (spotsWithPhotos.length === 0) {
      window.alert("재처리할 기존 사진이 없습니다.");
      return;
    }

    const confirmed = window.confirm(
      "기존 첨부사진 " + String(spotsWithPhotos.length) + "건을 일괄 재처리할까요?\n" +
      "가로 800px 조정 + 중앙 워터마크 + JPG 변환으로 다시 저장됩니다."
    );
    if (!confirmed) {
      return;
    }

    const previousButtonText = elements.spotPhotoReprocessButton
      ? String(elements.spotPhotoReprocessButton.textContent || "기존 첨부사진 일괄 재처리")
      : "기존 첨부사진 일괄 재처리";
    if (elements.spotPhotoReprocessButton) {
      elements.spotPhotoReprocessButton.disabled = true;
      elements.spotPhotoReprocessButton.textContent = "재처리 중...";
    }
    setSpotPhotoReprocessStatus("0 / " + String(spotsWithPhotos.length) + " 처리 시작", false);

    try {
      let processedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      const failureReasonCounts = new Map();
      const collectionName = getIssueCollectionName();
      for (const spot of spotsWithPhotos) {
        processedCount += 1;
        let uploadedStoragePaths = [];
        try {
          // if errored or skipped, the array will be empty.
          const optimizedPhotos = await makeOptimizedPhotos(spot);
          if (optimizedPhotos.length === 0) {
            skippedCount += 1;
            continue;
          }
          const limitResult = applyHotspotPhotoDataUrlLimits(optimizedPhotos);
          const finalPhotos = limitResult.photoDataUrls;
          if (finalPhotos.length === 0) {
            throw new Error("재처리 가능한 사진이 없습니다. 기존 사진 URL 접근 권한 또는 형식을 확인하세요.");
          }

          const persistedPhotos = await persistHotspotPhotoRefs(String(spot.id), finalPhotos, spot);
          uploadedStoragePaths = persistedPhotos.uploadedStoragePaths;
          await state.db.collection(collectionName).doc(String(spot.id)).update({
            photoUrls: persistedPhotos.photoUrls,
            photoUrl: persistedPhotos.photoUrls[0] || "",
            photoStoragePaths: persistedPhotos.photoStoragePaths,
            photoDataUrls: firebase.firestore.FieldValue.delete(),
            photoDataUrl: firebase.firestore.FieldValue.delete(),
            photo_data_urls: firebase.firestore.FieldValue.delete(),
            photo_data_url: firebase.firestore.FieldValue.delete(),
            photoProcessingVersion: hotspotPhotoConfig.processingVersion,
            updatedBy: normalizeEmail(state.currentUser.email),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          const removedStoragePaths = collectRemovedSpotPhotoStoragePaths(
            spot,
            persistedPhotos.photoStoragePaths
          );
          if (removedStoragePaths.length > 0) {
            await deleteSpotPhotoStoragePaths(removedStoragePaths);
          }
          updatedCount += 1;
        } catch (error) {
          if (uploadedStoragePaths.length > 0) {
            await deleteSpotPhotoStoragePaths(uploadedStoragePaths);
          }
          failedCount += 1;
          const failureReason = toMessage(error);
          failureReasonCounts.set(failureReason, (failureReasonCounts.get(failureReason) || 0) + 1);
          console.error("[photo-reprocess]", spot && spot.id ? spot.id : "-", failureReason);
        }
        setSpotPhotoReprocessStatus(
          String(processedCount) + " / " + String(spotsWithPhotos.length) +
          " 처리 중 (업데이트 " + String(updatedCount) + ", 건너뜀 " + String(skippedCount) + ", 실패 " + String(failedCount) + ")",
          failedCount > 0
        );
      }

      const summary =
        "완료: 총 " + String(spotsWithPhotos.length) + "건 중 업데이트 " + String(updatedCount) +
        "건, 건너뜀 " + String(skippedCount) + "건, 실패 " + String(failedCount) + "건";
      const topFailureSummary = Array.from(failureReasonCounts.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, 2)
        .map((entry) => entry[0] + " (" + String(entry[1]) + "건)")
        .join(" | ");
      const statusSummary = topFailureSummary
        ? summary + " | 주요 실패 원인: " + topFailureSummary
        : summary;
      setSpotPhotoReprocessStatus(statusSummary, failedCount > 0);
      window.alert("기존 첨부사진 일괄 재처리가 끝났습니다.\n" + statusSummary);
    } finally {
      if (elements.spotPhotoReprocessButton) {
        elements.spotPhotoReprocessButton.disabled = false;
        elements.spotPhotoReprocessButton.textContent = previousButtonText;
      }
    }
  }

  function renderSpotPhotoPreview(photoDataUrls) {
    if (!elements.spotPhotoPreviewWrap || !elements.spotPhotoPreviewSlideshow) {
      return;
    }
    const photoSlides = buildSpotPhotoSlides(photoDataUrls, "첨부한 현안 사진");
    const hasPhotos = photoSlides.length > 0;
    if (elements.spotPhotoRemoveCurrentButton) {
      elements.spotPhotoRemoveCurrentButton.disabled = !hasPhotos;
    }
    if (elements.spotPhotoRemoveButton) {
      elements.spotPhotoRemoveButton.disabled = !hasPhotos;
    }
    clearPhotoSlideshowsByPrefix("spot-form-preview-");
    if (hasPhotos) {
      const slideshowId = createPhotoSlideshowId("spot-form-preview");
      elements.spotPhotoPreviewSlideshow.innerHTML = buildPhotoSlideshowHtml({
        slideshowId,
        slides: photoSlides,
        wrapperClassName: "spot-photo-preview-inner",
        imageClassName: "spot-photo-preview",
        loading: "eager"
      });
      schedulePhotoSlideshowsSync(elements.spotPhotoPreviewSlideshow);
      elements.spotPhotoPreviewWrap.classList.remove("hidden");
      return;
    }
    elements.spotPhotoPreviewSlideshow.innerHTML = "";
    elements.spotPhotoPreviewWrap.classList.add("hidden");
  }

  function normalizeHotspotPhotoDataUrl(value) {
    return normalizeHotspotPhotoRef(value);
  }

  function normalizeHotspotPhotoRef(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "";
    }
    if (isHotspotPhotoDataUrl(raw)) {
      return raw;
    }
    if (isHotspotPhotoRemoteUrl(raw)) {
      try {
        return new URL(raw, window.location.origin).toString();
      } catch (_error) {
        return raw;
      }
    }
    return "";
  }

  function isHotspotPhotoDataUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return false;
    }
    return /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=]+$/i.test(raw);
  }

  function isHotspotPhotoRemoteUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return false;
    }
    try {
      const parsed = new URL(raw, window.location.origin);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (_error) {
      return false;
    }
  }

  function normalizeHotspotPhotoStoragePath(value) {
    const raw = String(value || "").trim().replace(/^\/+/, "");
    if (!raw) {
      return "";
    }
    if (raw.includes("..") || raw.includes("?") || raw.includes("#")) {
      return "";
    }
    if (!/^[a-zA-Z0-9/_\-.]+$/.test(raw)) {
      return "";
    }
    return raw;
  }

  function normalizeSourceImageDataUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "";
    }
    if (!isHotspotPhotoDataUrl(raw)) {
      return "";
    }
    return raw;
  }

  function normalizeHotspotPhotoDataUrls(value) {
    const values = [];
    if (Array.isArray(value)) {
      values.push(...value);
    } else if (typeof value === "string") {
      const raw = value.trim();
      if (raw) {
        if (raw.startsWith("[")) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              values.push(...parsed);
            } else {
              values.push(raw);
            }
          } catch (_error) {
            values.push(raw);
          }
        } else {
          values.push(raw);
        }
      }
    } else if (value) {
      values.push(value);
    }

    const normalized = [];
    const seen = new Set();
    values.forEach((item) => {
      const photoDataUrl = normalizeHotspotPhotoDataUrl(item);
      if (!photoDataUrl || seen.has(photoDataUrl)) {
        return;
      }
      seen.add(photoDataUrl);
      normalized.push(photoDataUrl);
    });
    return normalized;
  }

  function applyHotspotPhotoDataUrlLimits(photoDataUrls) {
    const normalized = normalizeHotspotPhotoDataUrls(photoDataUrls);
    const limited = normalized.slice(0, hotspotPhotoConfig.maxPhotoCount);
    return {
      photoDataUrls: limited,
      trimmedByCount: normalized.length > limited.length,
      trimmedBySize: false
    };
  }

  function getSpotPhotoDataUrls(spot) {
    if (!spot || typeof spot !== "object") {
      return [];
    }
    const photos = normalizeHotspotPhotoDataUrls(
      spot.photoUrls ||
      spot.photo_urls ||
      spot.photoDataUrls ||
      spot.photo_data_urls ||
      []
    );
    if (photos.length > 0) {
      return photos;
    }
    const legacyPhoto = normalizeHotspotPhotoDataUrl(
      spot.photoUrl ||
      spot.photo_url ||
      spot.photoDataUrl ||
      spot.photo_data_url
    );
    return legacyPhoto ? [legacyPhoto] : [];
  }

  function normalizeHotspotPhotoStoragePaths(value) {
    const values = [];
    if (Array.isArray(value)) {
      values.push(...value);
    } else if (typeof value === "string") {
      const raw = value.trim();
      if (raw) {
        if (raw.startsWith("[")) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              values.push(...parsed);
            } else {
              values.push(raw);
            }
          } catch (_error) {
            values.push(raw);
          }
        } else {
          values.push(raw);
        }
      }
    } else if (value) {
      values.push(value);
    }
    return values.map((item) => normalizeHotspotPhotoStoragePath(item));
  }

  function alignHotspotPhotoStoragePaths(photoDataUrls, storagePaths) {
    const normalizedPhotos = normalizeHotspotPhotoDataUrls(photoDataUrls);
    const normalizedPaths = normalizeHotspotPhotoStoragePaths(storagePaths);
    return normalizedPhotos.map((photoDataUrl, index) => {
      const explicitPath = normalizeHotspotPhotoStoragePath(normalizedPaths[index]);
      if (explicitPath) {
        return explicitPath;
      }
      return extractStoragePathFromHotspotPhotoRef(photoDataUrl);
    });
  }

  function getSpotPhotoStoragePaths(spot) {
    if (!spot || typeof spot !== "object") {
      return [];
    }
    const photos = getSpotPhotoDataUrls(spot);
    if (photos.length === 0) {
      return [];
    }
    return alignHotspotPhotoStoragePaths(
      photos,
      normalizeHotspotPhotoStoragePaths(
        spot.photoStoragePaths ||
        spot.photo_storage_paths ||
        []
      )
    );
  }

  function extractStoragePathFromHotspotPhotoRef(photoRef) {
    if (!isHotspotPhotoRemoteUrl(photoRef)) {
      return "";
    }
    try {
      const parsed = new URL(String(photoRef));
      const hostname = String(parsed.hostname || "").toLowerCase();
      if (!hostname) {
        return "";
      }
      if (hostname === "storage.googleapis.com") {
        const chunks = parsed.pathname.split("/").filter(Boolean);
        if (chunks.length >= 2) {
          return normalizeHotspotPhotoStoragePath(decodeURIComponent(chunks.slice(1).join("/")));
        }
        return "";
      }
      if (hostname.includes("firebasestorage.googleapis.com")) {
        const match = parsed.pathname.match(/\/o\/(.+)$/);
        if (match && match[1]) {
          return normalizeHotspotPhotoStoragePath(decodeURIComponent(match[1]));
        }
        return "";
      }
      if (hostname.endsWith(".firebasestorage.app")) {
        const match = parsed.pathname.match(/\/o\/(.+)$/);
        if (match && match[1]) {
          return normalizeHotspotPhotoStoragePath(decodeURIComponent(match[1]));
        }
      }
      return "";
    } catch (_error) {
      return "";
    }
  }

  function buildSpotPhotoSlides(photoDataUrls, altBaseText) {
    const normalized = normalizeHotspotPhotoDataUrls(photoDataUrls);
    const safeAltBase = String(altBaseText || "현안 사진").trim() || "현안 사진";
    return normalized.map((photoDataUrl, index) => {
      const suffix = normalized.length > 1 ? " (" + String(index + 1) + "/" + String(normalized.length) + ")" : "";
      return {
        src: photoDataUrl,
        alt: safeAltBase + suffix
      };
    });
  }

  async function optimizeHotspotPhotoFile(file) {
    const fileType = String(file && file.type ? file.type : "").toLowerCase();
    if (!fileType.startsWith("image/")) {
      throw new Error("이미지 파일만 첨부할 수 있습니다.");
    }
    if (!Number.isFinite(file.size) || file.size <= 0) {
      throw new Error("파일을 읽을 수 없습니다.");
    }

    const imageDataUrl = await readFileAsDataUrl(file);
    try {
      return await optimizeHotspotPhotoDataUrl(imageDataUrl);
    } catch (error) {
      const message = toMessage(error);
      const isHeicLike = fileType.includes("heic") || fileType.includes("heif");
      if (isHeicLike && message.includes("이미지 디코딩에 실패")) {
        throw new Error("이 브라우저에서 HEIC/HEIF 디코딩을 지원하지 않습니다. Safari 최신 버전 사용 또는 JPG/PNG로 변환 후 업로드해 주세요.");
      }
      throw error;
    }
  }

  async function optimizeHotspotPhotoDataUrl(dataUrl) {
    const normalizedSource = normalizeSourceImageDataUrl(dataUrl);
    if (!normalizedSource) {
      throw new Error("이미지 데이터 형식이 올바르지 않습니다.");
    }
    const imageDataUrl = normalizedSource;
    const image = await loadImageElement(imageDataUrl);
    const width = image.naturalWidth || image.width || 0;
    const height = image.naturalHeight || image.height || 0;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error("이미지 크기를 확인할 수 없습니다.");
    }

    const ratio = width > hotspotPhotoConfig.maxWidth
      ? hotspotPhotoConfig.maxWidth / width
      : 1;
    const targetWidth = Math.max(1, Math.round(width * ratio));
    const targetHeight = Math.max(1, Math.round(height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("브라우저에서 이미지 변환을 지원하지 않습니다.");
    }
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const watermarkImage = await getHotspotWatermarkImage();
    const watermarkWidth = watermarkImage.naturalWidth || watermarkImage.width || 0;
    const watermarkHeight = watermarkImage.naturalHeight || watermarkImage.height || 0;
    if (!Number.isFinite(watermarkWidth) || !Number.isFinite(watermarkHeight) || watermarkWidth <= 0 || watermarkHeight <= 0) {
      throw new Error("워터마크 이미지를 읽을 수 없습니다.");
    }
    const targetWatermarkWidth = Math.max(1, Math.min(hotspotPhotoConfig.watermarkWidth, targetWidth));
    const watermarkScale = targetWatermarkWidth / watermarkWidth;
    const targetWatermarkHeight = Math.max(1, Math.round(watermarkHeight * watermarkScale));
    const watermarkX = Math.round((targetWidth - targetWatermarkWidth) / 2);
    const watermarkY = Math.round((targetHeight - targetWatermarkHeight) / 2);
    context.drawImage(
      watermarkImage,
      watermarkX,
      watermarkY,
      targetWatermarkWidth,
      targetWatermarkHeight
    );

    const encoded = canvas.toDataURL("image/jpeg", hotspotPhotoConfig.jpegQuality);
    const normalized = normalizeSourceImageDataUrl(encoded);
    if (!normalized) {
      throw new Error("이미지 변환 결과가 올바르지 않습니다.");
    }
    return normalized;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(String(reader.result || ""));
      };
      reader.onerror = () => {
        reject(new Error("이미지 파일을 읽지 못했습니다."));
      };
      reader.readAsDataURL(file);
    });
  }

  async function getHotspotWatermarkImage() {
    if (hotspotWatermarkImagePromise) {
      return hotspotWatermarkImagePromise;
    }
    hotspotWatermarkImagePromise = loadImageElement(hotspotPhotoConfig.watermarkSrc)
      .catch((error) => {
        hotspotWatermarkImagePromise = null;
        throw new Error("워터마크 로드 실패: " + toMessage(error));
      });
    return hotspotWatermarkImagePromise;
  }

  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("이미지 디코딩에 실패했습니다."));
      image.src = src;
    });
  }

  function sanitizeStoragePathSegment(value) {
    const sanitized = String(value || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return sanitized || "spot";
  }

  function createHotspotPhotoRandomId() {
    const bytes = new Uint8Array(8);
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  }

  function buildHotspotPhotoStoragePath(spotId) {
    const safeSpotId = sanitizeStoragePathSegment(spotId);
    const timestamp = Date.now();
    const randomId = createHotspotPhotoRandomId();
    return hotspotPhotoConfig.storagePathPrefix + "/" + safeSpotId + "/" + String(timestamp) + "-" + randomId + ".jpg";
  }

  function assertHotspotPhotoStorageReady() {
    if (!state.storage) {
      throw new Error("Firebase Storage가 초기화되지 않았습니다. firebase-storage-compat.js 로드 여부를 확인해 주세요.");
    }
    return state.storage;
  }

  async function uploadHotspotPhotoDataUrlToStorage(spotId, photoDataUrl) {
    const storage = assertHotspotPhotoStorageReady();
    const normalizedSource = normalizeSourceImageDataUrl(photoDataUrl);
    if (!normalizedSource) {
      throw new Error("업로드할 이미지 데이터 형식이 올바르지 않습니다.");
    }
    const path = buildHotspotPhotoStoragePath(spotId);
    const storageRef = storage.ref(path);
    await storageRef.putString(normalizedSource, "data_url", {
      contentType: "image/jpeg",
      cacheControl: "public,max-age=31536000,immutable"
    });
    const url = await storageRef.getDownloadURL();
    return { path, url };
  }

  function buildSpotPhotoStoragePathQueue(spot) {
    const queue = new Map();
    if (!spot) {
      return queue;
    }
    const photoRefs = getSpotPhotoDataUrls(spot);
    const storagePaths = getSpotPhotoStoragePaths(spot);
    photoRefs.forEach((photoRef, index) => {
      const normalizedRef = normalizeHotspotPhotoDataUrl(photoRef);
      const normalizedPath = normalizeHotspotPhotoStoragePath(storagePaths[index]);
      if (!normalizedRef || !normalizedPath) {
        return;
      }
      if (!queue.has(normalizedRef)) {
        queue.set(normalizedRef, []);
      }
      queue.get(normalizedRef).push(normalizedPath);
    });
    return queue;
  }

  function shiftSpotPhotoStoragePath(queue, photoRef) {
    if (!queue || !(queue instanceof Map)) {
      return "";
    }
    const normalizedRef = normalizeHotspotPhotoDataUrl(photoRef);
    if (!normalizedRef || !queue.has(normalizedRef)) {
      return "";
    }
    const values = queue.get(normalizedRef);
    if (!Array.isArray(values) || values.length === 0) {
      queue.delete(normalizedRef);
      return "";
    }
    const next = normalizeHotspotPhotoStoragePath(values.shift());
    if (values.length === 0) {
      queue.delete(normalizedRef);
    }
    return next;
  }

  function collectRemovedSpotPhotoStoragePaths(spot, nextStoragePaths) {
    if (!spot) {
      return [];
    }
    const currentPaths = normalizeHotspotPhotoStoragePaths(getSpotPhotoStoragePaths(spot))
      .filter(Boolean);
    if (currentPaths.length === 0) {
      return [];
    }
    const nextPathSet = new Set(
      normalizeHotspotPhotoStoragePaths(nextStoragePaths)
        .filter(Boolean)
    );
    return currentPaths.filter((path) => !nextPathSet.has(path));
  }

  function isStorageObjectNotFoundError(error) {
    const code = String(error && error.code ? error.code : "").toLowerCase();
    return code === "storage/object-not-found" || code === "object-not-found";
  }

  async function deleteSpotPhotoStoragePaths(paths) {
    if (!state.storage) {
      return;
    }
    const uniquePaths = [];
    const seen = new Set();
    normalizeHotspotPhotoStoragePaths(paths).forEach((path) => {
      if (!path || seen.has(path)) {
        return;
      }
      seen.add(path);
      uniquePaths.push(path);
    });
    for (const path of uniquePaths) {
      try {
        await state.storage.ref(path).delete();
      } catch (error) {
        if (isStorageObjectNotFoundError(error)) {
          continue;
        }
        console.warn("[spot-photo-delete]", path, toMessage(error));
      }
    }
  }

  async function readBlobAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("이미지 응답을 읽지 못했습니다."));
      reader.readAsDataURL(blob);
    });
  }

  async function fetchHotspotPhotoUrlAsDataUrl(photoUrl) {
    const response = await fetch(String(photoUrl), { cache: "no-store" });
    if (!response.ok) {
      throw new Error("기존 사진 다운로드 실패 (" + String(response.status) + ")");
    }
    const blob = await response.blob();
    if (!blob || !Number.isFinite(blob.size) || blob.size <= 0) {
      throw new Error("기존 사진 응답이 비어 있습니다.");
    }
    const sourceDataUrl = await readBlobAsDataUrl(blob);
    const normalized = normalizeSourceImageDataUrl(sourceDataUrl);
    if (!normalized) {
      const blobType = String(blob.type || "").trim() || "-";
      throw new Error("기존 사진 형식이 이미지가 아닙니다. (content-type: " + blobType + ")");
    }
    return normalized;
  }

  async function fetchHotspotPhotoDataUrlByStoragePath(path) {
    const storage = assertHotspotPhotoStorageReady();
    const normalizedPath = normalizeHotspotPhotoStoragePath(path);
    if (!normalizedPath) {
      throw new Error("기존 사진의 Storage 경로가 올바르지 않습니다.");
    }
    const downloadUrl = await storage.ref(normalizedPath).getDownloadURL();
    return await fetchHotspotPhotoUrlAsDataUrl(downloadUrl);
  }

  async function optimizeHotspotPhotoReference(photoRef, options) {
    const preferredStoragePath = normalizeHotspotPhotoStoragePath(options && options.preferredStoragePath);
    if (isHotspotPhotoDataUrl(photoRef)) {
      return await optimizeHotspotPhotoDataUrl(photoRef);
    }
    if (preferredStoragePath) {
      try {
        const sourceDataUrl = await fetchHotspotPhotoDataUrlByStoragePath(preferredStoragePath);
        return await optimizeHotspotPhotoDataUrl(sourceDataUrl);
      } catch (preferredError) {
        console.warn("[photo-reprocess-storage-path]", preferredStoragePath, toMessage(preferredError));
      }
    }
    if (isHotspotPhotoRemoteUrl(photoRef)) {
      let sourceDataUrl = "";
      try {
        sourceDataUrl = await fetchHotspotPhotoUrlAsDataUrl(photoRef);
      } catch (primaryError) {
        const storagePath = extractStoragePathFromHotspotPhotoRef(photoRef);
        if (!storagePath) {
          throw new Error("기존 사진 다운로드 실패: " + toMessage(primaryError));
        }
        try {
          sourceDataUrl = await fetchHotspotPhotoDataUrlByStoragePath(storagePath);
        } catch (fallbackError) {
          throw new Error(
            "기존 사진 다운로드 실패: " + toMessage(primaryError) +
            " / Storage 경로 재시도 실패: " + toMessage(fallbackError)
          );
        }
      }
      return await optimizeHotspotPhotoDataUrl(sourceDataUrl);
    }
    throw new Error("이미지 데이터 형식이 올바르지 않습니다.");
  }

  async function persistHotspotPhotoRefs(spotId, photoRefs, existingSpot, onPhotoUploadProgress) {
    const normalized = normalizeHotspotPhotoDataUrls(photoRefs);
    const limited = normalized.slice(0, hotspotPhotoConfig.maxPhotoCount);
    const existingPathQueue = buildSpotPhotoStoragePathQueue(existingSpot);
    const uploadTotal = countHotspotPhotoUploads(limited);
    const reportPhotoUploadProgress = typeof onPhotoUploadProgress === "function"
      ? onPhotoUploadProgress
      : null;
    const photoUrls = [];
    const photoStoragePaths = [];
    const uploadedStoragePaths = [];
    let uploadedCount = 0;

    for (const photoRef of limited) {
      if (isHotspotPhotoDataUrl(photoRef)) {
        if (reportPhotoUploadProgress) {
          reportPhotoUploadProgress({
            currentIndex: uploadedCount + 1,
            uploadedCount,
            total: uploadTotal
          });
        }
        const uploaded = await uploadHotspotPhotoDataUrlToStorage(spotId, photoRef);
        uploadedCount += 1;
        photoUrls.push(uploaded.url);
        photoStoragePaths.push(uploaded.path);
        uploadedStoragePaths.push(uploaded.path);
        continue;
      }
      const normalizedRef = normalizeHotspotPhotoDataUrl(photoRef);
      if (!normalizedRef) {
        continue;
      }
      const preservedPath =
        shiftSpotPhotoStoragePath(existingPathQueue, normalizedRef) ||
        extractStoragePathFromHotspotPhotoRef(normalizedRef);
      photoUrls.push(normalizedRef);
      photoStoragePaths.push(normalizeHotspotPhotoStoragePath(preservedPath));
    }

    return {
      photoUrls,
      photoStoragePaths,
      uploadedStoragePaths
    };
  }

  async function handleHotspotSubmit(event) {
    event.preventDefault();
    if (!isEditMode()) {
      return;
    }
    if (state.hotspotSubmitInProgress) {
      setSpotSaveStatus("이미 저장 중입니다. 완료될 때까지 잠시만 기다려 주세요.", false);
      return;
    }
    if (!state.currentUser) {
      window.alert("로그인 상태가 아닙니다.");
      return;
    }
    if (state.spotPhotoProcessingInProgress) {
      setSpotSaveStatus("사진을 처리하는 중입니다. 완료된 뒤 다시 저장해 주세요.", false);
      return;
    }

    state.hotspotSubmitInProgress = true;
    let submitUiLocked = false;
    let unlockStatusMessage = "";
    let unlockStatusIsError = false;
    try {
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
      const photoLimitResult = applyHotspotPhotoDataUrlLimits(
        normalizeHotspotPhotoDataUrls(formData.get("photoDataUrls"))
      );
      const photoDataUrls = photoLimitResult.photoDataUrls;
      if (photoLimitResult.trimmedByCount) {
        window.alert("사진은 최대 " + String(hotspotPhotoConfig.maxPhotoCount) + "장까지 첨부할 수 있습니다.");
      }
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
      const selectedDongKey = String(formData.get("dongKey") || DONG_AUTO_KEY).trim() || DONG_AUTO_KEY;
      const isCommonSelection = selectedDongKey === DONG_COMMON_KEY;
      const selectedDongMeta = resolveDongMetaByKey(selectedDongKey);
      const usingManualDong = Boolean(selectedDongMeta) && !isCommonSelection;
      const finalDongNameRaw = isCommonSelection
        ? DONG_COMMON_NAME
        : usingManualDong
        ? String(selectedDongMeta.dongName || "").trim()
        : String(boundaryMeta.dongName || "").trim();
      const finalDongName = resolveMergedDongName(finalDongNameRaw);
      const finalEmdCode = isCommonSelection
        ? ""
        : usingManualDong
        ? normalizeEmdCode(selectedDongMeta.emdCode)
        : normalizeEmdCode(boundaryMeta.emdCode);
      const finalDongKey = isCommonSelection
        ? DONG_COMMON_KEY
        : buildDongKey("", finalDongName);

      if (!finalDongName) {
        window.alert("동을 판별하지 못했습니다. '동 선택'에서 직접 지정하세요.");
        return;
      }

      const photoUploadCount = countHotspotPhotoUploads(photoDataUrls);
      setHotspotSubmitUi(true, buildHotspotSavingMessage(photoUploadCount), false);
      submitUiLocked = true;

      const collectionName = getIssueCollectionName();
      const editingSpotId = state.editingHotspotId;
      const collectionRef = state.db.collection(collectionName);
      const targetDocRef = editingSpotId
        ? collectionRef.doc(editingSpotId)
        : collectionRef.doc();
      const targetSpotId = String(targetDocRef.id || "").trim();
      const existingSpot = editingSpotId ? state.hotspotData.get(editingSpotId) : null;
      let uploadedStoragePaths = [];

      try {
        const persistedPhotos = await persistHotspotPhotoRefs(
          targetSpotId,
          photoDataUrls,
          existingSpot,
          (progress) => {
            const total = Number(progress && progress.total ? progress.total : 0);
            const currentIndex = Number(progress && progress.currentIndex ? progress.currentIndex : 0);
            if (total > 0 && currentIndex > 0) {
              setSpotSaveStatus(
                "사진 " + String(currentIndex) + " / " + String(total) + " 업로드 중입니다. 완료될 때까지 잠시만 기다려 주세요.",
                false
              );
            }
          }
        );
        uploadedStoragePaths = persistedPhotos.uploadedStoragePaths;
        setSpotSaveStatus("현안 내용을 저장하는 중입니다.", false);
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
          dongSelectionMode: isCommonSelection ? "common" : usingManualDong ? "manual" : "auto",
          dongKey: finalDongKey,
          photoUrls: persistedPhotos.photoUrls,
          photoUrl: persistedPhotos.photoUrls[0] || "",
          photoStoragePaths: persistedPhotos.photoStoragePaths,
          photoProcessingVersion: hotspotPhotoConfig.processingVersion,
          updatedBy: normalizeEmail(state.currentUser.email),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (editingSpotId) {
          payload.photoDataUrls = firebase.firestore.FieldValue.delete();
          payload.photoDataUrl = firebase.firestore.FieldValue.delete();
          payload.photo_data_urls = firebase.firestore.FieldValue.delete();
          payload.photo_data_url = firebase.firestore.FieldValue.delete();
          await targetDocRef.update(payload);
        } else {
          await targetDocRef.set(payload);
        }

        const removedStoragePaths = collectRemovedSpotPhotoStoragePaths(
          existingSpot,
          persistedPhotos.photoStoragePaths
        );
        if (removedStoragePaths.length > 0) {
          void deleteSpotPhotoStoragePaths(removedStoragePaths);
        }
        setSpotSaveStatus("저장 완료. 목록을 갱신하는 중입니다.", false);
        exitHotspotEditMode(true);
      } catch (error) {
        if (uploadedStoragePaths.length > 0) {
          await deleteSpotPhotoStoragePaths(uploadedStoragePaths);
        }
        unlockStatusMessage = "저장에 실패했습니다. 내용을 확인한 뒤 다시 시도하세요.";
        unlockStatusIsError = true;
        window.alert("현안 저장 실패: " + toMessage(error));
      }
    } finally {
      state.hotspotSubmitInProgress = false;
      if (submitUiLocked) {
        setHotspotSubmitUi(false, unlockStatusMessage, unlockStatusIsError);
      }
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
    setSpotPhotoDataUrls(getSpotPhotoDataUrls(spot));
    setSpotPhotoReprocessStatus("", false);
    setSpotSaveStatus("", false);
    clearSpotPhotoFileInput();
    if (issueRefSelect) {
      syncIssueCatalogSelectOptions(spot.issueRefId || "");
    }

    if (elements.spotDongSelect) {
      let preferredDongKey = DONG_AUTO_KEY;
      if (spot.dongSelectionMode === "common" || isCommonSpot(spot)) {
        preferredDongKey = DONG_COMMON_KEY;
      } else if (spot.dongSelectionMode === "manual") {
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
      setSpotPhotoDataUrls([]);
      setSpotPhotoReprocessStatus("", false);
      setSpotSaveStatus("", false);
      clearSpotPhotoFileInput();
      if (elements.spotIssueRefSelect) {
        syncIssueCatalogSelectOptions("");
      } else {
        applyIssueCatalogSelection("");
      }
      syncDongSelectOptions(DONG_AUTO_KEY);
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
    const spotPhotoStoragePaths = getSpotPhotoStoragePaths(spot);
    const confirmed = window.confirm("'" + title + "' 현안을 삭제할까요?");
    if (!confirmed) {
      return;
    }

    const collectionName = getIssueCollectionName();
    try {
      await state.db.collection(collectionName).doc(targetId).delete();
      if (spotPhotoStoragePaths.length > 0) {
        void deleteSpotPhotoStoragePaths(spotPhotoStoragePaths);
      }
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

      setCurrentLocationIndicator(lat, lng);
      setSelectedCoord(lat, lng);
      if (state.map) {
        const hasBoundaryData = Boolean(
          state.boundariesLoaded &&
          state.boundarySource &&
          state.boundarySource.getFeatures().length > 0
        );
        if (hasBoundaryData) {
          const boundaryMeta = resolveBoundaryMetaForLonLat(lng, lat);
          const isOutsideBoundary = !boundaryMeta.dongName && !boundaryMeta.emdCode;
          if (isOutsideBoundary) {
            const fitted = fitMapToBoundaryExtent({
              padding: getRegionMapFocusPadding(),
              duration: MAP_VIEW_FIT_ANIMATION_MS,
              maxZoom: 16
            });
            if (fitted) {
              return;
            }
          }
        }
        const view = state.map.getView();
        const currentZoom = view.getZoom();
        const nextZoom = Number.isFinite(currentZoom) && currentZoom > 16 ? currentZoom : 16;
        animateMapView(view, {
          center: ol.proj.fromLonLat([lng, lat]),
          zoom: nextZoom,
          duration: MAP_VIEW_CENTER_ANIMATION_MS
        }, MAP_VIEW_CENTER_ANIMATION_MS);
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
    const mergedDongName = resolveMergedDongName(dongName);
    const safeName = escapeHtml(mergedDongName || dongName || "동 경계");
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

  function openHotspotPopup(coordinate, spot, options) {
    if (!spot) {
      return;
    }
    const safeSpotId = escapeHtml(String(spot.id || "").trim());
    const rawTitle = String(spot.title || "").trim() || "현안";
    const safeTitle = escapeHtml(rawTitle);
    const safeMemo = escapeHtml(spot.memo || "-");
    const safeCategory = escapeHtml(resolveCategoryLabel(spot.categoryId, spot.categoryLabel));
    const safeDong = escapeHtml(formatSpotDongLabel(spot));
    const safeUser = escapeHtml(spot.updatedBy || "-");
    const safeTime = escapeHtml(formatTimestamp(spot.updatedAt));
    const photoDataUrls = getSpotPhotoDataUrls(spot);
    const titleWithPhotoBadge = photoDataUrls.length > 0
      ? safeTitle + " <span class='spot-title-photo-badge' aria-label='사진 첨부'>🖼️</span>"
      : safeTitle;
    clearPhotoSlideshowsByPrefix("map-popup-");
    const popupPhotoSlides = buildSpotPhotoSlides(photoDataUrls, rawTitle + " 사진");
    const popupSlideshowId = popupPhotoSlides.length > 0
      ? createPhotoSlideshowId("map-popup")
      : "";
    const photoHtml = popupPhotoSlides.length > 0
      ? buildPhotoSlideshowHtml({
        slideshowId: popupSlideshowId,
        slides: popupPhotoSlides,
        wrapperClassName: "map-popup-photo-wrap",
        imageClassName: "map-popup-photo",
        loading: "eager"
      })
      : "";

    const editorInfo = isEditMode()
      ? "<div>수정자: " + safeUser + "</div><div>수정시각: " + safeTime + "</div>"
      : "";
    const popupActions = (isEditMode() && safeSpotId)
      ? (
        "<div class='map-popup-actions'>" +
          "<button type='button' class='btn-secondary btn-small spot-action-btn' data-action='edit-spot' data-spot-id='" + safeSpotId + "'>수정</button>" +
          "<button type='button' class='btn-secondary btn-small spot-action-btn danger' data-action='delete-spot' data-spot-id='" + safeSpotId + "'>삭제</button>" +
        "</div>"
      )
      : "";
    openPopup(
      coordinate,
      "<strong>" + titleWithPhotoBadge + "</strong>" +
      photoHtml +
      "<div>분류: " + safeCategory + "</div>" +
      "<div>소속 동: " + safeDong + "</div>" +
      "<div>내용: " + safeMemo + "</div>" +
      editorInfo +
      popupActions,
      {
        clearsHotspotSelection: true,
        alignToVisibleCenter: true,
        hasPhoto: photoDataUrls.length > 0,
        returnFocusElement: options && options.returnFocusElement,
        focusPopup: Boolean(options && options.focusPopup)
      }
    );
  }

  function openIssueGroupPopup(coordinate, group) {
    if (!group) {
      return;
    }

    const safeTitle = escapeHtml(group.title || "현안 그룹");
    const safeCategory = escapeHtml(resolveCategoryLabel(group.categoryId, group.categoryLabel));
    const countLabel = String(Array.isArray(group.spots) ? group.spots.length : 0);
    const dongNames = Array.isArray(group.dongNames)
      ? group.dongNames
      : [];
    const safeDongs = escapeHtml(dongNames.join(", ") || "동 정보 없음");

    openPopup(
      coordinate,
      "<strong>" + safeTitle + "</strong>" +
      "<div>분류: " + safeCategory + "</div>" +
      "<div>포인트 수: " + countLabel + "곳</div>" +
      "<div>대상 동: " + safeDongs + "</div>"
    );
  }

  function resolvePopupReturnFocusElement(candidate) {
    if (candidate instanceof HTMLElement && candidate.isConnected) {
      return candidate;
    }
    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLElement &&
      activeElement !== document.body &&
      activeElement !== elements.mapPopup &&
      !(elements.mapPopup && elements.mapPopup.contains(activeElement))
    ) {
      return activeElement;
    }
    return elements.map instanceof HTMLElement ? elements.map : null;
  }

  function restoreMapPopupFocus() {
    const focusTarget = resolvePopupReturnFocusElement(state.mapPopupReturnFocusElement);
    state.mapPopupReturnFocusElement = null;
    if (!focusTarget || typeof focusTarget.focus !== "function") {
      return;
    }
    focusTarget.focus({ preventScroll: true });
  }

  function openPopup(coordinate, html, options) {
    if (!state.popupOverlay || !elements.mapPopup) {
      return;
    }
    clearMapPopupCloseTimer();
    clearPhotoSlideshowsByPrefix("map-popup-");
    state.mapPopupReturnFocusElement = resolvePopupReturnFocusElement(options && options.returnFocusElement);
    state.mapPopupDismissClearsDongFilter = Boolean(options && options.dismissClearsDongFilter);
    state.mapPopupClearsHotspotSelection = Boolean(options && options.clearsHotspotSelection);
    elements.mapPopup.innerHTML =
      "<button type='button' class='map-popup-close' data-action='close-popup' aria-label='현안 팝업 닫기' title='닫기'>" +
        getPhotoControlIconMarkup("close") +
      "</button>" +
      "<div class='map-popup-body'>" + String(html || "") + "</div>";
    schedulePhotoSlideshowsSync(elements.mapPopup);
    elements.mapPopup.style.pointerEvents = "auto";
    elements.mapPopup.classList.remove("hidden", "map-popup-closing");
    elements.mapPopup.setAttribute("aria-hidden", "false");
    const popupPhoto = elements.mapPopup.querySelector(".map-popup-photo");
    if (popupPhoto instanceof HTMLImageElement) {
      popupPhoto.style.cursor = "zoom-in";
    }
    state.popupOverlay.setPosition(coordinate);
    window.dispatchEvent(new CustomEvent("map-popup-opened", {
      detail: {
        hasPhoto: Boolean(options && options.hasPhoto)
      }
    }));
    if (options && options.alignToVisibleCenter) {
      window.requestAnimationFrame(() => {
        alignOpenMapPopupToVisibleCenter({
          duration: options.alignDuration,
          hasPhoto: Boolean(options.hasPhoto)
        });
      });
    }
    if (options && options.focusPopup) {
      window.requestAnimationFrame(() => {
        const closeButton = elements.mapPopup && elements.mapPopup.querySelector("[data-action='close-popup']");
        if (closeButton instanceof HTMLElement) {
          closeButton.focus({ preventScroll: true });
        }
      });
    }
  }

  function closePopup(options) {
    if (!state.popupOverlay || !elements.mapPopup) {
      return false;
    }
    if (elements.mapPopup.classList.contains("hidden") || elements.mapPopup.classList.contains("map-popup-closing")) {
      return false;
    }

    const immediate = Boolean(options && options.immediate);
    const shouldRestoreFocus = Boolean(options && options.restoreFocus);
    const shouldClearHotspotSelection = Boolean(state.mapPopupClearsHotspotSelection);
    elements.mapPopup.classList.add("map-popup-closing");
    elements.mapPopup.setAttribute("aria-hidden", "true");
    elements.mapPopup.style.pointerEvents = "none";
    if (shouldClearHotspotSelection) {
      clearHighlightedHotspots();
    }

    const finishClose = () => {
      if (!elements.mapPopup || !state.popupOverlay) {
        return;
      }
      elements.mapPopup.classList.add("hidden");
      elements.mapPopup.classList.remove("map-popup-closing");
      elements.mapPopup.innerHTML = "";
      clearPhotoSlideshowsByPrefix("map-popup-");
      state.popupOverlay.setPosition(undefined);
      state.mapPopupDismissClearsDongFilter = false;
      state.mapPopupClearsHotspotSelection = false;
      state.mapPopupCloseTimer = null;
      if (shouldRestoreFocus) {
        restoreMapPopupFocus();
      } else {
        state.mapPopupReturnFocusElement = null;
      }
    };

    if (immediate || prefersReducedMotion()) {
      clearMapPopupCloseTimer();
      finishClose();
      return true;
    }

    clearMapPopupCloseTimer();
    state.mapPopupCloseTimer = window.setTimeout(finishClose, MAP_POPUP_CLOSE_ANIMATION_MS);
    return true;
  }

  function dismissMapPopup(options) {
    const shouldClearDongFilter = Boolean(state.mapPopupDismissClearsDongFilter && getActiveDongFilterName());
    const didClose = closePopup({
      immediate: Boolean(options && options.immediate),
      restoreFocus: true
    });
    if (!didClose) {
      return false;
    }
    if (shouldClearDongFilter) {
      clearActiveIssueFilter({
        animateList: true
      });
    }
    return true;
  }

  function clearMapPopupCloseTimer() {
    if (!state.mapPopupCloseTimer) {
      return;
    }
    window.clearTimeout(state.mapPopupCloseTimer);
    state.mapPopupCloseTimer = null;
  }

  function prefersReducedMotion() {
    return Boolean(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  async function resolveStaffAccess(user) {
    if (!user || typeof user.getIdTokenResult !== "function") {
      return {
        ok: false,
        isStaff: false,
        reason: "인증 토큰을 확인할 수 없습니다."
      };
    }

    try {
      const cached = await user.getIdTokenResult(false);
      if (hasStaffClaim(cached && cached.claims)) {
        return { ok: true, isStaff: true, reason: "" };
      }
      const refreshed = await user.getIdTokenResult(true);
      return {
        ok: true,
        isStaff: hasStaffClaim(refreshed && refreshed.claims),
        reason: ""
      };
    } catch (error) {
      return {
        ok: false,
        isStaff: false,
        reason: toMessage(error)
      };
    }
  }

  function hasStaffClaim(claims) {
    const raw = claims ? claims.staff : undefined;
    return raw === true || raw === "true" || raw === 1 || raw === "1";
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

  function toAuthErrorMessage(error) {
    const code = String(error && error.code ? error.code : "").toLowerCase();
    if (code === "auth/popup-closed-by-user") {
      return "로그인 창이 닫혀 인증이 완료되지 않았습니다. 다시 시도하세요.";
    }
    if (code === "auth/popup-blocked") {
      return "브라우저가 로그인 팝업을 차단했습니다. 팝업 허용 후 다시 시도하세요.";
    }
    if (code === "auth/unauthorized-domain") {
      return "Firebase Authentication Authorized domains에 현재 도메인이 등록되지 않았습니다.";
    }
    if (code === "auth/network-request-failed") {
      return "네트워크 오류로 인증 요청에 실패했습니다. 네트워크/보안 확장 기능을 확인하세요.";
    }
    if (code === "auth/cancelled-popup-request") {
      return "이미 로그인 요청이 진행 중입니다. 잠시 후 다시 시도하세요.";
    }
    return toMessage(error);
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

  exposeSpotListTestHooks();
})();
