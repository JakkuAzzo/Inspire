# Collaboration Page Design Breakdown

## Overview
The collaboration page is a **real-time multi-user workspace** for musicians/producers to work together on creative projects. It supports simultaneous video conferencing, DAW editing, comments, and session management with guest session restrictions (1-hour limit).

---

## Architecture Components

### 1. **Main Container: CollaborativeSessionDetail**
**File:** [frontend/src/pages/CollaborativeSession.tsx](frontend/src/pages/CollaborativeSession.tsx)

A full-screen flex layout composed of 4 sections:

```
┌─────────────────────────────────────────────────────────────┐
│                      HEADER (100px)                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│                    MAIN CONTENT BODY                          │
│              (Layout controls + content grid)                │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                      SIDEBAR (320px)                          │
│              (Comments & Reactions - Fixed)                  │
├─────────────────────────────────────────────────────────────┤
│                      FOOTER (200px max)                       │
│              (Participants List - Scrollable)                │
└─────────────────────────────────────────────────────────────┘
```

---

## Detailed Section Breakdown

### SECTION 1: Header (`session-header`)
**Purpose:** Display session metadata, timer, and exit controls

#### Visual Design
- **Background:** Dark gradient `linear-gradient(135deg, rgba(25,25,50,0.9) 0%, rgba(22,33,62,0.9) 100%)`
- **Border:** 2px solid `rgba(100,150,255,0.2)` (bottom only)
- **Shadow:** `0 4px 20px rgba(0,0,0,0.3)`
- **Padding:** `2rem`

#### Content Layout
Three-column flex structure:

```
┌─────────────────────────────────┬─────────────────────────────┐
│  Title & Metadata               │   Action Buttons             │
│                                 │   (Leave Session)            │
├─────────────────────────────────┴─────────────────────────────┤
│ Session Title (H1)              │ Leave Session (btn)          │
│ Hosted by <name> • N collab.    │                             │
│ • 👁️ M viewers • ⏱️ MM:SS left  │                             │
│ [Optional Description]          │                             │
└─────────────────────────────────┴─────────────────────────────┘
```

#### Typography
- **Title (H1):** 
  - Font size: `2rem`
  - Weight: `700`
  - Color: Gradient `#ec4899 → #a855f7` (pink to purple)
  - Applied via `background-clip: text` + `-webkit-text-fill-color: transparent`

- **Metadata (p.session-meta):**
  - Font size: `0.95rem`
  - Color: `#cbd5e1` (light slate)
  - Username emphasis: `#22d3ee` (cyan)

#### Timer Display
- **Visible only for guest sessions:** `(session as any).isGuestSession === true`
- **Format:** `MM:SS remaining` (minutes and seconds)
- **Color:** 
  - Active: `#f59e0b` (amber/warning)
  - Expired: `#ef4444` (red)
- **Updates:** Every 1000ms via `setInterval`
- **Calculation:** `Math.max(0, expiresAt - now)`

#### Features
- **Description field:** Optional, appears below metadata in `#94a3b8` (slate)
- **Header Actions:** Flex row with `gap: 0.75rem`
  - "Leave Session" button (tertiary style)

---

### SECTION 2: Main Body (`session-body`)
**Purpose:** Display interactive layout controls and content grid

#### Layout Controls Toolbar
Located above content grid

**CSS Class:** `.layout-controls`
- **Background:** `rgba(15,15,30,0.6)` (dark semi-transparent)
- **Border:** `1px solid rgba(100,150,255,0.15)` (subtle blue)
- **Padding:** `0.75rem 1rem`
- **Border radius:** `0.5rem`
- **Layout:** Flex row with `gap: 1rem`

**Toggle Group:**
Three buttons for layout switching:
```
[Video] [DAW] [Split]
```
- **Inactive button:** 
  - Background: Default (dark)
  - Border: `rgba(100,150,255,0.15)`
  - Font size: `0.85rem`
  - Padding: `0.4rem 0.75rem`

- **Active button (.btn.active):**
  - Background: Gradient `#6495ff → #4f7eff` (blue)
  - Border color: `#6495ff`
  - Color: `white`
  - Text weight: `600`

