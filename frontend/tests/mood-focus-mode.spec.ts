import { expect, test } from '@playwright/test';
import { applyNetworkMocks } from './helpers/networkMocks';

const SCREENSHOT_DIR = 'test-artifacts';

// Verify mood palette theming updates CSS variables and focus mode hides workspace chrome.
test('mood palette and focus mode flows', async ({ page }) => {
        test.setTimeout(90_000);
        await applyNetworkMocks(page);
        await page.goto('/');

        // Use hero flow to enter the studio and generate a pack
        const heroCTA = page.getByRole('button', { name: 'Get Started - Pick a Lab' });
        await expect(heroCTA).toBeVisible({ timeout: 15000 });
        await heroCTA.click();
                await expect(page.getByRole('button', { name: /Writer Lab/ })).toBeVisible({ timeout: 15000 });
                await page.getByRole('button', { name: /Writer Lab/ }).click();
        await page.getByRole('button', { name: 'Rapper' }).click();
        const generateButton = page.getByRole('button', { name: 'Generate fuel pack' });
        await expect(generateButton).toBeEnabled({ timeout: 15000 });
        await generateButton.click();

        const appShell = page.locator('.app');
        const initialAccent = (await appShell.evaluate((node) => getComputedStyle(node as HTMLElement).getPropertyValue('--mood-accent'))).trim();

        await page.getByRole('button', { name: 'Show Controls ▸' }).click();
        await page.getByRole('button', { name: 'Sunrise' }).click();
        await page.getByRole('button', { name: 'Close' }).click();

        const updatedAccent = (await appShell.evaluate((node) => getComputedStyle(node as HTMLElement).getPropertyValue('--mood-accent'))).trim();
        expect(updatedAccent).not.toEqual(initialAccent);

        const packCards = page.locator('.pack-deck .pack-card');
        await expect(packCards.first()).toBeVisible({ timeout: 15000 });
        await packCards.first().click();

        await page.getByRole('button', { name: 'Focus Mode' }).click();
        await expect(page.locator('.focus-mode-overlay')).toBeVisible({ timeout: 15000 });
        await expect(appShell).toHaveClass(/focus-mode-active/);
        await expect(page.locator('.workspace-queue')).toBeHidden();
        await expect(page.locator('.top-nav')).toBeHidden();

        await page.screenshot({ path: `${SCREENSHOT_DIR}/mood-focus.png`, fullPage: true });
});
