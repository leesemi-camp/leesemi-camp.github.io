const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadAppConfig() {
  const filePath = path.resolve(process.cwd(), "config.js");
  const code = fs.readFileSync(filePath, "utf8");
  const context = { window: {} };
  vm.runInNewContext(code, context, { filename: "config.js" });
  if (!context.window || !context.window.APP_CONFIG) {
    throw new Error("APP_CONFIG not found in config.js");
  }
  return context.window.APP_CONFIG;
}

function resolveUrl(baseURL, value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  return new URL(raw, baseURL).toString();
}

function resolveBoundarySources(config) {
  const dataConfig = config && config.data ? config.data : {};
  const boundarySources = Array.isArray(dataConfig.boundarySources)
    ? dataConfig.boundarySources.filter(Boolean)
    : [];
  if (boundarySources.length > 0) {
    return boundarySources;
  }
  if (dataConfig.boundaryGeoJsonPath) {
    return [dataConfig.boundaryGeoJsonPath];
  }
  return ["./data/dong-boundaries.sample.geojson"];
}

function buildIssueCatalogRequest(config, baseURL) {
  const dataConfig = config && config.data ? config.data : {};
  const issueCatalog = dataConfig.issueCatalog || {};
  const apiUrl = String(issueCatalog.apiUrl || "").trim();
  if (!apiUrl) {
    return null;
  }
  const parsedUrl = new URL(apiUrl, baseURL);
  const token = String(issueCatalog.token || "").trim();
  const tokenQueryKey = String(issueCatalog.tokenQueryKey || "").trim();
  if (token && tokenQueryKey && !parsedUrl.searchParams.has(tokenQueryKey)) {
    parsedUrl.searchParams.set(tokenQueryKey, token);
  }
  if (issueCatalog.queryParams && typeof issueCatalog.queryParams === "object") {
    Object.keys(issueCatalog.queryParams).forEach((key) => {
      const rawValue = issueCatalog.queryParams[key];
      if (rawValue === null || rawValue === undefined) {
        return;
      }
      parsedUrl.searchParams.set(key, String(rawValue));
    });
  }
  return {
    name: "data.issueCatalog",
    url: parsedUrl.toString(),
    options: { method: "GET", headers: {} },
    tokens: [token]
  };
}

function buildOverlayRequest(config, baseURL, kind) {
  const traffic = config && config.trafficOverlays ? config.trafficOverlays : {};
  const entry = traffic && typeof traffic[kind] === "object" ? traffic[kind] : {};
  const url = String(entry.url || "").trim();
  if (!url) {
    return null;
  }
  const parsedUrl = new URL(url, baseURL);
  const headers = {};
  if (traffic.headers && typeof traffic.headers === "object") {
    Object.assign(headers, traffic.headers);
  }
  if (entry.headers && typeof entry.headers === "object") {
    Object.assign(headers, entry.headers);
  }

  const token = String(entry.token || traffic.token || "").trim();
  const tokenQueryKey = String(entry.tokenQueryKey || traffic.tokenQueryKey || "").trim();
  const tokenHeaderKey = String(entry.tokenHeaderKey || traffic.tokenHeaderKey || "").trim();

  if (token && tokenHeaderKey && !headers[tokenHeaderKey]) {
    headers[tokenHeaderKey] = token;
  }
  if (token && tokenQueryKey && !parsedUrl.searchParams.has(tokenQueryKey)) {
    parsedUrl.searchParams.set(tokenQueryKey, token);
  }

  const method = String(entry.method || "GET").toUpperCase();
  return {
    name: "trafficOverlays." + kind,
    url: parsedUrl.toString(),
    options: { method, headers },
    tokens: [token]
  };
}

function buildPopulationRequest(config, baseURL) {
  const population = config && config.mobilityPopulation ? config.mobilityPopulation : {};
  const dataPath = String(population.dataPath || "").trim();
  if (!dataPath) {
    return null;
  }
  const parsedUrl = new URL(dataPath, baseURL);
  const token = String(population.token || "").trim();
  const tokenQueryKey = String(population.tokenQueryKey || "").trim();
  if (token && tokenQueryKey && !parsedUrl.searchParams.has(tokenQueryKey)) {
    parsedUrl.searchParams.set(tokenQueryKey, token);
  }
  if (population.queryParams && typeof population.queryParams === "object") {
    Object.keys(population.queryParams).forEach((key) => {
      const rawValue = population.queryParams[key];
      if (rawValue === null || rawValue === undefined) {
        return;
      }
      parsedUrl.searchParams.set(key, String(rawValue));
    });
  }
  return {
    name: "mobilityPopulation",
    url: parsedUrl.toString(),
    options: { method: "GET", headers: {} },
    tokens: [token]
  };
}

function buildApiRequests(config, baseURL) {
  const requests = [];
  const missing = [];

  const boundarySources = resolveBoundarySources(config);
  if (!boundarySources || boundarySources.length === 0) {
    throw new Error("Boundary sources must be configured to test API files.");
  }
  boundarySources.forEach((source, index) => {
    requests.push({
      name: "boundarySources[" + index + "]",
      url: resolveUrl(baseURL, source),
      options: { method: "GET", headers: {} },
      tokens: []
    });
  });

  const issueCatalogRequest = buildIssueCatalogRequest(config, baseURL);
  if (issueCatalogRequest) {
    requests.push(issueCatalogRequest);
  } else {
    missing.push("data.issueCatalog.apiUrl");
  }

  const vehicleRequest = buildOverlayRequest(config, baseURL, "vehicle");
  if (vehicleRequest) {
    requests.push(vehicleRequest);
  } else {
    missing.push("trafficOverlays.vehicle.url");
  }

  const pedestrianRequest = buildOverlayRequest(config, baseURL, "pedestrian");
  if (pedestrianRequest) {
    requests.push(pedestrianRequest);
  } else {
    missing.push("trafficOverlays.pedestrian.url");
  }

  const populationRequest = buildPopulationRequest(config, baseURL);
  if (populationRequest) {
    requests.push(populationRequest);
  } else {
    missing.push("mobilityPopulation.dataPath");
  }

  return { requests, missing };
}

module.exports = {
  loadAppConfig,
  resolveUrl,
  resolveBoundarySources,
  buildApiRequests
};