#### Content Grid (`.content-grid`)
**Flex layout:** `flex: 1; display: grid; gap: 1rem`

Three layout modes:

##### Mode 1: Video-only (`.layout-video`)
```css
.layout-video .video-section { grid-column: 1 / -1; }
.layout-video .daw-section { display: none; }
```
- Video streams take full width
- DAW hidden

##### Mode 2: DAW-only (`.layout-daw`)
```css
.layout-daw .daw-section { grid-column: 1 / -1; }
.layout-daw .video-section { display: none; }
```
- Piano roll editor takes full width
- Video streams hidden

##### Mode 3: Split Layout (`.layout-split`)
```css
.layout-split {
  grid-template-columns: 1.5fr 1fr;
}
```
- **Left (60%):** Video streams (`video-section`)
- **Right (40%):** DAW editor (`daw-section`)

#### Section Styling (`.video-section`, `.daw-section`)
- **Display:** Flex column with `min-height: 0` (allows flex shrinking)
- **Border radius:** `0.75rem`
- **Overflow:** `hidden`
- **Background:** `rgba(15,15,30,0.6)` (dark)
- **Border:** `1px solid rgba(100,150,255,0.15)` (subtle)

---

### SECTION 3: Sidebar (`session-sidebar`)
**Purpose:** Comments thread and reactions interface

#### Layout & Positioning
- **Position:** `fixed`
- **Right:** `0`
- **Size:** `320px` wide (full height, minus header/footer)
- **Z-index:** `40` (above content)
- **Backdrop:** `blur(8px)`
- **Transition:** `transform 0.3s ease` for collapse animation
- **Border:** `1px solid rgba(100,150,255,0.2)` (left side)
- **Background:** `rgba(15,15,30,0.95)` (nearly opaque dark)

#### Collapsed State
- When `showComments === false`:
  - Width: `0`
  - Overflow: `hidden`
  - Content invisible but DOM remains

#### Sub-sections

##### A. Sidebar Header (`.sidebar-header`)
```
┌─────────────────────────────────┐
│ Comments & Reactions    [−] btn  │
└─────────────────────────────────┘
```
- **Display:** Flex with `justify-content: space-between`
- **Padding:** `1rem`
- **Border bottom:** `1px solid rgba(100,150,255,0.2)`
- **H2 title:** `1rem` font, weight `600`, color `#e2e8f0`

**Toggle Button (micro):**
- Shows `−` when expanded
- Shows `+` when collapsed
- `aria-label` updates dynamically

##### B. Sidebar Content (`.sidebar-content`)
**Only visible when `showComments === true`**
- **Flex layout:** Column with `gap: 1rem`, flex `1` (grows)
- **Overflow-y:** `auto` (scrollable)
- **Padding:** `1rem`

###### Comment Input Section (`.comment-input-section`)
```
┌──────────────────────────────┐
│  [Textarea for input]        │
│  [Post Button]               │
└──────────────────────────────┘
```

**Textarea styling (`.comment-textarea`):**
- **Size:** `rows={2}`, resizable vertically
- **Padding:** `0.75rem`
- **Background:** `rgba(30,30,50,0.8)` (slightly lighter dark)
- **Border:** `1px solid rgba(100,150,255,0.3)` (blue tint)
- **Border radius:** `0.375rem`
- **Color:** `#e2e8f0`
- **Font size:** `0.9rem`
- **Font family:** `inherit`

**Focus state:**
- Outline: `none`
- Border color: `#6495ff` (bright blue)
- Box shadow: `0 0 8px rgba(100,150,255,0.2)` (glow effect)

**Placeholder:** `"Add a comment..."` in `#64748b` (muted)

**Post Button:**
- Class: `.btn.primary.small`
- **Disabled when:** `!newComment.content.trim()` (empty)

##### C. Comments Thread (`.comments-thread`)
```
┌──────────────────────────────┐
│ [Comment 1]                  │
├──────────────────────────────┤
│ [Comment 2]                  │
├──────────────────────────────┤
│ [Comment 3]                  │
└──────────────────────────────┘
```

**Flex layout:** Column with `gap: 1rem`, flex `1` (grows), overflow-y auto

