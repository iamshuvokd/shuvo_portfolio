import { defineConfig, devices } from '@playwright/test';
import { ADMIN_PASSWORD, API_PORT, REDIS_URL, WEB_PORT, WEB_URL, API_URL } from './tests/support/env';

/**
 * The suite boots its OWN isolated stack so it can never touch your dev data:
 *   backend  :4100  (dev uses :4000)
 *   frontend :8180  (dev uses :8080)
 *   Redis    database 15 (dev uses database 0)
 * Only requirement: a Redis server on localhost:6379  ->  `npm run redis` from the repo root.
 */
export default defineConfig({
  testDir: './tests',
  // Tests share one Redis database and mutate site content, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off', // would need ffmpeg (npx playwright install ffmpeg); traces + screenshots are enough
    viewport: { width: 1280, height: 800 },
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        // On Windows use the Edge that is already installed (no browser download).
        // Elsewhere / in CI Playwright's bundled Chromium is used: `npx playwright install chromium`.
        channel: process.env.PW_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined),
      },
    },
  ],

  webServer: [
    {
      name: 'backend',
      command: 'npx tsx src/index.ts',
      cwd: '../backend',
      url: `${API_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'development',
        PORT: String(API_PORT),
        REDIS_URL,
        ADMIN_PASSWORD,
        JWT_SECRET: 'e2e-only-jwt-secret-not-for-production-0123456789',
        CORS_ORIGINS: WEB_URL,
        // Relaxed so the suite can sign in / post many times within a minute.
        LOGIN_RATE_LIMIT: '1000',
        CONTACT_RATE_LIMIT: '20',
        GITHUB_TOKEN: '',
      },
    },
    {
      name: 'frontend',
      command: `npx vite --port ${WEB_PORT} --strictPort --host 127.0.0.1`,
      cwd: '../frontend',
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { API_PROXY_TARGET: API_URL },
    },
  ],
});
