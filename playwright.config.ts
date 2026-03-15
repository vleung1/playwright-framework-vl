import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
import { ELEMENT_TIMEOUT, NAVIGATION_TIMEOUT } from './config/constants';
import { getCrdcBaseURL } from './config/env/urls';

const baseURL = getCrdcBaseURL();

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    actionTimeout: ELEMENT_TIMEOUT,
    navigationTimeout: NAVIGATION_TIMEOUT,
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    {
      name: 'crdc-home',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: getCrdcBaseURL(),
      },
      testMatch: /crdc-home\.spec\.ts/,
      timeout: 60_000,
    },
  ],
});
