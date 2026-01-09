import { expect, test } from '@playwright/test';

test('combined focus drop supports drag and keyboard add', async ({ page }) => {
        test.setTimeout(120_000);

        await page.goto('/');
        await page.getByRole('button', { name: 'Get Started - Pick a Lab' }).click();
                await page.getByRole('button', { name: /Writer Lab/ }).click();
        await page.getByRole('button', { name: 'Rapper' }).click();

        const generateButton = page.getByRole('button', { name: 'Generate fuel pack' });
        await expect(generateButton).toBeEnabled();
        await generateButton.click();

        const packCards = page.locator('.pack-deck .pack-card');
        await expect(packCards.first()).toBeVisible({ timeout: 60_000 });

        const dropZone = page.getByLabel('Combined focus drop area');
        const firstCardId = await packCards.nth(0).getAttribute('data-card-id');
        await dropZone.evaluate((element, payload) => {
                const dataTransfer = new DataTransfer();
                if (payload?.cardId) {
                        dataTransfer.setData('text/plain', payload.cardId);
                }
                element.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
                element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
        }, { cardId: firstCardId });
        await expect(dropZone.locator('.drop-sub')).toContainText('1 added');

        // Keyboard add: select a second card, focus drop zone, press Enter.
        await packCards.nth(1).click();
        await dropZone.evaluate((element) => {
                element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        });
        await expect(dropZone.locator('.drop-sub')).toContainText('2 added');

        await page.getByRole('button', { name: 'Open focus mode' }).click();
        const overlayDrop = page.getByLabel('Combined focus drop area');
        await expect(overlayDrop.locator('.drop-sub')).toContainText('2 added');
});
