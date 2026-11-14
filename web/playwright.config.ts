import { defineConfig, devices } from '@playwright/test'
import { E2E_PORT, E2E_URL } from './e2e/env.ts'

// End-to-end tests against the built app (`pnpm e2e` builds it first), served together
// with the API from a separate database. See e2e/env.ts.
export default defineConfig({
  testDir: './e2e',
  // One PHP built-in server handles one request at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL: E2E_URL,
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'android',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'node e2e/server.ts',
    url: `http://127.0.0.1:${E2E_PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
