import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	timeout: 45_000,
	retries: process.env.CI ? 1 : 0,
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4173',
		headless: true,
		screenshot: 'only-on-failure',
		video: 'off'
	},
	webServer: {
		command: 'npm run dev -- --host 0.0.0.0 --port 4173 --strictPort',
		url: 'http://localhost:4173',
		reuseExistingServer: !process.env.CI,
		timeout: 60_000
	}
});
