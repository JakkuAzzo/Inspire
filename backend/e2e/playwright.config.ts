import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './tests',
  timeout: 30_000,
  use: {
    headless: true,
    baseURL: process.env.PW_BASE_URL || 'http://localhost:3001',
  },
};

export default config;
