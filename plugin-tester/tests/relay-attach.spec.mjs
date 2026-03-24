import { expect, test } from '@playwright/test';

test('relay leave/updates/attach/cancel flow', async ({ page }) => {
  await page.goto('/');

  // Bootstrap a master room so relay has a valid room target.
  await page.getByRole('button', { name: 'Create Room' }).click();
  await expect(page.locator('#masterStatus')).toContainText('Room created:');

  // Relay leaves room then hits updates; attach dialog should appear immediately.
  await page.getByRole('button', { name: 'Leave Room' }).click();
  await page.getByRole('button', { name: 'Updates' }).click();
  await expect(page.locator('#attachDialog')).toHaveClass(/open/);

  // Corrupt token and attach; server auto-refresh should prevent persistent invalid-token lock.
  await page.evaluate(() => window.__sim.corruptRelayToken());
  await page.getByRole('button', { name: 'Attach' }).click();

  await expect(page.locator('#attachDialog')).not.toHaveClass(/open/);
  await expect(page.locator('#relayStatus')).toContainText('Attached to');
  await expect(page.locator('#relayStatus')).not.toContainText('Locked: invalid session token');

  // Cancel path: leaving room + updates + cancel keeps relay on home controls.
  await page.getByRole('button', { name: 'Leave Room' }).click();
  await page.getByRole('button', { name: 'Updates' }).click();
  await expect(page.locator('#attachDialog')).toHaveClass(/open/);

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('#attachDialog')).not.toHaveClass(/open/);
  await expect(page.locator('#relayHomeControls')).toBeVisible();
  await expect(page.locator('#relayRoomCode')).toBeVisible();
  await expect(page.locator('#relayPassword')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Updates' })).toBeVisible();
});
