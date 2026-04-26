import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: [
    {
      command: "pnpm --filter @cip/shared build && pnpm --filter @cip/api build && pnpm --filter @cip/api start",
      url: "http://127.0.0.1:3001/api/health",
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: "pnpm --filter @cip/web build && pnpm serve:web:local",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: true,
      timeout: 120_000
    }
  ],
  projects: [
    {
      name: "edge",
      use: {
        ...devices["Desktop Chrome"],
        channel: "msedge"
      }
    }
  ]
});
