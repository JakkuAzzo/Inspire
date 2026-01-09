import { expect, test } from '@playwright/test';

test('Drag pack cards into combined focus using data transfer', async ({ page }) => {
  test.setTimeout(120_000);
  
  await page.goto('/');
  
  // Pick Writer Lab
  await page.getByRole('button', { name: 'Get Started - Pick a Lab' }).click();
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
  const firstCardId = await packCards.first().getAttribute('data-card-id');
  const secondCardId = await packCards.nth(1).getAttribute('data-card-id');
  console.log(`First card ID: ${firstCardId}`);
  console.log(`Second card ID: ${secondCardId}`);
  
  // Get drop zone
  const dropZone = page.locator('.combined-drop');
  await expect(dropZone).toBeVisible();
  
  // Simulate drag event with data transfer on first card
  console.log('Simulating drop of first card...');
  await dropZone.evaluate((element, payload) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', payload.cardId);
    const dragOverEvent = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt });
    element.dispatchEvent(dragOverEvent);
    const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
    element.dispatchEvent(dropEvent);
  }, { cardId: firstCardId });
  
  await page.waitForTimeout(500);
  
  // Check if card was added
  const combinedList = dropZone.locator('.combined-cards-list');
  const chipCount1 = await combinedList.locator('.combined-card-chip').count();
  console.log(`Cards in drop zone after first drop: ${chipCount1}`);
  
  if (chipCount1 > 0) {
    console.log('✓ First card added successfully');
    
    // Simulate drop of second card
    console.log('Simulating drop of second card...');
    await dropZone.evaluate((element, payload) => {
      const dt = new DataTransfer();
      dt.setData('text/plain', payload.cardId);
      const dragOverEvent = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt });
      element.dispatchEvent(dragOverEvent);
      const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
      element.dispatchEvent(dropEvent);
    }, { cardId: secondCardId });
    
    await page.waitForTimeout(500);
    
    const chipCount2 = await combinedList.locator('.combined-card-chip').count();
    console.log(`Total cards in drop zone: ${chipCount2}`);
    expect(chipCount2).toBe(2);
    console.log('✓ Both cards added successfully!');
  } else {
    console.log('✗ First card was not added. Drag-drop may not be working.');
    expect(chipCount1).toBeGreaterThan(0);
  }
});
