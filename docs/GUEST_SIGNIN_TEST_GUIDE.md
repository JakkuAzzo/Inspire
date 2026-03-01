# Guest Sign-In Test Documentation

## Overview

This document describes the Playwright test suite for guest sign-in functionality in the Inspire webapp. The tests verify that:

1. Users can successfully sign in as guests
2. The guest username appears correctly in the top-left navigation
3. Guest usernames follow the expected format

## Test Files

### Main Test: `frontend/tests/guest-signin.spec.ts`

Contains two comprehensive test cases:

#### Test 1: "should sign in as guest and verify username appears in top left"
- **Purpose**: Full guest sign-in workflow test
- **Steps**:
  1. Navigate to homepage
  2. Check if already authenticated
  3. Open authentication modal
  4. Select "Guest Mode" tab
  5. Click "Continue as Guest" button
  6. Verify username appears in `.nav-handle` element
  7. Validate username format

- **Screenshots Captured**:
  - `01-homepage-initial`: Initial state
  - `02-check-nav-handle`: Navigation bar check
  - `03-auth-trigger-visible`: Auth button visible
  - `04-auth-modal-open`: Modal opened
  - `05-guest-mode-tab-active`: Guest tab selected
  - `06-before-guest-auth`: Before authentication click
  - `07-after-auth-nav-visible`: After auth completion
  - `08-final-success-state`: Final verification

#### Test 2: "should display guest username format correctly"
- **Purpose**: Validates guest username format
- **Validation Rules**:
  - Must be non-empty (length > 5)
  - Must NOT contain `@` symbol (reserved for authenticated users)
  - Should match pattern: `[A-Z][a-zA-Z]+\d{1,4}` (e.g., "CoolArtist1234")

- **Screenshots Captured**:
  - `01-format-test-homepage`: Initial state
  - `02-format-check-auth-status`: Check authentication status
  - `03-format-auth-modal-open`: Modal opened
  - `04-format-guest-tab-active`: Guest tab selected
  - `05-format-username-visible`: Final username verification

## Helper Functions

### Screenshot Helper (`frontend/tests/helpers/screenshot-helper.ts`)

Provides utilities for capturing and analyzing screenshots:

#### `captureScreenshot(page, name, elementSelector?)`
Captures full-page screenshot and optionally targets a specific element.

**Returns**:
```typescript
{
  path: string;              // File path of screenshot
  timestamp: number;         // Unix timestamp
  elementFound: boolean;     // Was element found?
  elementText?: string;      // Element text content
  elementBounds?: {          // Element position/size
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

#### `logScreenshotStage(page, stageName, elementSelector?)`
Captures screenshot and logs detailed information about it.

**Output Example**:
```
📸 Screenshot: 01-homepage-initial
   Path: test-artifacts/01-homepage-initial-1706804523456.png
   Time: 2024-02-01T15:35:23.456Z
   Element found: true
   Element text: Sign up / Log in
   Element bounds: 150,30 (120x40)
```

#### `getPageAccessibility(page)`
Returns accessibility information about the page.

**Returns**:
```typescript
{
  url: string;              // Current URL
  title: string;            // Page title
  bodyClasses: string;      // Body element classes
  headingsCount: number;    // Number of headings
  buttonsCount: number;     // Number of buttons
}
```

#### `verifyElementWithScreenshot(page, selector, screenshotName, expectVisible?)`
Verifies element visibility with screenshot capture.

#### `waitAndCapture(page, selector, screenshotName, timeout?)`
Waits for element to appear and captures screenshot.

## Running the Tests

### Prerequisites

```bash
# Install dependencies (from project root)
npm install

# Or from frontend directory
cd frontend && npm install
```

### Run Tests

```bash
# Run guest-signin tests only
cd frontend
npx playwright test guest-signin.spec.ts

# Run with headed mode (see browser)
npx playwright test guest-signin.spec.ts --headed

# Run with specific config (HTTPS testing)
npx playwright test --config=playwright.config.https.ts

# Run single test
npx playwright test guest-signin.spec.ts -g "should sign in as guest"

# Run with verbose output
npx playwright test guest-signin.spec.ts --verbose
```

### Test Output

Tests produce detailed console output:

```
🚀 Starting guest sign-in test...
⏳ Waiting for page load...
📄 Page Info: Inspire - Make Something (8 headings, 24 buttons)
📸 Screenshot: 01-homepage-initial
   Path: test-artifacts/01-homepage-initial-1706804523456.png
   Time: 2024-02-01T15:35:23.456Z
🖱️ Clicking auth trigger...
🔖 Clicking Guest Mode tab...
💫 Clicking Continue as Guest button...
⏳ Waiting for authentication to complete...
🔍 Verifying username appears in top left...
✓ Signed in as guest: EpicWizard4872
✅ Guest sign-in test PASSED! Username visible in top left.
```

## Artifact Analysis

### Screenshot Artifacts

Screenshots are saved to `test-artifacts/` directory with the naming convention:

```
{stageName}-{timestamp}.png
```

Example: `01-homepage-initial-1706804523456.png`

### Analyzing Artifacts

To analyze captured screenshots (when MCP image tools are available):

```bash
# List all screenshots
cd frontend
npx ts-node tests/helpers/analyze-artifacts.ts
```

This will generate a report like:

```
📸 Screenshot Analysis Report
============================================================
Found 8 screenshot(s)

