import { test, expect } from '@playwright/test';

test('root page generates a fuel pack and shows words & memes', async ({ page, baseURL }) => {
  await page.goto('/');
  // Click the Generate button
  await page.fill('#wordsCount', '4');
  await page.fill('#memesCount', '2');
  await page.click('#genBtn');
  // Wait for output area to contain JSON
  await page.waitForSelector('#lastPack');
  const last = await page.locator('#lastPack').innerText();
  expect(last.length).toBeGreaterThan(0);
});
