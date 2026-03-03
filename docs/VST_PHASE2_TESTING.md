# Phase 2 Testing: Smart Polling & WebSocket Infrastructure

## Quick Start (5 minutes)

### Setup
1. **Start backend**:
   ```bash
   cd backend && npm run dev
   ```
   Should see: `WebSocket server listening on /ws/sync`

2. **Build VST with Phase 2**:
   ```bash
   cd build && cmake --build . --target InspireVST_VST3 --config Release
   ```

3. **Open VST in DAW** (2 instances minimum)

### Test Smart Polling (Phase 2 Feature)

**Goal**: Verify VST uses `/recent-pushes` instead of `/instances` when no changes

#### Setup
- Instance A: Open Updates tab (polling starts)
- Instance B: Ready to push
- DevTools: Open Network tab in browser (or Charles/Wireshark)

#### Test Flow
1. **Wait 5 seconds** - observe Instance A's network requests
   - Should see: `GET /recent-pushes?since=...` (~50 bytes response)
   - NOT seeing `/instances` every time is the win

2. **Instance B: Push Track State**
   - Instance B: Click "Push This Track"

3. **Instance A: Detects Change**
   - Network: /recent-pushes returns list of pushes (not empty)
   - UI: instancesDisplay updates with new version
   - Network: /instances is fetched (full refresh triggered)

4. **Wait 5 seconds again**
   - Instance A polls again
   - Since no new pushes: /recent-pushes returns empty []
   - UI doesn't update (correct!)

#### Pass Criteria ✅
- [ ] Polling requests show smaller responses when idle
- [ ] /recent-pushes endpoint is called (watch network tab)
- [ ] On push from another instance, full refresh is triggered
- [ ] After update, idle polling resumes (no constant refreshing)

---

## Network Tab Inspection

### Expected Pattern (Idle Room)
```
Time | Request                          | Size   | Response
-----|----------------------------------|--------|----------
 0s  | GET /recent-pushes?since=1704... | 150 B  | {"pushes":[],"count":0}
 5s  | GET /recent-pushes?since=1704... | 150 B  | {"pushes":[],"count":0}
10s  | GET /recent-pushes?since=1704... | 150 B  | {"pushes":[],"count":0}
```

**Notice**: Small request size, empty response, no /instances calls

### Expected Pattern (After Push)
```
Time | Request                          | Size    | Response
-----|----------------------------------|---------|--------
18s  | GET /recent-pushes?since=1704... | 150 B   | {"pushes":[{...}]}
18s  | GET /instances?roomCode=...      | 200 B   | [instance objects]
18s  | GET /sync-status?room=...        | 150 B   | {status, version}
23s  | GET /recent-pushes?since=1704... | 150 B   | {"pushes":[]}
```

**Notice**: Push detected → 3 requests → back to polling

---

## Backend WebSocket Server Test

### Check Server Started
```bash
# In backend logs (npm run dev output):
[INFO] WebSocket server listening on /ws/sync
```

### Test WebSocket Manually (Optional)
```bash
# Install wscat if you don't have it
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:3001/ws/sync

# Send join message
{"type":"join","pluginInstanceId":"VST-test123","roomCode":"test-room","username":"Tester"}
```

**Expected**: Connection accepted, no errors

---

## Polling Efficiency Measurement

### Before Phase 2 (Baseline)
1. Open DevTools
2. Filter by `/api/rooms/`
3. Wait 1 minute in idle room
4. Note total request bytes

**Expected**: ~12 requests × 350 bytes/request = ~4.2 KB/min

### After Phase 2 (Optimized)
1. Same test with updated code
2. Filter by `/api/rooms/`
3. Wait 1 minute in idle room
4. Note total request bytes

**Expected**: ~12 requests × 50 bytes/request = ~0.6 KB/min

**Improvement**: ~7X smaller in idle rooms

---

## Multi-Instance Test

### Setup (3 instances)
- Instance A: Updates mode (polling)
- Instance B: Updates mode (polling)
- Instance C: Ready to push

### Test Sequence
1. **Baseline** (1 minute idle)
   - Instance A: Network panel shows ~50 byte responses
   - Instance B: Same pattern

2. **Instance C: Push**
   - Instance C: Click Push

3. **Observe ripple** (within 2-3 seconds)
   - Instance A: /recent-pushes detects change
   - Instance A: Fetches /instances
   - Instance A: Shows Instance C at v42
   - Instance B: Same update

4. **Back to polling** (5 seconds later)
   - Both idle instances back to /recent-pushes polling

#### Verify Each Instance Shows
- [ ] Other instances in list
- [ ] Correct version numbers
- [ ] Proper sync status
- [ ] No excessive requests

---

## Error Handling Test

### Scenario 1: Network Glitch
1. Instance A: Open Updates, polling active
2. Stop backend: `Ctrl+C` in backend terminal
3. Instance A should:
   - [ ] Still show instances list (cached)
   - [ ] Sync status shows error or "checking..."
   - [ ] No crash
