# Guest Sign-In Test - Quick Reference

## Files Created/Modified

### Test Files
- ✅ `frontend/tests/guest-signin.spec.ts` - Main test suite (179 lines, 2 tests)
- ✅ `frontend/tests/helpers/screenshot-helper.ts` - Screenshot utilities
- ✅ `frontend/tests/helpers/analyze-artifacts.ts` - Artifact analysis
- ✅ `frontend/playwright.config.https.ts` - HTTPS test config

### Documentation
- ✅ `GUEST_SIGNIN_TEST_GUIDE.md` - Complete guide (~350 lines)
- ✅ `GUEST_SIGNIN_TEST_ANALYSIS.md` - Implementation analysis (~650 lines)
- ✅ `GUEST_SIGNIN_TEST_QUICK_REF.md` - This file

### Utilities
- ✅ `run-guest-signin-tests.js` - Test runner script with reporting

## Quick Start

```bash
# 1. Run tests (auto-starts dev server)
cd frontend
npx playwright test guest-signin.spec.ts

# 2. Run with visual browser
npx playwright test guest-signin.spec.ts --headed

# 3. View screenshots
ls -la test-artifacts/

# 4. Run full test suite with reporting
node run-guest-signin-tests.js
```

## Test Cases

| # | Name | Focus | Time | Screenshots |
|---|------|-------|------|-------------|
| 1 | Guest Sign-In Flow | Full workflow + username display | 15-20s | 8 |
| 2 | Username Format | Format validation | 10-15s | 5 |

## Screenshot Stages

### Test 1 (Full Flow)
```
01-homepage-initial        → Page loads
02-check-nav-handle        → Check nav state
03-auth-trigger-visible    → Auth button found
04-auth-modal-open         → Modal appears
05-guest-mode-tab-active   → Guest tab selected
06-before-guest-auth       → Before auth click
07-after-auth-nav-visible  → Username appears
08-final-success-state     → Success verification
```

### Test 2 (Format Check)
```
01-format-test-homepage         → Initial state
02-format-check-auth-status     → Auth check
03-format-auth-modal-open       → Modal opened
04-format-guest-tab-active      → Tab selected
05-format-username-visible      → Username visible
```

## Key Elements Tested

| Element | Selector | Purpose |
|---------|----------|---------|
| Username Display | `.nav-handle` | Top-left navigation |
| Auth Modal | `.auth-modal-overlay` | Modal container |
| Guest Tab | `.auth-tab` (filtered) | Guest Mode tab |
| Continue Button | `.auth-guest-btn` or `button:has-text()` | Submit guest auth |
| Description | `.auth-guest-description` | Guest mode info |

## Expected Guest Usernames

Valid format: `[Adjective][Noun][1-4 digits]`

Examples:
- ✅ `CoolArtist1234`
- ✅ `EpicWizard42`
- ✅ `SuperGenius999`
- ❌ `coolartist1234` (lowercase)
- ❌ `@user1234` (has @)
- ❌ `CoolArtist` (no numbers)

## Assertions Validated

### Test 1
- ✅ `.nav-handle` is visible
- ✅ Username is non-empty
- ✅ Username ≠ "Sign up / Log in"
- ✅ Screenshots captured

### Test 2
- ✅ Username length > 5
- ✅ No `@` symbol
- ✅ Matches `[A-Z][a-zA-Z]+\d{1,4}`
- ✅ Format validation passed

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Connection refused | Check dev server running on port 8080 |
| Element not found | Run `--headed` to see browser |
| Screenshot dir missing | `mkdir -p test-artifacts` |
| Timeout errors | Increase timeout in playwright.config.ts |
| Auth fails | Check backend running on port 3001 |

## Console Output

✅ Successful test shows:
```
🚀 Starting guest sign-in test...
⏳ Waiting for page load...
📄 Page Info: Inspire - Make Something (8 headings, 24 buttons)
📸 Screenshot: 01-homepage-initial
🖱️ Clicking auth trigger...
🔖 Clicking Guest Mode tab...
💫 Clicking Continue as Guest button...
✓ Signed in as guest: EpicWizard4872
✅ Guest sign-in test PASSED!
```

## MCP Image Analysis

Extract text from screenshots:
```bash
mcp_sunriseapps_i_ocr test-artifacts/07-after-auth-nav-visible-*.png
```

Detect UI elements:
```bash
mcp_sunriseapps_i_detect test-artifacts/04-auth-modal-open-*.png
```

Find objects:
```bash
mcp_sunriseapps_i_find test-artifacts/05-guest-mode-tab-active-*.png \
  --description "continue button"
```

## Directory Structure

```
Inspire/
├── frontend/
│   ├── tests/
│   │   ├── guest-signin.spec.ts          ← Main test
│   │   ├── helpers/
│   │   │   ├── screenshot-helper.ts      ← Utilities
│   │   │   └── analyze-artifacts.ts      ← Analysis
│   │   └── playwright.config.ts
│   └── playwright.config.https.ts        ← HTTPS config
├── test-artifacts/                       ← Screenshots saved here
├── GUEST_SIGNIN_TEST_GUIDE.md            ← Full docs
├── GUEST_SIGNIN_TEST_ANALYSIS.md         ← Analysis
└── run-guest-signin-tests.js             ← Test runner
```

## Common Commands

```bash
# Run specific test
npx playwright test guest-signin.spec.ts -g "should sign in as guest"

# Run with debug mode
npx playwright test guest-signin.spec.ts --debug

# Generate report
npx playwright test guest-signin.spec.ts --reporter=html

# Update snapshots
npx playwright test guest-signin.spec.ts --update-snapshots

# Clean artifacts
rm -rf test-artifacts/*

# Run single worker (sequential)
npx playwright test guest-signin.spec.ts --workers=1
```

## Performance

| Metric | Value |
|--------|-------|
| Test 1 Duration | 15-20 seconds |
| Test 2 Duration | 10-15 seconds |
| Total Suite | 25-35 seconds |
| Screenshots Per Test | 8 + 5 |
| Total Artifacts | ~2-5 MB |

## CI/CD Integration

```yaml
# Example GitHub Actions
- name: Run Guest Sign-In Tests
  run: npm test -- frontend/tests/guest-signin.spec.ts

- name: Upload Artifacts
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: test-artifacts/
```

## Next Steps

1. **Run the tests**: `npm test -- frontend/tests/guest-signin.spec.ts`
2. **Review screenshots**: Check `test-artifacts/` directory
3. **Analyze results**: Use MCP tools for advanced analysis
4. **Fix any issues**: See troubleshooting section
5. **Commit & push**: Include test files in repository

## Resources

- 📖 [Full Guide](./GUEST_SIGNIN_TEST_GUIDE.md)
- 📋 [Analysis](./GUEST_SIGNIN_TEST_ANALYSIS.md)
- 🎭 [Playwright Docs](https://playwright.dev/)
- 🔍 [Auth Implementation](./backend/src/auth/)

---

**Status**: ✅ Ready to Run
**Last Updated**: January 31, 2026
