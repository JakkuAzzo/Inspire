export default {
  testDir: './tests',
  testMatch: '**/guest-auth-standalone.spec.ts',
  timeout: 45000,
  use: {
    headless: false,
    ignoreHTTPSErrors: true,
  },
  // NO webServer config - we go directly to the IP
};
