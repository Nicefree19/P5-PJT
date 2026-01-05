import { defineConfig, devices } from '@playwright/test';

/**
 * P5 Dashboard - Playwright E2E Test Configuration
 * WP-9-2: E2E Test Expansion
 *
 * Supports both local development and GitHub Pages deployment testing
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    process.env.CI ? ['github'] : ['line']
  ],
  timeout: 30000,
  expect: {
    timeout: 10000
  },
  use: {
    // Use GitHub Pages URL in CI, localhost in development
    baseURL: process.env.CI
      ? 'https://nicefree19.github.io/P5-PJT/'
      : 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Default viewport for desktop testing
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile viewport for responsive testing
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  // Only start dev server when not in CI (CI uses deployed site)
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
  // Output directory for test artifacts
  outputDir: 'test-results',
});
