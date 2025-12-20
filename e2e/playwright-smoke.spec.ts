import { test, expect } from '@playwright/test';

test('Dev console can generate a fuel pack', async ({ page }) => {
  // Backend dev console is served at /dev when ENABLE_DEV_CONSOLE=true
  await page.goto('http://localhost:3001/dev');
  // Click the generate button in the dev console
  await page.click('#genBtn');
  // Wait for the output box to contain a JSON response
  await page.waitForSelector('#output');
  const txt = await page.textContent('#output');
  expect(txt).toBeTruthy();
  // The output JSON should include a status and body
  expect(txt).toMatch(/"status"\s*:\s*\d+/);
});
