# Collaborative Mode Architecture

## Overview

Inspire now features a comprehensive **Collaborative Mode** that enables real-time multi-user music production sessions. Up to 4 collaborators can work together with an unlimited number of spectators.

### Key Features

- **Live Video Streams**: Up to 4 concurrent video/audio streams with dynamic layout switching
- **Shared DAW (Digital Audio Workstation)**: Piano roll interface with real-time note synchronization
- **Audio Sync**: Ensures all participants stay synchronized despite network latency
- **Comments & Voting**: Live feedback from spectators with upvote/downvote system
- **Host Controls**: Session host controls playback, tempo, and can manage participants

## System Architecture

### Three-Tier Real-Time System

```
┌─────────────────────────────────────────────────────────────┐
│                   Spectators (Unlimited)                      │
│              (Can comment and vote, read-only)               │
└─────────────┬───────────────────────────────────┬─────────────┘
              │                                   │
         Socket.io                          Socket.io
      (Comments/Votes)                    (Comments/Votes)
              │                                   │
┌─────────────┴───────────────────────────────────┴─────────────┐
│                     WebSocket Server (socket.io)              │
│                   ├─ Collaborative Session                   │
│                   ├─ DAW State Sync                          │
│                   ├─ Audio Playhead Sync                     │
│                   ├─ Video Stream Signaling                  │
│                   └─ Comment Broadcasting                    │
└─────────────┬───────────────────────────────────┬─────────────┘
              │                                   │
         Collaborator                      Collaborator
         (Host or Peer)                    (Host or Peer)
         
         WebRTC                            WebRTC
         (P2P Video/Audio)                (P2P Video/Audio)
         
         Socket.io                        Socket.io
         (DAW Sync)                       (DAW Sync)
```

### Data Flow

1. **Collaborative Session Creation**: Host initiates session via REST API
2. **Participant Join**: Socket.io connects and joins session room
3. **WebRTC Negotiation**: Peers exchange SDP offers/answers (can be proxied via server)
4. **DAW Synchronization**: Notes, tempo, and playback position broadcast via socket.io
5. **Audio Sync**: Playback positions synced every 500ms with latency compensation
6. **Comments**: Spectators and participants can comment; all receive updates

## Component Architecture

### Frontend Components

#### `VideoStreamManager.tsx`
Manages video/audio streams for up to 4 collaborators.

```tsx
<VideoStreamManager
  sessionId="collab-123"
  localUserId="user-456"
  localUsername="Alice"
  participants={[...]} // CollaborativeSessionParticipant[]
  viewers={[...]}      // Spectators
  maxStreams={4}
  onStreamJoin={(userId, stream) => {...}}
  onStreamLeave={(userId) => {...}}
  onControlChange={(userId, control, enabled) => {...}}
/>
```

**Features**:
- Auto-requests camera/microphone permissions
- Displays up to 4 video tiles in adaptive grid
- Per-stream audio/video toggle
- Shows participant names and "You" badge for local stream
- Displays spectator count

**Grid Layouts**:
- 1 stream: Full screen
- 2 streams: Side-by-side
- 3 streams: 2-up + 1 centered bottom
- 4 streams: 2x2 grid

#### `CollaborativeDAW.tsx`
Shared Digital Audio Workstation with piano roll interface.

```tsx
<CollaborativeDAW
  sessionId="collab-123"
  dawSession={{...}}           // Current DAW state
  audioSyncState={{...}}       // Sync metadata
  isHost={true}
  onNoteAdd={(note) => {...}}
  onNoteRemove={(noteId) => {...}}
  onTempoChange={(tempo) => {...}}
  onPlaybackStateChange={(isPlaying) => {...}}
/>
```

**Features**:
- MIDI note grid (C2 to B6, 4+ octaves)
- Click to add notes, double-click to delete
- Ctrl+click for multi-select
- Playback controls (play/pause) for host only
- BPM adjustment (host only)
- Snap-to-grid with configurable grid size (1/16, 1/8, 1/4, 1/2, whole note)
- Real-time playhead animation
- Latency indicator with sync correction feedback

