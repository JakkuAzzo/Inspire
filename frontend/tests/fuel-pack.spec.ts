import { expect, test } from '@playwright/test';
import { applyNetworkMocks } from './helpers/networkMocks';

const SCREENSHOT_DIR = 'test-artifacts';

// Generates a fresh fuel pack from the hero flow and captures a screenshot of the deck.
test('generate fuel pack', async ({ page }) => {
	test.setTimeout(90_000);
	await applyNetworkMocks(page);
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

	// Wait for hero CTA to be ready
	const heroCTA = page.getByRole('button', { name: 'Get Started - Pick a Lab' });
	await expect(heroCTA).toBeVisible({ timeout: 15000 });
	await heroCTA.click();
	await expect(page.getByRole('button', { name: /Writer Lab/ })).toBeVisible({ timeout: 15000 });
	await page.getByRole('button', { name: /Writer Lab/ }).click();
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

	const modePackDeck = page.locator('.pack-deck');
	const legacyPack = page.locator('.legacy-pack');
	await Promise.race([
		modePackDeck.waitFor({ state: 'visible', timeout: 60_000 }),
		legacyPack.waitFor({ state: 'visible', timeout: 60_000 })
	]);

	if (await modePackDeck.isVisible().catch(() => false)) {
		const packCards = page.locator('.pack-deck .pack-card');
		await expect(packCards.first()).toBeVisible({ timeout: 60_000 });
		await expect(await packCards.count()).toBeGreaterThan(0);
	} else {
		await expect(legacyPack).toBeVisible({ timeout: 60_000 });
		const wordChips = page.locator('.legacy-pack .word-chip');
		await expect(wordChips.first()).toBeVisible({ timeout: 60_000 });
		await expect(await wordChips.count()).toBeGreaterThan(0);
	}

	await page.screenshot({ path: `${SCREENSHOT_DIR}/fuel-pack-generated.png`, fullPage: true });
});
