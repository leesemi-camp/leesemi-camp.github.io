import { test, expect } from "@playwright/test";
import {
  loadAppConfig,
  resolveUrl,
  resolveBoundarySources,
  buildApiRequests
} from "./helpers/config.js";
import { maskTokens, formatRequestForLog } from "./helpers/network.js";

test("Config loads", () => {
  // config.js에서 기본 설정이 로드되는지 확인
  const config = loadAppConfig();
  expect(config).toBeTruthy();
  expect(config.map).toBeTruthy();
  expect(config.data).toBeTruthy();
  expect(Array.isArray(config.data.boundarySources)).toBeTruthy();
});

test("URL resolution works", () => {
  // 상대/절대 경로 변환 로직 확인
  expect(resolveUrl("https://example.com/base/", "  ")).toBe("");
  expect(resolveUrl("https://example.com/base/", "/data/file.json")).toBe(
    "https://example.com/data/file.json"
  );
  expect(resolveUrl("https://example.com/base/", "https://other.com/a")).toBe(
    "https://other.com/a"
  );
});

test("Boundary sources pick defaults", () => {
  // 경계 데이터 소스 선택 규칙 확인
  expect(
    resolveBoundarySources({ data: { boundarySources: ["/a", "", null, "/b"] } })
  ).toEqual(["/a", "/b"]);
  expect(
    resolveBoundarySources({ data: { boundaryGeoJsonPath: "/geo.json" } })
  ).toEqual(["/geo.json"]);
  expect(resolveBoundarySources({ data: {} })).toEqual([
    "./data/dong-boundaries.sample.geojson"
  ]);
});

test("Log masking hides tokens", () => {
  // 로그 출력 시 토큰 마스킹 확인
  expect(maskTokens("abc-123-abc", ["abc", "123"])).toBe("***-***-***");
  expect(maskTokens("", ["abc"])).toBe("");
  expect(maskTokens("value", [null, ""])).toBe("value");

  const request = {
    url: "https://example.com?token=secret",
    options: { method: "POST" },
    tokens: ["secret"]
  };
  expect(formatRequestForLog(request)).toBe(
    "POST https://example.com?token=***"
  );
  expect(formatRequestForLog({ url: "https://example.com", options: {} })).toBe(
    "GET https://example.com"
  );
});

test("API request wiring uses tokens and params", () => {
  // 토큰/헤더/쿼리 파라미터가 올바르게 결합되는지 확인
  const config = {
    data: {
      boundarySources: ["/a.geojson", "/b.geojson"],
      issueCatalog: {
        apiUrl: "/issues",
        token: "abc",
        tokenQueryKey: "KEY",
        queryParams: { foo: "1" }
      }
    },
    trafficOverlays: {
      token: "global",
      tokenQueryKey: "tq",
      tokenHeaderKey: "X-Auth",
      headers: { "X-Global": "1" },
      vehicle: {
        url: "/traffic/vehicle",
        method: "post",
        headers: { "X-Entry": "2" }
      },
      pedestrian: {
        url: "/traffic/ped",
        method: "GET"
      }
    },
    mobilityPopulation: {
      dataPath: "/pop.csv",
      token: "ptoken",
      tokenQueryKey: "pkey",
      queryParams: { month: 202501 }
    }
  };

  const baseURL = "https://example.com/app/";
  const { requests, missing } = buildApiRequests(config, baseURL);
  expect(missing).toEqual([]);

  const byName = Object.fromEntries(
    requests.map((request) => [request.name, request])
  );

  expect(byName["boundarySources[0]"].url).toBe(
    "https://example.com/a.geojson"
  );
  expect(byName["boundarySources[1]"].url).toBe(
    "https://example.com/b.geojson"
  );

  const issueUrl = new URL(byName["data.issueCatalog"].url);
  expect(issueUrl.pathname).toBe("/issues");
  expect(issueUrl.searchParams.get("KEY")).toBe("abc");
  expect(issueUrl.searchParams.get("foo")).toBe("1");

  const vehicle = byName["trafficOverlays.vehicle"];
  expect(vehicle.options.method).toBe("POST");
  expect(vehicle.options.headers["X-Auth"]).toBe("global");
  expect(vehicle.options.headers["X-Global"]).toBe("1");
  expect(vehicle.options.headers["X-Entry"]).toBe("2");
  expect(new URL(vehicle.url).searchParams.get("tq")).toBe("global");

  const pedestrian = byName["trafficOverlays.pedestrian"];
  expect(pedestrian.options.method).toBe("GET");
  expect(pedestrian.options.headers["X-Auth"]).toBe("global");
  expect(pedestrian.options.headers["X-Global"]).toBe("1");
  expect(new URL(pedestrian.url).searchParams.get("tq")).toBe("global");

  const population = byName["mobilityPopulation"];
  const populationUrl = new URL(population.url);
  expect(populationUrl.pathname).toBe("/pop.csv");
  expect(populationUrl.searchParams.get("pkey")).toBe("ptoken");
  expect(populationUrl.searchParams.get("month")).toBe("202501");
});

test("API request wiring reports missing keys", () => {
  // 필수 설정이 비어 있을 때 누락 키가 반환되는지 확인
  const config = {
    data: {
      boundarySources: ["/only.geojson"],
      issueCatalog: { apiUrl: "" }
    },
    trafficOverlays: { vehicle: {}, pedestrian: {} },
    mobilityPopulation: {}
  };

  const { missing } = buildApiRequests(config, "https://example.com/");
  expect(missing).toEqual([
    "data.issueCatalog.apiUrl",
    "trafficOverlays.vehicle.url",
    "trafficOverlays.pedestrian.url",
    "mobilityPopulation.dataPath"
  ]);
});