**Data Model**:
```typescript
interface DAWNote {
  id: string;
  pitch: number;       // 0-127 MIDI note number
  startTime: number;   // in beats
  duration: number;    // in beats
  velocity: number;    // 0-127
  track: number;       // instrument/track index
}

interface DAWSession {
  id: string;
  bpm: number;
  timeSignature: string; // "4/4", "3/4", etc.
  key: string;         // "C", "F#", etc.
  scale: string;       // "major", "minor", etc.
  notes: DAWNote[];
  tempo: number;
  currentBeat: number;
  isPlaying: boolean;
  lastUpdatedBy: string;
  lastUpdatedAt: number;
}
```

#### `CollaborativeSessionDetail.tsx`
Main page composing all UI elements.

```tsx
<CollaborativeSessionDetail
  session={{...}}
  localUserId="user-456"
  localUsername="Alice"
  userRole="collaborator" // or "host", "viewer"
  onSessionUpdate={(updatedSession) => {...}}
  onLeaveSession={() => {...}}
/>
```

**Layout Options**:
- **Video**: Full screen video streams
- **DAW**: Full screen DAW editor
- **Split**: Side-by-side (video left, DAW right)

**Sidebar Features**:
- Comment input (all participants and viewers)
- Comment thread with timestamps
- Upvote/downvote buttons per comment
- Vote counts update in real-time
- Expandable/collapsible

**Footer**:
- Collaborators list with online status
- Spectators list
- Host indicator badge

### Frontend Services

#### `audioSyncService.ts`
Handles playback synchronization across network delays.

```typescript
class AudioSyncService {
  // Measure round-trip latency
  async measureLatency(): Promise<number>
  
  // Sync with server state (call on every sync message)
  syncWithServer(serverState: AudioSyncState): SyncMetrics
  
  // Get interpolated playback position between syncs
  getLocalPlaybackPosition(
    lastServerPosition: number,
    lastServerBeat: number,
    tempo: number,
    isPlaying: boolean
  ): number
  
  // Register callback for sync events
  onSync(callback: (state, metrics) => void): unsubscribe
  
  // Get debug info
  getDebugInfo(): {...}
}
```

**Sync Algorithm**:
1. **Latency Measurement**: Ping `/api/health` to measure round-trip time (~20ms typical)
2. **Drift Detection**: Compare expected position (local advance) with server position
3. **Threshold**: If drift > 0.25 beats, apply correction
4. **Correction**: Jump playhead to server position (with latency compensation)
5. **Interpolation**: Between syncs, advance playhead locally based on tempo

**Metrics Returned**:
```typescript
interface SyncMetrics {
  latencyMs: number;        // measured network latency
  driftBeats: number;       // how far off we were
  correctionApplied: boolean;
  lastSyncTime: number;     // timestamp of last sync
}
```

## Backend Architecture

### Socket.io Events

#### Video Stream Events

```
collab:stream:init
  └─ Request to initialize a stream
  
collab:stream:ready
  └─ Stream is ready (peers can connect)
  
collab:stream:update
  └─ Update stream metadata (e.g., SDP offer/answer for WebRTC)
  
collab:stream:control
  └─ Toggle audio/video mute for a stream
  
collab:stream:control-changed
  └─ Broadcast control change to all participants
```

#### DAW Synchronization Events

```
collab:daw:sync
  └─ Broadcast DAW state to all participants
  
collab:daw:note-add
  └─ New note added to DAW
  
collab:daw:note-remove
  └─ Note deleted from DAW
  
collab:daw:playback
  └─ Playback state changed (play/pause/position)
  
collab:daw:tempo
  └─ Tempo/BPM changed
```

#### Audio Sync Events

```
collab:audio:sync-request
  └─ Client requests current server time
  
collab:audio:sync-response
  └─ Server sends timestamp + measured latency
```

#### Comment/Voting Events

```
collab:comment:add
  └─ New comment posted
  
collab:comment:delete
  └─ Comment deleted
  
collab:vote
  └─ Upvote/downvote on comment
  
collab:vote:registered
  └─ Vote broadcast to all participants
```

### REST API Endpoints

#### Session Management