**Empty state (p.empty-state):**
- Text: "No comments yet. Be the first to share!"
- Padding: `2rem 1rem`
- Text align: `center`
- Color: `#64748b`
- Font size: `0.9rem`

###### Individual Comment (`.comment-item`)
```
┌────────────────────────────────────┐
│ Username           [Date]           │
│ "This is the comment content text" │
│ [👍 Vote] [👎]                     │
└────────────────────────────────────┘
```

**Styling:**
- **Padding:** `0.75rem`
- **Background:** `rgba(30,30,50,0.5)` (semi-dark)
- **Border-left:** `2px solid rgba(34,211,238,0.4)` (cyan accent)
- **Border radius:** `0.375rem`
- **Hover:** Background changes to `rgba(30,30,50,0.8)`
- **Transition:** `all 0.2s ease`

**Comment Header (`.comment-header`):**
- Flex with `justify-content: space-between`
- Gap: `0.5rem`
- Margin-bottom: `0.5rem`

**Author (`.comment-author`):**
- Weight: `600`
- Color: `#22d3ee` (cyan)
- Font size: `0.9rem`

**Timestamp (`.comment-time`):**
- Font size: `0.75rem`
- Color: `#64748b` (muted)
- Format: `"Jan 25"` (short month + day)

**Content (`.comment-content`):**
- Margin: `0`
- Font size: `0.9rem`
- Color: `#cbd5e1`
- Line height: `1.4`
- Word break: `break-word` (wraps long words)

**Vote Buttons (`.vote-btn`):**
```
[👍 5] [👎]
```

**Default state:**
- Padding: `0.25rem 0.5rem`
- Background: `rgba(100,150,255,0.1)`
- Border: `1px solid rgba(100,150,255,0.2)`
- Border radius: `0.25rem`
- Color: `#94a3b8` (muted)
- Font size: `0.8rem`
- Cursor: `pointer`
- White space: `nowrap`

**Hover state:**
- Background: `rgba(100,150,255,0.2)` (brighter)
- Border color: `rgba(100,150,255,0.4)`
- Color: `#cbd5e1` (lighter)

**Active upvote (.vote-btn.active):**
- Background: `rgba(34,211,238,0.2)` (cyan tint)
- Border color: `#22d3ee`
- Color: `#22d3ee`

**Active downvote (.vote-btn.downvote.active):**
- Background: `rgba(239,68,68,0.2)` (red tint)
- Border color: `#ef4444`
- Color: `#ef4444`

**Vote count display:**
- Shows count if `voteCount > 0`
- Hidden if `voteCount === 0` (space still allocated for upvote button label)

---

### SECTION 4: Footer (`session-footer`)
**Purpose:** List of all participants (collaborators + spectators)

#### Layout & Positioning
- **Position:** Bottom of page
- **Padding:** `1rem`
- **Background:** `rgba(15,15,30,0.8)` (dark)
- **Border-top:** `1px solid rgba(100,150,255,0.2)`
- **Max-height:** `200px` (scrollable)
- **Overflow-y:** `auto`

#### Participants Grid (`.participants-list`)
```css
grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
gap: 1.5rem;
```
- Responsive grid that creates columns of ~150px min
- Grows to fill space

#### Participant Group (`.participant-group`)
**Two groups visible when applicable:**
1. **Collaborators** (always present)
2. **Spectators** (only if `session.viewers.length > 0`)

**H4 heading (`.participant-group h4`):**
- Margin: `0 0 0.75rem 0`
- Font size: `0.85rem`
- Weight: `600`
- Color: `#94a3b8` (muted)
- Text transform: `uppercase`
- Letter spacing: `0.5px`

**UL list:**
- List style: `none`
- Margin: `0`
- Padding: `0`
- Display: Flex column
- Gap: `0.5rem`

#### Individual Participant (`.participant`)
```
┌──────────────────────────────┐
│ 🟢 Username          [Host]  │
└──────────────────────────────┘
```

**Default styling:**
- Display: Flex with `align-items: center`
- Gap: `0.75rem`
- Padding: `0.5rem`
- Border radius: `0.375rem`
- Background: `rgba(30,30,50,0.5)` (semi-dark)
- Font size: `0.9rem`
- Color: `#cbd5e1`

