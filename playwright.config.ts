import { defineConfig } from '@playwright/test';

// Every spec runs twice, in the installed Microsoft Edge: against the dev server
// and against a production build. Playwright gives the browser a temporary
// profile and deletes it when the run ends. Specs run one at a time so timings
// don't compete for the CPU.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 3_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    channel: 'msedge',
    actionTimeout: 3_000,
  },
  projects: [
    { name: 'dev', use: { baseURL: 'http://localhost:4261' } },
    { name: 'prod', use: { baseURL: 'http://localhost:4262' } },
  ],
  webServer: [
    {
      command: 'npx ng serve --port 4261',
      url: 'http://localhost:4261',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npx ng serve --port 4262 --configuration production',
      url: 'http://localhost:4262',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
