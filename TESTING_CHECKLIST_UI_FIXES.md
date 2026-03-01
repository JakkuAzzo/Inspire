# VST UI Fixes - Testing Checklist

## Quick Start Testing (5 minutes)

### 1. Load Plugin
- [ ] Open Ableton Live
- [ ] Create new audio/MIDI track
- [ ] Drag InspireVST.vst3 to track OR select from Audio Effects browser
- [ ] Plugin UI opens without crashes

### 2. Check InitialView Layout
- [ ] Click "Writer Lab" tab
- [ ] Verify ONLY these elements visible:
  - [ ] "Generate" button (centered, cyan color, with Play icon)
  - [ ] 9 filter buttons in 3×3 grid:
    - Row 1: Fresh | Recent | Timeless (Timeframe)
    - Row 2: Funny | Deep | Dark (Tone)
    - Row 3: Tight | Balanced | Wild (Semantic)
  - [ ] NO text labels above button groups (removed by fix)
  - [ ] All other UI elements hidden (pack list, detail pane, etc.)

### 3. Check GeneratedView Layout
- [ ] Click "Generate" button
- [ ] UI transitions to show:
  - [ ] LEFT pane: Pack card buttons (vertical list)
  - [ ] RIGHT pane: Inspiration Queue (content list)
  - [ ] Generate button HIDDEN
  - [ ] Filter buttons HIDDEN
  - [ ] ~50/50 split between left and right panes

### 4. Test Window Resizing
- [ ] Drag plugin window corner to make narrow (600px wide)
- [ ] Both panes still visible and usable
- [ ] No text clipping or overflow
- [ ] Drag wider (1200px+)
- [ ] Split still maintains ~50/50 ratio

---

## Detailed Verification Tests (15 minutes)

### Filter Button Behavior
- [ ] Click "Fresh" button → turns cyan, others dim
- [ ] Click "Recent" button → "Fresh" dims, "Recent" turns cyan
- [ ] Click "Funny" button → "Deep" and "Dark" dim, "Funny" turns cyan
- [ ] Click "Tight" button → "Balanced" and "Wild" dim, "Tight" turns cyan
- [ ] **Mutual exclusion works**: Only one button per category is highlighted
- [ ] **Visual feedback**: Selected button has higher opacity, clear distinction

### GeneratedView Pack Cards
- [ ] Each pack card shows as clickable button
- [ ] Click a pack card → detail view appears in left pane
- [ ] Previous pack cards disappear when detail selected
- [ ] "Back" button appears at top-left (with CaretLeft icon)
- [ ] Click "Back" → detail hidden, pack cards reappear
- [ ] Inspiration Queue on right stays visible throughout

### Right Pane: Inspiration Queue
- [ ] Queue displays content (list items visible)
- [ ] Queue has scroll bar if content exceeds pane height
- [ ] Scrolling doesn't affect left pane
- [ ] Content doesn't clip at pane edges

### Save with Valid Token
*Prerequisites: User is logged in with valid session token*

- [ ] Generate a pack
- [ ] Click "Save" button (or access via menu)
- [ ] Modal appears: "Pack Saved"
- [ ] Modal shows: "Save response: {success message}"
- [ ] Modal has "Close" button
- [ ] Status bar shows "Pack saved"

### Save with Invalid Token (Test Auth Error Handling)
*Prerequisites: Logged in OR guest mode*

**Setup Auth Error (Option A - simulator):**
- [ ] Open browser DevTools or similar, inspect network
- [ ] Make one successful save (to know token is valid)
- [ ] Close plugin and reopen to clear any cached responses

**Setup Auth Error (Option B - manual token manipulation):**
- [ ] After a successful save, manually clear cache/cookies
- [ ] Or wait for session token to expire naturally (varies by backend)

**Test Auth Error Flow:**
- [ ] Attempt save with expired/invalid token
- [ ] Modal appears: "Authentication Error"
- [ ] Modal shows: "Your session has expired. Please log in again."
- [ ] Modal shows: "Response: {error message from server}"
- [ ] Modal has "Close" button
- [ ] Status bar shows: "Authentication failed. Please log in."
- [ ] After closing modal: "Back" button visible (user returned to mode selection)
- [ ] Auth state cleared (cannot save again until re-login)

**Verify Logout Was Called:**
- [ ] Look for elements that should be hidden when not authenticated:
  - [ ] Session token display should be empty or say "Not logged in"
  - [ ] Save button should be disabled or grayed
  - [ ] Login/signup form should be visible
- [ ] Click "Start Guest Mode" or "Log In"
- [ ] Log back in
- [ ] Try save again → should succeed

---

## Visual Regression Tests (20 minutes)

