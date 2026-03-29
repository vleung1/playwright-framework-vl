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
    // Cross-browser projects: run everything under tests/ *except* the CRDC hub suite.
    // That suite is owned by `crdc-homepage` below (Chrome + longer timeout) so we do not
    // execute the same SSO / modal flows four times or hit flakiness on Firefox/WebKit.
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /crdc-homepage\.spec\.ts/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: /crdc-homepage\.spec\.ts/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: /crdc-homepage\.spec\.ts/,
    },
    {
      name: 'crdc-homepage',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: getCrdcBaseURL(),
      },
      testMatch: /crdc-homepage\.spec\.ts/,
      timeout: 60_000,
    },
  ],
});
