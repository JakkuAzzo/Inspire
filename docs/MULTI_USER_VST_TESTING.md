# Multi-User VST Testing Guide

## Overview
This guide explains how to test the InspireVST plugin between two users simultaneously - one using Ableton Live and one using Logic Pro on the same machine.

## Setup: Create a Secondary macOS User Account

### Step 1: Create a New macOS User Account

1. Open **System Settings** → **General** → **Users & Groups**
2. Click the lock icon to unlock settings
3. Click the **+** button to add a new user
4. Select **User** as account type
5. Configure:
   - **Full Name**: `Inspire Test User 2` (or similar)
   - **Account name**: `testuser2` (or your preference)
   - **Password**: Set a password
6. Click **Create User**

### Step 2: Enable Automatic Login (Optional)
To make switching easier:
1. System Settings → General → Users & Groups
2. Select the secondary account
3. Check "Allow user to administer this computer" (optional, for plugin installation)
4. Note: Don't enable automatic login if you have sensitive data

## Backend Setup

### Step 1: Start Backend on Main Account

On your main account, start the backend server in development mode:

```bash
cd /Users/nathanbrown-bennett/TildeSec/Inspire/Inspire
npm run dev
```

This starts:
- Backend API on `http://localhost:3001`
- Frontend dev server on `http://localhost:5173`

**Important**: The backend must be running on the main account and accessible from both user accounts via `localhost`.

### Step 2: Install Plugins on Both Accounts

#### On Main Account:
```bash
cd /Users/nathanbrown-bennett/TildeSec/Inspire/Inspire
./inspirevst-build.sh
```

This installs:
- VST3: `~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3`
- AU: `~/Library/Audio/Plug-Ins/Components/InspireVST.component`

#### On Secondary Account:
Switch to the test user account and run:

```bash
cd /Users/nathanbrown-bennett/TildeSec/Inspire/Inspire
./inspirevst-build.sh
```

## Testing Workflow

### Test Scenario: Master (Ableton) → Relay (Logic)

#### On Main Account (Ableton Live):

1. Open Ableton Live 12+
2. Create a **MIDI Track**
3. **Add InspireVST to the track**:
   - Click Audio Effects → Add VST3 → InspireVST
   - Or drag InspireVST from Browser to track
4. In the VST UI:
   - Set **Server**: `http://localhost:3001`
   - Set **Role**: **Master**
   - Click **Create Room**
   - Note the **Room Code** (displayed in the UI)
   - Choose **Submode**: (e.g., "Lyricist - Rapper")
   - Select **Filters**: Timeframe, Tone, Semantic
   - Generate a pack (observe in plugin UI)

#### On Secondary Account (Logic Pro):

1. Switch to the **secondary user account** (Command+Q to logout, then login)
2. Open **Logic Pro**
3. Create an **Audio Track**
4. **Add InspireVST to the track**:
   - Insert Audio FX → Audio Units → InspireVST
   - Click the dropdown if not visible; may need Plugin Manager rescan
5. In the VST UI:
   - Set **Server**: `http://localhost:3001`
   - Set **Role**: **Relay**
   - Enter the **Room Code** from Ableton
   - Click **Join Room**
   - Observe: Should show connection to master, display master's pack

### Expected Behavior

✅ **Relay joins master's room**:
- Shows "Connected to Master" in UI
- Displays master's generated pack data (Lyricist, Producer, or Editor content)

✅ **Track state is shared**:
- Master can push track state (MIDI clips, samples, visuals)
- Relay can pull and import into Logic

✅ **No conflicts**:
- Second master attempt rejected (409 error)
- Multiple relays can join same room
- Each relay tracks independently within the room

## Networking Considerations

### localhost Access Between Accounts

On macOS, `localhost` and `127.0.0.1` are shared across user accounts on the same machine because they resolve to the loopback interface.

**If backend is not reachable**:

1. Check backend is running:
   ```bash
   curl http://localhost:3001/dev/api/health
   ```
   Should return: `{ "status": "ok" }`

2. Configure firewall:
   - System Settings → Security & Privacy → Firewall
   - Add exceptions for Ableton Live and Logic Pro if needed

3. If using custom VM/Docker:
   - Ensure backend listens on `0.0.0.0:3001` (not just `localhost`)
   - Update VST plugin config to use `http://<actual-ip>:3001`

## Test Scenarios

