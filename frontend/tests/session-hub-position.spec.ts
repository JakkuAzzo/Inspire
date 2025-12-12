import { expect, test } from '@playwright/test';

const SCREENSHOT_DIR = 'test-artifacts';

test('session hub position stability and label visibility', async ({ page }) => {
	// Navigate to the app
	await page.goto('http://localhost:8080/');

	// Wait for the session hub to be visible
	const sessionHub = page.locator('.session-hub.glass');
	await expect(sessionHub).toBeVisible({ timeout: 10000 });

	// Array to store position measurements
	const positions: Array<{ top: number; bottom: number; timestamp: number }> = [];
	const startTime = Date.now();
	const monitorDuration = 2000; // Monitor for 2 seconds

	// Monitor position every 1ms
	console.log('Starting position monitoring...');
	
	while (Date.now() - startTime < monitorDuration) {
		const boundingBox = await sessionHub.boundingBox();
		
		if (boundingBox) {
			positions.push({
				top: boundingBox.y,
				bottom: boundingBox.y + boundingBox.height,
				timestamp: Date.now() - startTime
			});
		}
		
		// Wait 1ms before next measurement
		await page.waitForTimeout(1);
	}

	console.log(`Captured ${positions.length} position measurements`);

	// Analyze position changes
	const positionChanges: Array<{ from: number; to: number; time: number }> = [];
	
	for (let i = 1; i < positions.length; i++) {
		const diff = Math.abs(positions[i].top - positions[i - 1].top);
		
		if (diff > 10) { // Significant position change (more than 10px)
			positionChanges.push({
				from: positions[i - 1].top,
				to: positions[i].top,
				time: positions[i].timestamp
			});
			console.log(`Position jump detected at ${positions[i].timestamp}ms: ${positions[i - 1].top}px → ${positions[i].top}px (Δ${diff}px)`);
		}
	}

	// Check for rapid position flashing
	const rapidChanges = positionChanges.filter((change, index, arr) => {
		if (index === 0) return false;
		return change.time - arr[index - 1].time < 50; // Changes within 50ms
	});

	console.log(`Found ${positionChanges.length} significant position changes`);
	console.log(`Found ${rapidChanges.length} rapid position changes (within 50ms)`);

	// Take screenshot showing the session hub
	await page.screenshot({ 
		path: `${SCREENSHOT_DIR}/session-hub-position-initial.png`, 
		fullPage: true 
	});

	// Check labels visibility
	console.log('Checking session hub labels...');
	
	// Check for both column labels
	const spectateLabel = page.locator('.session-hub .session-heading:has-text("Spectate live")');
	const collabLabel = page.locator('.session-hub .session-heading:has-text("Join a collab")');
	
	const spectateCount = await spectateLabel.count();
	const collabCount = await collabLabel.count();
	const spectateVisible = await spectateLabel.isVisible().catch(() => false);
	const collabVisible = await collabLabel.isVisible().catch(() => false);
	
	console.log(`Spectate live heading count: ${spectateCount}, visible: ${spectateVisible}`);
	console.log(`Join a collab heading count: ${collabCount}, visible: ${collabVisible}`);
	
	// Get all visible text in session hub
	const allText = await sessionHub.textContent();
	console.log(`Session hub text content: "${allText}"`);
	
	// Check computed styles of the second column
	const secondColumn = page.locator('.session-hub .session-column').nth(1);
	if (await secondColumn.count() > 0) {
		const display = await secondColumn.evaluate(el => window.getComputedStyle(el).display);
		const visibility = await secondColumn.evaluate(el => window.getComputedStyle(el).visibility);
		const opacity = await secondColumn.evaluate(el => window.getComputedStyle(el).opacity);
		console.log(`Second column styles - display: ${display}, visibility: ${visibility}, opacity: ${opacity}`);
	}
	
	// Take a focused screenshot of just the session hub
	const hubBox = await sessionHub.boundingBox();
	if (hubBox) {
		await page.screenshot({ 
			path: `${SCREENSHOT_DIR}/session-hub-labels-peeking.png`,
			clip: {
				x: Math.max(0, hubBox.x - 20),
				y: Math.max(0, hubBox.y - 20),
				width: Math.min(hubBox.width + 40, 800),
				height: Math.min(hubBox.height + 40, 600)
			}
		});
	}
	
	// Report findings
	console.log('\n=== TEST SUMMARY ===');
	console.log(`Position measurements: ${positions.length}`);
	console.log(`Significant position changes: ${positionChanges.length}`);
	console.log(`Rapid flashing events: ${rapidChanges.length}`);
	
	// Log unique positions to see if it's jumping between specific values
	const uniquePositions = [...new Set(positions.map(p => Math.round(p.top)))];
	console.log(`Unique Y positions: ${uniquePositions.sort((a, b) => a - b).join(', ')}`);

	// Assertions
	expect(positionChanges.length, `Session hub should not change position significantly (found ${positionChanges.length} changes)`).toBe(0);
	expect(rapidChanges.length, `Session hub should not flash rapidly (found ${rapidChanges.length} rapid changes)`).toBe(0);
	
	// Verify both labels are visible
	expect(spectateVisible, 'Spectate live label should be visible').toBe(true);
	expect(collabVisible, 'Join a collab label should be visible').toBe(true);
});

test('session hub should not expand without direct hover', async ({ page }) => {
	await page.goto('http://localhost:8080/');

	const sessionHub = page.locator('.session-hub.glass');
	await expect(sessionHub).toBeVisible({ timeout: 10000 });

	// Move mouse to safe area away from session hub (top left corner)
	await page.mouse.move(50, 50);
	
	// Take screenshots at intervals while keeping mouse away
	const screenshots: Array<{ index: number; time: number; position: number | null; height: number | null }> = [];
	const interval = 100; // Every 100ms
	const duration = 3000; // For 3 seconds

	console.log('Monitoring session hub with mouse at top-left (50, 50)');

	for (let i = 0; i < duration / interval; i++) {
		const boundingBox = await sessionHub.boundingBox();
		screenshots.push({
			index: i,
			time: i * interval,
			position: boundingBox ? boundingBox.y : null,
			height: boundingBox ? boundingBox.height : null
		});
		
		if (boundingBox) {
			console.log(`Frame ${i}: Y=${boundingBox.y.toFixed(2)}px, Height=${boundingBox.height.toFixed(2)}px`);
		}
		
		await page.waitForTimeout(interval);
	}

	// Analyze for any expansion
	const unexpectedExpansions = screenshots.filter((s, i) => {
		if (i === 0 || !s.height || !screenshots[i-1].height) return false;
		return Math.abs(s.height! - screenshots[i-1].height!) > 10;
	});

	console.log(`\nCapture complete:`);
	console.log(`- Total frames: ${screenshots.length}`);
	console.log(`- Unexpected expansions: ${unexpectedExpansions.length}`);
	
	if (unexpectedExpansions.length > 0) {
		console.log('\nUnexpected expansions detected:');
		unexpectedExpansions.forEach(s => {
			const prev = screenshots[s.index - 1];
			console.log(`  Frame ${s.index} at ${s.time}ms: Height ${prev.height}px → ${s.height}px`);
		});
	}
	
	// Assert no unexpected expansions occurred
	expect(unexpectedExpansions.length, 'Session hub should not expand without hover').toBe(0);
});
