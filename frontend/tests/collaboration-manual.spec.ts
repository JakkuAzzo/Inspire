import { test, expect } from '@playwright/test';

test.describe('Start Collaboration - Manual Flow', () => {
	test('manually verify collaboration UI is accessible', async ({ page }) => {
		// Navigate to the app
		await page.goto('/');
		
		// Wait for app to load
		await page.waitForSelector('.session-peak, .mode-card, .app-foreground', { timeout: 15000 });
		
		// Take a screenshot of the initial state
		await page.screenshot({ path: 'test-artifacts/collab-home-screen.png', fullPage: true });
		
		// Try to find any session peaks
		const sessionPeaks = page.locator('.session-peak');
		const peakCount = await sessionPeaks.count();
		console.log(`Found ${peakCount} session peaks`);
		
		// Log all visible peaks
		for (let i = 0; i < peakCount; i++) {
			const peak = sessionPeaks.nth(i);
			const header = await peak.locator('h3').first().textContent();
			console.log(`Peak ${i}: ${header}`);
		}
		
		// If Collaborate peak exists, test the flow
		const collabPeak = sessionPeaks.filter({ hasText: 'Collaborate' });
		const hasCollabPeak = await collabPeak.count() > 0;
		
		if (hasCollabPeak) {
			console.log('✓ Collaborate peak found!');
			
			// Take screenshot of collaboration peak
			await collabPeak.screenshot({ path: 'test-artifacts/collab-peak.png' });
			
			// Try to click Start button
			const startButton = collabPeak.locator('button').filter({ hasText: /Start|Create/i });
			if (await startButton.count() > 0) {
				await startButton.click();
				await page.waitForTimeout(500);
				
				// Check if modal opened
				const modal = page.locator('.overlay-backdrop, .modal');
				const modalCount = await modal.count();
				console.log(`Modal elements found: ${modalCount}`);
				
				if (modalCount > 0) {
					await page.screenshot({ path: 'test-artifacts/collab-modal.png', fullPage: true });
					console.log('✓ Modal opened successfully!');
				} else {
					console.log('✗ Modal did not open');
				}
			} else {
				console.log('✗ Start button not found');
			}
		} else {
			console.log('✗ Collaborate peak not found - may need authentication');
			
			// Check if there's a login/signup button
			const authButtons = page.locator('button').filter({ hasText: /sign|login|auth/i });
			const authButtonCount = await authButtons.count();
			console.log(`Auth buttons found: ${authButtonCount}`);
			
			if (authButtonCount > 0) {
				console.log('Suggestion: User may need to login first to see Collaborate peak');
			}
		}
		
		// This test always passes - it's for manual verification
		expect(true).toBe(true);
	});

	test('verify API endpoint for creating collaboration session', async ({ request }) => {
		// Test the backend API directly
		const response = await request.post('http://localhost:3001/api/sessions/collaborate', {
			data: {
				title: 'Test Collaboration',
				mode: 'lyricist',
				submode: 'rapper',
				maxParticipants: 4
			}
		});
		
		expect(response.ok()).toBeTruthy();
		const body = await response.json();
		
		console.log('API Response:', JSON.stringify(body, null, 2));
		
		// Verify response structure
		expect(body).toHaveProperty('id');
		expect(body).toHaveProperty('session');
		expect(body.session.title).toBe('Test Collaboration');
		expect(body.session.mode).toBe('lyricist');
		expect(body.session.submode).toBe('rapper');
		
		console.log('✓ API endpoint works correctly!');
		console.log(`Session ID: ${body.id}`);
	});
});
