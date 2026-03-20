# Multi-DAW VST Testing Guide
## Testing InspireVST Between Ableton Live & Logic Pro

This guide walks you through testing the VST role governance system with two different DAW instances running simultaneously.

---

## Prerequisites

✅ Backend server running on `http://localhost:3001`
✅ VST3 installed: `~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3`
✅ AU installed: `~/Library/Audio/Plug-Ins/Components/InspireVST.component`

---

## Test Scenario: Room Creation & Join

### Step 1: Open Ableton Live (DAW #1 - Master/Creator)

1. Launch **Ableton Live 12+**
2. Create a new blank project or open existing
3. Create an **Audio Track**
4. In the Browser on the left:
   - Look for "InspireVST" under Audio Effects
   - Drag it onto the audio track to load the plugin

### Step 2: Initialize Master Room in Ableton

In the InspireVST plugin window on the Ableton track:

1. **Server URL**: Keep default `http://localhost:3001` (or adjust if running on different machine)
2. **Role Selection**: Should auto-detect as `MASTER` (first instance in room)
3. Click **"Create Room"** button
   - This creates a new VST room with this instance as the Master
   - You should see a Room Code displayed (e.g., `ABC123`)
   - Status should show: `✓ Room created`
4. Note the **Room Code** for sharing with Logic Pro user

### Step 3: Push Initial Track State (Ableton Master)

1. In Ableton, create some MIDI or audio content, or just set up an empty track
2. In InspireVST plugin:
   - Click the **"Sync" or "Collaboration"** tab
   - Click **"Push Track State"** button
   - You should see: `✓ Track state pushed from MASTER`
   - This establishes the master track baseline that relays need before attaching

### Step 4: Open Logic Pro (DAW #2 - Relay/Join)

1. Launch **Logic Pro** (separate instance from Ableton)
2. Create a new project or open existing
3. Create an **Audio Track**
4. Add InspireVST AU plugin:
   - Go to **Track Header** → **Plug-In** → **Audio FX**
   - Find **InspireVST** under Audio Units
   - Select to load the plugin

### Step 5: Join Room as Relay in Logic Pro

In the InspireVST plugin window on the Logic track:

1. **Server URL**: Enter the same URL as Ableton (`http://localhost:3001`)
2. **Role Selection**: Should auto-detect or show `RELAY/CREATE` options
3. **Room Code**: Enter the room code from Step 2 (from Ableton)
4. Click **"Join Room"** button
   - The plugin will:
     ✓ Validate room exists
     ✓ Confirm master has pushed track state
     ✓ Attach as a relay participant
   - Status should show: `✓ Attached to room as RELAY`

### Step 6: Test Track State Synchronization

**From Ableton (Master):**
1. Modify MIDI notes, clips, or track parameters
2. Click **"Push Track State"** 
3. Status: `✓ Track pushed to master_track_id`

**From Logic Pro (Relay):**
1. Click **"Pull Track State"** 
2. You should receive:
   - The MIDI data/clips from Ableton
   - Track metadata (BPM, time signature, etc.)
   - Status: `✓ Track pulled successfully`

---

## Testing the Role Governance Rules

### Rule 1: Single Master Per Room

**Test**: Try to create a second Master in the same room

- From Logic Pro, try to change role to MASTER and join the same room
- **Expected Result**: ❌ Error: `master_already_exists`
- The system prevents two masters from controlling the same room

### Rule 2: Master Track State Prerequisite

**Test**: Try to attach as Relay BEFORE master pushes state

- In Ableton, create a room but DON'T push track state
- In Logic Pro, attempt to join as Relay to that room
- **Expected Result**: ❌ Error: `master_track_missing`
- This ensures relay participants don't attach to incomplete master state

### Rule 3: One Relay Per Track

**Test**: Try to push to the same track from two relays

- Create a second instance of Logic Pro (or another DAW)
- Both join the same room as RELAY
- First relay: Push to track ID X → ✓ Success
- Second relay: Push to same track ID X → ❌ Error: `relay_track_occupied`

---

## Troubleshooting

### Plugin Not Showing in Ableton/Logic
- **Ableton**: Go to Options → Preferences → File Folder → Plugin Sources, enable VST3
- **Logic**: Use Plugin Manager (Preferences → Plugins Manager) and click "Rescan" under Audio Units

### "Server Not Responding" Error
- Verify backend is running: `curl http://localhost:3001/api/health`
- If stuck, restart: `npm run build && node dist/src/index.js` in backend directory

### Room Code Not Appearing
- Check browser console in plugin (if available)
- Check backend logs for error messages
- Verify all instances use same server URL

### Track State Not Syncing
- Confirm Master has pushed at least once before Relay pull
- Check that both instances have activity (MIDI/audio data to sync)
- Verify room code is identical across instances

---

## Useful Terminal Commands

### Check Backend Status
```bash
curl -s http://localhost:3001/api/health | jq .
```

### View All Active Rooms
```bash
curl -s http://localhost:3001/dev/api/vst/rooms | jq .
```

### Stop Backend (if needed for clean restart)
```bash
# Kill all node processes
killall node

# Then rebuild and start
cd /Users/nathanbrown-bennett/TildeSec/Inspire/Inspire/backend
npm run build && node dist/src/index.js
```

---

## Expected Behavior Summary

| Action | Expected Result |
|--------|-----------------|
| Create room as Master in Ableton | ✓ Room created with unique code |
| Push track state from Master | ✓ State stored on server |
| Join same room as Relay in Logic | ✓ Attached after master push confirmed |
| Pull track state from Relay | ✓ Receives master's track data |
| Push to same track from 2 relays | ❌ Second push blocked (relay_track_occupied) |
| Try second Master in same room | ❌ Blocked (master_already_exists) |
| Relay attempts attach before master push | ❌ Blocked (master_track_missing) |

---

## Next Steps After Testing

Once you've validated the above scenarios:

1. Test with different BPM/time signature values
2. Test with actual MIDI clips and arrange them
3. Test network latency by running backend on different machine
4. Add third participant as another Relay
5. Test error recovery (disconnect & reconnect)

---

**Note**: This testing validates the **role governance backend constraints**. Each DAW's plugin frontend may vary in UI responsiveness, but the server-side rules are enforced consistently.
