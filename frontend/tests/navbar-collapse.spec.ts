import { test, expect } from '@playwright/test';

test.describe('Collapsible Navbar', () => {
	test('navbar collapses on small viewport and expands on hover', async ({ page }) => {
		// Start on the home page
		await page.goto('http://localhost:8080');
		
		// Wait for the app to load
		await page.waitForSelector('.mode-card', { timeout: 10000 });
		
		// Click on a studio mode to enter it (lyricist)
		await page.click('.mode-card[data-mode="lyricist"]');
		
		// Wait for the studio to load with navbar
		await page.waitForSelector('.top-nav', { timeout: 10000 });
		
		// Set viewport to wide size (navbar should not be collapsed)
		await page.setViewportSize({ width: 1400, height: 900 });
		await page.waitForTimeout(500); // Wait for resize to trigger
		
		// Verify navbar is NOT collapsed
		const navWide = page.locator('.top-nav');
		await expect(navWide).not.toHaveClass(/collapsed/);
		
		// Verify action buttons are visible
		const actionsGroupWide = page.locator('.actions-group');
		await expect(actionsGroupWide).toBeVisible();
		
		// Set viewport to narrow size (navbar should collapse)
		await page.setViewportSize({ width: 1100, height: 900 });
		await page.waitForTimeout(500); // Wait for resize to trigger
		
		// Verify navbar is collapsed
		const navNarrow = page.locator('.top-nav');
		await expect(navNarrow).toHaveClass(/collapsed/);
		
		// Verify essential elements are still visible
		await expect(page.locator('.back-button')).toBeVisible();
		await expect(page.locator('.nav-title-block h2')).toBeVisible();
		await expect(page.locator('.nav-settings')).toBeVisible();
		
		// Verify action buttons are hidden when collapsed
		const actionsGroup = page.locator('.actions-group');
		const actionsOpacity = await actionsGroup.evaluate((el) => 
			window.getComputedStyle(el).opacity
		);
		expect(parseFloat(actionsOpacity)).toBeLessThan(0.5);
		
		// Hover over the navbar
		await page.hover('.top-nav');
		await page.waitForTimeout(400); // Wait for transition
		
		// Verify action buttons become visible on hover
		const actionsOpacityHover = await actionsGroup.evaluate((el) => 
			window.getComputedStyle(el).opacity
		);
		expect(parseFloat(actionsOpacityHover)).toBeGreaterThan(0.9);
		
		// Verify description text is visible on hover
		const description = page.locator('.nav-title-block p');
		if (await description.count() > 0) {
			const descOpacity = await description.evaluate((el) => 
				window.getComputedStyle(el).opacity
			);
			expect(parseFloat(descOpacity)).toBeGreaterThan(0.9);
		}
	});

	test('navbar maintains visibility of critical elements when collapsed', async ({ page }) => {
		await page.goto('http://localhost:8080');
		await page.waitForSelector('.mode-card', { timeout: 10000 });
		
		// Enter a studio
		await page.click('.mode-card[data-mode="producer"]');
		await page.waitForSelector('.top-nav', { timeout: 10000 });
		
		// Set narrow viewport
		await page.setViewportSize({ width: 1000, height: 800 });
		await page.waitForTimeout(500);
		
		// Verify back button is visible and clickable
		const backButton = page.locator('.back-button');
		await expect(backButton).toBeVisible();
		await expect(backButton).toBeEnabled();
		
		// Verify settings button is visible and clickable
		const settingsButton = page.locator('.nav-settings');
		await expect(settingsButton).toBeVisible();
		await expect(settingsButton).toBeEnabled();
		
		// Verify title is visible
		const title = page.locator('.nav-title-block h2');
		await expect(title).toBeVisible();
		const titleText = await title.textContent();
		expect(titleText).toBeTruthy();
	});
});
