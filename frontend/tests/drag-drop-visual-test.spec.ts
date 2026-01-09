import { expect, test } from '@playwright/test';

test('Drag and drop two pack cards into combined focus', async ({ page }) => {
  test.setTimeout(120_000);
  
  await page.goto('/');
  
  // Pick Writer Lab
  await page.getByRole('button', { name: /Writer Lab/ }).click();
  
  // Pick Rapper submode
  await page.getByRole('button', { name: 'Rapper' }).click();
  
  // Generate a pack
  const generateButton = page.getByRole('button', { name: 'Generate fuel pack' });
  await expect(generateButton).toBeEnabled();
  await generateButton.click();
  
  // Wait for pack cards to appear
  const packCards = page.locator('.pack-card');
  await expect(packCards.first()).toBeVisible({ timeout: 60_000 });
  
  // Get drop zone
  const dropZone = page.getByLabel('Combined focus drop area');
  
  // Initially, drop zone should show instruction text
  const dropSub = dropZone.locator('.drop-sub');
  const initialInstruction = await dropSub.textContent();
  console.log(`Initial instruction: ${initialInstruction}`);
  expect(initialInstruction).toContain('Drag from the pack deck');
  
  // Drag first card
  console.log('Dragging first pack card...');
  const firstCard = packCards.first();
  const firstCardLabel = await firstCard.locator('.card-label').textContent();
  console.log(`First card: ${firstCardLabel}`);
  
  await firstCard.dragTo(dropZone);
  await page.waitForTimeout(500);
  
  // After drop, check for combined cards list (should replace drop-sub)
  const combinedList = dropZone.locator('.combined-cards-list');
  const firstCardChips = combinedList.locator('.combined-card-chip');
  let chipCount = await firstCardChips.count();
  console.log(`Cards in drop zone after first drag: ${chipCount}`);
  expect(chipCount).toBe(1);
  
  // Verify first card label is in the drop zone
  const firstChipLabel = await firstCardChips.first().locator('.combined-card-label').textContent();
  console.log(`First chip label: ${firstChipLabel}`);
  expect(firstChipLabel).toBe(firstCardLabel);
  
  // Drag second card
  console.log('Dragging second pack card...');
  const secondCard = packCards.nth(1);
  const secondCardLabel = await secondCard.locator('.card-label').textContent();
  console.log(`Second card: ${secondCardLabel}`);
  
  await secondCard.dragTo(dropZone);
  await page.waitForTimeout(500);
  
  // Check for both cards now in drop zone
  const finalChips = combinedList.locator('.combined-card-chip');
  const finalCount = await finalChips.count();
  console.log(`Total cards in drop zone: ${finalCount}`);
  expect(finalCount).toBe(2);
  
  // Verify both labels are present
  const allLabels = await finalChips.locator('.combined-card-label').allTextContents();
  console.log(`All card labels: ${allLabels.join(', ')}`);
  expect(allLabels).toContain(firstCardLabel);
  expect(allLabels).toContain(secondCardLabel);
  
  console.log('✓ Drag and drop test passed! Both cards added successfully.');
});