4. Restart backend: `npm run dev`
5. Instance A should:
   - [ ] Resume polling after ~5-10 seconds
   - [ ] Sync status refreshes

### Scenario 2: Invalid Room Code
1. Instance A: Enter bad room code (e.g., "invalid-room")
2. Click Updates
3. DevTools: Show 404 errors from /recent-pushes
4. Instance A should:
   - [ ] Not crash
   - [ ] Show "Room not found" or similar
   - [ ] Allow retry

---

## WebSocket Infrastructure Readiness Check

### Verify Backend
```bash
# Check server initialized WebSocket
grep -n "setupWebSocketServer" backend/src/index.ts
# Should find the import and call

# Check types defined
grep -n "VSTSyncMessage" backend/src/types.ts
# Should find the interface definitions
```

### Verify VST
```bash
# Check checkForRecentPushes implemented
grep -n "checkForRecentPushes" InspireVST/Source/PluginEditor.*
# Should find declaration and implementation

# Check lastPollTime tracking
grep -n "lastPollTime" InspireVST/Source/PluginEditor.h
# Should find member variable
```

### Infrastructure Ready for Phase 3 ✅
Once Phase 3 adds VST WebSocket client:
- [ ] Backend ready to handle connections
- [ ] Recent pushes tracking working
- [ ] Message broadcast system proven
- [ ] No architecture changes needed

---

## Performance Metrics to Watch

### CPU Usage
- Instance A in Updates mode: Should be <2% CPU (minimal polling impact)
- Compare to Phase 1: Should be same or lower

### Memory Usage
- Recent pushes cache: ~50 pushes × 200 bytes = ~10 KB per room
- WebSocket connections: ~1 MB per 1000 concurrent clients

### Latency
- /recent-pushes response: 10-50ms (minimal server work)
- /instances refresh: 50-100ms (full query, only on change)

---

## Checklist: Phase 2 Complete

### Backend ✅
- [ ] TypeScript compilation clean
- [ ] WebSocket types defined
- [ ] VSTSyncManager initialized
- [ ] recordPush integration in /daw-sync/push
- [ ] /recent-pushes endpoint responds correctly

### VST ✅
- [ ] Builds without errors
- [ ] lastPollTime member added
- [ ] checkForRecentPushes() implemented
- [ ] timerCallback() uses smart polling
- [ ] startInstancePolling() sets initial time

### Testing ✅
- [ ] Polling requests reduced in idle rooms
- [ ] Change detection works correctly
- [ ] Multi-instance sync verified
- [ ] Network panel shows expected pattern

### Ready for Phase 3 ✅
- [ ] WebSocket server infrastructure proven
- [ ] Recent pushes tracking reliable
- [ ] No breaking changes to Phase 1
- [ ] All builds successful

---

## Troubleshooting

### Issue: WebSocket server not starting
**Symptom**: No "WebSocket server listening" in logs, /recent-pushes returns 404

**Fix**:
```typescript
// Check backend/src/index.ts line ~77
const vstSyncManager = setupWebSocketServer(server);

// Verify ws library installed
npm list ws
```

### Issue: Recent pushes showing old data
**Symptom**: /recent-pushes doesn't return new pushes after push

**Fix**:
```typescript
// Verify recordPush called in /daw-sync/push (line ~1348)
vstSyncManager.recordPush(roomCode, instanceId, version);

// Check state.pluginInstanceId is being sent from VST
// Should see pluginInstanceId in request body
```

### Issue: Smart polling not triggering refresh
**Symptom**: After push, Instance A doesn't show changed version

**Fix**:
1. Check DevTools: /recent-pushes should have pushes[] with content
2. Verify refresh methods called:
   ```cpp
   refreshInstancesList();  // Should be called
   refreshSyncStatus();     // Should be called
   ```
3. Check UI update (might be filtering by same instance)

### Issue: Excessive network requests in idle room
**Symptom**: Network panel shows large /instances requests every 5s

**Fix**:
```cpp
// Verify checkForRecentPushes called in timerCallback()
// NOT refreshInstancesList() directly

void InspireVSTAudioProcessorEditor::timerCallback()
{
  if (selectedMode == "updates" && !currentSyncRoomCode.isEmpty()) {
    checkForRecentPushes();  // ← Should be this, not direct refresh
  }
}
```

---

## Next Phase (Phase 3)

Once Phase 2 testing complete, Phase 3 will:
- Add WebSocket client to VST
- Replace polling with real-time updates
- Expected improvement: <100ms update latency vs 5 second polling

Test infrastructure from Phase 2 will continue to support Phase 3.

---

**Phase 2 Testing Ready**: March 2026  
**Expected Test Duration**: 30 minutes  
**Success Rate**: All criteria met