### Spacing & Alignment
- [ ] Filter buttons in InitialView are evenly spaced
- [ ] 8px gaps between buttons (visually confirm)
- [ ] All buttons same size (128px width each)
- [ ] All buttons same height (40px)
- [ ] Buttons centered in window horizontally
- [ ] No buttons cut off at screen edges

### Typography
- [ ] Button text is readable (font size acceptable)
- [ ] Button text not clipped or overlapping
- [ ] Disclaimer: No section labels above button groups (intentional removal)

### Color & Styling
- [ ] Unselected filter buttons: darker cyan (~0.3 opacity)
- [ ] Selected filter buttons: bright cyan (~0.9 opacity)
- [ ] Generate button: bright cyan with Play icon visible
- [ ] Background: dark gradient (purple/navy theme)
- [ ] Icons (Play, Save, Open, CaretLeft) render clearly

### Responsiveness
- [ ] InitialView layout tested at: 800×600, 1024×768, 1440×900, 1600×1000
- [ ] GeneratedView layout tested at same sizes
- [ ] Portrait orientation (narrow, tall window): still usable
- [ ] Landscape orientation (wide, short window): split panes both visible

---

## Edge Cases & Error Conditions

### Network Errors During Save
- [ ] [If applicable] Disconnect network
- [ ] Click Save
- [ ] Modal appears with connection error
- [ ] "Close" button works
- [ ] Plugin doesn't crash

### Empty Pack / Invalid JSON
- [ ] [If applicable] Select malformed pack item
- [ ] Click Save
- [ ] Error modal with validation message
- [ ] Plugin recovers gracefully

### Multiple Rapid Clicks
- [ ] Click Save button multiple times quickly
- [ ] Only one request sent (debouncing works or sequential)
- [ ] No duplicate modals
- [ ] Plugin responsive

### Window Minimize/Maximize
- [ ] Minimize plugin window
- [ ] Maximize plugin window
- [ ] Layout redraws correctly
- [ ] No rendering artifacts

### Switch Between Modes Multiple Times
- [ ] Click Writer Lab → InitialView visible
- [ ] Click Producer Lab → InitialView resets (filters reset to Fresh/Funny/Tight)
- [ ] Click Editor Suite → InitialView resets
- [ ] No layout glitches or state corruption

---

## Performance Verification

### Frame Rate / Responsiveness
- [ ] Button clicks respond immediately (no lag)
- [ ] Transitions between InitialView/GeneratedView are smooth
- [ ] Redraws on window resize are clean (no jittering)
- [ ] Tooltip hover doesn't stutter

### Memory Usage
- [ ] Plugin memory footprint stable (~50-100MB)
- [ ] No memory leaks during extended use
- [ ] Clicking buttons repeatedly doesn't increase memory over time

### CPU Usage
- [ ] Idle CPU usage minimal (~<1% per core)
- [ ] Save operation completes within 5 seconds
- [ ] No CPU spikes on UI interactions

---

## Sign-Off Checklist

- [ ] **Visual Issues Fixed**: Filter labels no longer overlap with buttons
- [ ] **Auth Error Handling**: Save with invalid token shows proper error modal
- [ ] **Layout Consistency**: InitialView and GeneratedView both display correctly
- [ ] **Code Quality**: Build passes with zero new compiler errors/warnings
- [ ] **Backward Compatibility**: All existing features still work (generate, remix, export, etc.)
- [ ] **User Experience**: Error messages are clear and actionable
- [ ] **Performance**: Plugin is responsive and doesn't lag

---

## Notes for QA

1. **Filter Labels Intentionally Removed**: The hardcoded text labels ("Timeframe", "Tone", "Semantic") have been removed. The 3×3 button grid provides sufficient visual grouping.

2. **Auth Error Recovery**: Current implementation clears session and prompts re-login. Future enhancement: implement server-side token refresh if backend provides that capability.

3. **Icon Changes**: 
   - Removed text labels (eliminated misalignment issue)
   - Kept FontAudio icons for Generate (Play), Save, Open, Back (CaretLeft)
   - Menu hover still shows CaretDown icon

4. **Testing Focus Areas**:
   - Priority 1: Filter button layout and spacing
   - Priority 2: Auth error modal and recovery flow
   - Priority 3: Split pane responsiveness on resize

---

## Reporting Issues

If you encounter issues during testing:

1. **Take screenshot** of the issue
2. **Note the exact steps** to reproduce
3. **Check if issue occurs in clean build** (`./inspirevst-build.sh clean`)
4. **Report with**:
   - Window size (width × height)
   - Session state (logged in / guest / not authenticated)
   - Selected mode (Writer Lab / Producer Lab / Editor Suite)
   - Ableton Live version

---

**Last Updated**: March 1, 2026  
**Tested On**: macOS (arm64), VST3 format, Ableton Live 12+  
**Plugin Location**: `/Users/nathanbrown-bennett/Library/Audio/Plug-Ins/VST3/InspireVST.vst3`

