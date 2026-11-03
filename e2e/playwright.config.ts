import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests against the real stack: the NestJS API on a fresh in-memory
 * database (synthetic data only) and a production build of the web app that
 * proxies to it. Ports differ from the dev servers so both can run at once.
 * Run from the repository root with `npm run test:e2e`.
 */
const API_PORT = 3101;
const WEB_PORT = 3100;
const webUrl = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: ".",
  // The tests share one database and some change it (password reset).
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: webUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node apps/api/dist/main.js",
      url: `http://localhost:${API_PORT}/api/v1/health`,
      cwd: "..",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        PORT: String(API_PORT),
        DATA_MODE: "synthetic",
        AUTH_MODE: "local",
        PGLITE_DATA_DIR: "memory",
        ALLOWED_ORIGINS: webUrl,
        // The suite signs in many times a minute from one address.
        PASSWORD_ATTEMPTS_PER_MINUTE: "1000",
        RATE_LIMIT_PER_MINUTE: "100000",
      },
    },
    {
      command: `npm run build -w @smart-rounding/web && npm run start -w @smart-rounding/web -- -p ${WEB_PORT}`,
      url: webUrl,
      cwd: "..",
      reuseExistingServer: false,
      timeout: 600_000,
      env: { API_BASE_URL: `http://localhost:${API_PORT}` },
    },
  ],
});
