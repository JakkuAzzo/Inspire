# Phase 1 Testing Quick Start

## Prerequisites
- Backend running on `localhost:3001`
- VST installed: `~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3`
- DAW with multi-track support (Ableton Live, Logic Pro, etc.)

## Test Scenario: Two-Instance Sync

### Setup (5 minutes)
1. **Start backend**:
   ```bash
   cd backend && npm run dev
   ```

2. **Launch DAW and add 2 VST instances**:
   - Track 1: InspireVST instance A
   - Track 3: InspireVST instance B

3. **Join same room in both**:
   - Instance A: Guest → Create Room → Code: "TEST123"
   - Instance B: Guest → Join Room → Enter: "TEST123"

### Test 1: Instance List Display
**Expected**: Both instances show each other in Updates mode

1. In **Instance A**: Click **Updates** tab
2. Wait 5 seconds (or click push/pull to trigger refresh)
3. **Check**: "Active VST Instances" panel shows:
   ```
   → VST-xxxxxxxx (v0)
     VST-yyyyyyyy (v0)
   ```
   (Arrow → marks current instance)

4. In **Instance B**: Click **Updates** tab
5. **Check**: Same list appears, but arrow next to Instance B's ID

**Pass Criteria**: ✅ Both instances visible in list, arrow correctly identifies self

---

### Test 2: Push/Pull Sync Status
**Expected**: Version numbers update, sync status changes color

1. In **Instance A**:
   - Click **Push Track State**
   - Note version increments to v1
   - Sync status: "Sync: Up to date" (green)

2. In **Instance B** (wait 5s or force refresh):
   - Instances list should show:
     ```
     VST-xxxxxxxx (v1)  ← Instance A
     → VST-yyyyyyyy (v0)
     ```
   - Sync status: "Sync: Behind" (orange)

3. In **Instance B**:
   - Click **Pull Latest**
   - Version should update to v1
   - Sync status: "Sync: Up to date" (green)

**Pass Criteria**: ✅ Version numbers sync, status indicator changes color

---

### Test 3: Auto-Refresh Polling
**Expected**: Updates appear automatically every 5 seconds

1. In **Instance A**: Stay on Updates tab
2. In **Instance B**: Click **Push Track State** (increments to v2)
3. **Watch Instance A**: Within 5 seconds, instances list should update:
   ```
   → VST-xxxxxxxx (v1)
     VST-yyyyyyyy (v2)  ← Now shows v2
   ```
4. Sync status in Instance A: "Sync: Behind" (orange)

**Pass Criteria**: ✅ Changes appear automatically without manual refresh

---

### Test 4: Mode Switching (Polling Control)
**Expected**: Polling stops when leaving Updates mode

1. In **Instance A**: Go to Updates tab (polling should start)
2. Switch to **Writer** tab
3. Switch back to **Updates** tab
4. **Check**: Instances list still updates every 5 seconds

**Pass Criteria**: ✅ Polling resumes after switching modes

---

## Visual Checklist

### Updates Mode Layout
```
┌────────────────────────────────────────────┐
│ [Push] [Pull]     Sync: Up to date 🟢     │ ← Status indicator
├────────────────────────────────────────────┤
│ Active VST Instances                       │ ← Label
│ ┌────────────────────────────────────────┐ │
│ │ → VST-abc123de (v42) Track 1:         │ │ ← Current instance (arrow)
│ │   VST-xyz789ab (v41) Track 3:         │ │ ← Other instance
│ │                                        │ │
│ └────────────────────────────────────────┘ │
├────────────────────────────────────────────┤
│ Room Activity                              │
│ ┌────────────────────────────────────────┐ │
│ │ [03:45] Push from VST-abc123de...     │ │
│ │                                        │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

**Verify**:
- [ ] Sync status visible in top-right
- [ ] Instances list scrollable if many instances
- [ ] Arrow (→) next to current instance
- [ ] Version numbers match after pull
- [ ] Room Activity log still visible below

---

## Troubleshooting

### Instances list shows "Loading..."
**Cause**: Backend not reachable or room not joined  
**Fix**: Check backend logs, verify room code matches

### Sync status stuck on "Checking..."
**Cause**: GET /sync-status request failing  
**Fix**: Check browser DevTools Network tab, verify endpoint exists

### No auto-refresh (list never updates)
**Cause**: Timer not starting or polling stopped  
**Fix**: Switch modes to restart polling

### Backend errors: "Cannot read property 'version'"
**Cause**: DAWTrackState missing `pluginInstanceId`  
**Fix**: Ensure VST pushes new fields (check backend logs for received JSON)

---

## Known Limitations

1. **Track names empty**: DAW track info extraction not yet implemented (shows Track 0: "")
2. **No WebSocket**: Polling has 5-second delay (Phase 2 will add real-time)
3. **Version mismatch handling**: No conflict resolution if two instances push simultaneously

---

## Success Metrics

Phase 1 testing is **complete** when:
- ✅ Multiple instances see each other in Updates mode
- ✅ Version numbers sync correctly after push/pull
- ✅ Sync status indicator changes color based on state
- ✅ Auto-refresh works (5-second polling)
- ✅ No crashes or memory leaks after 30+ minutes

**Next**: Phase 2 (WebSocket real-time sync) — see [VST_INSTANCE_BROADCASTING_PLAN.md](./VST_INSTANCE_BROADCASTING_PLAN.md)
