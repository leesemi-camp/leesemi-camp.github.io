const { test } = require("@playwright/test");
const { loadAppConfig, buildApiRequests } = require("./helpers/config");
const { formatRequestForLog } = require("./helpers/network");

function resolveBaseURL(testInfo) {
  const baseURL = testInfo.project.use && testInfo.project.use.baseURL
    ? testInfo.project.use.baseURL
    : process.env.PW_BASE_URL;
  return baseURL || "http://localhost:5173";
}

test("API endpoints respond in browser", async ({ page }, testInfo) => {
  const config = await loadAppConfig();
  const baseURL = resolveBaseURL(testInfo);
  const apiPlan = buildApiRequests(config, baseURL);
  const requests = apiPlan.requests;
  const missing = apiPlan.missing;

  if (missing.length > 0) {
    // 누락된 API 설정은 경고로 기록한다. (테스트는 계속 진행)
    testInfo.annotations.push({
      type: "warning",
      description: "Missing API config keys: " + missing.join(", ")
    });
  }

  // 브라우저 컨텍스트에서 실제 API 응답 여부를 확인한다.
  await page.goto("/");

  for (const request of requests) {
    if (!request.url) {
      throw new Error("Missing URL for " + request.name);
    }

    const result = await page.evaluate(async ({ url, options }) => {
      try {
        const response = await fetch(url, {
          method: options.method || "GET",
          headers: options.headers || {},
          cache: "no-store"
        });
        return { ok: response.ok, status: response.status };
      } catch (error) {
        return {
          ok: false,
          error: error && error.message ? error.message : String(error)
        };
      }
    }, { url: request.url, options: request.options });

    if (!result.ok) {
      const errorMessage = result.error
        ? "Error: " + result.error
        : "Status: " + String(result.status);
      throw new Error("[" + request.name + "] " + formatRequestForLog(request) + " failed. " + errorMessage);
    }
  }
});
