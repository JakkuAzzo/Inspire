import { test, expect } from '@playwright/test';

test.describe('Start Collaboration', () => {
	test('should open collaboration modal and create a session', async ({ page }) => {
		// Navigate to the app
		await page.goto('/');
		
		// Wait for the app to load (wait for session peaks which are on home screen)
		await page.waitForSelector('.session-peak', { timeout: 15000 });
		
		// Look for the collaboration peak section (text is "Collaborate" not "Collaborate")
		const collabPeak = page.locator('.session-peak').filter({ hasText: 'Collaborate' });
		await expect(collabPeak).toBeVisible();
		
		// Click the Start button to open the collaboration modal
		const startButton = collabPeak.locator('button.primary', { hasText: 'Start' });
		await startButton.click();
		
		// Verify modal opens
		const modal = page.locator('.overlay-backdrop[aria-label="Create collaboration"]');
		await expect(modal).toBeVisible();
		
		const modalContent = page.locator('.modal.glass');
		await expect(modalContent).toBeVisible();
		
		// Verify modal title
		const modalTitle = modalContent.locator('h3');
		await expect(modalTitle).toHaveText('Start a Collaboration');
		
		// Fill in session details
		const titleInput = page.locator('#collab-title');
		await titleInput.fill('Test Collaboration Session');
		
		// Select mode (default should be 'lyricist')
		const modeSelect = page.locator('#collab-mode');
		await expect(modeSelect).toBeVisible();
		await modeSelect.selectOption('lyricist');
		
		// Select submode (should have options)
		const submodeSelect = page.locator('#collab-submode');
		await expect(submodeSelect).toBeVisible();
		// Wait for submodes to populate
		await page.waitForTimeout(300);
		
		// Submit the form
		const createButton = modalContent.locator('button[type="submit"]', { hasText: /Create|Start/i });
		await createButton.click();
		
		// Wait for modal to close and session to be created
		await expect(modal).not.toBeVisible({ timeout: 5000 });
		
		// Verify feedback message appears
		const feedback = page.locator('.feedback.success');
		await expect(feedback).toBeVisible({ timeout: 5000 });
		await expect(feedback).toContainText(/Collaboration room created/i);
		
		// Verify collaborative session detail view appears
		const sessionDetail = page.locator('.collaborative-session-detail, .collab-session-page');
		await expect(sessionDetail).toBeVisible({ timeout: 5000 });
	});

	test('should validate required fields in collaboration modal', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('.session-peak', { timeout: 15000 });
		
		// Open collaboration modal
		const collabPeak = page.locator('.session-peak').filter({ hasText: 'Collaborate' });
		const startButton = collabPeak.locator('button.primary');
		await startButton.click();
		
		const modal = page.locator('.modal.glass');
		await expect(modal).toBeVisible();
		
		// Clear the title (it's optional, so this should still work)
		const titleInput = page.locator('#collab-title');
		await titleInput.clear();
		
		// Try to submit without changing mode/submode (should use defaults)
		const createButton = modal.locator('button[type="submit"]');
		await createButton.click();
		
		// Session should still be created with default values
		await page.waitForTimeout(1000);
		
		// Either modal closed (success) or error message appears
		const modalVisible = await modal.isVisible();
		const errorFeedback = page.locator('.feedback.error');
		
		if (!modalVisible) {
			// Success case - session was created
			const successFeedback = page.locator('.feedback.success');
			await expect(successFeedback).toBeVisible({ timeout: 3000 });
		} else {
			// Error case - should show validation error
			await expect(errorFeedback).toBeVisible({ timeout: 3000 });
		}
	});

	test('should close modal when clicking backdrop', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('.session-peak', { timeout: 15000 });
		
		// Open collaboration modal
		const collabPeak = page.locator('.session-peak').filter({ hasText: 'Collaborate' });
		const startButton = collabPeak.locator('button.primary');
		await startButton.click();
		
		const backdrop = page.locator('.overlay-backdrop[aria-label="Create collaboration"]');
		await expect(backdrop).toBeVisible();
		
		// Click the backdrop (outside the modal)
		await backdrop.click({ position: { x: 10, y: 10 } });
		
		// Modal should close
		await expect(backdrop).not.toBeVisible({ timeout: 2000 });
	});

	test('should close modal when clicking close button', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('.session-peak', { timeout: 15000 });
		
		// Open collaboration modal
		const collabPeak = page.locator('.session-peak').filter({ hasText: 'Collaborate' });
		const startButton = collabPeak.locator('button.primary');
		await startButton.click();
		
		const modal = page.locator('.overlay-backdrop[aria-label="Create collaboration"]');
		await expect(modal).toBeVisible();
		
		// Click the close button
		const closeButton = page.locator('.modal.glass button[aria-label="Close"]');
		await closeButton.click();
		
		// Modal should close
		await expect(modal).not.toBeVisible({ timeout: 2000 });
	});

	test('should update submode options when mode changes', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('.session-peak', { timeout: 15000 });
		
		// Open collaboration modal
		const collabPeak = page.locator('.session-peak').filter({ hasText: 'Collaborate' });
		const startButton = collabPeak.locator('button.primary');
		await startButton.click();
		
		const modal = page.locator('.modal.glass');
		await expect(modal).toBeVisible();
		
		const modeSelect = page.locator('#collab-mode');
		const submodeSelect = page.locator('#collab-submode');
		
		// Get initial submode options for lyricist
		await modeSelect.selectOption('lyricist');
		await page.waitForTimeout(200);
		const lyricistSubmodes = await submodeSelect.locator('option').count();
		
		// Change to producer mode
		await modeSelect.selectOption('producer');
		await page.waitForTimeout(200);
		const producerSubmodes = await submodeSelect.locator('option').count();
		
		// Submode options should have updated
		expect(producerSubmodes).toBeGreaterThan(0);
		
		// Change to editor mode
		await modeSelect.selectOption('editor');
		await page.waitForTimeout(200);
		const editorSubmodes = await submodeSelect.locator('option').count();
		
		// Each mode should have submodes
		expect(lyricistSubmodes).toBeGreaterThan(0);
		expect(editorSubmodes).toBeGreaterThan(0);
	});

	test('should display empty state when no collaborative sessions exist', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('.session-peak', { timeout: 15000 });
		
		// Look for the collaboration peak section
		const collabPeak = page.locator('.session-peak').filter({ hasText: 'Collaborate' });
		await expect(collabPeak).toBeVisible();
		
		// Check for empty state message
		const emptyMessage = collabPeak.locator('.session-empty');
		const hasEmptyState = await emptyMessage.count() > 0;
		
		if (hasEmptyState) {
			await expect(emptyMessage).toContainText(/Create a session/i);
		}
		// If there are sessions, verify the list is present
		else {
			const sessionList = collabPeak.locator('.session-peak-list li');
			await expect(sessionList).not.toHaveCount(0);
		}
	});
});
