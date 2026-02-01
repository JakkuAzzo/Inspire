// Playwright config for testing against existing HTTPS server
export default {
  testDir: './tests',
  testMatch: '**/guest-signin.spec.ts',
  timeout: 45_000,
  retries: 0,
  use: {
    baseURL: 'https://192.168.1.119:3000',
    ignoreHTTPSErrors: true,
    headless: false, // Run headed to see what's happening
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  // No webServer - we're testing against an existing server
};
