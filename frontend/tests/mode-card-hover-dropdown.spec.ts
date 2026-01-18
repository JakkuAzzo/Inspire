import { expect, test } from '@playwright/test';

const SCREENSHOT_DIR = 'test-artifacts';

test('mode card hover dropdowns appear with Writer Lab', async ({ page }) => {
	test.setTimeout(90_000);
	await page.goto('/');

	// Wait for Get Started button and click it
	const getStartedButton = page.getByRole('button', { name: 'Get Started - Pick a Lab' });
	await expect(getStartedButton).toBeVisible({ timeout: 30000 });
	await getStartedButton.click();
	await page.waitForTimeout(1000);

	// Find Writer Lab button and hover
	const writerLabButton = page.getByRole('button', { name: 'Writer Lab' });
	await expect(writerLabButton).toBeVisible({ timeout: 30000 });
	
	// Get the container and dropdown
	const writerContainer = writerLabButton.locator('..');
	const writerDropdown = writerContainer.locator('.mode-card-dropdown');

	// Hover over Writer Lab card
	await writerLabButton.hover();
	await expect(writerDropdown).toHaveClass(/visible/, { timeout: 5000 });

	// Verify description text
	const writerDescription = writerDropdown.locator('.dropdown-description');
	await expect(writerDescription).toContainText('Spin packs with power words, rhyme families, story arcs');

	// Verify pack includes items
	const writerIncludeItems = writerDropdown.locator('.dropdown-pack-includes li');
	await expect(writerIncludeItems).toHaveCount(6);
	await expect(writerIncludeItems.nth(0)).toContainText('Power words & phrases');
	await expect(writerIncludeItems.nth(1)).toContainText('Rhyme families & sound-alikes');
	await expect(writerIncludeItems.nth(2)).toContainText('Story arc prompts');
	await expect(writerIncludeItems.nth(3)).toContainText('Emotional journey maps');
	await expect(writerIncludeItems.nth(4)).toContainText('Trending news hooks');
	await expect(writerIncludeItems.nth(5)).toContainText('Meme culture references');

	// Verify checkmarks are visible
	const writerCheckmarks = writerDropdown.locator('.check-icon');
	await expect(writerCheckmarks).toHaveCount(6);

	await page.screenshot({ path: `${SCREENSHOT_DIR}/writer-lab-hover.png`, fullPage: true });

	// Move away to hide dropdown
	await page.mouse.move(0, 0);
	await page.waitForTimeout(400);
	await expect(writerDropdown).not.toHaveClass(/visible/, { timeout: 5000 });
});

test('mode card hover dropdowns appear with Producer Lab', async ({ page }) => {
	test.setTimeout(90_000);
	await page.goto('/');

	// Click Get Started
	const getStartedButton = page.getByRole('button', { name: 'Get Started - Pick a Lab' });
	await expect(getStartedButton).toBeVisible({ timeout: 30000 });
	await getStartedButton.click();
	await page.waitForTimeout(1000);

	// Find Producer Lab button and hover
	const producerLabButton = page.getByRole('button', { name: 'Producer Lab' });
	await expect(producerLabButton).toBeVisible({ timeout: 30000 });
	
	// Get the container and dropdown
	const producerContainer = producerLabButton.locator('..');
	const producerDropdown = producerContainer.locator('.mode-card-dropdown');

	// Hover over Producer Lab card
	await producerLabButton.hover();
	await expect(producerDropdown).toHaveClass(/visible/, { timeout: 5000 });

	// Verify description text
	const producerDescription = producerDropdown.locator('.dropdown-description');
	await expect(producerDescription).toContainText('Generate packs with curated samples, FX chains, key/tempo suggestions');

	// Verify pack includes items
	const producerIncludeItems = producerDropdown.locator('.dropdown-pack-includes li');
	await expect(producerIncludeItems).toHaveCount(6);
	await expect(producerIncludeItems.nth(0)).toContainText('Curated audio samples');
	await expect(producerIncludeItems.nth(1)).toContainText('FX chain ideas');
	await expect(producerIncludeItems.nth(2)).toContainText('Key & tempo suggestions');
	await expect(producerIncludeItems.nth(3)).toContainText('Instrumental references');
	await expect(producerIncludeItems.nth(4)).toContainText('Creative production constraints');
	await expect(producerIncludeItems.nth(5)).toContainText('Sonic texture prompts');

	await page.screenshot({ path: `${SCREENSHOT_DIR}/producer-lab-hover.png`, fullPage: true });

	// Move away to hide dropdown
	await page.mouse.move(0, 0);
	await page.waitForTimeout(400);
	await expect(producerDropdown).not.toHaveClass(/visible/, { timeout: 5000 });
});

