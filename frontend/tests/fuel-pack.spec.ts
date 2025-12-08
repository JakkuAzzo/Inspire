import { expect, test } from '@playwright/test';

const SCREENSHOT_DIR = 'test-artifacts';

// Generates a fresh fuel pack from the hero flow and captures a screenshot of the deck.
test('generate fuel pack', async ({ page }) => {
	page.on('console', (msg) => {
		console.log(`[console:${msg.type()}] ${msg.text()}`);
	});
	page.on('pageerror', (err) => {
		console.log(`[pageerror] ${err.message}`);
		if (err.stack) {
			console.log(err.stack);
		}
	});
	await page.goto('/');

	await page.getByRole('button', { name: 'Get Started - Pick a Lab' }).click();
	await page.getByRole('button', { name: /Lyricist Studio/ }).click();
	await page.getByRole('button', { name: 'Rapper' }).click();

	const generateButton = page.getByRole('button', { name: 'Generate fuel pack' });
	await expect(generateButton).toBeEnabled();
	const requestPromise = page.waitForRequest('**/api/modes/lyricist/fuel-pack');
	const responsePromise = page.waitForResponse((res) => res.url().includes('/api/modes/lyricist/fuel-pack') && res.request().method() === 'POST');
	await generateButton.click();
	const request = await requestPromise;
	console.log('fuel-pack request payload:', request.postData());
	const response = await responsePromise;
	await expect(response.status()).toBe(201);

	const packCards = page.locator('.pack-card');
	await expect(packCards.first()).toBeVisible({ timeout: 20000 });
	await expect(await packCards.count()).toBeGreaterThan(0);

	await page.screenshot({ path: `${SCREENSHOT_DIR}/fuel-pack-generated.png`, fullPage: true });
});
