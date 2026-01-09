import { test, expect } from '@playwright/test';

test('Live Headline should have only one Focus Mode button', async ({ page }) => {
	// Navigate to app
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	// Click Get Started
	const getStartedBtn = page.locator('button:has-text("Get Started")');
	if (await getStartedBtn.isVisible()) {
		await getStartedBtn.click();
		await page.waitForTimeout(500);
	}

	// Click Writer Lab
	const lyricistBtn = page.locator('button:has-text("Writer Lab")').or(page.locator('h2:has-text("Writer Lab")')).first();
	await lyricistBtn.click();
	await page.waitForTimeout(500);

	// Click Rapper submode
	const rapperBtn = page.locator('button:has-text("Rapper")').or(page.locator('strong:has-text("Rapper")')).first();
	await rapperBtn.click();
	await page.waitForTimeout(1000);

	// Generate a pack
	const generateBtn = page.locator('button[title="Generate fuel pack"]').or(page.locator('button:has-text("Generate")'));
	await generateBtn.first().click();
	await page.waitForTimeout(3000); // Wait for pack generation

	// Open Live Headline card
	const headlineCard = page.locator('.deck-card').filter({ hasText: 'Live Headline' }).first();
	await headlineCard.click();
	await page.waitForTimeout(1000);

	// Count Focus Mode buttons
	const focusModeButtons = await page.locator('button:has-text("Focus Mode")').all();
	
	console.log(`Found ${focusModeButtons.length} Focus Mode button(s)`);
	
	// Should have exactly 1 Focus Mode button (in detail toolbox)
	expect(focusModeButtons.length).toBe(1);

	// Verify it's in the detail toolbox
	const toolboxFocusBtn = page.locator('.detail-toolbox button:has-text("Focus Mode")');
	await expect(toolboxFocusBtn).toBeVisible();
});

test('Rhyme Families should have only one Focus Mode button', async ({ page }) => {
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const getStartedBtn = page.locator('button:has-text("Get Started")');
	if (await getStartedBtn.isVisible()) {
		await getStartedBtn.click();
		await page.waitForTimeout(500);
	}

	const lyricistBtn = page.locator('button:has-text("Writer Lab")').or(page.locator('h2:has-text("Writer Lab")')).first();
	await lyricistBtn.click();
	await page.waitForTimeout(500);

	const rapperBtn = page.locator('button:has-text("Rapper")').or(page.locator('strong:has-text("Rapper")')).first();
	await rapperBtn.click();
	await page.waitForTimeout(1000);

	const generateBtn = page.locator('button[title="Generate fuel pack"]').or(page.locator('button:has-text("Generate")'));
	await generateBtn.first().click();
	await page.waitForTimeout(3000);

	// Open Rhyme Families card
	const rhymeCard = page.locator('.deck-card').filter({ hasText: 'Rhyme Families' }).first();
	await rhymeCard.click();
	await page.waitForTimeout(1000);

	// Count Focus Mode buttons
	const focusModeButtons = await page.locator('button:has-text("Focus Mode")').all();
	
	console.log(`Found ${focusModeButtons.length} Focus Mode button(s) in Rhyme Families`);
	
	expect(focusModeButtons.length).toBe(1);

	const toolboxFocusBtn = page.locator('.detail-toolbox button:has-text("Focus Mode")');
	await expect(toolboxFocusBtn).toBeVisible();
});

test('Word Explorer should have only one Focus Mode button', async ({ page }) => {
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const getStartedBtn = page.locator('button:has-text("Get Started")');
	if (await getStartedBtn.isVisible()) {
		await getStartedBtn.click();
		await page.waitForTimeout(500);
	}

	const lyricistBtn = page.locator('button:has-text("Writer Lab")').or(page.locator('h2:has-text("Writer Lab")')).first();
	await lyricistBtn.click();
	await page.waitForTimeout(500);

	const rapperBtn = page.locator('button:has-text("Rapper")').or(page.locator('strong:has-text("Rapper")')).first();
	await rapperBtn.click();
	await page.waitForTimeout(1000);

	const generateBtn = page.locator('button[title="Generate fuel pack"]').or(page.locator('button:has-text("Generate")'));
	await generateBtn.first().click();
	await page.waitForTimeout(3000);

	// Open Word Explorer card
	const wordCard = page.locator('.deck-card').filter({ hasText: 'Word Explorer' }).first();
	await wordCard.click();
	await page.waitForTimeout(1000);

	// Count Focus Mode buttons
	const focusModeButtons = await page.locator('button:has-text("Focus Mode")').all();
	
	console.log(`Found ${focusModeButtons.length} Focus Mode button(s) in Word Explorer`);
	
	expect(focusModeButtons.length).toBe(1);

	const toolboxFocusBtn = page.locator('.detail-toolbox button:has-text("Focus Mode")');
	await expect(toolboxFocusBtn).toBeVisible();
});