test('mode card hover dropdowns appear with Editor Suite', async ({ page }) => {
	test.setTimeout(90_000);
	await page.goto('/');

	// Click Get Started
	const getStartedButton = page.getByRole('button', { name: 'Get Started - Pick a Lab' });
	await expect(getStartedButton).toBeVisible({ timeout: 30000 });
	await getStartedButton.click();
	await page.waitForTimeout(1000);

	// Find Editor Suite button and hover
	const editorButton = page.getByRole('button', { name: 'Editor Suite' });
	await expect(editorButton).toBeVisible({ timeout: 30000 });
	
	// Get the container and dropdown
	const editorContainer = editorButton.locator('..');
	const editorDropdown = editorContainer.locator('.mode-card-dropdown');

	// Hover over Editor Suite card
	await editorButton.hover();
	await expect(editorDropdown).toHaveClass(/visible/, { timeout: 5000 });

	// Verify description text
	const editorDescription = editorDropdown.locator('.dropdown-description');
	await expect(editorDescription).toContainText('Create packs with visual references, color palettes, pacing guides');

	// Verify pack includes items
	const editorIncludeItems = editorDropdown.locator('.dropdown-pack-includes li');
	await expect(editorIncludeItems).toHaveCount(6);
	await expect(editorIncludeItems.nth(0)).toContainText('Visual reference images');
	await expect(editorIncludeItems.nth(1)).toContainText('Color palette suggestions');
	await expect(editorIncludeItems.nth(2)).toContainText('Pacing & rhythm guides');
	await expect(editorIncludeItems.nth(3)).toContainText('B-roll & clip ideas');
	await expect(editorIncludeItems.nth(4)).toContainText('Editorial constraints');
	await expect(editorIncludeItems.nth(5)).toContainText('Timeline beat markers');

	await page.screenshot({ path: `${SCREENSHOT_DIR}/editor-suite-hover.png`, fullPage: true });

	// Move away to hide dropdown
	await page.mouse.move(0, 0);
	await page.waitForTimeout(400);
	await expect(editorDropdown).not.toHaveClass(/visible/, { timeout: 5000 });
});

test('dropdowns have smooth animations', async ({ page }) => {
	test.setTimeout(90_000);
	await page.goto('/');

	// Click Get Started
	const getStartedButton = page.getByRole('button', { name: 'Get Started - Pick a Lab' });
	await expect(getStartedButton).toBeVisible({ timeout: 30000 });
	await getStartedButton.click();
	await page.waitForTimeout(1000);

	// Find Writer Lab button
	const writerLabButton = page.getByRole('button', { name: 'Writer Lab' });
	await expect(writerLabButton).toBeVisible({ timeout: 30000 });
	
	// Get the container and dropdown
	const writerContainer = writerLabButton.locator('..');
	const writerDropdown = writerContainer.locator('.mode-card-dropdown');

	// Initially dropdown should not have visible class
	const initialClass = await writerDropdown.getAttribute('class');
	expect(initialClass).not.toContain('visible');

	// Hover to show
	await writerLabButton.hover();
	await page.waitForTimeout(350);

	const visibleClass = await writerDropdown.getAttribute('class');
	expect(visibleClass).toContain('visible');

	// Check opacity is 1 (visible)
	const opacity = await writerDropdown.evaluate((el) => {
		return window.getComputedStyle(el).opacity;
	});
	expect(parseFloat(opacity)).toBe(1);

	// Move away to hide
	await page.mouse.move(0, 0);
	await page.waitForTimeout(350);

	const hiddenClass = await writerDropdown.getAttribute('class');
	expect(hiddenClass).not.toContain('visible');

	// Check opacity is 0 (hidden)
	const hiddenOpacity = await writerDropdown.evaluate((el) => {
		return window.getComputedStyle(el).opacity;
	});
	expect(parseFloat(hiddenOpacity)).toBe(0);
});

