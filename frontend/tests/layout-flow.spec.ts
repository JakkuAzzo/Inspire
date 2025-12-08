import { expect, test } from '@playwright/test';

const SCREENSHOT_DIR = 'test-artifacts';

// Smoke test the list → detail → back flow and queue visibility.
test('pack detail layout flow', async ({ page }) => {
	await page.goto('/');

	await page.getByRole('button', { name: 'Fork & Remix' }).first().click();

	const packCards = page.locator('.pack-deck .pack-card');
	await expect(packCards.first()).toBeVisible();
	await expect(page.locator('.workspace-queue')).toBeVisible();

	await page.screenshot({ path: `${SCREENSHOT_DIR}/layout-list.png`, fullPage: true });

	await packCards.first().click();

	const detailPanel = page.locator('.pack-card-detail');
	await expect(detailPanel).toBeVisible();
	await expect(page.locator('.workspace-queue')).toHaveCount(0);

	await page.screenshot({ path: `${SCREENSHOT_DIR}/layout-detail.png`, fullPage: true });

	await page.getByRole('button', { name: '← Back to list' }).click();

	await expect(packCards.first()).toBeVisible();
	await expect(page.locator('.workspace-queue')).toBeVisible();

	await page.screenshot({ path: `${SCREENSHOT_DIR}/layout-back.png`, fullPage: true });
});
