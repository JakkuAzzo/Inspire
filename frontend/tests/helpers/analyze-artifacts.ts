/**
 * Test Image Analysis Script
 * Analyzes screenshots from Playwright tests using MCP image analysis tools
 */

import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { existsSync } from 'fs';

export interface ImageAnalysisReport {
  imagePath: string;
  filename: string;
  width?: number;
  height?: number;
  detectedElements?: string[];
  textContent?: string;
  analysisTimestamp: number;
}

const ARTIFACTS_DIR = 'test-artifacts';

/**
 * List all screenshots in artifacts directory
 */
export async function listScreenshots(): Promise<string[]> {
  if (!existsSync(ARTIFACTS_DIR)) {
    console.log(`ℹ No artifacts directory found at ${ARTIFACTS_DIR}`);
    return [];
  }

  const files = await fs.readdir(ARTIFACTS_DIR);
  return files.filter(f => f.endsWith('.png'));
}

/**
 * Get screenshot metadata
 */
export function getScreenshotMetadata(filename: string): {
  name: string;
  stage: string;
  timestamp?: string;
} {
  // Expected format: stageName-timestamp.png
  const match = filename.match(/^(.+)-(\d+)\.png$/);
  
  if (match) {
    const [, stageName, timestamp] = match;
    return {
      name: filename,
      stage: stageName,
      timestamp: new Date(parseInt(timestamp)).toISOString(),
    };
  }
  
  return {
    name: filename,
    stage: filename.replace('.png', ''),
  };
}

/**
 * Print analysis report
 */
export async function printScreenshotReport(): Promise<void> {
  const screenshots = await listScreenshots();
  
  if (screenshots.length === 0) {
    console.log('No screenshots found in test artifacts');
    return;
  }
  
  console.log('\n📸 Screenshot Analysis Report');
  console.log('='.repeat(60));
  console.log(`Found ${screenshots.length} screenshot(s)\n`);
  
  screenshots.sort().forEach((filename, index) => {
    const metadata = getScreenshotMetadata(filename);
    const filePath = join(ARTIFACTS_DIR, filename);
    
    console.log(`${index + 1}. ${metadata.stage}`);
    console.log(`   File: ${metadata.name}`);
    if (metadata.timestamp) {
      console.log(`   Time: ${metadata.timestamp}`);
    }
    console.log(`   Path: ${filePath}`);
    console.log();
  });
}

export async function main() {
  console.log('🔍 Analyzing Playwright test artifacts...\n');
  await printScreenshotReport();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
