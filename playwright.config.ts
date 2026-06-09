import { defineConfig, devices } from "@playwright/test";

const qaPort = process.env.QA_PORT ?? "4321";
const qaBaseUrl = `http://127.0.0.1:${qaPort}`;
const qaServerTimeout = Number.parseInt(
  process.env.QA_SERVER_TIMEOUT_MS ?? "360000",
  10
);

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  reporter: "line",
  testDir: "tests/qa",
  timeout: 60_000,
  use: {
    baseURL: qaBaseUrl,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${qaPort}`,
    reuseExistingServer: !process.env.CI,
    timeout: qaServerTimeout,
    url: qaBaseUrl,
  },
});