**Viewer state (.participant.viewer):**
- Opacity: `0.7` (dimmed)

**Username (`.participant-name`):**
- Flex: `1` (grows to fill space)
- White space: `nowrap`
- Overflow: `hidden`
- Text overflow: `ellipsis` (truncates long names)

**Status Indicator (`.status-indicator`):**
```
🟢 = Online   🔴 = Offline   🟠 = Away
```

**Styling:**
- Width: `8px`
- Height: `8px`
- Border radius: `50%` (circle)
- Default background: `#64748b` (offline gray)

**Online state (.status-indicator.online):**
- Background: `#10b981` (emerald green)
- Box shadow: `0 0 8px rgba(16,185,129,0.5)` (glow)

**Offline state (.status-indicator.offline):**
- Background: `#ef4444` (red)

**Host Badge (`.badge`):**
```
[Host]
```
- Display: `inline-block`
- Padding: `0.2rem 0.4rem`
- Background: `rgba(168,85,247,0.2)` (purple tint)
- Border radius: `0.25rem`
- Font size: `0.75rem`
- Color: `#d8b4fe` (light purple)
- White space: `nowrap`

---

## Child Components

### 1. VideoStreamManager
**File:** [frontend/src/components/workspace/VideoStreamManager.tsx](frontend/src/components/workspace/VideoStreamManager.tsx)

**Purpose:** Manage up to 4 concurrent video streams (WebRTC)

**Handles:**
- User camera/microphone capture (getUserMedia)
- Peer connection management
- Stream controls (mute, video toggle)
- Screen sharing support
- Grid layout switching (1, 2, 3, 4 streams)

**Props from parent:**
```typescript
{
  localUserId: string;
  localUsername: string;
  participants: CollaborativeSessionParticipant[];
  viewers: CollaborativeSessionParticipant[];
  maxStreams?: number; // typically 4
  onStreamJoin?: (userId: string, stream: MediaStream) => void;
  onStreamLeave?: (userId: string) => void;
  onControlChange?: (userId: string, control: 'audio'|'video', enabled: boolean) => void;
}
```

**Detected Issues & Error Handling:**
- Checks `navigator.mediaDevices` availability
- Validates HTTPS or localhost context
- Falls back to mock error message if unsupported
- Shows detailed console logs for debugging

**Features:**
- Real-time layout switching (1x1, 2x1, 2x2)
- Audio/video control per stream
- Screen sharing toggle
- Volume meters (optional)

---

### 2. CollaborativeDAW
**File:** [frontend/src/components/workspace/CollaborativeDAW.tsx](frontend/src/components/workspace/CollaborativeDAW.tsx)

**Purpose:** Shared piano roll editor with real-time sync and playback

**Handles:**
- Piano roll rendering (5 octaves, 12 semitones per octave)
- Note drag-and-drop placement
- MIDI note playback via synthesizer
- Tempo/BPM adjustment (slider)
- Playback controls (play/pause/stop)
- Multi-user sync via `audioSyncService`
- Playhead animation

**Props from parent:**
```typescript
{
  sessionId?: string; // for Socket.io rooms
  dawSession: DAWSession;
  audioSyncState: AudioSyncState;
  isHost: boolean;
  onNoteAdd?: (note: DAWNote) => void;
  onNoteRemove?: (noteId: string) => void;
  onTempoChange?: (tempo: number) => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  onSync?: (metrics: SyncMetrics) => void;
}
```

**Note Structure:**
```typescript
interface DAWNote {
  id: string;
  midiNote: number; // 0-127
  startBeat: number;
  durationBeats: number;
  velocity: number; // 0-127
  addedBy: string; // userId
  createdAt: number;
}
```

**Features:**
- Grid snap (0.25 beat resolution)
- Multi-note selection
- Playback sync with server metrics
- Latency compensation
- Visual playhead indicator

---

## Type Definitions

