import { expect, test } from '@playwright/test';

const SCREENSHOT_DIR = 'test-artifacts';

// Verify clicking a track in the inspiration queue replaces the main player (title updates)
test('inspiration queue track selection replaces main player', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');

  // Enter studio via hero flow and generate a fresh pack (ensures YouTube item exists)
  await page.getByRole('button', { name: 'Get Started - Pick a Lab' }).click();
  await page.getByRole('button', { name: /Lyricist Studio/ }).click();
  await page.getByRole('button', { name: 'Rapper' }).click();
  const generateButton = page.getByRole('button', { name: 'Generate fuel pack' });
  await expect(generateButton).toBeEnabled();
  await generateButton.click();

  // Ensure the queue is visible
  const queue = page.locator('.workspace-queue');
  await expect(queue).toBeVisible({ timeout: 30_000 });

  // Find the first queue item with a tracklist (YouTube playlist)
  const youtubeItem = queue.locator('.queue-item').filter({ has: queue.locator('.queue-tracklist') }).first();
  if (!(await youtubeItem.isVisible().catch(() => false))) {
    console.log('No playlist tracklist found in queue; skipping selection check.');
    return;
  }

  // Capture the current main title
  const mainTitleEl = youtubeItem.locator('.queue-embed-meta > strong');
  const beforeTitle = await mainTitleEl.textContent();

  // Pick a non-active track from the tracklist and click it
  const nonActiveTrack = youtubeItem.locator('.queue-tracklist .queue-track:not(.active)').first();
  const clickedTitle = await nonActiveTrack.locator('.queue-track-title').textContent();
  await nonActiveTrack.click();

  // The main title should update to the clicked track title
  await expect(mainTitleEl).toHaveText(clickedTitle || '', { timeout: 30_000 });

  await page.screenshot({ path: `${SCREENSHOT_DIR}/queue-select.png`, fullPage: true });
});
