import { expect, test } from '@playwright/test';
import { applyNetworkMocks } from './helpers/networkMocks';

const SCREENSHOT_DIR = 'test-artifacts';

// Smoke test the list → detail → back flow and queue visibility.
test('pack detail layout flow', async ({ page }) => {
	test.setTimeout(90_000);
	await applyNetworkMocks(page);
	await page.goto('/');

	// Navigate via hero CTA into Lyricist → Rapper, then generate a pack
	const heroCTA = page.getByRole('button', { name: 'Get Started - Pick a Lab' });
	await expect(heroCTA).toBeVisible({ timeout: 15000 });
	await heroCTA.click();
	await expect(page.getByRole('button', { name: /Writer Lab/ })).toBeVisible({ timeout: 15000 });
	await page.getByRole('button', { name: /Writer Lab/ }).click();
	await page.getByRole('button', { name: 'Rapper' }).click();
	const generateButton = page.getByRole('button', { name: 'Generate fuel pack' });
	await expect(generateButton).toBeEnabled({ timeout: 15000 });
	await generateButton.click();

	// Wait for modern pack deck to appear
	const modePackDeck = page.locator('.pack-deck');
	await expect(modePackDeck).toBeVisible({ timeout: 60000 });

	const packCards = page.locator('.pack-deck .pack-card');
	await expect(packCards.first()).toBeVisible({ timeout: 15000 });
	await expect(page.locator('.workspace-queue')).toBeVisible({ timeout: 15000 });

	await page.screenshot({ path: `${SCREENSHOT_DIR}/layout-list.png`, fullPage: true });

	await packCards.first().click();

	const detailPanel = page.locator('.pack-card-detail');
	await expect(detailPanel).toBeVisible({ timeout: 15000 });
	await expect(page.locator('.workspace-queue')).toHaveCount(0, { timeout: 20000 });

	await page.screenshot({ path: `${SCREENSHOT_DIR}/layout-detail.png`, fullPage: true });

	await page.getByRole('button', { name: '← Back to list' }).click();
	await expect(page.locator('.pack-card-detail')).toHaveCount(0, { timeout: 20000 });

	await expect(page.locator('.pack-deck')).toBeVisible({ timeout: 20000 });
	const packCardsAfterBack = page.locator('.pack-deck .pack-card');
	await expect(packCardsAfterBack.first()).toBeVisible({ timeout: 20000 });
	await expect(page.locator('.workspace-queue')).toBeVisible({ timeout: 20000 });

	await page.screenshot({ path: `${SCREENSHOT_DIR}/layout-back.png`, fullPage: true });
});
