import { test, expect } from '@playwright/test';

/**
 * STANDALONE GUEST AUTH TEST
 * This test does NOT depend on webServer config
 * It goes directly to the IP:port specified
 */

test.describe('Guest Sign-In - Standalone', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate directly to the IP
		// Don't use baseURL - use the full URL
		await page.goto('https://192.168.1.119:3000/', {
			waitUntil: 'networkidle'
		});
	});

	test('should complete guest authentication', async ({ page }) => {
		console.log('\n✅ TEST: Guest Authentication Flow\n');

		try {
			// STEP 1: Verify page loaded
			console.log('1️⃣  Checking page loaded...');
			const title = await page.title();
			console.log(`    Title: "${title}"`);
			expect(title).toContain('Inspire');

			// STEP 2: Find and click "Sign Up / Log in"
			console.log('2️⃣  Finding "Sign Up / Log in" button...');
			const btn = page.getByRole('button', { name: /sign up.*log in/i }).first();
			const isVisible = await btn.isVisible({ timeout: 5000 }).catch(() => false);
			
			if (!isVisible) {
				console.log('    ❌ Button not found!');
				const html = await page.content();
				console.log('    Taking screenshot for debugging...');
				await page.screenshot({ path: '/tmp/debug-not-found.png', fullPage: true });
				throw new Error('Sign up button not found');
			}
			
			console.log('    ✓ Button found, clicking...');
			await btn.click();

			// STEP 3: Wait for modal
			console.log('3️⃣  Waiting for auth modal...');
			const modal = page.locator('.auth-modal-overlay');
			try {
				await modal.waitFor({ timeout: 5000, state: 'visible' });
				console.log('    ✓ Modal appeared');
			} catch {
				console.log('    ❌ Modal did not appear');
				await page.screenshot({ path: '/tmp/debug-no-modal.png', fullPage: true });
				throw new Error('Auth modal not found');
			}

			// STEP 4: Click Guest Mode
			console.log('4️⃣  Clicking Guest Mode tab...');
			const guestTab = page.getByRole('button', { name: /guest mode/i });
			try {
				await guestTab.click({ timeout: 3000 });
				await page.waitForTimeout(300);
				console.log('    ✓ Guest mode selected');
			} catch {
				console.log('    ❌ Guest mode tab not found');
				await page.screenshot({ path: '/tmp/debug-no-guest-tab.png', fullPage: true });
				throw new Error('Guest mode tab not found');
			}

			// STEP 5: Click Continue
			console.log('5️⃣  Clicking "Continue as Guest"...');
			const continueBtn = page.getByRole('button', { name: /continue as guest/i });
			try {
				await continueBtn.click({ timeout: 3000 });
				console.log('    ✓ Button clicked');
			} catch {
				console.log('    ❌ Continue button not found');
				await page.screenshot({ path: '/tmp/debug-no-continue.png', fullPage: true });
				throw new Error('Continue button not found');
			}

			// STEP 6: Wait for modal to close
			console.log('6️⃣  Waiting for authentication to complete...');
			try {
				await modal.waitFor({ timeout: 10000, state: 'hidden' });
				console.log('    ✓ Modal closed - AUTH SUCCESSFUL!');
			} catch {
				console.log('    ❌ Modal did not close (auth may have failed)');
				await page.screenshot({ path: '/tmp/debug-modal-stuck.png', fullPage: true });
				throw new Error('Modal still visible after continue clicked');
			}

			console.log('\n✅ TEST PASSED - Guest authentication successful!\n');

		} catch (error) {
			console.log('\n❌ TEST FAILED');
			console.log(`Error: ${error}`);
			await page.screenshot({ path: '/tmp/debug-error.png', fullPage: true });
			throw error;
		}
	});
});
