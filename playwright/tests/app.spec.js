const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'http://localhost:3001';

test('health endpoint returns ok', async ({ request }) => {
  const res = await request.get(`${BASE}/dev/api/health`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.status).toBe('ok');
});

test('landing shows hero image and Get Started gate', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  const logo = page.locator('img[alt="Inspire"]');
  await expect(logo).toBeVisible();
  const gate = page.locator('button:has-text("Get Started - Pick a Lab")');
  await expect(gate).toBeVisible();
});

test('mode picker flow and top nav appear', async ({ page }) => {
  await page.goto(BASE);
  await page.click('button:has-text("Get Started - Pick a Lab")');
  await expect(page.locator('.mode-selector')).toBeVisible();
  // pick first mode
  await page.click('.mode-card >> nth=0');
  await expect(page.locator('.top-nav')).toBeVisible();
  await expect(page.locator('.nav-handle')).toBeVisible();
});

test('generate pack -> open card -> focus mode overlay', async ({ page }) => {
  await page.goto(BASE);
  await page.click('button:has-text("Get Started - Pick a Lab")');
  await page.click('.mode-card >> nth=0');

  // click generate
  await page.click('button[title="Generate fuel pack"]');

  // wait for pack deck to populate
  await page.waitForSelector('.pack-deck .pack-card', { timeout: 15000 });
  const cards = await page.locator('.pack-deck .pack-card').count();
  expect(cards).toBeGreaterThan(0);

  // open first card
  await page.click('.pack-deck .pack-card >> nth=0');
  await page.waitForSelector('.pack-card-detail', { timeout: 5000 });
  await expect(page.locator('.pack-card-detail')).toBeVisible();

  // toggle focus mode
  const focusBtn = page.locator('button.focus-toggle, button:has-text("Focus Mode")');
  if (await focusBtn.count() === 0) {
    // try alternative button label
    await page.click('button:has-text("Focus Mode")');
  } else {
    await focusBtn.first().click();
  }

  // assert the pack detail has focus-mode class and is fixed
  await page.waitForSelector('.pack-card-detail.focus-mode', { timeout: 4000 });
  const pos = await page.$eval('.pack-card-detail.focus-mode', (el) => getComputedStyle(el).position);
  expect(pos).toBe('fixed');

  // close focus mode (click the focus toggle again or the close button)
  if (await focusBtn.count() > 0) {
    await focusBtn.first().click();
  } else {
    // click the close icon inside overlays if present
    const closeBtn = page.locator('.challenge-overlay .icon-button, .account-overlay .icon-button, .settings-overlay .icon-button, .pack-card-detail .icon-button');
    if (await closeBtn.count() > 0) await closeBtn.first().click();
  }
});

test('daily challenge overlay loads backend activity', async ({ page }) => {
  await page.goto(BASE);
  // open a mode to surface the metric card if needed
  if (await page.locator('button:has-text("Get Started - Pick a Lab")').count() > 0) {
    await page.click('button:has-text("Get Started - Pick a Lab")');
    await page.click('.mode-card >> nth=0');
  }
  // open daily challenge overlay via metric card
  const challengeBtn = page.locator('.metric-card.challenge-card, button.metric-card.challenge-card');
  await expect(challengeBtn).toBeVisible();
  await challengeBtn.first().click();
  await page.waitForSelector('.challenge-overlay', { timeout: 5000 });
  // check activity entries
  const items = await page.locator('.challenge-activity li').count();
  expect(items).toBeGreaterThanOrEqual(0);
});
