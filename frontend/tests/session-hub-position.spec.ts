import { expect, test } from '@playwright/test';

const SCREENSHOT_DIR = 'test-artifacts';

test('session hub position stability and label visibility', async ({ page }) => {
	await page.goto('/');

	// The landing view uses the "Session Peaks" layout.
	const peaks = page.locator('.session-peaks');
	await expect(peaks).toBeVisible({ timeout: 10000 });

	// Array to store position measurements
	const positions: Array<{ top: number; bottom: number; timestamp: number }> = [];
	const startTime = Date.now();
	const monitorDuration = 2000; // Monitor for 2 seconds

	// Monitor position periodically
	console.log('Starting position monitoring...');
	
	while (Date.now() - startTime < monitorDuration) {
		const boundingBox = await peaks.boundingBox();
		
		if (boundingBox) {
			positions.push({
				top: boundingBox.y,
				bottom: boundingBox.y + boundingBox.height,
				timestamp: Date.now() - startTime
			});
		}
		
		await page.waitForTimeout(25);
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

	// Take screenshot showing the peaks
	await page.screenshot({ 
		path: `${SCREENSHOT_DIR}/session-hub-position-initial.png`, 
		fullPage: true 
	});

	console.log('Checking session peak labels...');
	const spectateVisible = await page.getByRole('heading', { name: 'Spectate live' }).isVisible().catch(() => false);
	const collabVisible = await page.getByRole('heading', { name: 'Join a collab' }).isVisible().catch(() => false);
	const communityVisible = await page.getByRole('heading', { name: 'Community feed' }).isVisible().catch(() => false);
	console.log(`Spectate live visible: ${spectateVisible}`);
	console.log(`Join a collab visible: ${collabVisible}`);
	console.log(`Community feed visible: ${communityVisible}`);
	
	// Take a focused screenshot of just the peaks
	const peaksBox = await peaks.boundingBox();
	if (peaksBox) {
		await page.screenshot({ 
			path: `${SCREENSHOT_DIR}/session-hub-labels-peeking.png`,
			clip: {
				x: Math.max(0, peaksBox.x - 20),
				y: Math.max(0, peaksBox.y - 20),
				width: Math.min(peaksBox.width + 40, 1100),
				height: Math.min(peaksBox.height + 40, 700)
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
	expect(communityVisible, 'Community feed label should be visible').toBe(true);
});

test('session hub should not expand without direct hover', async ({ page }) => {
	await page.goto('/');

	const peaks = page.locator('.session-peaks');
	await expect(peaks).toBeVisible({ timeout: 10000 });

	// Move mouse to safe area away from session hub (top left corner)
	await page.mouse.move(50, 50);
	
	// Take screenshots at intervals while keeping mouse away
	const screenshots: Array<{ index: number; time: number; position: number | null; height: number | null }> = [];
	const interval = 100; // Every 100ms
	const duration = 3000; // For 3 seconds

	console.log('Monitoring session peaks with mouse at top-left (50, 50)');

	for (let i = 0; i < duration / interval; i++) {
		const boundingBox = await peaks.boundingBox();
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

	// Analyze for any unexpected expansion state when not hovering.
	const unexpectedExpandedCount = await page.locator('.session-peaks .session-peak.expanded').count();

	console.log(`\nCapture complete:`);
	console.log(`- Total frames: ${screenshots.length}`);
	console.log(`- Expanded peaks (without hover): ${unexpectedExpandedCount}`);
	
	expect(unexpectedExpandedCount, 'Session peaks should not expand without hover').toBe(0);
});
