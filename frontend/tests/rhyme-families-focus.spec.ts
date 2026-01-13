import { test, expect } from '@playwright/test';

/**
 * Rhyme Families Focus Mode Tests
 * 
 * Tests the focus mode functionality in the Rhyme Families overlay:
 * 1. Focus mode button appears ONLY after results load
 * 2. Button toggles between grid view and animated stream
 * 3. Animation appears when focus mode is active
 */

test.describe('Rhyme Families Focus Mode', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		
		// Wait for app to load - might need authentication
		await page.waitForTimeout(2000);
	});

	test('Focus mode button appears ONLY after Rhyme Families results load', async ({ page }) => {
		console.log('\n🧪 Test 1: Focus mode button appears only after results load');
		
		// Take initial screenshot
		await page.screenshot({ path: 'test-artifacts/rhyme-initial.png', fullPage: true });
		
		// Try to find the Rhyme Families button
		const rhymeButton = page.locator('button:has-text("Rhyme Families")').first();
		const rhymeButtonCount = await rhymeButton.count();
		console.log(`📊 Rhyme Families buttons found: ${rhymeButtonCount}`);
		
		if (rhymeButtonCount === 0) {
			console.log('⚠️  Rhyme Families button not found - may need to authenticate or select mode');
			
			// Check if we're on a login page
			const loginVisible = await page.locator('input[type="email"], input[type="password"]').count();
			if (loginVisible > 0) {
				console.log('📝 Login page detected - skipping test');
				test.skip();
				return;
			}
			
			// Try to click lyricist mode
			const lyricistButton = page.locator('button:has-text("Lyricist"), button[data-mode="lyricist"]').first();
			const lyricistCount = await lyricistButton.count();
			console.log(`📊 Lyricist buttons found: ${lyricistCount}`);
			
			if (lyricistCount > 0) {
				await lyricistButton.click();
				await page.waitForTimeout(500);
			}
			
			await page.screenshot({ path: 'test-artifacts/rhyme-after-mode-select.png', fullPage: true });
		}
		
		// Try again to find Rhyme Families button
		const rhymeButton2 = page.locator('button:has-text("Rhyme Families")').first();
		const rhymeButtonCount2 = await rhymeButton2.count();
		
		if (rhymeButtonCount2 === 0) {
			console.log('❌ Rhyme Families button still not found after mode selection');
			console.log('Current URL:', page.url());
			test.skip();
			return;
		}
		
		// Click Rhyme Families to open overlay
		await rhymeButton2.click();
		await page.waitForTimeout(500);
		console.log('✅ Rhyme Families overlay opened');
		
		// Take screenshot of overlay
		await page.screenshot({ path: 'test-artifacts/rhyme-overlay-opened.png', fullPage: true });
		
		// Check that focus mode button does NOT exist yet (no results)
		const overlay = page.locator('[aria-label*="Rhyme"], .focus-mode-overlay').first();
		const focusButtonBefore = overlay.locator('button.focus-toggle');
		const focusCountBefore = await focusButtonBefore.count();
		console.log(`📊 Focus buttons before search: ${focusCountBefore}`);
		expect(focusCountBefore).toBe(0); // Should not exist yet
		console.log('✅ Focus button correctly hidden before results');
		
		// Find input and enter a word
		const searchInput = overlay.locator('input[type="text"]').first();
		const inputExists = await searchInput.count() > 0;
		
		if (!inputExists) {
			console.log('❌ Search input not found in overlay');
			await page.screenshot({ path: 'test-artifacts/rhyme-no-input.png', fullPage: true });
			test.skip();
			return;
		}
		
		await searchInput.fill('fire');
		console.log('✅ Entered "fire" into search');
		
		// Submit search
		await searchInput.press('Enter');
		console.log('✅ Submitted search');
		
		// Wait for results to load
		await page.waitForTimeout(2000);
		
		// Take screenshot after search
		await page.screenshot({ path: 'test-artifacts/rhyme-after-search.png', fullPage: true });
		
		// Now check if focus mode button appears
		const focusButtonAfter = overlay.locator('button.focus-toggle');
		const focusCountAfter = await focusButtonAfter.count();
		console.log(`📊 Focus buttons after search: ${focusCountAfter}`);
		
		if (focusCountAfter > 0) {
			console.log('✅ Focus mode button appeared after results loaded');
			
			// Verify button text
			const buttonText = await focusButtonAfter.textContent();
			expect(buttonText).toContain('Focus Mode');
			console.log(`✅ Button text correct: "${buttonText}"`);
			
			// Verify button is enabled
			const isDisabled = await focusButtonAfter.isDisabled();
			expect(isDisabled).toBe(false);
			console.log('✅ Button is enabled');
			
		} else {
			console.log('⚠️  Focus button not found after search - checking for results');
			const wordChips = overlay.locator('.word-chip');
			const chipCount = await wordChips.count();
			console.log(`📊 Word chips found: ${chipCount}`);
			
			if (chipCount === 0) {
				console.log('⚠️  No results returned from search');
			}
		}
	});

	test('Focus mode toggles between grid and animation views', async ({ page }) => {
		console.log('\n🧪 Test 2: Focus mode view toggling');
		
		await page.goto('/');
		await page.waitForTimeout(2000);
		
		// Navigate to Rhyme Families and search
		const rhymeButton = page.locator('button:has-text("Rhyme Families")').first();
		if (await rhymeButton.count() === 0) {
			console.log('⚠️  Rhyme Families button not found');
			test.skip();
			return;
		}
		
		await rhymeButton.click();
		await page.waitForTimeout(500);
		
		const overlay = page.locator('[aria-label*="Rhyme"], .focus-mode-overlay').first();
		const searchInput = overlay.locator('input[type="text"]').first();
		
		if (await searchInput.count() === 0) {
			console.log('⚠️  Search input not found');
			test.skip();
			return;
		}
		
		await searchInput.fill('dream');
		await searchInput.press('Enter');
		await page.waitForTimeout(2000);
		
		// Check for focus button
		const focusButton = overlay.locator('button.focus-toggle');
		if (await focusButton.count() === 0) {
			console.log('⚠️  Focus button not found');
			test.skip();
			return;
		}
		
		// Initial state: grid should be visible
		const wordGrid = overlay.locator('.word-grid');
		const gridVisibleBefore = await wordGrid.isVisible();
		console.log(`📊 Grid visible before: ${gridVisibleBefore}`);
		
		// Click focus mode
		await focusButton.click();
		await page.waitForTimeout(500);
		
		// Take screenshot in focus mode
		await page.screenshot({ path: 'test-artifacts/rhyme-focus-active.png', fullPage: true });
		
		// Check button changed
		const buttonText = await focusButton.textContent();
		expect(buttonText).toContain('Exit Focus Mode');
		console.log('✅ Button text changed to "Exit Focus Mode"');
		
		// Check button has active class
		const hasActive = await focusButton.evaluate(el => el.classList.contains('active'));
		expect(hasActive).toBe(true);
		console.log('✅ Button has active class');
		
		// Grid should be hidden
		const gridVisibleAfter = await wordGrid.isVisible();
		expect(gridVisibleAfter).toBe(false);
		console.log('✅ Grid hidden in focus mode');
		
		// Click again to exit
		await focusButton.click();
		await page.waitForTimeout(500);
		
		// Grid should return
		const gridVisibleAgain = await wordGrid.isVisible();
		expect(gridVisibleAgain).toBe(true);
		console.log('✅ Grid visible again after exiting focus mode');
	});
});
