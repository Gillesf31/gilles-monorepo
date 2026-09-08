import { defineConfig, devices } from '@playwright/test';

// Reuse the core workflow tests against the already-running production stack.
export default defineConfig({
  testDir: './src',
  outputDir: '../../dist/.playwright/apps/recipe-e2e/runtime-test-output',
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8080',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