```
POST /api/sessions/collaborate
  Creates a new collaborative session
  Body: {
    title: string;
    description?: string;
    mode: 'lyricist' | 'producer' | 'editor';
    submode: string;
    maxParticipants?: number; // default 4
    maxStreams?: number;      // default 4
  }
  Response: { id, session }

GET /api/sessions/:sessionId
  Retrieve session details
  Response: { session }

PUT /api/sessions/:sessionId
  Update session (DAW state, comments, status)
  Body: { daw?, comments?, audioSyncState?, status? }
  Response: { session }

GET /api/sessions
  List all active sessions
  Response: { sessions, count }
```

#### Comments & Voting

```
GET /api/sessions/:sessionId/comments
  Get all comments for a session
  Response: { comments: CommentThread[] }

POST /api/sessions/:sessionId/votes
  Record a vote on a comment or session
  Body: {
    targetId: string;
    targetType: 'comment' | 'session';
    voteType: 'upvote' | 'downvote';
    userId: string;
  }
  Response: { voteId, ... }
```

### Session State Management

**In-Memory Store** (current): `Map<sessionId, CollaborativeSession>`

**Production DB Schema** (planned):
```sql
CREATE TABLE collaborative_sessions (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255),
  description TEXT,
  mode VARCHAR(50),
  submode VARCHAR(50),
  host_id VARCHAR(255),
  host_username VARCHAR(255),
  created_at BIGINT,
  started_at BIGINT,
  ended_at BIGINT,
  status VARCHAR(50),
  max_participants INT,
  max_streams INT,
  is_persisted BOOLEAN,
  recording_url TEXT
);

CREATE TABLE session_participants (
  id VARCHAR(255) PRIMARY KEY,
  session_id VARCHAR(255),
  user_id VARCHAR(255),
  username VARCHAR(255),
  role VARCHAR(50),
  joined_at BIGINT,
  is_active BOOLEAN,
  audio_enabled BOOLEAN,
  video_enabled BOOLEAN
);

CREATE TABLE session_comments (
  id VARCHAR(255) PRIMARY KEY,
  session_id VARCHAR(255),
  user_id VARCHAR(255),
  username VARCHAR(255),
  content TEXT,
  created_at BIGINT,
  updated_at BIGINT,
  is_edited BOOLEAN,
  vote_count INT
);

CREATE TABLE session_votes (
  id VARCHAR(255) PRIMARY KEY,
  session_id VARCHAR(255),
  user_id VARCHAR(255),
  target_type VARCHAR(50),
  target_id VARCHAR(255),
  vote_type VARCHAR(50),
  created_at BIGINT
);
```

## Integration with Existing Code

### Updating `App.tsx`

To integrate collaborative mode into the main app:

```tsx
// Add state
const [activeCollaborativeSession, setActiveCollaborativeSession] = useState<CollaborativeSession | null>(null);
const [collaborativeRole, setCollaborativeRole] = useState<'host' | 'collaborator' | 'viewer'>('viewer');

// When user joins/creates session
const handleCreateSession = async (title: string, mode: CreativeMode, submode: string) => {
  const res = await fetch('/api/sessions/collaborate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, mode, submode })
  });
  const { session } = await res.json();
  setActiveCollaborativeSession(session);
  setCollaborativeRole('host');
  // Navigate to session page
};

// When user joins an existing session
const handleJoinSession = (session: CollaborativeSession) => {
  setActiveCollaborativeSession(session);
  setCollaborativeRole('collaborator');
};

// When user spectates
const handleSpectateSession = (session: CollaborativeSession) => {
  setActiveCollaborativeSession(session);
  setCollaborativeRole('viewer');
};

// Render collaborative session if active
{activeCollaborativeSession && (
  <CollaborativeSessionDetail
    session={activeCollaborativeSession}
    localUserId={authUser?.id || 'guest'}
    localUsername={authUser?.username || 'Anonymous'}
    userRole={collaborativeRole}
    onSessionUpdate={(updated) => setActiveCollaborativeSession(updated)}
    onLeaveSession={() => {
      setActiveCollaborativeSession(null);
      // Navigate back to main
    }}
  />
)}
```

### WebRTC Integration (Future)

For peer-to-peer video/audio, integrate a WebRTC library:

