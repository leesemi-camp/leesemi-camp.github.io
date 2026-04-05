const fs = require("node:fs");
const path = require("node:path");

async function globalSetup() {
  const isCI = Boolean(process.env.GITHUB_ACTIONS);
  
  if (!isCI) {
    // 로컬 환경에서는 스냅샷 생성/검증 스킵
    console.log("[firestore-snapshot] Local environment, skipping Firestore snapshot validation");
    return;
  }

  // GitHub Actions 환경: config.local.js 필수 확인
  const configLocalPath = path.resolve(process.cwd(), "config.local.js");
  if (!fs.existsSync(configLocalPath)) {
    throw new Error(
      "[firestore-snapshot] GITHUB_ACTIONS is set but config.local.js not found. " +
      "APP_CONFIG_LOCAL_JS secret must be provided."
    );
  }

  console.log("[firestore-snapshot] GitHub Actions detected, config.local.js is available");
  
  // 스냅샷 디렉토리 준비 (테스트에서 참조할 경로)
  const outputDir = path.resolve(process.cwd(), "test-results", "firestore");
  fs.mkdirSync(outputDir, { recursive: true });
  
  console.log("[firestore-snapshot] Setup complete, ready for Firestore export");
}

module.exports = globalSetup;

