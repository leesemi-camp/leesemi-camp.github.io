const { defineConfig } = require("@playwright/test");

const baseURL = process.env.PW_BASE_URL || "http://localhost:5173";
const chromeChannel = process.env.PW_CHROME_CHANNEL ? String(process.env.PW_CHROME_CHANNEL) : "";
const edgeChannel = process.env.PW_EDGE_CHANNEL ? String(process.env.PW_EDGE_CHANNEL) : "";

function buildChromiumUse(channel) {
  if (channel) {
    return { browserName: "chromium", channel };
  }
  return { browserName: "chromium" };
}

module.exports = defineConfig({
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
      use: buildChromiumUse(chromeChannel)
    },
    {
      name: "Chromium-Edge",
      use: buildChromiumUse(edgeChannel)
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
