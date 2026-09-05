import { defineConfig, devices } from '@playwright/test';
import { workspaceRoot } from '@nx/devkit';

export default defineConfig({
  testDir: './offline',
  outputDir: '../../dist/.playwright/apps/recipe-e2e/offline-test-output',
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4310',
    trace: 'on-first-retry',
  },
  webServer: {
    command:
      'pnpm exec nx run recipe:serve-static --buildTarget recipe:build:offline-e2e --host 127.0.0.1 --port 4310',
    url: 'http://127.0.0.1:4310',
    reuseExistingServer: false,
    cwd: workspaceRoot,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