### Scenario 1: Simple Connection Test

**Duration**: 5 min

1. Ableton: Create room as Master
2. Logic: Join room as Relay
3. Verify: Relay shows master's current pack

**Success Criteria**:
- No 409/500 errors
- Relay displays master's content
- Connection status shows "Active"

### Scenario 2: Role Constraints

**Duration**: 10 min

1. Ableton: Create room as Master, note room code
2. Attempt: Open another Ableton instance, join **as Master** with same room code
   - **Expected**: 409 error "master_already_exists"
3. Join as **Relay**: Should succeed
4. Join as **Create**: Should succeed

**Success Criteria**:
- Only one master per room enforced
- Multiple relays/create roles allowed
- Appropriate error messages

### Scenario 3: Track State Sync

**Duration**: 15 min

1. Ableton (Master):
   - Create a MIDI clip with notes
   - Select clips and click **Push Track**
2. Logic (Relay):
   - Click **Pull Track**
   - Verify: MIDI notes appear in Logic's arrangement
3. Logic (Relay):
   - Create a sample clip
   - Click **Push Track**
   - Check Ableton for the update

**Success Criteria**:
- Track state transfers without corruption
- Metadata (BPM, time signature) is preserved
- Timestamps and source attribution visible

### Scenario 4: Multiple Relays & Conflict Detection

**Duration**: 20 min

1. Ableton (Master):
   - Create room, push track state on "Track_A"
2. Logic (Relay 1):
   - Join room
   - Push track state **also on "Track_A"**
3. Open a second Logic instance (same account, different window):
   - Join room as Relay 2
   - Attempt to push track state on **same "Track_A"**
   - **Expected**: 409 error "relay_track_occupied" (first relay owns it)

**Success Criteria**:
- One relay per track enforced
- Conflict detected with trackId + DAW metadata match
- Second relay can push to different track without issue

## Troubleshooting

### Issue: Logic Pro doesn't list InspireVST

**Solution**:
1. Logic Pro → Audio Units Manager (or Preferences → Plug-ins)
2. Search for "InspireVST"
3. Check box to enable
4. Click "Rescan"
5. Restart Logic Pro

### Issue: "Connection refused" or "Cannot reach backend"

**Solution**:
1. Verify backend running on main account: `npm run dev` active
2. Check port 3001 is listening:
   ```bash
   lsof -i :3001
   ```
3. Test from secondary account:
   ```bash
   curl http://localhost:3001/dev/api/health
   ```
4. If using macOS Sequoia/15.3+, check System Setting → Security → Local Network
   - May need to grant permissions to DAWs

### Issue: "master_track_missing" error when relay tries to push

**Solution**:
- Master must push track state first before relay can push
- Master click: **Push Track** on a track with MIDI content
- Then relay can join and push/pull

### Issue: Second user account can't access `/Users/nathanbrown-bennett/TildeSec/Inspire/Inspire`

**Solution**:
1. Grant permissions:
   ```bash
   chmod -R 755 /Users/nathanbrown-bennett/TildeSec/Inspire/Inspire
   ```
2. Or use a shared `/Users/Shared/Inspire` directory (symlink or copy)
3. Or use `sudo` on secondary account (if "Allow user to administer" is checked)

## Performance & Resource Notes

- **Two DAW instances** will use ~1-2GB RAM each
- **Simultaneous audio playback** might cause CPU strain; disable audio on one instance if testing only sync
- **Recommended**: Mac with 16GB+ RAM for smooth testing

## Cleanup

### To Remove Secondary User Account

1. System Settings → General → Users & Groups
2. Select the secondary account
3. Click the **-** (minus) button
4. Choose to keep or delete the account's files

### To Uninstall Plugins from Secondary Account

Log into secondary account and run:
```bash
rm -rf ~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3
rm -rf ~/Library/Audio/Plug-Ins/Components/InspireVST.component
```

## Next Steps

After successful multi-user testing:

1. **Document results**: Screenshot room codes, pack data, sync transfers
2. **Performance benchmarks**: Note latency between push/pull
3. **Edge cases**: Test network interruptions (kill backend, observe timeout behavior)
4. **E2E validation**: Run full test suite to ensure no regressions

See [docs/TESTING_CHECKLIST_UI_FIXES.md](TESTING_CHECKLIST_UI_FIXES.md) for full test matrix.
