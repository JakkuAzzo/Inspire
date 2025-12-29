import { test, expect } from '@playwright/test';

test('Story Arc scaffold generates distinct beats', async ({ page }) => {
	const summary = 'i find a girl i love but she has a boyfriend';

	await page.goto('/');
	await page.getByRole('button', { name: /Get Started - Pick a Lab/i }).click();
	await page.getByRole('button', { name: /Lyricist Studio/i }).click();
	await page.getByRole('button', { name: /Rapper/i }).click({ timeout: 10_000 }).catch(() => {});
	await page.getByRole('button', { name: /Generate fuel pack/i }).first().click();

	await expect(page.getByText('Story Arc')).toBeVisible({ timeout: 20_000 });
	const arcButton = page.getByRole('button', { name: /^Story Arc$/i });
	if (await arcButton.count()) {
		await arcButton.first().click();
	} else {
		await page.getByText('Story Arc', { exact: false }).first().click();
	}

	await page.getByPlaceholder('Summary (what happens?)').fill(summary);
	await page.getByRole('button', { name: /7\s*nodes/i }).click();
	await page.getByRole('button', { name: /Generate scaffold/i }).click();
	await expect(page.getByText('Theme:')).toBeVisible({ timeout: 45_000 });

	const nodes = await page.$$eval('.focus-list textarea', (els) => els.map((el) => (el as HTMLTextAreaElement).value.trim()));
	console.log('NODES', JSON.stringify(nodes));
	await page.screenshot({ path: '../test-artifacts/story-arc-mcp.png', fullPage: true });

	expect(new Set(nodes.map((n) => n.toLowerCase())).size).toBeGreaterThanOrEqual(3);
});