### CollaborativeSession
```typescript
interface CollaborativeSession {
  id: string;
  title: string;
  description: string;
  mode: CreativeMode; // 'lyricist' | 'producer' | 'editor'
  submode: string;
  hostId: string;
  hostUsername: string;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  status: 'waiting' | 'active' | 'ended';
  maxParticipants: number;
  maxStreams: number; // typically 4
  participants: CollaborativeSessionParticipant[];
  viewers: CollaborativeSessionParticipant[];
  daw: DAWSession;
  audioSyncState: AudioSyncState;
  comments: CommentThread[];
  isPersisted: boolean;
  recordingUrl?: string;
  expiresAt?: number; // For guest sessions (1 hour from creation)
  isGuestSession?: boolean;
}
```

### CollaborativeSessionParticipant
```typescript
interface CollaborativeSessionParticipant {
  userId: string;
  username: string;
  role: 'host' | 'collaborator' | 'viewer';
  joinedAt: number;
  isActive: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
}
```

### CommentThread
```typescript
interface CommentThread {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isEdited: boolean;
  voteCount: number;
}
```

---

## State Management

### Page-level State (CollaborativeSessionDetail)
```typescript
const [comments, setComments] = useState<CommentThread[]>(session.comments);
const [newComment, setNewComment] = useState<NewComment>({ content: '' });
const [showComments, setShowComments] = useState(true); // Sidebar toggle
const [userVotes, setUserVotes] = useState<Map<string, 'upvote'|'downvote'>>(new Map());
const [expandedLayout, setExpandedLayout] = useState<'video'|'daw'|'split'>('split');
const [sessionTimer, setSessionTimer] = useState<SessionTimer>({
  minutes: 0,
  seconds: 0,
  isExpired: false
});
```

### Effects
1. **Timer update effect:** Updates every 1000ms for guest sessions
2. **Comments sync effect:** Updates when `session.comments` changes
3. **DAW sync effect:** Subscribes to audio sync service for playback state

---

## Responsive Behavior

### Tablet (≤ 1024px)
```css
.layout-split {
  grid-template-columns: 1fr; /* Stacks vertically */
}
.session-sidebar {
  width: 280px; /* Narrower */
}
```

### Mobile (≤ 768px)
```css
.session-header {
  flex-direction: column; /* Actions move below title */
}
.session-sidebar {
  position: relative; /* No longer fixed */
  width: 100%;
  max-height: 50vh;
  border-left: none;
  border-top: 1px solid rgba(100,150,255,0.2); /* Top border instead */
}
.session-body {
  padding: 0.75rem; /* Reduced padding */
}
```

### Small Mobile (≤ 480px)
```css
.session-header h1 {
  font-size: 1.25rem; /* Smaller title */
}
.session-body {
  padding: 0.5rem;
}
.layout-controls {
  font-size: 0.85rem;
  padding: 0.5rem;
}
.session-footer {
  max-height: 150px;
}
```

---

## Color Scheme

### Primary Colors
| Element | Color | Usage |
|---------|-------|-------|
| Title gradient | `#ec4899` → `#a855f7` | H1 gradient (pink to purple) |
| Primary accent | `#22d3ee` | Usernames, active states, borders |
| Secondary accent | `#6495ff` | Buttons, focus states |
| Warning (timer) | `#f59e0b` | Active guest timer |
| Danger (expired) | `#ef4444` | Expired timer, offline indicator |
| Success (online) | `#10b981` | Online status indicator |

### Background Colors
| Element | Color | Usage |
|---------|-------|-------|
| Main bg | `linear-gradient(135deg, #0f0f1e, #1a1a2e)` | Page background |
| Header | `rgba(25,25,50,0.9)` → `rgba(22,33,62,0.9)` | Header gradient |
| Sections | `rgba(15,15,30,0.6)` | Content cards |
| Dark inputs | `rgba(30,30,50,0.8)` | Textareas, inputs |
| Light inputs | `rgba(30,30,50,0.5)` | Comment items |

### Text Colors
| Element | Color | Usage |
|---------|-------|-------|
| Primary text | `#e2e8f0` | Main content |
| Secondary text | `#cbd5e1` | Secondary content |
| Muted text | `#94a3b8` | Headings, labels |
| Dim text | `#64748b` | Timestamps, placeholders |

---

## Key Features & Interactions

