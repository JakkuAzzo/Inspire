import { expect, test } from '@playwright/test';

// Verify the challenge flow renders streak progress and badges when completing a prompt.
test('daily challenge completion updates streak + badges', async ({ page }) => {
        test.setTimeout(120_000);
        await page.goto('/');

        const challengeButton = page.getByRole('button', { name: /daily challenge/i });
        await expect(challengeButton).toBeVisible();
        await challengeButton.click();

        const overlay = page.locator('.challenge-overlay-body');
        await expect(overlay).toBeVisible();
        await expect(overlay.locator('.streak-meter')).toBeVisible();

        const completeButton = page.getByRole('button', { name: /mark complete/i });
        await completeButton.click();
        await expect(page.getByText(/Marked Complete/)).toBeVisible({ timeout: 20000 });

        const badges = overlay.locator('.achievement-item');
        await expect(badges.first()).toBeVisible({ timeout: 20000 });
});
