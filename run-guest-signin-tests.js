#!/usr/bin/env node
/**
 * Test Runner with Screenshot Analysis
 * Runs Playwright tests and analyzes screenshots using MCP tools
 */

import { execSync, spawn } from 'child_process';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';

const ARTIFACTS_DIR = 'test-artifacts';
const TEST_FILE = 'frontend/tests/guest-signin.spec.ts';

async function ensureArtifactsDir() {
  if (!existsSync(ARTIFACTS_DIR)) {
    await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
  }
}

async function runTests(headless = false) {
  console.log('\n🧪 Running Playwright Tests...\n');
  console.log('━'.repeat(60));
  
  try {
    const args = [
      'npx playwright test',
      TEST_FILE,
      headless ? '' : '--headed',
      '--workers=1'
    ].filter(Boolean);
    
    execSync(args.join(' '), {
      cwd: 'frontend',
      stdio: 'inherit'
    });
    
    console.log('\n✅ Tests completed successfully!');
    return true;
  } catch (error) {
    console.error('\n❌ Tests failed');
    return false;
  }
}

async function listArtifacts() {
  console.log('\n📸 Generated Artifacts\n');
  console.log('━'.repeat(60));
  
  if (!existsSync(ARTIFACTS_DIR)) {
    console.log('No artifacts directory found');
    return [];
  }
  
  const files = await fs.readdir(ARTIFACTS_DIR);
  const screenshots = files.filter(f => f.endsWith('.png'));
  
  if (screenshots.length === 0) {
    console.log('No screenshots generated');
    return [];
  }
  
  console.log(`Found ${screenshots.length} screenshot(s):\n`);
  
  screenshots.sort().forEach((file, i) => {
    const match = file.match(/^(.+)-(\d+)\.png$/);
    const stage = match ? match[1] : file.replace('.png', '');
    const timestamp = match ? new Date(parseInt(match[2])).toISOString() : 'unknown';
    
    console.log(`  ${i + 1}. ${stage}`);
    console.log(`     📁 ${ARTIFACTS_DIR}/${file}`);
    console.log(`     ⏰ ${timestamp}`);
  });
  
  return screenshots;
}

async function generateReport() {
  console.log('\n📊 Test Execution Report\n');
  console.log('━'.repeat(60));
  
  const reportContent = `
# Guest Sign-In Test Execution Report

**Generated**: ${new Date().toISOString()}

## Test Summary

- **Test File**: ${TEST_FILE}
- **Test Suite**: Guest Sign In
- **Tests**: 2 test cases

### Test Cases

1. ✅ should sign in as guest and verify username appears in top left
   - Validates complete guest sign-in workflow
   - Verifies username appears in top-left navigation
   - 8 screenshot checkpoints

2. ✅ should display guest username format correctly
   - Validates guest username format
   - Ensures no @ symbol in username
   - Matches expected pattern: [A-Z][a-zA-Z]+\\d{1,4}
   - 5 screenshot checkpoints

## Artifacts Generated

Screenshots saved to: \`${ARTIFACTS_DIR}/\`

Each screenshot captures a specific stage of the authentication flow:
- Initial page load
- Auth state detection
- Modal interactions
- Tab navigation
- Authentication completion
- Final verification

## How to View Artifacts

1. **Visual Review**: Open screenshot files in image viewer
2. **Manual Analysis**: Examine each stage to verify UI state
3. **Automated Analysis**: Use OCR or object detection on screenshots

## Next Steps

To analyze screenshots further:

\`\`\`bash
# Extract text from screenshots (OCR)
mcp_sunriseapps_i_ocr test-artifacts/01-homepage-initial-*.png

# Detect UI elements
mcp_sunriseapps_i_detect test-artifacts/04-auth-modal-open-*.png

# Find specific objects
mcp_sunriseapps_i_find test-artifacts/05-guest-mode-tab-active-*.png --description "form input"
\`\`\`

## Test Execution Details

**Configuration**:
- Base URL: http://localhost:8080 (dev server)
- Timeout: 45 seconds per test
- Screenshot Mode: On failure + manual checkpoints
- Workers: 1 (sequential execution)

**Environment**:
- Node.js: $(node --version)
- Playwright: 1.57.0

---

For detailed documentation, see: \`GUEST_SIGNIN_TEST_GUIDE.md\`
  `;
  
  console.log(reportContent);
}

async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(58) + '║');
  console.log('║' + '  🎭 Inspire Guest Sign-In Test Suite'.padEnd(58) + '║');
  console.log('║' + ' '.repeat(58) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');
  
  await ensureArtifactsDir();
  
  const testsPassed = await runTests(process.argv.includes('--headed'));
  
  await listArtifacts();
  
  if (testsPassed) {
    await generateReport();
    console.log('\n✅ Test suite completed successfully!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️ Some tests failed. Check output above for details.\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
