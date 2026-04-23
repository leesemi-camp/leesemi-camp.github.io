import { defineConfig } from "@playwright/test";

const baseURL = process.env.PW_BASE_URL || "http://localhost:5173";

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
    ? [["github"], ["html", { open: "never" }]]
    : "list"
});
