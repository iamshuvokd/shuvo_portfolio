import { defineConfig, devices } from '@playwright/test';

/**
 * Post-deploy smoke tests: read-only checks against an ALREADY RUNNING site (production, staging, or the
 * local docker stack). No servers are started and nothing is modified.
 *
 *   SMOKE_URL=https://yoursite.com npm run test:smoke
 *   SMOKE_ADMIN_PASSWORD=...   (optional) also verifies the admin login works
 */
const baseURL = process.env.SMOKE_URL;
if (!baseURL) throw new Error('Set SMOKE_URL to the address of the deployed site, e.g. SMOKE_URL=http://localhost:8088');

export default defineConfig({
  testDir: './smoke',
  workers: 1,
  retries: 2, // a fresh deploy can need a moment (cold caches, TLS)
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never', outputFolder: 'smoke-report' }]] : 'list',
  use: {
    baseURL: baseURL.replace(/\/$/, ''),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined) },
    },
  ],
});
