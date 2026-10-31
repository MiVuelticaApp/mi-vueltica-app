import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';

/**
 * E2E runs against the static web export (web is a test target only).
 *   npm run e2e            builds the export (EXPO_PUBLIC_E2E=1, frozen clock) and serves it on :8081
 *   E2E_SKIP_BUILD=1 ...   reuse an existing ./dist
 */
const PORT = Number(process.env.E2E_PORT ?? 8081);
const FAKE_NOW = '2026-10-20T10:00:00-06:00';

const chromiumFallback = '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const launchOptions = process.env.PW_CHROMIUM_PATH
  ? { executablePath: process.env.PW_CHROMIUM_PATH }
  : fs.existsSync('/usr/bin/google-chrome')
    ? { executablePath: '/usr/bin/google-chrome' }
    : fs.existsSync(chromiumFallback)
      ? { executablePath: chromiumFallback }
      : { channel: 'chrome' as const };

const mobile = {
  ...devices['Pixel 7'],
  viewport: { width: 402, height: 874 },
  geolocation: { latitude: 9.9333, longitude: -84.0833 },
  permissions: ['geolocation'],
  locale: 'es-CR',
  timezoneId: 'America/Costa_Rica',
  launchOptions,
};

const build = `EXPO_PUBLIC_E2E=1 EXPO_PUBLIC_FAKE_NOW=${FAKE_NOW} npx expo export -p web`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure', testIdAttribute: 'data-testid' },
  projects: [
    { name: 'light', use: { ...mobile, colorScheme: 'light' }, testIgnore: /.*\.denied\.spec\.ts/ },
    { name: 'dark', use: { ...mobile, colorScheme: 'dark' }, testIgnore: /.*\.denied\.spec\.ts/ },
    {
      name: 'denied',
      use: { ...mobile, colorScheme: 'light', permissions: [] },
      testMatch: /.*\.denied\.spec\.ts/,
    },
  ],
  webServer: {
    command: `${process.env.E2E_SKIP_BUILD ? 'true' : build} && npx serve dist -s -l ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
  },
});
