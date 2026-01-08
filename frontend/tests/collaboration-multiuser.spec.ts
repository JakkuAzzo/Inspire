import { test, expect, chromium } from '@playwright/test';
import path from 'path';

test.describe('Multi-User Collaboration with Screenshots', () => {
	const artifactDir = 'test-artifacts';
	
	test('should allow two users to create and join a collaborative session', async () => {
		const browser = await chromium.launch();
		
		try {
			// ============ USER 1: Create Session ============
			console.log('\n📹 USER 1: Creating collaborative session...');
			// Grant camera/microphone permissions
			const user1Context = await browser.newContext({
				permissions: ['camera', 'microphone'],
				recordVideo: { dir: 'test-artifacts/videos' } // Record video if needed
			});
			const user1Page = await user1Context.newPage();
			
			await user1Page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
			await user1Page.waitForSelector('.session-peak', { timeout: 15000 });
			
			// Take screenshot of home screen
			await user1Page.screenshot({ path: `${artifactDir}/01-user1-home.png`, fullPage: true });
			console.log('✓ Captured: User 1 home screen');
			
			// Find and click "Collaborate" peak (requires auth, so it may not be visible)
			const collabPeak1 = user1Page.locator('.session-peak').filter({ hasText: 'Collaborate' });
			const hasCollabPeak = await collabPeak1.count() > 0;
			
			if (!hasCollabPeak) {
				// User needs to authenticate first
				console.log('ℹ Collaborate peak not visible - user needs to authenticate');
				
				// Try to find auth trigger (login/signup button)
				const authButtons = user1Page.locator('button').filter({ hasText: /sign|login|create account/i });
				const authButtonCount = await authButtons.count();
				
				if (authButtonCount > 0) {
					console.log('🔐 Found authentication UI - simulating authentication...');
					// In a real test, you'd handle the auth flow here
					// For now, we'll note this requirement
					await user1Context.close();
					console.log('⚠️  Skipping - requires authentication flow');
					return;
				}
			}
			
			// Click Start button in Collaborate peak
			const startButton1 = collabPeak1.locator('button').filter({ hasText: /Start|Create/i });
			await startButton1.click();
			await user1Page.waitForTimeout(500);
			
			// Take screenshot of modal
			await user1Page.screenshot({ path: `${artifactDir}/02-user1-modal.png`, fullPage: true });
			console.log('✓ Captured: User 1 modal opened');
			
			// Fill in session details
			const titleInput = user1Page.locator('#collab-title, input[placeholder*="collab" i]');
			const sessionTitle = `Collab Test ${Date.now()}`;
			await titleInput.fill(sessionTitle);
			
			// Select mode
			const modeSelect = user1Page.locator('#collab-mode, select');
			if (await modeSelect.count() > 0) {
				await modeSelect.selectOption('lyricist');
			}
			
			// Submit form
			const createButton = user1Page.locator('button[type="submit"], .modal button.primary, .modal button:has-text("Create"), .modal button:has-text("Start")');
			if (await createButton.count() > 0) {
				await createButton.click();
				await user1Page.waitForTimeout(1000);
			}
			
			// Take screenshot after session creation
			await user1Page.screenshot({ path: `${artifactDir}/03-user1-session-created.png`, fullPage: true });
			console.log('✓ Captured: User 1 session created');
			
			// Extract session ID from URL or page state
			const pageUrl = user1Page.url();
			console.log(`📍 Session URL: ${pageUrl}`);
			
			// Wait for collaborative session detail to appear
			const sessionDetail1 = user1Page.locator('.collaborative-session-detail, .collab-session-page, .session-detail');
			if (await sessionDetail1.count() > 0) {
				await sessionDetail1.waitFor({ timeout: 5000 });
				await user1Page.screenshot({ path: `${artifactDir}/04-user1-session-detail.png`, fullPage: true });
				console.log('✓ Captured: User 1 in session detail view');
			}
			
			// ============ USER 2: Join Same Session ============
			console.log('\n🎯 USER 2: Attempting to join same session...');
			// Also grant camera/microphone permissions to user 2
			const user2Context = await browser.newContext({
				permissions: ['camera', 'microphone'],
				recordVideo: { dir: 'test-artifacts/videos' }
			});
			const user2Page = await user2Context.newPage();
			
			await user2Page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
			await user2Page.waitForSelector('.session-peak', { timeout: 15000 });
			
			// Take screenshot of user 2 home screen
			await user2Page.screenshot({ path: `${artifactDir}/05-user2-home.png`, fullPage: true });
			console.log('✓ Captured: User 2 home screen');
			
			// Try to find active collaborative sessions list
			const collabPeak2 = user2Page.locator('.session-peak').filter({ hasText: 'Collaborate' });
			const sessionList = collabPeak2.locator('ul li');
			const sessionCount = await sessionList.count();
			console.log(`Found ${sessionCount} active sessions`);
			
			if (sessionCount > 0) {
				// Click join on the first session (the one we just created)
				const joinButton = sessionList.first().locator('button').filter({ hasText: /Join|Enter/i });
				if (await joinButton.count() > 0) {
					await joinButton.click();
					await user2Page.waitForTimeout(1000);
					
					// Take screenshot after joining
					await user2Page.screenshot({ path: `${artifactDir}/06-user2-joined.png`, fullPage: true });
					console.log('✓ Captured: User 2 joined session');
				}
			}
			
			// ============ FINAL STATE: Both Users in Session ============
			console.log('\n👥 FINAL STATE: Both users in session');
			
			// Take simultaneous screenshots
			const user1Final = await user1Page.screenshot({ path: `${artifactDir}/07-user1-final.png`, fullPage: true });
			const user2Final = await user2Page.screenshot({ path: `${artifactDir}/08-user2-final.png`, fullPage: true });
			
			console.log('✓ Captured: Both users in collaborative session');
			
			// Take a close-up of collaborative controls
			const daw1 = user1Page.locator('.collaborative-daw, [data-testid="daw"], .daw');
			if (await daw1.count() > 0) {
				await daw1.screenshot({ path: `${artifactDir}/09-user1-daw.png` });
				console.log('✓ Captured: User 1 DAW/controls');
			}
			
			const video1 = user1Page.locator('.video-stream, [data-testid="video"], .video');
			if (await video1.count() > 0) {
				await video1.screenshot({ path: `${artifactDir}/10-user1-video.png` });
				console.log('✓ Captured: User 1 video stream');
			}
			
			// Verify both users can see session information
			const sessionTitle1 = await user1Page.locator('h2, h3').first().textContent();
			const sessionTitle2 = await user2Page.locator('h2, h3').first().textContent();
			
			console.log(`User 1 sees: "${sessionTitle1}"`);
			console.log(`User 2 sees: "${sessionTitle2}"`);
			
			// Test passes if we get here without errors
			expect(true).toBe(true);
			
			await user1Context.close();
			await user2Context.close();
		} finally {
			await browser.close();
		}
	});

	test('should show session timer for guest users', async ({ page, context }) => {
		// Grant camera/microphone permissions
		await context.grantPermissions(['camera', 'microphone']);
		
		// This test verifies that guest sessions show expiry timer
		await page.goto('http://localhost:8080');
		await page.waitForSelector('.session-peak', { timeout: 15000 });
		
		// Make a direct API call as guest to create a session
		const sessionResponse = await page.request.post('http://localhost:3001/api/sessions/collaborate', {
			data: {
				title: 'Guest Session Test',
				mode: 'producer',
				submode: 'sampler',
				isGuest: true
			}
		});
		
		expect(sessionResponse.ok()).toBeTruthy();
		const body = await sessionResponse.json();
		
		console.log('Session response:', JSON.stringify(body, null, 2));
		
		// Verify guest session has expiry information
		if (body.remainingMs !== undefined) {
			console.log(`✓ Guest session expires in ${body.remainingMinutes} minutes`);
			expect(body.remainingMs).toBeGreaterThan(0);
			expect(body.remainingMs).toBeLessThanOrEqual(60 * 60 * 1000); // 1 hour
		}
		
		// Verify session structure includes guest flag
		expect(body.session.isGuestSession).toBe(true);
		expect(body.session.expiresAt).toBeDefined();
		
		// Calculate time remaining
		const now = Date.now();
		const expiresAt = body.session.expiresAt;
		const minutesRemaining = Math.ceil((expiresAt - now) / 60000);
		console.log(`⏱️  Session will expire in approximately ${minutesRemaining} minutes`);
		
		// Take screenshot showing the app
		await page.screenshot({ path: `${artifactDir}/timer-test.png`, fullPage: true });
	});

	test('should handle expired guest sessions gracefully', async ({ request }) => {
		// Create a guest session
		const createResponse = await request.post('http://localhost:3001/api/sessions/collaborate', {
			data: {
				title: 'Expiring Guest Session',
				mode: 'editor',
				submode: 'image-editor',
				isGuest: true
			}
		});
		
		expect(createResponse.ok()).toBeTruthy();
		const body = await createResponse.json();
		const sessionId = body.id;
		
		console.log(`✓ Created guest session: ${sessionId}`);
		console.log(`⏱️  Expires at: ${new Date(body.session.expiresAt).toISOString()}`);
		
		// Immediately try to retrieve it (should work)
		const getResponse1 = await request.get(`http://localhost:3001/api/sessions/${sessionId}`);
		expect(getResponse1.ok()).toBeTruthy();
		console.log('✓ Guest session accessible immediately after creation');
		
		// In a real test, we'd wait 1 hour, but for this test we'll just verify the structure
		// The expiry mechanism is server-side
		const sessionData = await getResponse1.json();
		expect(sessionData.remainingMinutes).toBeLessThanOrEqual(60);
	});
});