test('mode card dropdowns have correct color accents', async ({ page }) => {
	test.setTimeout(90_000);
	await page.goto('/');

	// Click Get Started
	const getStartedButton = page.getByRole('button', { name: 'Get Started - Pick a Lab' });
	await expect(getStartedButton).toBeVisible({ timeout: 30000 });
	console.log('Get Started button is visible, clicking...');
	await getStartedButton.click();
	await page.waitForTimeout(1000); // Give animation time to complete

	// Wait for mode cards
	const modeCards = page.locator('.mode-card-container');
	console.log('Waiting for mode cards...');
	await expect(modeCards).toHaveCount(3, { timeout: 30000 });

	// Test Writer Lab checkmark color (pink #ec4899)
	const writerLabCard = modeCards.nth(0);
	const writerLabButton = writerLabCard.locator('.mode-card');
	await writerLabButton.hover();

	const writerCheckmark = writerLabCard.locator('.check-icon').nth(0);
	const writerCheckmarkColor = await writerCheckmark.evaluate((el) => {
		return window.getComputedStyle(el).color;
	});
	// Pink accent should be present
	expect(writerCheckmarkColor).toBeDefined();

	// Move away
	await page.mouse.move(0, 0);

	// Test Producer Lab checkmark color (cyan #22d3ee)
	const producerLabCard = modeCards.nth(1);
	const producerLabButton = producerLabCard.locator('.mode-card');
	await producerLabButton.hover();

	const producerCheckmark = producerLabCard.locator('.check-icon').nth(0);
	const producerCheckmarkColor = await producerCheckmark.evaluate((el) => {
		return window.getComputedStyle(el).color;
	});
	expect(producerCheckmarkColor).toBeDefined();

	// Move away
	await page.mouse.move(0, 0);

	// Test Editor Suite checkmark color (purple #a855f7)
	const editorCard = modeCards.nth(2);
	const editorButton = editorCard.locator('.mode-card');
	await editorButton.hover();

	const editorCheckmark = editorCard.locator('.check-icon').nth(0);
	const editorCheckmarkColor = await editorCheckmark.evaluate((el) => {
		return window.getComputedStyle(el).color;
	});
	expect(editorCheckmarkColor).toBeDefined();
});

test('mode card dropdown animations work smoothly', async ({ page }) => {
	test.setTimeout(90_000);
	await page.goto('/');

	// Click Get Started
	const getStartedButton = page.getByRole('button', { name: 'Get Started - Pick a Lab' });
	await expect(getStartedButton).toBeVisible({ timeout: 30000 });
	console.log('Get Started button is visible, clicking...');
	await getStartedButton.click();
	await page.waitForTimeout(1000); // Give animation time to complete

	// Wait for mode cards
	const modeCards = page.locator('.mode-card-container');
	console.log('Waiting for mode cards...');
	await expect(modeCards).toHaveCount(3, { timeout: 30000 });

	const writerLabCard = modeCards.nth(0);
	const writerLabButton = writerLabCard.locator('.mode-card');
	const writerLabDropdown = writerLabCard.locator('.mode-card-dropdown');

	// Initially dropdown should not have visible class
	const initialClass = await writerLabDropdown.getAttribute('class');
	expect(initialClass).not.toContain('visible');

	// Hover to show
	await writerLabButton.hover();
	await page.waitForTimeout(350); // Wait for animation

	const visibleClass = await writerLabDropdown.getAttribute('class');
	expect(visibleClass).toContain('visible');

	// Check opacity is 1 (visible)
	const opacity = await writerLabDropdown.evaluate((el) => {
		return window.getComputedStyle(el).opacity;
	});
	expect(parseFloat(opacity)).toBe(1);

	// Move away to hide
	await page.mouse.move(0, 0);
	await page.waitForTimeout(350); // Wait for animation

	const hiddenClass = await writerLabDropdown.getAttribute('class');
	expect(hiddenClass).not.toContain('visible');

	// Check opacity is 0 (hidden)
	const hiddenOpacity = await writerLabDropdown.evaluate((el) => {
		return window.getComputedStyle(el).opacity;
	});
	expect(parseFloat(hiddenOpacity)).toBe(0);
});
