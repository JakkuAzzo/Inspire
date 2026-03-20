import { expect, test } from '@playwright/test';

test.describe('Join collab room flow', () => {
  test('joins P7FSUM and switches to full collaborative session view', async ({ page }) => {
    // Authenticate first so join/create controls are available.
    const loginRes = await page.request.post('/api/auth/login', {
      data: {
        email: 'test.collab.1773326469@example.com',
        password: 'CollabUser1!2026'
      }
    });
    expect(loginRes.ok()).toBeTruthy();

    await page.goto('/');
    await page.waitForSelector('.session-peak', { timeout: 15000 });

    await page.context().grantPermissions(['camera', 'microphone']);

    const joinControls = page.locator('.session-join-credentials');
    await joinControls.getByRole('textbox', { name: /Room code or session id/i }).fill('P7FSUM');
    await joinControls.getByLabel(/Room password/i).fill('1234');
    await joinControls.getByRole('button', { name: /Join Collab/i }).click();

    const sessionDetail = page.locator('.collaborative-session-detail');
    await expect(sessionDetail).toBeVisible({ timeout: 15000 });

    // Landing page hero should not remain active once a session is joined.
    await expect(page.getByRole('heading', { name: 'Make Something' })).toHaveCount(0);

    // Session-specific room metadata should be visible.
    await expect(page.getByText(/Room:\s*P7FSUM/i)).toBeVisible();

    // Scroll should be enabled in session mode.
    const appOverflow = await page.locator('.app').evaluate((el) => getComputedStyle(el).overflowY);
    expect(appOverflow).not.toBe('hidden');

    const canScroll = await page.evaluate(() => {
      const root = document.scrollingElement || document.documentElement;
      return root.scrollHeight > root.clientHeight;
    });
    expect(canScroll).toBeTruthy();

    // Video/call controls should render even if no streams are active in headless runs.
    await expect(page.getByText('Layout:')).toBeVisible();
    await expect(page.locator('.stream-count')).toBeVisible();
  });
});
