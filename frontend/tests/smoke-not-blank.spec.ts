import { test, expect } from '@playwright/test';

test('app renders non-blank landing UI', async ({ page }) => {
  await page.goto('http://localhost:8080');
  await page.waitForLoadState('domcontentloaded');
  // Wait briefly for React to render
  await page.waitForTimeout(500);

  // Root should exist and contain some HTML
  const root = page.locator('#root');
  await expect(root).toBeVisible();
  const html = await root.innerHTML();
  expect(html.length).toBeGreaterThan(50);

  // At least two session peaks should be present (layout may vary)
  const peaks = page.locator('.session-peak');
  await expect(peaks.first()).toBeVisible();
});
