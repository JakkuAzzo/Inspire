import { expect, test } from '@playwright/test';

test('Pack card checkboxes enable combined focus mode', async ({ page }) => {
  await page.goto('/');
  
  // Wait for the app to load
  await page.waitForSelector('.app', { timeout: 5000 });
  
  // Generate a pack by clicking the generate button
  const generateButton = page.getByRole('button', { name: /generate|create/i }).first();
  await generateButton.click();
  
  // Wait for pack cards to appear
  await page.waitForSelector('.pack-card', { timeout: 10000 });
  
  // Get the pack cards
  const cards = await page.locator('.pack-card').count();
  console.log(`Found ${cards} pack cards`);
  
  // Verify checkboxes are present
  const checkboxes = await page.locator('.pack-card-checkbox').count();
  console.log(`Found ${checkboxes} checkboxes`);
  expect(checkboxes).toBeGreaterThan(0);
  
  // Click the first checkbox
  const firstCheckbox = page.locator('.pack-card-checkbox').first();
  await firstCheckbox.click();
  
  // Verify checkbox is checked
  expect(firstCheckbox).toBeChecked();
  
  // Click the second checkbox
  const secondCheckbox = page.locator('.pack-card-checkbox').nth(1);
  await secondCheckbox.click();
  
  // Verify both are checked
  expect(firstCheckbox).toBeChecked();
  expect(secondCheckbox).toBeChecked();
  
  // Verify "Start Combined Focus" button appears
  const button = page.locator('.start-combined-focus-btn');
  await expect(button).toBeVisible();
  
  // Button should show the count
  const buttonText = await button.textContent();
  expect(buttonText).toContain('2');
  
  // Click the button to start combined focus
  await button.click();
  
  // Verify focus mode is activated
  await page.waitForSelector('.focus-overlay', { timeout: 5000 });
  await expect(page.locator('.focus-overlay')).toBeVisible();
});