### 1. Guest Session Timer
- Only visible if `session.isGuestSession === true`
- Shows countdown in MM:SS format
- Updates every 1000ms
- Turns red and shows "Session Expired" when time runs out
- Server-enforced 1-hour limit

### 2. Layout Switching
- Three modes: **Video**, **DAW**, **Split** (default)
- Buttons in header control visibility
- Split layout: 60% video / 40% DAW

### 3. Real-time Comments
- Post new comments (min 1 character)
- Upvote/downvote system (toggle behavior)
- Vote count displays inline with button
- Timestamp shows date (`Jan 25` format)
- Collapsible sidebar with smooth transitions

### 4. Participant Status
- Shows online/offline status via color-coded dot
- Host badge on host user
- Collaborators listed separately from spectators
- Dimmed appearance for viewers

### 5. DAW Integration
- Piano roll with 5 octaves (C2 to C6)
- Drag-to-place notes
- Real-time multi-user sync
- Tempo slider (0.5x to 2.0x)
- Play/pause/stop controls
- Playhead animation

### 6. Video Streaming
- Up to 4 concurrent streams
- Responsive grid layout
- Mute/unmute audio per stream
- Camera toggle per stream
- Screen sharing support

---

## Performance Considerations

### Optimizations
1. **Sidebar fixed positioning:** Avoids reflow during scrolling
2. **Min-height: 0:** Allows flex items to shrink below content size
3. **Overflow hidden:** Prevents layout shift from scrollbars
4. **Backdrop filter:** GPU-accelerated blur
5. **Timer interval:** Cleared on unmount to prevent leaks

### Potential Bottlenecks
- Many video streams (4 is max to prevent performance degradation)
- Large comment thread (use pagination for production)
- High-frequency DAW note updates (batched in practice)

---

## Accessibility Features

- **ARIA labels:** Buttons have descriptive labels
  - `aria-label="Collapse"` / `aria-label="Expand"` on toggle
  - `aria-label="Upvote"` / `aria-label="Downvote"` on votes
- **Semantic HTML:** `<header>`, `<aside>`, `<footer>`, `<section>`
- **Color not sole indicator:** Status uses both color + icon (🟢/🔴)
- **Disabled state:** "Post" button disabled when comment empty
- **Focus management:** Tab order preserved across sections

---

## Future Enhancement Ideas

1. **Comment reactions:** Replace vote system with emoji reactions
2. **User presence cursors:** Show cursor positions in DAW
3. **Record session:** Save video/audio to storage
4. **Persistent sessions:** Move from in-memory to database
5. **Advanced DAW:** Velocity editing, quantize, loops
6. **Screen sharing overlays:** Picture-in-picture support
7. **Muted indicators:** Show 🔇 badge on muted users
8. **Typing indicators:** Show "User X is typing..."
9. **Session chat history:** Persist comments to database
10. **Export DAW:** Download MIDI/MP3 of collaborations

---

## CSS Architecture

**File structure:**
- `CollaborativeSessionDetail.css` (489 lines)
  - All styling for the main page
  - Responsive breakpoints at: 1024px, 768px, 480px
  - CSS variables could be extracted for theming

**Key CSS patterns:**
- Flexbox for main layout
- CSS Grid for participants list
- Transitions on hover/active states
- `min-height: 0` for flex containers
- `overflow-y: auto` for scrollable sections
- Backdrop filter for blurred effects

---

## Summary Table

| Aspect | Details |
|--------|---------|
| **Main file** | `frontend/src/pages/CollaborativeSession.tsx` (427 lines) |
| **Styles file** | `frontend/src/pages/CollaborativeSessionDetail.css` (489 lines) |
| **Child components** | VideoStreamManager, CollaborativeDAW |
| **Layout sections** | Header, Body, Sidebar, Footer |
| **Max participants** | 4 video streams (configurable) |
| **Max comments** | No limit (in-memory) |
| **Guest session limit** | 1 hour (enforced server-side) |
| **Active states** | 3 layout modes × 2 sidebar states |
| **Color palette** | Dark gradient with cyan/pink accents |
| **Responsive breakpoints** | 1024px, 768px, 480px |
| **Key features** | Video conferencing, DAW editing, real-time comments, participant tracking |

