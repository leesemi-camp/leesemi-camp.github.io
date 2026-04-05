const { test, expect } = require("@playwright/test");
const { loadAppConfig, hasLocalConfig } = require("./helpers/config");

test("Local config secret merges when provided", () => {
  const isCI = Boolean(process.env.GITHUB_ACTIONS);

  // 로컬 환경: 항상 skip (Secret 접근 불가 가정)
  if (!isCI) {
    test.skip(true, "Local environment: config.local.js not accessible, skipping");
  }

  // GitHub Actions 환경: config.local.js 필수
  if (!hasLocalConfig()) {
    throw new Error(
      "GitHub Actions environment requires config.local.js from APP_CONFIG_LOCAL_JS secret"
    );
  }

  const config = loadAppConfig({ includeLocal: true, requireLocal: true });
  if (!config || !config.firebase || !config.firebase.config) {
    throw new Error("Missing firebase.config in merged APP_CONFIG");
  }

  const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"];
  requiredKeys.forEach((key) => {
    const value = config.firebase.config[key];
    if (!value) {
      throw new Error("Missing firebase.config." + key);
    }
  });
});
