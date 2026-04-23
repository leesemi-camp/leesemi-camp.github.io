import { defineConfig } from "@playwright/test";

const baseURL = process.env.PW_BASE_URL || "http://localhost:5173";

// 커버리지 측정 여부는 COVERAGE 환경변수로 제어한다.
// test:coverage 스크립트가 --project=Chromium-Chrome 으로 단일 Chromium만 실행하므로,
// coverage 리포터는 항상 포함하되 실제 수집은 각 spec의 훅이 Chromium 여부를 검사한다.
const coverageReporter = [
  "monocart-reporter",
  {
    name: "Coverage Report",
    outputFile: "./coverage/index.html",
    coverage: {
      outputDir: "./coverage",
      reports: [
        ["v8"],
        ["lcovonly"],
        ["console-summary"]
      ],
      // 로컬 앱 파일만 포함: node_modules, Playwright 내부 번들, 외부 CDN URL 제외
      entryFilter: (entry) => {
        const url = entry.url || "";
        if (!url.startsWith(baseURL)) return false;
        if (url.includes("node_modules")) return false;
        if (url.includes("playwright")) return false;
        return true;
      }
    }
  }
];

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "Chromium-Coverage",
      use: { browserName: "chromium" }
    },
    {
      name: "Chromium-Chrome",
      use: { browserName: "chromium", channel: "chrome" }
    },
    {
      name: "Chromium-Edge",
      use: { browserName: "chromium", channel: "msedge" }
    },
    {
      name: "WebKit-Safari",
      use: { browserName: "webkit" }
    }
  ],
  webServer: {
    command: "npm run serve",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe"
  },
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }], coverageReporter]
    : [["list"], coverageReporter]
});
