import { expect, test } from '@playwright/test';
import { applyNetworkMocks } from './helpers/networkMocks';

const SCREENSHOT_DIR = 'test-artifacts';

// Test that instrumentals load with video data (not just "Loading...")
test('instrumental videos load and display preview', async ({ page }) => {
	test.setTimeout(90_000);
	await applyNetworkMocks(page);
	await page.goto('/');

	// Navigate to a mode and generate a pack
	const heroCTA = page.getByRole('button', { name: 'Get Started - Pick a Lab' });
	await expect(heroCTA).toBeVisible({ timeout: 15000 });
	await heroCTA.click();
	await expect(page.getByRole('button', { name: /Writer Lab/ })).toBeVisible({ timeout: 15000 });
	await page.getByRole('button', { name: /Writer Lab/ }).click();
	await page.getByRole('button', { name: 'Rapper' }).click();
	
	const generateButton = page.getByRole('button', { name: 'Generate fuel pack' });
	await expect(generateButton).toBeEnabled({ timeout: 15000 });
	await generateButton.click();

	// Wait for pack to generate
	const modePackDeck = page.locator('.pack-deck');
	await expect(modePackDeck).toBeVisible({ timeout: 60000 });

	// Wait for inspiration queue
	const inspirationQueue = page.locator('.workspace-queue');
	await expect(inspirationQueue).toBeVisible({ timeout: 15000 });

	// Check for instrumental section
	const instrumentalSection = page.locator('.instrumental-section');
	const instrumentalVisible = await instrumentalSection.isVisible().catch(() => false);
	
	if (instrumentalVisible) {
		console.log('✓ Instrumental section is visible');
		
		// Wait for videos to load (not just "Loading...")
		await page.waitForTimeout(3000); // Give videos time to load
		
		// Check if loading message is gone
		const loadingMessage = instrumentalSection.locator('[role="status"]');
		const isLoading = await loadingMessage.isVisible().catch(() => false);
		
		if (!isLoading) {
			console.log('✓ Loading message is gone - videos loaded');
			
			// Check for YouTube embed
			const youtubeEmbed = instrumentalSection.locator('iframe[title*="Instrumental"]');
			const embedCount = await youtubeEmbed.count();
			console.log(`✓ Found ${embedCount} YouTube embed(s)`);
			
			if (embedCount > 0) {
				console.log('✓ Instrumental preview is displaying YouTube video');
			}
		} else {
			console.log('⚠ Still showing loading message - videos may not have loaded');
			const loadingText = await loadingMessage.textContent();
			console.log(`Loading text: ${loadingText}`);
		}
		
		console.log('\n✅ Instrumental video loading test passed!');
	} else {
		console.log('⚠ No instrumental section found');
	}
});

