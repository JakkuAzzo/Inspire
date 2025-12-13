# Inspire App - Refactored Page Structure

## New File Organization

The app has been refactored from a single 3,485-line `App.tsx` file into a modular page-based structure.

### Directory Structure

```
frontend/src/
├── App.tsx                          (Main orchestrator component - routes pages)
├── pages/
│   ├── Home.tsx                     (Landing page: hero, session peaks, mode selector)
│   ├── SubmodeSelector.tsx          (Submode selection panel)
│   └── Workspace.tsx                (Main workspace: pack generation, queue, focus mode)
├── components/
│   ├── CollapsibleSection.tsx       (Reusable collapsible container)
│   ├── RelevanceSlider.tsx          (Filter sliders)
│   ├── AmbientAudioToggle.tsx       (Audio effects toggle)
│   ├── MouseParticles.tsx           (Background particle animation)
│   └── YouTubePlaylistEmbed.tsx     (YouTube video player)
├── App.css                          (Main styling)
├── index.css                        (Global styles)
├── types.ts                         (TypeScript interfaces)
└── main.tsx                         (Entry point)
```

## Page Components

### `pages/Home.tsx`
**Purpose**: Landing page displayed when `!mode`

**Responsibilities**:
- Hero header with Inspire logo and tagline
- Three session peaks (Spectate Live, Join Collab, Community Feed)
- Mode selector button/cards for Lyricist, Producer, Editor
- Mode card parallax hover effects

**Props Expected**:
- `onModeSelect`: Callback when user selects a mode
- `showModePicker`: Boolean to show/hide mode cards
- `onToggleModePicker`: Toggle mode selector visibility
- `expandedPeak`: Currently expanded peak (spectate|collab|community|null)
- `onPeakEnter/Leave`: Peak expansion handlers
- `liveSessions/collaborativeSessions/communityPosts`: Data arrays
- `heroMetaContent`: ReactNode for metadata display
- `onSpectateSession/onJoinSession`: Session handlers
- `onForkCommunityPost`: Community post handler

### `pages/SubmodeSelector.tsx`
**Purpose**: Submode selection panel displayed when `mode && !submode`

**Responsibilities**:
- Display mode title and description
- Show grid of available submodes
- Handle submode selection

**Props Expected**:
- `modeDefinition`: ModeDefinition object for active mode
- `onSubmodeSelect`: Callback with selected submode ID
- `onBack`: Callback to return to mode selection

### `pages/Workspace.tsx`
**Purpose**: Main creative workspace displayed when `mode && submode`

**Responsibilities**:
- Top navigation header with mode/submode info and action buttons
- Workspace controls overlay (collapsed/expanded toggle)
- Workspace main area with:
  - Pack stage (displays pack cards/deck)
  - Focus mixer for combined focus mode
  - Pack detail view when card is expanded
  - Inspiration queue with YouTube previews
- Handle drag/drop for combined focus
- Manage auto-refresh timer
- Display news headlines and challenges

**Props Expected**:
- Mode/submode info: `mode`, `submode`, `modeLabel`, `submodeLabel`
- State: `fuelPack`, `filters`, `loading`, `status`, `error`
- Handlers: `onGeneratePack`, `onRemixPack`, `onSaveCurrentPack`, `onLoadById`, etc.
- Pack deck: `packDeck`, `orderedPackDeck`, `expandedCard`
- Focus mode: `focusMode`, `focusModeType`, `focusDensity`, `focusSpeed`
- Queue: `workspaceQueue`, `queueCollapsed`, `youtubeVideos`, `youtubePlaylists`
- UI state: `controlsCollapsed`, `mixerHover`, `combinedFocusCardIds`

## Migration Path

### Current App.tsx Structure (3,485 lines):
1. **Constants & Config** (lines 1-150): MODE_DEFINITIONS, FALLBACK_MODE_DEFINITIONS, genre options, theme options
2. **Interface Definitions** (lines 150-250): CreatorStats, DeckCard, LiveSession, etc.
3. **Mock Data** (lines 250-450): DEMO_LYRICIST_PACK, DEMO_PRODUCER_PACK, COMMUNITY_POSTS
4. **Utility Functions** (lines 450-750): Date formatting, encoding/decoding packs, stats management
5. **Component Function** (line 750+): Main App() hook with all state and handlers
6. **Hook Definitions** (throughout): useState, useEffect, useCallback, useMemo
7. **Pack Building Logic** (lines 1500-2200): buildLyricistCard, buildProducerCard, buildEditorCard
8. **Rendering** (lines 2500-3485): Large conditional JSX with overlays

### Next Steps for Complete Refactoring:

1. **Extract Constants** → `src/constants.ts`
   - MODE_DEFINITIONS, FALLBACK_MODE_DEFINITIONS
   - LYRICIST_GENRES, MODE_BACKGROUNDS, THEME_OPTIONS
   - Storage keys, demo packs, challenge rotation

2. **Extract Utilities** → `src/utils/`
   - `dateUtils.ts`: formatRelativeTime, formatChallengeCountdown
   - `packUtils.ts`: encodePack, decodePack, isLyricistPack, isProducerPack, isEditorPack
   - `statsUtils.ts`: loadCreatorStats, persistCreatorStats, computeFavoriteTone
   - `packGenerationUtils.ts`: buildWorkspaceQueue, createRemixPack, formatShareText

3. **Extract Hooks** → `src/hooks/`
   - `usePackGeneration.ts`: Handle pack API calls, loading states
   - `useCreatorStats.ts`: Load/persist creator statistics
   - `useWorkspaceQueue.ts`: Build and manage queue items
   - `useYoutubePlaylist.ts`: Fetch YouTube videos
   - `useDailyChallenge.ts`: Challenge logic and persistence

4. **Extract Overlays** → `src/overlays/`
   - `CommunityOverlay.tsx`
   - `SettingsOverlay.tsx`
   - `SavedPacksOverlay.tsx`
   - `WordExplorerOverlay.tsx`
   - `ChallengeOverlay.tsx`
   - `FocusControlsOverlay.tsx`
   - `ChipPickerOverlay.tsx`
   - `AccountOverlay.tsx`
   - `OnboardingOverlay.tsx`

5. **Refactor App.tsx** → Main routing component
   - Keep only high-level state and routing logic
   - Props distribution to page components
   - Global overlay management

## Benefits of This Structure

✅ **Better Code Organization**: Each page has a single responsibility  
✅ **Easier Testing**: Isolated page components are easier to test  
✅ **Scalability**: New features/pages can be added independently  
✅ **Reusability**: Utilities and hooks can be shared across pages  
✅ **Maintainability**: Smaller files are easier to understand and modify  
✅ **Performance**: Potential for code splitting and lazy loading  
✅ **Onboarding**: New developers can understand the structure faster  

## API Surface

Each page component receives:
- **State** needed to render
- **Callbacks** to handle user interactions
- **Data** to display

This keeps pages "dumb" while App.tsx acts as the "smart" orchestrator.

---

**Last Updated**: December 2025  
**Status**: Pages created, ready for App.tsx refactor
