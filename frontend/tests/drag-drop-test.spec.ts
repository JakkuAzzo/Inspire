import { expect, test } from '@playwright/test';

test('Drag and drop pack cards into combined focus area', async ({ page }) => {
  await page.goto('/');
  
  // Wait for page to load and pick a mode (Lyricist)
  await page.waitForTimeout(1000);
  const lyricistButton = page.locator('button:has-text("Lyricist")').first();
  await lyricistButton.click();
  
  // Wait for studio to load
  await page.waitForTimeout(2000);
  
  // Get pack cards from the deck
  const packCards = page.locator('.pack-card');
  const cardCount = await packCards.count();
  console.log(`Found ${cardCount} pack cards`);
  
  if (cardCount < 2) {
    console.log('Not enough cards to test, generating a pack first...');
    const generateButton = page.locator('button[aria-label="Generate fuel pack"]');
    await generateButton.click();
    await page.waitForTimeout(2000);
  }
  
  // Find the combined drop area
  const combinedDrop = page.locator('.combined-drop');
  await expect(combinedDrop).toBeVisible();
  console.log('✓ Combined drop area is visible');
  
  // Get initial card count in drop area (should be 0 or empty)
  const initialDropCards = page.locator('.combined-drop .combined-card');
  const initialCount = await initialDropCards.count();
  console.log(`Initial cards in drop area: ${initialCount}`);
  
  // Perform first drag and drop
  console.log('Dragging first pack card...');
  const firstCard = page.locator('.pack-card').first();
  const firstCardText = await firstCard.locator('.card-label').textContent();
  console.log(`First card label: ${firstCardText}`);
  
  await firstCard.dragTo(combinedDrop);
  await page.waitForTimeout(500);
  
  // Verify first card appears in drop area
  let dropCardsAfterFirst = page.locator('.combined-drop .combined-card');
  let countAfterFirst = await dropCardsAfterFirst.count();
  console.log(`Cards after first drop: ${countAfterFirst}`);
  expect(countAfterFirst).toBe(initialCount + 1);
  
  // Perform second drag and drop
  console.log('Dragging second pack card...');
  const secondCard = page.locator('.pack-card').nth(1);
  const secondCardText = await secondCard.locator('.card-label').textContent();
  console.log(`Second card label: ${secondCardText}`);
  
  await secondCard.dragTo(combinedDrop);
  await page.waitForTimeout(500);
  
  // Verify second card appears in drop area
  dropCardsAfterFirst = page.locator('.combined-drop .combined-card');
  const countAfterSecond = await dropCardsAfterFirst.count();
  console.log(`Cards after second drop: ${countAfterSecond}`);
  expect(countAfterSecond).toBe(initialCount + 2);
  
  console.log('✓ Both cards successfully added to combined focus area');
  console.log('✓ Drag and drop test passed');
});