```tsx
// Example with simple-peer library
import SimplePeer from 'simple-peer';

// In VideoStreamManager, add per-participant peer connection:
const peer = new SimplePeer({
  initiator: true,
  stream: localStream,
  streams: [localStream],
  config: {
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302'] },
      { urls: ['stun:stun1.l.google.com:19302'] }
    ]
  }
});

peer.on('signal', data => {
  // Send SDP offer/answer via socket.io
  socket.emit('collab:stream:update', {
    sessionId,
    streamId,
    data // SDP offer/answer
  });
});

peer.on('stream', (stream) => {
  // Attach remote stream to video element
  videoRef.current.srcObject = stream;
});
```

## Audio Sync Protocol

### Playback Synchronization Strategy

**Goal**: All participants hear the same position despite network delays.

**Approach**: Server is the "master clock". Clients sync locally and correct drift.

### Sync Interval

- **Frequency**: Every 500ms (or on demand)
- **Latency**: Typical 20-50ms round-trip

### Algorithm

```
Client Timeline:
  T0 = local clock
  Send: "What's the current beat?"
  
Server Timeline:
  Receives at T0 + latency
  Sends back: "We're at beat 23.5, my time is T_server"
  
Client (T1 = now):
  Receives response
  RTT = T1 - T0
  One-way latency ≈ RTT / 2
  
  Server time = T_server + (T1 - (T0 + RTT/2))
  Expected position = 23.5 + (elapsed since server response * tempo / 60)
  
  If |expected - actual| > 0.25 beats:
    Correct: jump to expected position
```

### Latency Compensation

When playing, clients extrapolate playhead between syncs:

```typescript
// At sync time S
expectedBeats = serverBeat + (elapsed_since_sync_ms / 1000) * (tempo / 60)

// If no correction needed
localPlayhead = expectedBeats

// If correction needed
localPlayhead = jump_to_expectedBeats  // Instantaneous jump
```

## Spectator Features

### Comment System

- Spectators can post comments anytime
- Comments include timestamps and vote counts
- Real-time updates to all participants

### Voting

- Upvote comments to show appreciation
- Vote counts update instantly
- Track vote history per user to prevent duplicate votes

### Watch-Only Mode

- No audio/video capture
- No DAW editing capability
- Can comment and vote

## Performance Considerations

### Network Bandwidth

**Estimated Usage per Session**:
- Video streams: ~500 Kbps per participant (480p, 30fps)
- Audio streams: ~32-128 Kbps per participant
- DAW sync: ~1-5 Kbps (note updates, tempo changes)
- Comments: ~1 Kbps

**Total for 4 participants + 100 spectators**:
- Bandwidth: ~3-4 Mbps upstream (host/collaborators)
- Bandwidth: ~50-100 Kbps downstream (spectators, just comments)

### Scalability

- **Max streams**: 4 (hard limit, can increase with optimization)
- **Max spectators**: Unlimited (socket.io broadcasts)
- **Session duration**: Unlimited (design for >4-hour sessions)

## Troubleshooting

### Playback Out of Sync

1. Check latency indicator in DAW (should be <100ms)
2. If consistently >200ms, suggest participants optimize network
3. Try syncing more frequently (adjust `syncIntervalMs` in `audioSyncService`)

### Audio Crackling

1. Check microphone input levels
2. Check browser audio permissions
3. Try lowering audio bitrate or sample rate

### Video Not Displaying

1. Verify camera permission granted
2. Check browser console for WebRTC errors
3. Try refreshing the page (ICE candidates may need renegotiation)

### Comments Not Posting

1. Check socket.io connection status
2. Verify user is still in the session room
3. Check server logs for errors

## Future Enhancements

- [ ] Recording and playback of sessions
- [ ] Persistent session storage (database)
- [ ] Participant permissions (mute/remove)
- [ ] MIDI export of DAW state
- [ ] Chat (beyond comments)
- [ ] Screen sharing
- [ ] Virtual instruments/synths
- [ ] Audio processing effects (reverb, delay, etc.)
- [ ] Undo/redo for DAW edits
- [ ] Session history and analytics

## References

- WebRTC: https://webrtc.org/
- Socket.io: https://socket.io/
- Accessible Piano Roll: https://github.com/[repo-path]
- Flow Prompts: See `FlowPrompts.tsx`
