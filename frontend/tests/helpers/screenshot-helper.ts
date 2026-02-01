/**
 * Test Helper: Screenshot Analysis
 * Provides utilities for capturing and analyzing screenshots during Playwright tests
 */

import { Page } from '@playwright/test';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface ScreenshotAnalysisResult {
  path: string;
  timestamp: number;
  elementFound: boolean;
  elementText?: string;
  elementBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Ensure test artifacts directory exists
 */
export function ensureArtifactsDir(): string {
  const dir = 'test-artifacts';
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Take a screenshot and return metadata about key elements
 */
export async function captureScreenshot(
  page: Page,
  name: string,
  elementSelector?: string
): Promise<ScreenshotAnalysisResult> {
  ensureArtifactsDir();
  
  const timestamp = Date.now();
  const filename = `${name}-${timestamp}.png`;
  const path = join('test-artifacts', filename);
  
  // Capture full page screenshot
  await page.screenshot({ 
    path,
    fullPage: true
  });
  
  let elementFound = false;
  let elementText: string | undefined;
  let elementBounds: ScreenshotAnalysisResult['elementBounds'];
  
  // If selector provided, get element info
  if (elementSelector) {
    const element = page.locator(elementSelector);
    elementFound = await element.isVisible().catch(() => false);
    
    if (elementFound) {
      elementText = await element.textContent() ?? undefined;
      const box = await element.boundingBox();
      if (box) {
        elementBounds = {
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height),
        };
      }
    }
  }
  
  return {
    path,
    timestamp,
    elementFound,
    elementText,
    elementBounds,
  };
}

/**
 * Capture screenshot at specific stage and log results
 */
export async function logScreenshotStage(
  page: Page,
  stageName: string,
  elementSelector?: string
): Promise<void> {
  const result = await captureScreenshot(page, stageName, elementSelector);
  
  console.log(`\n📸 Screenshot: ${stageName}`);
  console.log(`   Path: ${result.path}`);
  console.log(`   Time: ${new Date(result.timestamp).toISOString()}`);
  
  if (elementSelector) {
    console.log(`   Element found: ${result.elementFound}`);
    if (result.elementFound) {
      console.log(`   Element text: ${result.elementText?.substring(0, 50)}...`);
      if (result.elementBounds) {
        console.log(`   Element bounds: ${result.elementBounds.x},${result.elementBounds.y} (${result.elementBounds.width}x${result.elementBounds.height})`);
      }
    }
  }
}

/**
 * Get page accessibility info for debugging
 */
export async function getPageAccessibility(page: Page): Promise<{
  url: string;
  title: string;
  bodyClasses: string;
  headingsCount: number;
  buttonsCount: number;
}> {
  const info = await page.evaluate(() => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
    const buttons = document.querySelectorAll('button').length;
    const bodyClasses = document.body.className;
    
    return {
      url: window.location.href,
      title: document.title,
      bodyClasses,
      headingsCount: headings,
      buttonsCount: buttons,
    };
  });
  
  return info;
}

/**
 * Wait for element and capture screenshot
 */
export async function waitAndCapture(
  page: Page,
  selector: string,
  screenshotName: string,
  timeout = 5000
): Promise<ScreenshotAnalysisResult> {
  await page.locator(selector).waitFor({ timeout });
  return captureScreenshot(page, screenshotName, selector);
}

/**
 * Verify element visibility with screenshot
 */
export async function verifyElementWithScreenshot(
  page: Page,
  selector: string,
  screenshotName: string,
  expectVisible = true
): Promise<boolean> {
  const result = await captureScreenshot(page, screenshotName, selector);
  
  const isVisible = await page.locator(selector).isVisible().catch(() => false);
  const matches = expectVisible ? isVisible : !isVisible;
  
  console.log(`✓ Verification: ${selector} is ${isVisible ? 'visible' : 'hidden'} (expected: ${expectVisible ? 'visible' : 'hidden'})`);
  
  return matches;
}
