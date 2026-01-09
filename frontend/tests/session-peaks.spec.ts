import { expect, test } from '@playwright/test';

test.describe('Session Peaks Hover Behavior', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('should show three collapsed peaks on landing page', async ({ page }) => {
		// Wait for peaks to be visible
		const peaks = page.locator('.session-peak');
		await expect(peaks).toHaveCount(3);

		// Take initial screenshot
		await page.screenshot({ path: 'test-artifacts/peaks-initial.png', fullPage: true });

		// Check all peaks are collapsed initially
		for (let i = 0; i < 3; i++) {
			const peak = peaks.nth(i);
			const boundingBox = await peak.boundingBox();
			
			// Collapsed height should be around 3.8rem (approximately 60-65px)
			expect(boundingBox?.height).toBeLessThan(100);
		}
	});

	test('should expand only Spectate Live peak on hover', async ({ page }) => {
		const spectatePeak = page.locator('.session-peak').nth(0);
		const collabPeak = page.locator('.session-peak').nth(1);
		const communityPeak = page.locator('.session-peak').nth(2);

		// Check initial classes
		const initialClass = await spectatePeak.getAttribute('class');
		console.log('Initial class:', initialClass);

		// Hover over Spectate Live peak
		await spectatePeak.hover();
		await page.waitForTimeout(500); // Wait for animation

		// Check if expanded class was added
		const hoverClass = await spectatePeak.getAttribute('class');
		console.log('After hover class:', hoverClass);
		expect(hoverClass).toContain('expanded');

		// Take screenshot
		await page.screenshot({ path: 'test-artifacts/peaks-spectate-expanded.png', fullPage: true });

		// Check Spectate peak is expanded
		const spectateBB = await spectatePeak.boundingBox();
		console.log('Spectate height:', spectateBB?.height);
		expect(spectateBB?.height).toBeGreaterThan(400); // Should be ~28rem

		// Check other peaks are still collapsed
		const collabBB = await collabPeak.boundingBox();
		const communityBB = await communityPeak.boundingBox();
		expect(collabBB?.height).toBeLessThan(100);
		expect(communityBB?.height).toBeLessThan(100);

		// Check expanded peak has visible list items
		await expect(spectatePeak.locator('.session-peak-list')).toBeVisible();
		await expect(spectatePeak.locator('.session-peak-list li')).toHaveCount(2);
	});

	test('should expand only Join Collab peak on hover', async ({ page }) => {
		const spectatePeak = page.locator('.session-peak').nth(0);
		const collabPeak = page.locator('.session-peak').nth(1);
		const communityPeak = page.locator('.session-peak').nth(2);

		// Hover over Join Collab peak
		await collabPeak.hover();
		await page.waitForTimeout(500);

		// Take screenshot
		await page.screenshot({ path: 'test-artifacts/peaks-collab-expanded.png', fullPage: true });

		// Check Join Collab peak is expanded
		const collabBB = await collabPeak.boundingBox();
		expect(collabBB?.height).toBeGreaterThan(400);

		// Check other peaks are still collapsed
		const spectateBB = await spectatePeak.boundingBox();
		const communityBB = await communityPeak.boundingBox();
		expect(spectateBB?.height).toBeLessThan(100);
		expect(communityBB?.height).toBeLessThan(100);
	});

	test('should expand only Community Feed peak on hover', async ({ page }) => {
		const spectatePeak = page.locator('.session-peak').nth(0);
		const collabPeak = page.locator('.session-peak').nth(1);
		const communityPeak = page.locator('.session-peak').nth(2);

		// Hover over Community Feed peak
		await communityPeak.hover();
		await page.waitForTimeout(500);

		// Take screenshot
		await page.screenshot({ path: 'test-artifacts/peaks-community-expanded.png', fullPage: true });

		// Check Community Feed peak is expanded
		const communityBB = await communityPeak.boundingBox();
		expect(communityBB?.height).toBeGreaterThan(400);

		// Check other peaks are still collapsed
		const spectateBB = await spectatePeak.boundingBox();
		const collabBB = await collabPeak.boundingBox();
		expect(spectateBB?.height).toBeLessThan(100);
		expect(collabBB?.height).toBeLessThan(100);

		// Check Fork buttons are visible in community feed
		await expect(communityPeak.locator('.btn.green')).toHaveCount(2);
	});

	test('should collapse peak when mouse leaves', async ({ page }) => {
		const spectatePeak = page.locator('.session-peak').nth(0);

		// Hover to expand
		await spectatePeak.hover();
		await page.waitForTimeout(500);

		let boundingBox = await spectatePeak.boundingBox();
		expect(boundingBox?.height).toBeGreaterThan(400);

		// Move mouse away
		await page.mouse.move(100, 100);
		await page.waitForTimeout(500);

		// Take screenshot
		await page.screenshot({ path: 'test-artifacts/peaks-collapsed-after-leave.png', fullPage: true });

		// Check it collapsed
		boundingBox = await spectatePeak.boundingBox();
		expect(boundingBox?.height).toBeLessThan(100);
	});

	test('should switch expanded peak when hovering between peaks', async ({ page }) => {
		const spectatePeak = page.locator('.session-peak').nth(0);
		const collabPeak = page.locator('.session-peak').nth(1);

		// Hover over Spectate peak
		await spectatePeak.hover();
		await page.waitForTimeout(500);

		let spectateBB = await spectatePeak.boundingBox();
		expect(spectateBB?.height).toBeGreaterThan(400);

		// Hover over Collab peak
		await collabPeak.hover();
		await page.waitForTimeout(500);

		// Take screenshot
		await page.screenshot({ path: 'test-artifacts/peaks-switch-hover.png', fullPage: true });

		// Spectate should now be collapsed
		spectateBB = await spectatePeak.boundingBox();
		expect(spectateBB?.height).toBeLessThan(100);

		// Collab should be expanded
		const collabBB = await collabPeak.boundingBox();
		expect(collabBB?.height).toBeGreaterThan(400);
	});
});
