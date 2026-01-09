import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function navigateToWorkspace(page: Page) {
        await page.goto('/');
        await page.getByRole('button', { name: 'Get Started - Pick a Lab' }).click();
                await page.getByRole('button', { name: /Writer Lab/ }).click();
        await page.getByRole('button', { name: 'Rapper' }).click();
}

test('focus animation and creator settings persist after reload', async ({ page }) => {
        test.setTimeout(120_000);

        await navigateToWorkspace(page);

        await page.getByLabel('Focus animation mode').click();
        const densityInput = page.locator('#focusDensityInline');
        const speedInput = page.locator('#focusSpeedInline');
        await densityInput.fill('12');
        await speedInput.fill('2.1');
        await page.getByLabel('Close focus mode').click();

        await page.getByLabel('Open creator settings').click();
        await page.getByRole('button', { name: 'Collaborate' }).click();
        await page.getByRole('button', { name: '5s' }).click();
        await page.getByLabel('Close focus mode').click();

        await page.reload();
        await navigateToWorkspace(page);

        await page.getByLabel('Focus animation mode').click();
        await expect(page.locator('#focusDensityInline')).toHaveValue('12');
        await expect(page.locator('#focusSpeedInline')).toHaveValue('2.1');
        await page.getByLabel('Close focus mode').click();

        await page.getByLabel('Open creator settings').click();
        await expect(page.getByRole('button', { name: 'Collaborate' })).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByRole('button', { name: '5s' })).toHaveAttribute('aria-pressed', 'true');
});