1. 01-homepage-initial
   File: 01-homepage-initial-1706804523456.png
   Time: 2024-02-01T15:35:23.456Z
   Path: test-artifacts/01-homepage-initial-1706804523456.png

2. 02-check-nav-handle
   File: 02-check-nav-handle-1706804524123.png
   Time: 2024-02-01T15:35:24.123Z
   Path: test-artifacts/02-check-nav-handle-1706804524123.png

...
```

### Manual Image Analysis with MCP Tools

For advanced image analysis, MCP image tools can be used:

#### Object Detection
```bash
# Detect objects in a screenshot
mcp_sunriseapps_i_detect --input_path test-artifacts/01-homepage-initial-*.png
```

#### Text Recognition (OCR)
```bash
# Extract text from screenshot
mcp_sunriseapps_i_ocr --input_path test-artifacts/01-homepage-initial-*.png
```

#### Object Finding
```bash
# Find specific objects by description
mcp_sunriseapps_i_find --input_path test-artifacts/01-homepage-initial-*.png --description "login button"
```

## Troubleshooting

### Test Fails: "page.goto: net::ERR_CONNECTION_REFUSED"

**Cause**: Dev server not running or wrong port

**Solution**:
```bash
# Start dev server
npm run dev

# Or in a separate terminal, run tests with webServer config
npx playwright test guest-signin.spec.ts
```

### Test Fails: "Element not found"

**Check**:
1. Verify CSS selectors match current HTML structure
2. Check if element is visible on page
3. Check screenshot artifacts to see actual page state

**Debug**:
```bash
# Run with headed mode to see browser
npx playwright test guest-signin.spec.ts --headed

# Run with debug mode
npx playwright test guest-signin.spec.ts --debug
```

### Authentication Modal Never Opens

**Check**:
1. Verify `.auth-modal-overlay` element exists in DOM
2. Check if button click is working
3. Look at screenshot before modal click

**Debug**:
```typescript
// Add to test temporarily
const buttons = await page.locator('button').all();
for (const btn of buttons) {
  const text = await btn.textContent();
  console.log('Button:', text);
}
```

### Guest Username Not Appearing

**Check**:
1. Verify guest session was created successfully
2. Check if `.nav-handle` element is being rendered
3. Look at page accessibility info in logs

**Debug**:
```bash
# Run with verbose output to see network requests
npx playwright test guest-signin.spec.ts --verbose

# Check network tab in headed mode
npx playwright test guest-signin.spec.ts --headed
```

## Configuration

### Playwright Config: `frontend/playwright.config.ts`

Default configuration for local testing:

```typescript
{
  baseURL: 'http://localhost:8080',
  ignoreHTTPSErrors: true,
  headless: true,
  screenshot: 'only-on-failure',
  webServer: {
    command: 'sh ../run_dev.sh',
    url: 'http://localhost:8080',
    timeout: 120_000,
    reuseExistingServer: true
  }
}
```

### HTTPS Config: `frontend/playwright.config.https.ts`

For testing against HTTPS server:

```typescript
{
  baseURL: 'https://192.168.1.119:3000',
  ignoreHTTPSErrors: true,
  headless: false,
  screenshot: 'only-on-failure',
  // No webServer - connect to existing server
}
```

## Expected Behavior

### Successful Test Flow

1. **Homepage Load**: Page loads with auth button visible
2. **Modal Opens**: Clicking auth button opens modal with tabs
3. **Guest Mode Selected**: User selects "Guest Mode" tab
4. **Guest Auth**: User clicks "Continue as Guest" button
5. **Session Created**: Backend creates new guest session with token
6. **Username Display**: Guest username appears in `.nav-handle` (top-left)
7. **Format Valid**: Username matches `[A-Z][a-zA-Z]+\d{1,4}` pattern

### Example Guest Usernames

Valid formats:
- `CoolArtist1234`
- `EpicWizard42`
- `SuperGenius999`
- `FreshCreator88`

Invalid (tests would fail):
- `@user1234` (contains @)
- `coolartist1234` (lowercase start)
- `CoolArtist` (no numbers)
- `1234` (numbers only)

## CI/CD Integration

Tests are configured to run in CI with:
- `retries: 1` (retry failed tests once)
- `headless: true` (no browser UI)
- `screenshot: 'only-on-failure'` (save screenshots only on failure)

To run in CI:
```bash
npm test -- frontend/tests/guest-signin.spec.ts
```

## References

- [Playwright Testing Guide](https://playwright.dev/docs/intro)
- [Playwright Assertions](https://playwright.dev/docs/test-assertions)
- Inspire Copilot Instructions: See `.github/copilot-instructions.md`
