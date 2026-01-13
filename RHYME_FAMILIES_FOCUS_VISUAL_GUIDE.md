# Rhyme Families Focus Mode - Visual Code Guide

## Quick Reference

```
Rhyme Families Focus Mode Implementation
├── State (Line 1029)
│   └── const [rhymeFocusMode, setRhymeFocusMode] = useState(false);
│
├── UI Rendering (Lines 4860-4910)
│   ├── FocusModeOverlay wrapper
│   ├── Focus toggle button (4869-4876)
│   ├── Grid view (4881-4895)
│   └── Focus mode animation (4896-4906)
│
└── Styling (App.css)
    ├── .focus-toggle (line 2298)
    └── .focus-toggle.active (line 2301)
```

## Code Snippets with Context

### 1. State Declaration (Line 1029)
```typescript
// Line 1025-1035 in App.tsx
const [rhymeMaxResults, setRhymeMaxResults] = useState('12');
const [rhymeResults, setRhymeResults] = useState<Array<{ word: string; score?: number; numSyllables?: number }>>([]);
const [rhymeLoading, setRhymeLoading] = useState(false);
const [rhymeError, setRhymeError] = useState<string | null>(null);
const [rhymeFocusMode, setRhymeFocusMode] = useState(false);  // ← FOCUS MODE STATE
const [newsHeadlines, setNewsHeadlines] = useState<NewsHeadline[]>([]);
```

**What it does:**
- Boolean state to track if focus mode is active
- `false` = grid view, `true` = animation view
- Toggles via `setRhymeFocusMode((prev) => !prev)`

---

### 2. Rhyme Families Overlay Structure (Lines 4861-4910)
```typescript
{showRhymeExplorer && (
  <FocusModeOverlay
    isOpen={showRhymeExplorer}
    onClose={() => setShowRhymeExplorer(false)}
    title="Rhyme Families"
    ariaLabel="Rhyme Families overlay"
  >
    <div className="settings-section">
      {/* Focus mode button container */}
      <div className="detail-toolbox" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={`btn secondary focus-toggle${rhymeFocusMode ? ' active' : ''}`}
          onClick={() => setRhymeFocusMode((prev) => !prev)}
          disabled={rhymeLoading || rhymeResults.length === 0}
        >
          {rhymeFocusMode ? 'Exit Focus Mode' : 'Focus Mode'}
        </button>
      </div>
      
      {/* Loading state */}
      {rhymeLoading && <p>Finding rhyme families…</p>}
      
      {/* Error state */}
      {!rhymeLoading && rhymeError && <p className="error">{rhymeError}</p>}
      
      {/* Grid View (default) */}
      {!rhymeLoading && !rhymeError && !rhymeFocusMode && (
        <div className="word-grid">
          {rhymeResults.map((w) => (
            <button
              key={w.word}
              type="button"
              className="word-chip interactive"
              title={`${w.numSyllables ?? ''} syllables`}
              onClick={() => handleApplyRhymeFamilies([w.word])}
            >
              {w.word}
            </button>
          ))}
        </div>
      )}
      
      {/* Focus Mode (animated) */}
      {!rhymeLoading && !rhymeError && rhymeFocusMode && rhymeResults.length > 0 && (
        <div style={{ position: 'relative', height: 360 }}>
          <FallingWordStream
            items={rhymeResults.map((w) => w.word)}
            active
            maxVisible={Math.max(18, focusDensity)}
            spawnIntervalMs={Math.max(120, focusSpawnIntervalMs)}
            fallDurationMs={Math.max(2500, focusFallDurationMs)}
          />
        </div>
      )}
    </div>
  </FocusModeOverlay>
)}
```

**Breakdown:**

#### Button Logic (Lines 4870-4876)
```typescript
className={`btn secondary focus-toggle${rhymeFocusMode ? ' active' : ''}`}
//                                    ↑ Dynamic class addition
onClick={() => setRhymeFocusMode((prev) => !prev)}
//             ↑ Toggle state on click
disabled={rhymeLoading || rhymeResults.length === 0}
//        ↑ Disabled during loading or with no results
```

#### Conditional Rendering Logic
```typescript
// Grid appears when:
!rhymeLoading && !rhymeError && !rhymeFocusMode
//                               ↑ NOT in focus mode

// Animation appears when:
!rhymeLoading && !rhymeError && rhymeFocusMode && rhymeResults.length > 0
//                               ↑ IN focus mode       ↑ Has results
```

---

### 3. Button Styling (App.css Lines 2298-2304)
```css
.focus-toggle {
  align-self: flex-end;  /* Aligns button to right */
}

.focus-toggle.active {
  background: rgba(59, 130, 246, 0.18);    /* Blue tint */
  border-color: rgba(59, 130, 246, 0.35);  /* Blue border */
}
```

**Visual effect:**
- Default: Standard button appearance
- Active (focus mode on): Subtle blue highlighting

---

### 4. FallingWordStream Component Props
```typescript
<FallingWordStream
  items={rhymeResults.map((w) => w.word)}  // Words to animate
  active                                    // Animation is running
  maxVisible={Math.max(18, focusDensity)}  // Max simultaneous words
  spawnIntervalMs={Math.max(120, focusSpawnIntervalMs)}  // Time between spawns
  fallDurationMs={Math.max(2500, focusFallDurationMs)}   // How fast they fall
/>
```

