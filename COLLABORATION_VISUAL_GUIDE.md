# Collaboration Features - Visual Guide

## Guest Session Time Limits

All guest users creating collaboration sessions are limited to **1 hour** of session time. This is enforced server-side and displayed with a real-time countdown timer on the frontend.

### Timer Display

**Active Session (Minutes Remaining)**
```
Session Header: [Collab Session Name]  [59:45 remaining] [Leave]
```
- Orange color indicates active guest session
- Timer updates every 1 second
- Format: MM:SS (minutes and seconds)

**Session Expired**
```
Session Header: [Collab Session Name]  [Session Expired] [Leave]
```
- Red color indicates session has expired
- User must leave and create a new session
- Server returns HTTP 410 (Gone) if session is accessed after expiry

## Architecture Flow

### Session Creation

```
┌─────────────────┐
│   Guest User    │
└────────┬────────┘
         │
         ├─ Clicks "Start Collaboration"
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Frontend: handleCreateCollaborativeSession()    │
│  - Detects: const isGuest = !authUser           │
│  - Sets isGuest: true in API request            │
└────────┬────────────────────────────────────────┘
         │
         ├─ POST /api/sessions/collaborate
         │
         ▼
┌───────────────────────────────────────────────────────┐
│  Backend: POST /api/sessions/collaborate             │
│  - Receives: { title, mode, submode, isGuest: true } │
│  - Calculates: expiresAt = now + 3600000ms (1 hour)  │
│  - Creates: { isGuestSession: true, expiresAt }      │
└────────┬────────────────────────────────────────────────┘
         │
         ├─ Returns: { id, session, remainingMs, remainingMinutes }
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Frontend: CollaborativeSession Component        │
│  - Receives: session with expiresAt              │
│  - useEffect: Updates timer every 1 second       │
│  - Displays: "MM:SS remaining" in header         │
└──────────────────────────────────────────────────┘
```

### Session Access (Expiry Check)

```
┌────────────────────┐
│   Active Session   │
│  59:45 remaining   │
└────────┬───────────┘
         │
    After 60 minutes
         │
         ▼
┌────────────────────┐
│ Session Expired    │
│  0:00 remaining    │
└────────┬───────────┘
         │
    User clicks action
         │
         ▼
┌──────────────────────────────────┐
│  GET /api/sessions/:sessionId    │
└────────┬───────────────────────────┘
         │
         ├─ Backend checks: now > expiresAt?
         │
         ├─ YES → Delete session
         │
         ├─ Return: HTTP 410 (Gone)
         │
         ▼
┌──────────────────────────┐
│  Frontend Error Handler  │
│  Shows: "Session Expired"│
│  Prompts: Go back / Home │
└──────────────────────────┘
```

## API Response Examples

### Create Guest Session

**Request:**
```json
{
  "title": "Collab Session",
  "mode": "producer",
  "submode": "sampler",
  "isGuest": true
}
```

**Response (201 Created):**
```json
{
  "id": "collab-session-1767887687406-imhogme",
  "remainingMs": 3600000,
  "remainingMinutes": 60,
  "session": {
    "id": "collab-session-1767887687406-imhogme",
    "title": "Collab Session",
    "mode": "producer",
    "submode": "sampler",
    "isGuestSession": true,
    "expiresAt": 1767891287406,
    "status": "waiting",
    "participants": [],
    "daw": { /* ... */ }
  }
}
```

### Get Active Session

**Response (200 OK):**
```json
{
  "session": { /* ... */ },
  "remainingMs": 1234567,
  "remainingMinutes": 20
}
```

### Get Expired Session

**Response (410 Gone):**
```json
{
  "error": "Session has expired",
  "code": "SESSION_EXPIRED"
}
```

## Frontend Timer Implementation

The `CollaborativeSession.tsx` component uses a `useEffect` hook to maintain countdown accuracy:

```typescript
interface SessionTimer {
  minutes: number;
  seconds: number;
  expired: boolean;
}

// Updates every 1 second, synced to server's expiresAt timestamp
useEffect(() => {
  const interval = setInterval(() => {
    const now = Date.now();
    const remaining = Math.max(0, session.expiresAt - now);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    setTimer({
      minutes,
      seconds,
      expired: remaining === 0
    });
  }, 1000);
  
  return () => clearInterval(interval);
}, [session.expiresAt]);
```

## Security Considerations

### Why Server-Side Enforcement?

The 1-hour limit is enforced by the server, not the client, because:

1. **Client Cannot Be Trusted**: Users could bypass client-side timers with browser DevTools
2. **Network Issues**: Clients could disconnect without cleanup
3. **Fair Resource Usage**: Server controls actual session lifetime
4. **Billing/Rate Limiting**: Future premium features can extend limits server-side

### Session Cleanup

```typescript
// Every hour, background cleanup job removes expired guest sessions
[cleanup] Starting periodic cleanup job (every hour)
[cleanup] Removed 0 expired pending users
[cleanup] Removed 0 expired guest sessions
```

## Testing

### Manual Testing (Single User)

1. Open `http://localhost:8080`
2. Click "Collaborate" peak → "Start Collaboration"
3. See "60:00 remaining" appear in session header (orange)
4. Wait 30 seconds, see "59:30 remaining" (or close to it)
5. Leave session and create new one
6. Timer resets to 60:00

### Automated Testing (Two Users)

```bash
npx playwright test collaboration-multiuser.spec.ts --headed

# Test verifies:
# ✅ Guest session creation with expiresAt timestamp
# ✅ Timer display showing 60:00 remaining
# ✅ Expired session returns HTTP 410
# ✅ Two-user video feeds visible in grid
```

## Authenticated User Sessions

Authenticated users (logged-in) create sessions with **no time limit**:

```typescript
// In backend POST /api/sessions/collaborate
if (isGuest) {
  expiresAt = now + 3600000; // 1 hour
} else {
  expiresAt = null; // No expiry
}
```

## Related Documents

- [CAMERA_TESTING_GUIDE.md](./CAMERA_TESTING_GUIDE.md) - How to test with actual camera feeds
- [GUEST_RESTRICTIONS_IMPLEMENTATION.md](./GUEST_RESTRICTIONS_IMPLEMENTATION.md) - Complete implementation details
- [COLLABORATION_TESTING_SUMMARY.md](./COLLABORATION_TESTING_SUMMARY.md) - Full test results and session architecture

## Roadmap

- ✅ Guest session time limits (1 hour)
- ✅ Real-time countdown timer display
- ✅ Server-side expiry enforcement
- ✅ Multi-user camera feeds
- ⏳ Socket.io real-time DAW synchronization
- ⏳ Audio mixing across participants
- ⏳ Session recording and export
- ⏳ Premium accounts with unlimited sessions
- ⏳ Session extension by host
- ⏳ Advanced permission controls (read-only viewers vs. editors)
