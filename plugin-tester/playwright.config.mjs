import { defineConfig } from '@playwright/test';

const port = process.env.PLUGIN_TESTER_PORT || '4179';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node server.mjs',
    cwd: '.',
    url: baseURL,
    timeout: 30_000,
    reuseExistingServer: true,
    env: {
      BACKEND_URL: process.env.BACKEND_URL || 'http://127.0.0.1:3001',
      PLUGIN_TESTER_PORT: String(port)
    }
  }
});