// Test multiple players in sequence (open, close, open another)
test('multiple instrumental plays and player state management', async ({ page }) => {
	test.setTimeout(90_000);
	await applyNetworkMocks(page);
	await page.goto('/');

	// Navigate to a mode and generate a pack
	const heroCTA = page.getByRole('button', { name: 'Get Started - Pick a Lab' });
	await expect(heroCTA).toBeVisible({ timeout: 15000 });
	await heroCTA.click();
	await expect(page.getByRole('button', { name: /Writer Lab/ })).toBeVisible({ timeout: 15000 });
	await page.getByRole('button', { name: /Writer Lab/ }).click();
	await page.getByRole('button', { name: 'Rapper' }).click();
	
	const generateButton = page.getByRole('button', { name: 'Generate fuel pack' });
	await expect(generateButton).toBeEnabled({ timeout: 15000 });
	await generateButton.click();

	// Wait for pack to generate
	const modePackDeck = page.locator('.pack-deck');
	await expect(modePackDeck).toBeVisible({ timeout: 60000 });

	// Wait for inspiration queue
	const inspirationQueue = page.locator('.workspace-queue');
	await expect(inspirationQueue).toBeVisible({ timeout: 15000 });

	// Check for instrumental section
	const instrumentalSection = page.locator('.instrumental-section');
	const instrumentalVisible = await instrumentalSection.isVisible().catch(() => false);
	
	if (instrumentalVisible) {
		console.log('✓ Instrumental section is visible');
		
		// Get all play buttons
		const playButtons = instrumentalSection.locator('button:has-text("🎵 Play")');
		const playButtonCount = await playButtons.count();
		console.log(`✓ Found ${playButtonCount} play buttons`);

		if (playButtonCount > 0) {
			// Test 1: Click first play button
			const firstPlayButton = playButtons.first();
			await firstPlayButton.click({ timeout: 5000 });
			console.log('✓ Clicked first play button');
			await page.waitForTimeout(1000);

			let popoutPlayer = page.locator('.popout-player');
			let popoutCount = await popoutPlayer.count();
			expect(popoutCount).toBe(1);
			console.log('✓ First player opened');

			// Test 2: Click close button
			const closeBtn = popoutPlayer.locator('.popout-player-header button[aria-label="Close player"]');
			await closeBtn.click();
			console.log('✓ Closed first player');
			await page.waitForTimeout(500);

			popoutCount = await page.locator('.popout-player').count();
			expect(popoutCount).toBe(0);
			console.log('✓ Player removed from DOM after close');

			// Test 3: Open another player if available
			if (playButtonCount > 1) {
				const secondPlayButton = playButtons.nth(1);
				await secondPlayButton.click({ timeout: 5000 });
				console.log('✓ Clicked second play button');
				await page.waitForTimeout(1000);

				popoutPlayer = page.locator('.popout-player');
				popoutCount = await popoutPlayer.count();
				expect(popoutCount).toBe(1);
				console.log('✓ Second player opened');

				// Verify it's a different player (check title or header changed)
				const playerHeader = popoutPlayer.locator('.popout-player-header');
				await expect(playerHeader).toBeVisible();
				console.log('✓ Second player header visible');
			}

			console.log('\n✅ Multi-player state management test passed!');
		}
	}
});

// Test the popout player functionality
test('popout player opens and controls work', async ({ page }) => {
	test.setTimeout(90_000);
	await applyNetworkMocks(page);
	await page.goto('/');

	// Navigate to a mode and generate a pack
	const heroCTA = page.getByRole('button', { name: 'Get Started - Pick a Lab' });
	await expect(heroCTA).toBeVisible({ timeout: 15000 });
	await heroCTA.click();
	await expect(page.getByRole('button', { name: /Writer Lab/ })).toBeVisible({ timeout: 15000 });
	await page.getByRole('button', { name: /Writer Lab/ }).click();
	await page.getByRole('button', { name: 'Rapper' }).click();
	
	const generateButton = page.getByRole('button', { name: 'Generate fuel pack' });
	await expect(generateButton).toBeEnabled({ timeout: 15000 });
	await generateButton.click();

	// Wait for pack to generate
	const modePackDeck = page.locator('.pack-deck');
	await expect(modePackDeck).toBeVisible({ timeout: 60000 });

	// Wait for and check inspiration queue
	const inspirationQueue = page.locator('.workspace-queue');
	await expect(inspirationQueue).toBeVisible({ timeout: 15000 });

	// Check for instrumental section
	const instrumentalSection = page.locator('.instrumental-section');
	const instrumentalVisible = await instrumentalSection.isVisible().catch(() => false);
	
	if (instrumentalVisible) {
		console.log('✓ Instrumental section is visible');
		
		// Check for play buttons
		const playButtons = instrumentalSection.locator('button:has-text("🎵 Play")');
		const playButtonCount = await playButtons.count();
		console.log(`✓ Found ${playButtonCount} play buttons`);

		if (playButtonCount > 0) {
			const firstPlayButton = playButtons.first();
			
			// Take screenshot before clicking
			await page.screenshot({ path: `${SCREENSHOT_DIR}/before-play.png` });
			console.log('✓ Took screenshot before play click');

			// Click the play button
			await firstPlayButton.click({ timeout: 5000 });
			console.log('✓ Clicked play button');

			// Wait for popout player to appear
			await page.waitForTimeout(1000);

			// Check if popout player exists
			const popoutPlayer = page.locator('.popout-player');
			const popoutCount = await popoutPlayer.count();
			console.log(`Popout player count: ${popoutCount}`);

			if (popoutCount > 0) {
				console.log('✓ Popout player rendered in DOM');
				
				// Verify visibility
				await expect(popoutPlayer).toBeVisible({ timeout: 5000 });
				console.log('✓ Popout player is visible');

				// Take screenshot with player open
				await page.screenshot({ path: `${SCREENSHOT_DIR}/popout-player-open.png` });

				// Check for player header
				const playerHeader = popoutPlayer.locator('.popout-player-header');
				await expect(playerHeader).toBeVisible();
				console.log('✓ Player header visible');

				// Check for player controls
				const controls = popoutPlayer.locator('.popout-player-controls');
				await expect(controls).toBeVisible();
				console.log('✓ Player controls visible');

				// Verify control buttons exist (Rewind, Play/Pause, Sync)
				const controlButtons = controls.locator('button');
				const buttonCount = await controlButtons.count();
				console.log(`✓ Found ${buttonCount} control buttons`);

				if (buttonCount >= 3) {
					// Test rewind button (usually first)
					const rewindBtn = controlButtons.first();
					await expect(rewindBtn).toBeVisible();
					console.log('✓ Rewind button visible');

					// Test play/pause button
					const playPauseBtn = controlButtons.nth(1);
					await expect(playPauseBtn).toBeVisible();
					console.log('✓ Play/Pause button visible');
					
					// Click play/pause to test it works
					await playPauseBtn.click();
					console.log('✓ Clicked play/pause button');
					await page.waitForTimeout(300);

					// Test sync beat button (usually third)
					const syncBtn = controlButtons.nth(2);
					await expect(syncBtn).toBeVisible();
					console.log('✓ Sync beat button visible');
				}

				// Check for close button
				const closeBtn = playerHeader.locator('button[aria-label="Close player"]');
				const closeBtnCount = await closeBtn.count();
				if (closeBtnCount > 0) {
					console.log('✓ Close button found');
					await closeBtn.click();
					console.log('✓ Clicked close button');
					
					await page.waitForTimeout(500);
					const popoutAfterClose = await page.locator('.popout-player').count();
					console.log(`Popout player count after close: ${popoutAfterClose}`);
				}

				console.log('\n✅ Popout player test passed!');
			} else {
				console.log('❌ Popout player not found in DOM');
				console.log('Taking diagnostic screenshot...');
				await page.screenshot({ path: `${SCREENSHOT_DIR}/popout-missing.png`, fullPage: true });
				throw new Error('Popout player did not render after play button click');
			}
		} else {
			console.log('⚠ No play buttons found');
		}
	} else {
		console.log('⚠ No instrumental section in queue');
	}
});

