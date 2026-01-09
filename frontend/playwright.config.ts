// Plain-object config to avoid importing @playwright/test from frontend node_modules
export default {
  testDir: './tests',
  testIgnore: ['**/audioSyncService.spec.ts'],
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8080',
    ignoreHTTPSErrors: true,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off'
  },
  webServer: {
    // Use the project dev script per team preference
    command: 'sh ../run_dev.sh',
    url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8080',
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DISABLE_TRANSFORMERS: 'true',
      USE_MOCK_FALLBACK: 'true'
      ,VITE_DISABLE_HTTPS: 'true'
    }
  }
};
