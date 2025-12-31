// Plain-object config to avoid importing @playwright/test from frontend node_modules
export default {
  testDir: './tests',
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8080',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off'
  },
  webServer: {
    command: 'cd .. && npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DISABLE_TRANSFORMERS: 'true',
      USE_MOCK_FALLBACK: 'true'
    }
  }
};
