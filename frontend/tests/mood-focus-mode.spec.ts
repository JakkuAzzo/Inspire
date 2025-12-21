import { expect, test } from '@playwright/test';

const SCREENSHOT_DIR = 'test-artifacts';

// Verify mood palette theming updates CSS variables and focus mode hides workspace chrome.
test('mood palette and focus mode flows', async ({ page }) => {
        test.setTimeout(90_000);
        await page.goto('/');

        const communityPeak = page
                .locator('.session-peaks .session-peak')
                .filter({ has: page.getByRole('heading', { name: 'Community feed' }) });
        await expect(communityPeak).toBeVisible();
        await communityPeak.getByRole('button', { name: 'Fork' }).first().click();

        const appShell = page.locator('.app');
        const initialAccent = (await appShell.evaluate((node) => getComputedStyle(node as HTMLElement).getPropertyValue('--mood-accent'))).trim();

        await page.getByRole('button', { name: 'Show Controls ▸' }).click();
        await page.getByRole('button', { name: 'Sunrise' }).click();
        await page.getByRole('button', { name: 'Close' }).click();

        const updatedAccent = (await appShell.evaluate((node) => getComputedStyle(node as HTMLElement).getPropertyValue('--mood-accent'))).trim();
        expect(updatedAccent).not.toEqual(initialAccent);

        const packCards = page.locator('.pack-deck .pack-card');
        await expect(packCards.first()).toBeVisible();
        await packCards.first().click();

        await page.getByRole('button', { name: 'Focus Mode' }).click();
        await expect(page.locator('.focus-mode-overlay')).toBeVisible();
        await expect(appShell).toHaveClass(/focus-mode-active/);
        await expect(page.locator('.workspace-queue')).toBeHidden();
        await expect(page.locator('.top-nav')).toBeHidden();

        await page.screenshot({ path: `${SCREENSHOT_DIR}/mood-focus.png`, fullPage: true });
});
