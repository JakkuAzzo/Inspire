import { expect, test } from '@playwright/test';

test.describe('Live Headline Filters', () => {
  test('input fields should work like Word Explorer inputs', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Sign in if needed (look for demo account or sign-up)
    const signUpBtn = page.locator('button:has-text("Sign up")').first();
    if (await signUpBtn.isVisible()) {
      await signUpBtn.click();
      await page.waitForTimeout(500);
    }

    // Navigate to Writer Lab
    const lyricistBtn = page.locator('button:has-text("Writer Lab")').first();
    await lyricistBtn.click();
    await page.waitForLoadState('networkidle');

    // Select Rapper submode
    const rapperBtn = page.locator('button:has-text("Rapper")').first();
    await rapperBtn.click();
    await page.waitForLoadState('networkidle');

    // Generate a pack
    const generateBtn = page.locator('button:has-text("Generate fuel pack")').first();
    await generateBtn.click();
    await page.waitForLoadState('networkidle');

    // Click on Live Headline card to open detail view
    const liveHeadlineItems = await page.locator('[role="listitem"]').all();
    let found = false;
    for (const item of liveHeadlineItems) {
      const text = await item.textContent();
      if (text?.includes('Live Headline')) {
        await item.click();
        found = true;
        break;
      }
    }
    expect(found).toBe(true);

    // Wait for detail view to render
    await page.waitForTimeout(500);

    // Verify the word-form inputs are visible
    const wordForm = page.locator('.word-form').first();
    await expect(wordForm).toBeVisible();

    // Test typing in the Topic input field
    const topicInput = page.locator('input[placeholder="Topic (e.g. tour announcements, AI collabs)"]');
    await expect(topicInput).toBeVisible();
    
    // Clear the input first
    await topicInput.click();
    await topicInput.clear();
    
    // Type text into the input
    await topicInput.type('AI collaborations', { delay: 50 });
    
    // Verify the text was entered
    const inputValue = await topicInput.inputValue();
    console.log('Typed value:', inputValue);
    expect(inputValue).toBe('AI collaborations');

    // Test typing in the Keywords input
    const keywordsInput = page.locator('input[placeholder="Keywords (comma-separated, e.g. producer, remix)"]');
    await keywordsInput.click();
    await keywordsInput.clear();
    await keywordsInput.type('music,production,remix', { delay: 50 });
    
    const keywordsValue = await keywordsInput.inputValue();
    expect(keywordsValue).toBe('music,production,remix');

    // Test date inputs
    const fromDateInput = page.locator('input[type="date"]').first();
    await fromDateInput.click();
    await fromDateInput.fill('2025-12-01');
    
    const fromDateValue = await fromDateInput.inputValue();
    expect(fromDateValue).toBe('2025-12-01');

    console.log('✅ All input fields work correctly');
  });

  test('Update headlines button should trigger API call with filter parameters', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Sign in if needed
    const signUpBtn = page.locator('button:has-text("Sign up")').first();
    if (await signUpBtn.isVisible()) {
      await signUpBtn.click();
      await page.waitForTimeout(500);
    }

    // Navigate to Writer Lab
    const lyricistBtn = page.locator('button:has-text("Writer Lab")').first();
    await lyricistBtn.click();
    await page.waitForLoadState('networkidle');

    // Select Rapper submode
    const rapperBtn = page.locator('button:has-text("Rapper")').first();
    await rapperBtn.click();
    await page.waitForLoadState('networkidle');

    // Generate a pack
    const generateBtn = page.locator('button:has-text("Generate fuel pack")').first();
    await generateBtn.click();
    await page.waitForLoadState('networkidle');

    // Click on Live Headline card
    const liveHeadlineItems = await page.locator('[role="listitem"]').all();
    for (const item of liveHeadlineItems) {
      const text = await item.textContent();
      if (text?.includes('Live Headline')) {
        await item.click();
        break;
      }
    }

    await page.waitForTimeout(500);

    // Intercept network requests to verify the API call
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/headlines')) {
        requests.push(request.url());
      }
    });

    // Set the topic and click Update headlines
    const topicInput = page.locator('input[placeholder="Topic (e.g. tour announcements, AI collabs)"]');
    await topicInput.click();
    await topicInput.clear();
    await topicInput.type('electronic music', { delay: 50 });

    // Click Update headlines button
    const updateBtn = page.locator('button:has-text("Update headlines")');
    await updateBtn.click();

    // Wait for the API call to complete
    await page.waitForTimeout(2000);

    // Verify API was called with the topic parameter
    const headlineRequest = requests.find(url => url.includes('topic='));
    console.log('Request made:', headlineRequest);
    expect(headlineRequest).toBeDefined();
    if (headlineRequest) {
      expect(headlineRequest).toContain('topic=electronic');
    }

    console.log('✅ API call made with correct parameters');
  });

  test('Random button should fetch headlines with random seed', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Sign in if needed
    const signUpBtn = page.locator('button:has-text("Sign up")').first();
    if (await signUpBtn.isVisible()) {
      await signUpBtn.click();
      await page.waitForTimeout(500);
    }

    // Navigate to Writer Lab
    const lyricistBtn = page.locator('button:has-text("Writer Lab")').first();
    await lyricistBtn.click();
    await page.waitForLoadState('networkidle');

    // Select Rapper submode
    const rapperBtn = page.locator('button:has-text("Rapper")').first();
    await rapperBtn.click();
    await page.waitForLoadState('networkidle');

    // Generate a pack
    const generateBtn = page.locator('button:has-text("Generate fuel pack")').first();
    await generateBtn.click();
    await page.waitForLoadState('networkidle');

    // Click on Live Headline card
    const liveHeadlineItems = await page.locator('[role="listitem"]').all();
    for (const item of liveHeadlineItems) {
      const text = await item.textContent();
      if (text?.includes('Live Headline')) {
        await item.click();
        break;
      }
    }

    await page.waitForTimeout(500);

    // Intercept network requests
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/headlines')) {
        requests.push(request.url());
      }
    });

    // Click Random button
    const randomBtn = page.locator('button:has-text("Random")');
    await randomBtn.click();

    // Wait for API call
    await page.waitForTimeout(2000);

    // Verify API was called with random seed
    const randomRequest = requests.find(url => url.includes('random=true'));
    console.log('Random request made:', randomRequest);
    expect(randomRequest).toBeDefined();
    if (randomRequest) {
      expect(randomRequest).toContain('random=true');
      expect(randomRequest).toContain('seed=');
    }

    console.log('✅ Random button works with seed parameter');
  });
});
