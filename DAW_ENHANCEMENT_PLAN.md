# DAW Enhancement & Focus Mode Refactoring Plan

## Overview
Major refactoring to:
1. **Enhance DAW** with instrument selection, drum patterns, sample browser/chopper
2. **Add DAW as a pack card** (accessible outside collaborative mode)
3. **Remove combined focus section**
4. **Implement new checkbox-based focus mode** with grid layout

---

## Phase 1: Enhanced DAW Component

### New Features to Add
1. **Instrument Selector**
   - Dropdown/tabs for: Piano, Synth, Bass, Drums, Sampler
   - Updates synthesizer waveform/envelope
   
2. **Drum Pattern Sequencer**
   - 16-step grid for kick, snare, hi-hat, clap
   - Velocity controls
   - Pattern presets (4-on-floor, breakbeat, trap, etc.)

3. **Sample Browser & Chopper**
   - Integration with Freesound/Jamendo APIs
   - Search bar for samples
   - Waveform display with chop points
   - Drag samples to piano roll
   - Slice/chop functionality

4. **Enhanced Piano Roll**
   - Multi-track support (4-8 tracks)
   - Per-track instrument selection
   - MIDI export (future)

### Implementation Files
- `frontend/src/components/workspace/EnhancedDAW.tsx` (new, replaces CollaborativeDAW)
- `frontend/src/components/workspace/EnhancedDAW.css`
- `frontend/src/components/daw/InstrumentSelector.tsx` (new)
- `frontend/src/components/daw/DrumSequencer.tsx` (new)
- `frontend/src/components/daw/SampleBrowser.tsx` (new)
- `frontend/src/components/daw/SampleChopper.tsx` (new)
- `frontend/src/services/audioSynthesizer.ts` (update with multi-instrument support)

---

## Phase 2: DAW Pack Card

### Requirements
- New pack type: `DAWModePack`
- Generated like other packs (lyricist/producer/editor)
- Contains:
  - Pre-loaded samples (from APIs)
  - Suggested drum patterns
  - Key/tempo suggestions
  - Chord progressions

### Implementation
- Update `backend/src/types.ts` with `DAWModePack` interface
- Add `generateDAWPack()` in `backend/src/modePackGenerator.ts`
- Fetch samples from Freesound/Jamendo based on genre/mood filters
- Display as pack card in main studio deck
- Clicking opens EnhancedDAW with pre-loaded content

---

## Phase 3: Remove Combined Focus

### Files to Modify
- `frontend/src/App.tsx`:
  - Remove `combinedFocusCardIds` state
  - Remove `CombinedFocusMode` component usage
  - Remove related handlers (drag/drop for combined focus)
  
- `frontend/src/App.css`:
  - Remove `.combined-focus-*` CSS classes
  
- Delete `frontend/src/components/workspace/CombinedFocusMode.tsx`
- Delete `frontend/src/components/workspace/CombinedFocusMode.css`

---

## Phase 4: New Checkbox Focus Mode

### UI Changes
1. **Pack Card Checkboxes**
   - Add checkbox to each pack card header
   - State: `selectedPackIds: Set<string>`
   
2. **Focus Button in Pack Header**
   - Located in `.pack-header` section
   - Only enabled when `selectedPackIds.size >= 2`
   - Label: "Focus Selected (X)" where X is count

3. **Focus Overlay Grid**
   - Replaces old combined focus
   - CSS Grid layout (2x2, 3x3, or auto-fit based on count)
   - Each grid cell contains a pack card
   - Resizable cards (drag handles)
   - Add/remove cards via checkboxes
   - Close button to exit focus mode

### Implementation
- `frontend/src/App.tsx`:
  - Add `selectedPackIds` state
  - Add `handlePackCheckbox()` handler
  - Add `openFocusGrid()` handler
  - Render checkbox on each pack card
  
- `frontend/src/components/FocusGridOverlay.tsx` (new):
  - Grid layout with CSS Grid
  - Resizable pack cards (using ResizeObserver or react-grid-layout)
  - Controls: close, add/remove cards
  
- `frontend/src/App.css`:
  - `.pack-card-checkbox` styles
  - `.focus-button` styles (enabled/disabled states)
  - `.focus-grid-overlay` styles

---

## Testing Plan

### Unit Tests
- [ ] Instrument selector changes waveform
- [ ] Drum sequencer triggers correct samples
- [ ] Sample browser API integration
- [ ] Pack checkbox state management
- [ ] Focus button enable/disable logic

### E2E Tests (Playwright)
- [ ] Enhanced DAW loads in collaborative mode
- [ ] DAW pack card generation
- [ ] Checkbox selection workflow
- [ ] Focus grid open/close
- [ ] Grid resize/reorder

---

## Migration Path

### Step 1: Create Enhanced DAW (non-breaking)
- Build EnhancedDAW alongside CollaborativeDAW
- Test in isolation
- Switch collaborative mode to use EnhancedDAW

### Step 2: Add DAW Pack (additive)
- Implement backend pack generation
- Add to mode selector
- Test pack card rendering

### Step 3: Remove Combined Focus (breaking)
- Remove state and components
- Update tests
- Deploy

### Step 4: Add Checkbox Focus (new feature)
- Implement checkbox UI
- Build FocusGridOverlay
- Wire up state management
- Test extensively

---

## Timeline Estimate
- Phase 1 (Enhanced DAW): 8-12 hours
- Phase 2 (DAW Pack): 4-6 hours
- Phase 3 (Remove Combined Focus): 2-3 hours
- Phase 4 (Checkbox Focus): 6-8 hours
- Testing & Polish: 4-6 hours
**Total: 24-35 hours**

---

## Risk Assessment
- **High Risk**: Audio synthesis with multiple instruments may have performance issues
- **Medium Risk**: Sample chopper waveform rendering could be complex
- **Low Risk**: Checkbox focus mode is straightforward UI work

---

## Open Questions
1. Should EnhancedDAW replace CollaborativeDAW or coexist?
   - **Recommendation**: Replace to reduce maintenance burden
2. How many tracks should the piano roll support?
   - **Recommendation**: Start with 4, expand to 8 later
3. Should focus grid support more than 4 cards?
   - **Recommendation**: Auto-layout up to 9 cards (3x3)
4. Export format for DAW sessions?
   - **Recommendation**: JSON for now, MIDI export as future enhancement

---

**Status**: Planning complete, ready for implementation.
