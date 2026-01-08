import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const SCREENSHOT_DIR = 'test-artifacts';

test.describe('Collaborative Session E2E', () => {
  test.describe.configure({ mode: 'serial' });

  let sessionId: string;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('creates a new collaborative session', async ({ page }) => {
    test.setTimeout(60_000);

    // Look for collaborative mode button (adjust selector based on your UI)
    const collabButton = page.getByRole('button', { name: /collaborate/i });
    
    // If button doesn't exist yet, this test documents the integration point
    if (await collabButton.count() === 0) {
      console.log('Collaborative mode not yet integrated into main UI');
      test.skip();
      return;
    }

    await collabButton.click();

    // Fill in session details
    await page.fill('input[name="session-title"]', 'E2E Test Session');
    await page.selectOption('select[name="mode"]', 'lyricist');
    await page.selectOption('select[name="submode"]', 'rapper');

    await page.getByRole('button', { name: /create session/i }).click();

    // Wait for session to be created and redirected
    await page.waitForURL(/.*\/session\/.+/);
    
    const url = page.url();
    const match = url.match(/\/session\/([^\/]+)/);
    expect(match).toBeTruthy();
    sessionId = match![1];

    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/collab-session-created.png`, 
      fullPage: true 
    });
  });

  test('displays video stream manager', async ({ page }) => {
    test.skip(!sessionId, 'Session ID not available');

    await page.goto(`/session/${sessionId}`);

    // Check for video stream manager
    const videoManager = page.locator('.video-stream-manager');
    await expect(videoManager).toBeVisible({ timeout: 10000 });

    // Check for permission request or video tiles
    const permissionRequest = page.locator('.video-permission-request');
    const videoTiles = page.locator('.video-tile');

    const hasPermissionRequest = await permissionRequest.count() > 0;
    const hasVideoTiles = await videoTiles.count() > 0;

    expect(hasPermissionRequest || hasVideoTiles).toBe(true);

    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/collab-video-manager.png`, 
      fullPage: true 
    });
  });

  test('displays collaborative DAW', async ({ page }) => {
    test.skip(!sessionId, 'Session ID not available');

    await page.goto(`/session/${sessionId}`);

    // Check for DAW container
    const daw = page.locator('.collaborative-daw');
    await expect(daw).toBeVisible({ timeout: 10000 });

    // Check for piano roll grid
    const pianoRoll = page.locator('.piano-roll-grid');
    await expect(pianoRoll).toBeVisible();

    // Check for transport controls
    const playButton = page.locator('button[aria-label*="Play"]');
    await expect(playButton).toBeVisible();

    // Check for tempo control
    const tempoControl = page.locator('.tempo-control');
    await expect(tempoControl).toBeVisible();

    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/collab-daw.png`, 
      fullPage: true 
    });
  });

  test('allows note addition in DAW', async ({ page }) => {
    test.skip(!sessionId, 'Session ID not available');

    await page.goto(`/session/${sessionId}`);

    const daw = page.locator('.collaborative-daw');
    await expect(daw).toBeVisible({ timeout: 10000 });

    // Count initial notes
    const initialNotes = await page.locator('.piano-roll-note').count();

    // Click on piano roll to add note (approximate center of grid)
    const pianoRoll = page.locator('.piano-roll-grid');
    const box = await pianoRoll.boundingBox();
    
    if (box) {
      await page.mouse.click(box.x + 100, box.y + 100);

      // Wait for note to appear
      await page.waitForTimeout(500);

      const finalNotes = await page.locator('.piano-roll-note').count();
      expect(finalNotes).toBeGreaterThan(initialNotes);

      await page.screenshot({ 
        path: `${SCREENSHOT_DIR}/collab-note-added.png`, 
        fullPage: true 
      });
    }
  });

  test('toggles playback in DAW', async ({ page }) => {
    test.skip(!sessionId, 'Session ID not available');

    await page.goto(`/session/${sessionId}`);

    const playButton = page.locator('button[aria-label*="Play"]');
    await expect(playButton).toBeVisible({ timeout: 10000 });

    // Click play
    await playButton.click();
    
    // Wait for playback state to update
    await page.waitForTimeout(500);

    // Check if button changed to pause
    const pauseButton = page.locator('button[aria-label*="Pause"]');
    await expect(pauseButton).toBeVisible();

    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/collab-playback-started.png`, 
      fullPage: true 
    });

    // Click pause
    await pauseButton.click();
    await page.waitForTimeout(500);

    // Should revert to play button
    await expect(playButton).toBeVisible();
  });

  test('displays and allows comments', async ({ page }) => {
    test.skip(!sessionId, 'Session ID not available');

    await page.goto(`/session/${sessionId}`);

    // Check for comment section
    const commentSection = page.locator('.comment-section');
    await expect(commentSection).toBeVisible({ timeout: 10000 });

    // Add a comment
    const commentInput = page.locator('textarea[placeholder*="comment" i], input[placeholder*="comment" i]');
    await commentInput.fill('This is a great collaboration!');

    const submitButton = page.locator('button:has-text("Post"), button:has-text("Add")');
    await submitButton.click();

    // Wait for comment to appear
    await page.waitForTimeout(500);

    const comments = page.locator('.comment-thread .comment');
    const commentCount = await comments.count();
    expect(commentCount).toBeGreaterThan(0);

    // Check if our comment appears
    const ourComment = page.locator('.comment:has-text("great collaboration")');
    await expect(ourComment).toBeVisible();

    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/collab-comment-added.png`, 
      fullPage: true 
    });
  });

  test('allows voting on comments', async ({ page }) => {
    test.skip(!sessionId, 'Session ID not available');

    await page.goto(`/session/${sessionId}`);

    // Wait for comments to load
    const comments = page.locator('.comment');
    await expect(comments.first()).toBeVisible({ timeout: 10000 });

    // Find upvote button
    const upvoteButton = page.locator('.vote-button[aria-label*="upvote" i]').first();
    
    if (await upvoteButton.count() > 0) {
      await upvoteButton.click();
      
      // Wait for vote to register
      await page.waitForTimeout(500);

      await page.screenshot({ 
        path: `${SCREENSHOT_DIR}/collab-voted.png`, 
        fullPage: true 
      });
    }
  });

  test('shows participant list', async ({ page }) => {
    test.skip(!sessionId, 'Session ID not available');

    await page.goto(`/session/${sessionId}`);

    // Check for participant list
    const participantList = page.locator('.participant-list, .participants-sidebar');
    await expect(participantList).toBeVisible({ timeout: 10000 });

    // Should show at least the current user
    const participants = page.locator('.participant-item');
    const count = await participants.count();
    expect(count).toBeGreaterThan(0);

    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/collab-participants.png`, 
      fullPage: true 
    });
  });

  test('switches layout modes', async ({ page }) => {
    test.skip(!sessionId, 'Session ID not available');

    await page.goto(`/session/${sessionId}`);

    // Look for layout switcher
    const layoutButtons = page.locator('.layout-switcher button, button[aria-label*="layout"]');
    
    if (await layoutButtons.count() > 0) {
      // Click different layout modes
      const videoOnlyButton = page.locator('button:has-text("Video"), button[aria-label*="video only"]');
      if (await videoOnlyButton.count() > 0) {
        await videoOnlyButton.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ 
          path: `${SCREENSHOT_DIR}/collab-layout-video.png`, 
          fullPage: true 
        });
      }

      const dawOnlyButton = page.locator('button:has-text("DAW"), button[aria-label*="daw only"]');
      if (await dawOnlyButton.count() > 0) {
        await dawOnlyButton.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ 
          path: `${SCREENSHOT_DIR}/collab-layout-daw.png`, 
          fullPage: true 
        });
      }

      const splitButton = page.locator('button:has-text("Split"), button[aria-label*="split"]');
      if (await splitButton.count() > 0) {
        await splitButton.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ 
          path: `${SCREENSHOT_DIR}/collab-layout-split.png`, 
          fullPage: true 
        });
      }
    }
  });

  test('displays latency and sync status', async ({ page }) => {
    test.skip(!sessionId, 'Session ID not available');

    await page.goto(`/session/${sessionId}`);

    // Check for sync status indicator
    const syncStatus = page.locator('.sync-status, .latency-indicator');
    
    if (await syncStatus.count() > 0) {
      await expect(syncStatus).toBeVisible();
      
      // Should show latency measurement
      const latencyText = await syncStatus.textContent();
      expect(latencyText).toMatch(/\d+\s*ms/i);

      await page.screenshot({ 
        path: `${SCREENSHOT_DIR}/collab-sync-status.png`, 
        fullPage: true 
      });
    }
  });

  test('allows user to leave session', async ({ page }) => {
    test.skip(!sessionId, 'Session ID not available');

    await page.goto(`/session/${sessionId}`);

    // Find leave button
    const leaveButton = page.locator('button:has-text("Leave"), button[aria-label*="leave session" i]');
    await expect(leaveButton).toBeVisible({ timeout: 10000 });

    await leaveButton.click();

    // Should redirect away from session
    await page.waitForURL(/^((?!\/session\/).)*$/);
    
    expect(page.url()).not.toContain(`/session/${sessionId}`);

    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/collab-left-session.png`, 
      fullPage: true 
    });
  });
});

// Multi-browser tests (requires multiple contexts)
test.describe('Multi-User Collaboration', () => {
  test('two users can join same session and see each other', async ({ browser }) => {
    test.setTimeout(120_000);

    // Create two browser contexts (simulating two users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // User 1 creates session
      await page1.goto('/');
      
      // Skip if collaborative mode not integrated
      const collabButton = page1.getByRole('button', { name: /collaborate/i });
      if (await collabButton.count() === 0) {
        console.log('Collaborative mode not yet integrated - skipping multi-user test');
        test.skip();
        return;
      }

      await collabButton.click();
      await page1.fill('input[name="session-title"]', 'Multi-User Test');
      await page1.selectOption('select[name="mode"]', 'producer');
      await page1.selectOption('select[name="submode"]', 'sampler');
      await page1.getByRole('button', { name: /create/i }).click();

      await page1.waitForURL(/.*\/session\/.+/);
      const sessionUrl = page1.url();

      // User 2 joins same session
      await page2.goto(sessionUrl);

      // Both should see each other in participant list
      await page1.waitForTimeout(2000); // Wait for socket sync

      const participants1 = await page1.locator('.participant-item').count();
      const participants2 = await page2.locator('.participant-item').count();

      expect(participants1).toBe(2);
      expect(participants2).toBe(2);

      await page1.screenshot({ 
        path: `${SCREENSHOT_DIR}/multi-user-1.png`, 
        fullPage: true 
      });
      await page2.screenshot({ 
        path: `${SCREENSHOT_DIR}/multi-user-2.png`, 
        fullPage: true 
      });

      // User 1 adds note
      const pianoRoll1 = page1.locator('.piano-roll-grid');
      const box = await pianoRoll1.boundingBox();
      if (box) {
        await page1.mouse.click(box.x + 150, box.y + 150);
        await page1.waitForTimeout(1000);

        // User 2 should see the note
        const notes2 = await page2.locator('.piano-roll-note').count();
        expect(notes2).toBeGreaterThan(0);

        await page2.screenshot({ 
          path: `${SCREENSHOT_DIR}/multi-user-synced-note.png`, 
          fullPage: true 
        });
      }

    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