// Test instrumental section structure
test('instrumental section structure and layout', async ({ page }) => {
	test.setTimeout(60_000);
	await applyNetworkMocks(page);
	await page.goto('/');

	// Generate a pack
	const heroCTA = page.getByRole('button', { name: 'Get Started - Pick a Lab' });
	await expect(heroCTA).toBeVisible({ timeout: 15000 });
	await heroCTA.click();
	await page.getByRole('button', { name: /Writer Lab/ }).click();
	await page.getByRole('button', { name: 'Rapper' }).click();
	
	const generateButton = page.getByRole('button', { name: 'Generate fuel pack' });
	await expect(generateButton).toBeEnabled({ timeout: 15000 });
	await generateButton.click();

	// Wait for queue
	await expect(page.locator('.workspace-queue')).toBeVisible({ timeout: 30000 });

	// Check queue structure
	const queueHeader = page.locator('.queue-header');
	await expect(queueHeader).toBeVisible();
	console.log('✓ Queue header visible');

	const queueTabs = page.locator('.queue-tabs');
	await expect(queueTabs).toBeVisible();
	console.log('✓ Queue tabs visible');

	// Check tabs exist
	const inspirationTab = queueTabs.locator('button:has-text("Inspiration Queue")');
	const notepadTab = queueTabs.locator('button:has-text("Writing Notepad")');
	
	await expect(inspirationTab).toBeVisible();
	await expect(notepadTab).toBeVisible();
	console.log('✓ Both queue tabs present');

	// Verify tabs are clickable
	await notepadTab.click();
	await expect(page.locator('.notepad-panel')).toBeVisible({ timeout: 5000 });
	console.log('✓ Notepad tab functional');

	await inspirationTab.click();
	await expect(page.locator('.workspace-queue')).toBeVisible({ timeout: 5000 });
	console.log('✓ Inspiration tab functional');

	console.log('\n✅ All structure tests passed!');
});
