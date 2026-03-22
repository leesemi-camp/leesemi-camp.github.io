const { test } = require("@playwright/test");
const { loadAppConfig, buildApiRequests } = require("./helpers/config");
const { formatRequestForLog } = require("./helpers/network");

function resolveBaseURL(testInfo) {
  const baseURL = testInfo.project.use && testInfo.project.use.baseURL
    ? testInfo.project.use.baseURL
    : process.env.PW_BASE_URL;
  return baseURL || "http://localhost:5173";
}

test("API files respond in browser context", async ({ page }, testInfo) => {
  const config = loadAppConfig();
  const baseURL = resolveBaseURL(testInfo);
  const result = buildApiRequests(config, baseURL);
  const requests = result.requests;
  const missing = result.missing;

  if (missing.length > 0) {
    testInfo.annotations.push({
      type: "warning",
      description: "Missing API config keys: " + missing.join(", ")
    });
  }

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
