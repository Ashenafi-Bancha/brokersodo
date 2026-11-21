// Load .env so tests can read SEED_ADMIN_* (Node 22+)
try {
  process.loadEnvFile(".env");
} catch {
  /* no .env — rely on real env vars */
}

import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests. Needs a seeded database (npm run db:seed) and the admin credentials
 * from .env (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD) or E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.
 * Uses the installed Chrome; in CI run `npx playwright install chromium` and set PW_CHANNEL="".
 */
const PORT = Number(process.env.E2E_PORT ?? 3000);
const channel = process.env.PW_CHANNEL ?? "chrome";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    ...(channel ? { channel } : {}),
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], ...(channel ? { channel } : {}) }, testMatch: /public\.spec\.ts/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...(channel ? { channel } : {}) } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run start", port: PORT, reuseExistingServer: true, timeout: 120_000 },
});