**Configuration source:**
```typescript
// Lines ~1020-1022 in App.tsx
const [focusDensity, setFocusDensity] = useState(18);
const [focusSpawnIntervalMs, setFocusSpawnIntervalMs] = useState(120);
const [focusFallDurationMs, setFocusFallDurationMs] = useState(2500);
```

**Shared with:**
- Word Explorer focus mode
- Any other feature using `FallingWordStream`

---

## State Machine Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Rhyme Families Overlay                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   User enters word      │
              │   and searches          │
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   rhymeLoading = true   │
              │   Button DISABLED       │
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   Results loaded        │
              │   rhymeResults.length > 0│
              │   Button ENABLED        │
              └─────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │  rhymeFocusMode      │  │  rhymeFocusMode      │
    │      = false         │  │      = true          │
    │                      │  │                      │
    │  GRID VIEW           │  │  FOCUS MODE          │
    │  • Word chips        │  │  • Falling words     │
    │  • Clickable         │  │  • Animated          │
    │  • Syllable count    │  │  • Full screen       │
    └──────────────────────┘  └──────────────────────┘
                │                       │
                └───────────┬───────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   Click toggle button   │
              │   State flips           │
              └─────────────────────────┘
```

---

## UI Flow Screenshots (Described)

### 1. Initial State
```
┌────────────────────────────────────────┐
│  Rhyme Families                    [X] │
├────────────────────────────────────────┤
│  [Input field: Enter word...]          │
│  [Search button]                       │
│                                        │
│  [Focus Mode] ← DISABLED (no results) │
└────────────────────────────────────────┘
```

### 2. Loading State
```
┌────────────────────────────────────────┐
│  Rhyme Families                    [X] │
├────────────────────────────────────────┤
│  [Input field: "fire"]                 │
│                                        │
│  Finding rhyme families…               │
│                                        │
│  [Focus Mode] ← DISABLED (loading)    │
└────────────────────────────────────────┘
```

### 3. Grid View (Default)
```
┌────────────────────────────────────────┐
│  Rhyme Families                    [X] │
├────────────────────────────────────────┤
│  [Input field: "fire"]                 │
│                                        │
│  [Focus Mode] ← ENABLED               │
│                                        │
│  ┌──────┐ ┌──────┐ ┌──────┐          │
│  │ wire │ │ tire │ │ hire │          │
│  └──────┘ └──────┘ └──────┘          │
│  ┌──────┐ ┌───────┐ ┌──────┐         │
│  │ dire │ │ desire│ │ spire│         │
│  └──────┘ └───────┘ └──────┘         │
└────────────────────────────────────────┘
```

### 4. Focus Mode (Animated)
```
┌────────────────────────────────────────┐
│  Rhyme Families                    [X] │
├────────────────────────────────────────┤
│  [Input field: "fire"]                 │
│                                        │
│  [Exit Focus Mode] ← ACTIVE (blue)    │
│  ┌──────────────────────────────────┐ │
│  │                                  │ │
│  │       wire  ↓                    │ │
│  │                  tire ↓          │ │
│  │              hire ↓              │ │
│  │                      dire ↓      │ │
│  │          desire ↓                │ │
│  │                        spire ↓   │ │
│  │                                  │ │
│  └──────────────────────────────────┘ │
│           (360px height)               │
└────────────────────────────────────────┘
```

---

## Quick Checks

### ✅ Feature is Complete If:
- [ ] Button exists in Rhyme Families overlay
- [ ] Button disabled during loading
- [ ] Button disabled when `rhymeResults.length === 0`
- [ ] Button text changes on toggle
- [ ] Button gets `.active` class when focus mode on
- [ ] Grid view visible by default
- [ ] Grid hides when focus mode active
- [ ] `FallingWordStream` renders when focus mode active
- [ ] Animation container has `height: 360`
- [ ] Toggling works in both directions

### 🔍 How to Verify Manually:
1. Open app → Lyricist mode
2. Click "Rhyme Families" button
3. Verify button is disabled initially
4. Enter a word (e.g., "dream")
5. Search for rhymes
6. Verify button becomes enabled
7. Click "Focus Mode"
8. Verify grid disappears
9. Verify falling words animation starts
10. Verify button text changed to "Exit Focus Mode"
11. Click "Exit Focus Mode"
12. Verify grid returns

---

## File Locations Summary

| Element | File | Lines |
|---------|------|-------|
| State | `frontend/src/App.tsx` | 1029 |
| Button UI | `frontend/src/App.tsx` | 4870-4876 |
| Grid View | `frontend/src/App.tsx` | 4881-4895 |
| Focus Mode View | `frontend/src/App.tsx` | 4896-4906 |
| Button Styles | `frontend/src/App.css` | 2298-2304 |
| Configuration | `frontend/src/App.tsx` | ~1020-1022 |
| FallingWordStream | `frontend/src/components/` | (component file) |

---

**Conclusion:** The focus mode button is already fully implemented with the exact same animation and behavior as Word Explorer. No additional code changes needed.
