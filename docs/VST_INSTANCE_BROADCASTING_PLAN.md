# VST Instance Broadcasting & Sync Implementation Plan

## Overview
Enable each VST instance to broadcast its ID and track location, show all instances in the Updates page, display recent pushes, and sync changes between users in collaborative rooms.

**Status**: Phase 2 Complete ✅ | See [VST_PHASE2_COMPLETE.md](./VST_PHASE2_COMPLETE.md) for details

---

## Current State Analysis

### ✅ Already Implemented
1. **Unique Instance IDs**: Each VST has `pluginInstanceID` (generated on load)
2. **Basic Push/Pull**: Track state push/pull with version tracking
3. **Updates Log**: Shows `[timestamp] instance — beat:X — message` format
4. **Beat/BPM Tracking**: Uses host transport info for beat position
5. **Phase 1 Complete** (Jan 2025):
   - ✅ Instance list display in Updates mode
   - ✅ Sync status indicators (ahead/behind/up-to-date)
   - ✅ Auto-refresh polling (5 seconds)
   - ✅ Backend endpoints: `/instances`, `/sync-status`
   - ✅ Type system updates with `pluginInstanceId`, `dawTrackIndex`, `dawTrackName`
6. **Phase 2 Complete** (Mar 2026):
   - ✅ WebSocket server infrastructure (`VSTSyncManager`)
   - ✅ Smart polling with `/recent-pushes` endpoint
   - ✅ Network efficiency: ~86% reduction in idle rooms
   - ✅ Message broadcast system ready for real-time sync
   - ✅ Recent pushes tracking (up to 50 per room)
   - ✅ VST smart polling that only refreshes on changes

### ⏳ Partially Complete
1. DAW track index/name capture (TODO: host-specific APIs needed)

### ❌ Missing Features (Phases 3-4)
1. VST WebSocket client implementation (Phase 3)
2. Focus mode animations for pack cards (Phase 3B)
3. Advanced collaboration features (Phase 4)

---

## Feature 1: Track Location Broadcast

### Backend Changes

#### 1.1 Update `DAWTrackState` Type (backend/src/types.ts)
```typescript
export interface DAWTrackState {
  roomCode: string;
  trackId: string;
  trackIndex: number;
  trackName: string;
  pluginInstanceId: string;      // NEW: VST instance ID
  dawTrackIndex?: number;         // NEW: DAW track number (1, 2, 3...)
  dawTrackName?: string;          // NEW: Host-provided track name
  updatedAt: number;
  updatedBy: string;
  bpm: number;
  timeSignature: string;
  currentBeat: number;
  currentBar: number;
  isPlaying: boolean;
  isLooping: boolean;
  loopStart?: number;
  loopEnd?: number;
}
```

#### 1.2 Backend API Endpoint: List Active Instances
**New Route**: `GET /api/rooms/:roomCode/instances`

```typescript
// backend/src/index.ts
app.get('/api/rooms/:roomCode/instances', (req, res) => {
  const { roomCode } = req.params;
  const room = collaborativeRooms.get(roomCode);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Collect all unique plugin instances from track states in room
  const instances = new Map<string, {
    pluginInstanceId: string;
    dawTrackIndex?: number;
    dawTrackName?: string;
    lastPushAt: number;
    lastPushBy: string;
    version: number;
    trackId: string;
  }>();

  // Iterate through all tracks in room to find instances
  for (const [trackId, trackState] of Object.entries(room.tracks || {})) {
    if (trackState.pluginInstanceId) {
      instances.set(trackState.pluginInstanceId, {
        pluginInstanceId: trackState.pluginInstanceId,
        dawTrackIndex: trackState.dawTrackIndex,
        dawTrackName: trackState.dawTrackName,
        lastPushAt: trackState.updatedAt,
        lastPushBy: trackState.updatedBy,
        version: trackState.version || 0,
        trackId
      });
    }
  }

  res.json({
    roomCode,
    instances: Array.from(instances.values()),
    count: instances.size
  });
});
```

#### 1.3 Backend: Track Version Comparison
**New Route**: `GET /api/rooms/:roomCode/sync-status`

```typescript
app.get('/api/rooms/:roomCode/sync-status', (req, res) => {
  const { roomCode } = req.params;
  const { pluginInstanceId } = req.query;
  
  const room = collaborativeRooms.get(roomCode);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Find this instance's track
  const myTrack = Object.values(room.tracks || {})
    .find(t => t.pluginInstanceId === pluginInstanceId);

  // Find latest version across all tracks
  const allVersions = Object.values(room.tracks || {})
    .map(t => ({ 
      version: t.version || 0, 
      instanceId: t.pluginInstanceId,
      updatedAt: t.updatedAt 
    }))
    .sort((a, b) => b.version - a.version);

  const latestVersion = allVersions[0]?.version || 0;
  const myVersion = myTrack?.version || 0;

  res.json({
    pluginInstanceId,
    myVersion,
    latestVersion,
    status: myVersion < latestVersion ? 'behind' : 
            myVersion > latestVersion ? 'ahead' : 'up-to-date',
    behindBy: Math.max(0, latestVersion - myVersion),
    recentPushes: allVersions.slice(0, 10)
  });
});
```

### VST Changes

#### 1.4 Extract DAW Track Info (PluginProcessor.cpp)
```cpp
// InspireVST/Source/PluginProcessor.h
struct HostTrackInfo {
  int trackIndex = -1;        // Track number in DAW
  juce::String trackName;     // Track name from host
};

HostTrackInfo getHostTrackInfo() const;

// InspireVST/Source/PluginProcessor.cpp
HostTrackInfo InspireVSTAudioProcessor::getHostTrackInfo() const {
  HostTrackInfo info;
  
  // Try to get track info from host
  if (auto* playHead = getPlayHead()) {
    juce::AudioPlayHead::CurrentPositionInfo position;
    if (playHead->getCurrentPosition(position)) {
      // Some hosts provide track index
      // This is host-dependent and may require VST3 extensions
      
      #if JUCE_VST3
      // VST3-specific track info extraction
      // This needs VST3-specific API calls
      #endif
      
      #if JUCE_AU
      // Audio Unit track info
      #endif
    }
  }
  
  // Fallback: parse processor name which often includes track info
  juce::String procName = getName();
  // Many DAWs name like "Track 1 - InspireVST" or "Vocals - InspireVST"
  
  return info;
}
```

#### 1.5 Broadcast Instance on Track Push (PluginEditor.cpp)
```cpp
// In pushTrack() method, add track location info:

void InspireVSTAudioProcessorEditor::pushTrack() {
  // ... existing code ...
  
  runAsync([this, serverUrl] {
    DAWTrackState state;
    state.roomCode = currentSyncRoomCode;
    state.trackId = "vst-main-track";
    state.pluginInstanceId = pluginInstanceID;  // Already exists
    
    // NEW: Add DAW track info
    auto hostTrackInfo = processor.getHostTrackInfo();
    state.dawTrackIndex = hostTrackInfo.trackIndex;
    state.dawTrackName = hostTrackInfo.trackName.toStdString();
    
    // ... rest of existing code ...
  });
}
```

#### 1.6 VST Updates Page: Show All Instances
```cpp
// Add to PluginEditor.h
juce::Array<juce::var> activeInstances;     // List of VST instances in room
juce::Label instancesListLabel;             // Header for instances section
juce::TextEditor instancesDisplay;          // Show all instances

// Add to constructor
instancesListLabel.setText("Active VST Instances", juce::dontSendNotification);
instancesDisplay.setMultiLine(true);
instancesDisplay.setReadOnly(true);
addChildComponent(instancesListLabel);
addChildComponent(instancesDisplay);

// New method: Fetch and display instances
void InspireVSTAudioProcessorEditor::refreshInstancesList() {
  if (currentSyncRoomCode.isEmpty()) return;
  
  const auto serverUrl = serverUrlInput.getText();
  
  runAsync([this, serverUrl] {
    // Call GET /api/rooms/{roomCode}/instances
    juce::String endpoint = serverUrl + "/api/rooms/" + 
                           currentSyncRoomCode + "/instances";
    
    juce::URL url(endpoint);
    auto stream = url.createInputStream(juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inAddress));
    
    if (stream) {
      juce::String response = stream->readEntireStreamAsString();
      auto parsed = juce::JSON::parse(response);
      
      juce::MessageManager::callAsync([this, parsed] {
        if (parsed.isObject()) {
          auto* obj = parsed.getDynamicObject();
          auto instancesArray = obj->getProperty("instances");
          
          if (instancesArray.isArray()) {
            activeInstances.clear();
            
            juce::String displayText;
            for (const auto& inst : *instancesArray.getArray()) {
              activeInstances.add(inst);
              
              auto* instObj = inst.getDynamicObject();
              juce::String id = instObj->getProperty("pluginInstanceId").toString();
              juce::String trackName = instObj->getProperty("dawTrackName").toString();
              int trackIndex = instObj->getProperty("dawTrackIndex");
              int version = instObj->getProperty("version");
              
              // Highlight this instance
              juce::String marker = (id == pluginInstanceID) ? "→ " : "  ";
              
              displayText += marker + id.substring(0, 8) + " | ";
              displayText += "Track " + juce::String(trackIndex) + " ";
              if (trackName.isNotEmpty())
                displayText += "(" + trackName + ") ";
              displayText += "| v" + juce::String(version) + "\n";
            }
            
            instancesDisplay.setText(displayText, false);
          }
        }
      });
    }
  });
}

// Call this when entering Updates mode and periodically
void InspireVSTAudioProcessorEditor::selectUpdates() {
  // ... existing code ...
  
  refreshInstancesList();
  
  // Refresh every 5 seconds
  startTimer(5000);
}

void InspireVSTAudioProcessorEditor::timerCallback() {
  if (selectedMode == "updates" && !currentSyncRoomCode.isEmpty()) {
    refreshInstancesList();
    refreshSyncStatus();
  }
}
```

#### 1.7 Show Ahead/Behind Status
```cpp
// Add to PluginEditor.h
juce::Label syncStatusIndicator;
int myVersionNumber = 0;
int latestVersionNumber = 0;

// New method: Check sync status
void InspireVSTAudioProcessorEditor::refreshSyncStatus() {
  const auto serverUrl = serverUrlInput.getText();
  
  runAsync([this, serverUrl] {
    juce::String endpoint = serverUrl + "/api/rooms/" + 
                           currentSyncRoomCode + "/sync-status?pluginInstanceId=" + 
                           pluginInstanceID;
    
    juce::URL url(endpoint);
    auto stream = url.createInputStream(juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inAddress));
    
    if (stream) {
      juce::String response = stream->readEntireStreamAsString();
      auto parsed = juce::JSON::parse(response);
      
      juce::MessageManager::callAsync([this, parsed] {
        if (parsed.isObject()) {
          auto* obj = parsed.getDynamicObject();
          juce::String status = obj->getProperty("status").toString();
          myVersionNumber = obj->getProperty("myVersion");
          latestVersionNumber = obj->getProperty("latestVersion");
          int behindBy = obj->getProperty("behindBy");
          
          juce::String statusText;
          juce::Colour statusColor;
          
          if (status == "up-to-date") {
            statusText = "✓ Up to date";
            statusColor = juce::Colours::green;
          } else if (status == "behind") {
            statusText = "↓ Behind by " + juce::String(behindBy) + " version(s)";
            statusColor = juce::Colours::orange;
          } else if (status == "ahead") {
            statusText = "↑ Ahead (push to share)";
            statusColor = juce::Colours::cyan;
          }
          
          syncStatusIndicator.setText(statusText, juce::dontSendNotification);
          syncStatusIndicator.setColour(juce::Label::textColourId, statusColor);
        }
      });
    }
  });
}
```

---

## Feature 2: Focus Mode Animations for Pack Cards

### VST Implementation

#### 2.1 Add FallingWordComponent (New File)
```cpp
// InspireVST/Source/FallingWordComponent.h

class FallingWordItem : public juce::Component {
public:
  FallingWordItem(const juce::String& text) : word(text) {
    startTime = juce::Time::getMillisecondCounter();
    
    // Random horizontal position
    juce::Random rand;
    xRatio = rand.nextFloat();
    
    // Random fall duration 3-6 seconds
    fallDuration = 3000.0 + rand.nextFloat() * 3000.0;
  }
  
  void paint(juce::Graphics& g) override {
    auto now = juce::Time::getMillisecondCounter();
    double elapsed = now - startTime;
    double progress = juce::jlimit(0.0, 1.0, elapsed / fallDuration);
    
    // Fade in/out
    float alpha = 1.0f;
    if (progress < 0.1) alpha = progress / 0.1f;
    else if (progress > 0.9) alpha = (1.0 - progress) / 0.1f;
    
    g.setColour(juce::Colours::white.withAlpha(alpha));
    g.setFont(18.0f + progress * 6.0f);  // Grow as it falls
    g.drawText(word, getLocalBounds(), juce::Justification::centred);
  }
  
  bool isFinished() const {
    auto now = juce::Time::getMillisecondCounter();
    return (now - startTime) >= fallDuration;
  }
  
  void updatePosition(int containerHeight) {
    auto now = juce::Time::getMillisecondCounter();
    double elapsed = now - startTime;
    double progress = elapsed / fallDuration;
    
    // Y position based on progress
    int y = static_cast<int>(progress * containerHeight);
    setTopLeftPosition(static_cast<int>(xRatio * (getParentWidth() - 100)), y);
  }

private:
  juce::String word;
  uint32_t startTime;
  float xRatio;
  double fallDuration;
};

class FallingWordStream : public juce::Component, private juce::Timer {
public:
  FallingWordStream() {
    startTimerHz(30);  // 30 FPS animation
  }
  
  void setWords(const juce::StringArray& words) {
    wordPool = words;
  }
  
  void setActive(bool shouldBeActive) {
    active = shouldBeActive;
    if (!active) {
      children.clear();
    }
  }
  
  void paint(juce::Graphics& g) override {
    // Background blur/tint
    g.fillAll(juce::Colours::black.withAlpha(0.7f));
  }
  
private:
  void timerCallback() override {
    if (!active || wordPool.isEmpty()) return;
    
    // Spawn new word every ~2 seconds
    if (juce::Time::getMillisecondCounter() - lastSpawnTime > 2000) {
      juce::Random rand;
      auto word = wordPool[rand.nextInt(wordPool.size())];
      
      auto* item = new FallingWordItem(word);
      addAndMakeVisible(item);
      children.add(item);
      
      lastSpawnTime = juce::Time::getMillisecondCounter();
    }
    
    // Update positions and remove finished
    for (int i = children.size() - 1; i >= 0; --i) {
      auto* item = children[i];
      item->updatePosition(getHeight());
      
      if (item->isFinished()) {
        removeChildComponent(item);
        children.remove(i);
      }
    }
    
    repaint();
  }
  
  juce::StringArray wordPool;
  juce::OwnedArray<FallingWordItem> children;
  bool active = false;
  uint32_t lastSpawnTime = 0;
};
```

#### 2.2 Integrate Focus Mode into Pack Detail View
```cpp
// InspireVST/Source/PluginEditor.h

std::unique_ptr<FallingWordStream> focusModeStream;
juce::TextButton toggleFocusModeButton{"Focus Mode"};
bool focusModeActive = false;

// InspireVST/Source/PluginEditor.cpp

// In constructor
focusModeStream = std::make_unique<FallingWordStream>();
addChildComponent(*focusModeStream);

toggleFocusModeButton.onClick = [this] {
  focusModeActive = !focusModeActive;
  focusModeStream->setActive(focusModeActive);
  
  if (focusModeActive) {
    // Extract words from current pack
    juce::StringArray words;
    if (currentDisplayedPack.isObject()) {
      auto* obj = currentDisplayedPack.getDynamicObject();
      auto powerWords = obj->getProperty("powerWords");
      if (powerWords.isArray()) {
        for (const auto& w : *powerWords.getArray()) {
          words.add(w.toString());
        }
      }
    }
    focusModeStream->setWords(words);
    focusModeStream->setVisible(true);
    focusModeStream->toFront(false);
  } else {
    focusModeStream->setVisible(false);
  }
};

// In resized()
if (focusModeStream->isVisible()) {
  focusModeStream->setBounds(getLocalBounds());
}
```

---

## Feature 3: Real-Time Sync Between Users

### Backend Changes

#### 3.1 WebSocket Support for Real-Time Updates
```typescript
// backend/src/websocket.ts (NEW FILE)

import { WebSocket, WebSocketServer } from 'ws';

interface WSClient {
  ws: WebSocket;
  roomCode: string;
  pluginInstanceId: string;
  username: string;
}

export function setupWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server });
  const clients = new Map<string, WSClient>();

  wss.on('connection', (ws: WebSocket) => {
    let clientId: string;

    ws.on('message', (data: string) => {
      try {
        const msg = JSON.parse(data.toString());

        switch (msg.type) {
          case 'join':
            clientId = msg.pluginInstanceId;
            clients.set(clientId, {
              ws,
              roomCode: msg.roomCode,
              pluginInstanceId: msg.pluginInstanceId,
              username: msg.username
            });
            
            // Broadcast instance joined
            broadcastToRoom(msg.roomCode, {
              type: 'instance-joined',
              pluginInstanceId: msg.pluginInstanceId,
              username: msg.username
            }, clientId);
            break;

          case 'track-pushed':
            // Broadcast to all other instances in room
            const client = clients.get(clientId);
            if (client) {
              broadcastToRoom(client.roomCode, {
                type: 'track-update',
                pluginInstanceId: msg.pluginInstanceId,
                version: msg.version,
                timestamp: msg.timestamp
              }, clientId);
            }
            break;
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      if (clientId && clients.has(clientId)) {
        const client = clients.get(clientId)!;
        broadcastToRoom(client.roomCode, {
          type: 'instance-left',
          pluginInstanceId: client.pluginInstanceId
        }, clientId);
        clients.delete(clientId);
      }
    });
  });

  function broadcastToRoom(roomCode: string, message: any, excludeId?: string) {
    clients.forEach((client, id) => {
      if (client.roomCode === roomCode && id !== excludeId) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify(message));
        }
      }
    });
  }

  return wss;
}
```

#### 3.2 Update Backend to Use WebSockets
```typescript
// backend/src/index.ts

import { setupWebSocketServer } from './websocket';

// After creating Express server
const httpServer = app.listen(3001);
setupWebSocketServer(httpServer);
```

### VST Changes (WebSocket Client)

**Note**: JUCE doesn't have built-in WebSocket support. You'll need to use a library like `libwebsockets` or implement polling instead:

#### 3.3 Polling Alternative (Simpler)
```cpp
// InspireVST/Source/PluginEditor.cpp

void InspireVSTAudioProcessorEditor::startInstancePolling() {
  // Poll every 5 seconds for updates
  startTimer(5000);
}

void InspireVSTAudioProcessorEditor::timerCallback() {
  if (selectedMode == "updates" && !currentSyncRoomCode.isEmpty()) {
    refreshInstancesList();
    refreshSyncStatus();
    checkForRemoteUpdates();
  }
}

void InspireVSTAudioProcessorEditor::checkForRemoteUpdates() {
  // Check if any instance has pushed since last check
  runAsync([this, serverUrl] {
    // GET /api/rooms/{roomCode}/recent-pushes?since={lastCheckTime}
    juce::String endpoint = serverUrl + "/api/rooms/" + currentSyncRoomCode + 
                           "/recent-pushes?since=" + juce::String(lastPollTime);
    
    // ... fetch and display recent pushes from other instances ...
  });
}
```

---

## UI/UX Layout for Updates Page

### Visual Mockup
```
┌──────────────────────────────────────────────────┐
│  UPDATES                              [Back]      │
├──────────────────────────────────────────────────┤
│                                                   │
│  Sync Status: ✓ Up to date (v12 of 12)          │
│                                                   │
│  ┌──────────────────────────────────────────┐   │
│  │ Active VST Instances (3)                 │   │
│  ├──────────────────────────────────────────┤   │
│  │ → A3F9D21C | Track 1 (Drums) | v12     │   │
│  │   B7E4A089 | Track 3 (Bass)  | v11 ↓   │   │
│  │   C2D8F156 | Track 5 (Synth) | v12     │   │
│  └──────────────────────────────────────────┘   │
│                                                   │
│  ┌──────────────────────────────────────────┐   │
│  │ Recent Pushes                            │   │
│  ├──────────────────────────────────────────┤   │
│  │ [14:32] B7E4A089 — beat:3 — Pushed v11  │   │
│  │ [14:31] A3F9D21C — beat:1 — Pushed v12  │   │
│  │ [14:29] C2D8F156 — beat:4 — Pushed v12  │   │
│  └──────────────────────────────────────────┘   │
│                                                   │
│  [Push This Track]  [Pull Latest]                │
│                                                   │
└──────────────────────────────────────────────────┘
```

---

## Testing Checklist

- [ ] Open multiple VST instances in DAW (e.g., Track 1, Track 2, Track 3)
- [ ] Each instance shows unique ID in Updates page
- [ ] Push from Track 1, verify Track 2 shows "behind by 1"
- [ ] Pull from Track 2, verify status becomes "up to date"
- [ ] Verify track names/indexes displayed correctly
- [ ] Test focus mode animation with pack words
- [ ] Test with multiple users in same collab room
- [ ] Verify WebSocket/polling delivers updates within 5 seconds
- [ ] Test with offline mode (no backend connection)

---

## Implementation Phases

### Phase 1 (Week 1): Track Location & Instance List
- [ ] Update `DAWTrackState` type with `pluginInstanceId`, `dawTrackIndex`, `dawTrackName`
- [ ] Backend: `GET /api/rooms/:roomCode/instances` endpoint
- [ ] VST: Extract track info from host (if possible)
- [ ] VST: Display instances list in Updates page

### Phase 2 (Week 2): Version Tracking & Sync Status
- [ ] Backend: `GET /api/rooms/:roomCode/sync-status` endpoint
- [ ] VST: Show ahead/behind status indicator
- [ ] VST: Highlight current instance in list
- [ ] Add automatic polling (5 second intervals)

### Phase 3 (Week 3): Focus Mode Animations
- [ ] Create `FallingWordComponent` in VST
- [ ] Add "Focus Mode" toggle button to pack detail view
- [ ] Extract words/samples from packs for animation
- [ ] Test animation performance (30 FPS target)

### Phase 4 (Week 4): Real-Time Sync
- [ ] Backend: WebSocket server setup
- [ ] Backend: Broadcast push/pull events to room
- [ ] VST: WebSocket client (or enhanced polling)
- [ ] Show notifications when other instances push

---

## Files to Create/Modify

### New Files
- `InspireVST/Source/FallingWordComponent.h`
- `InspireVST/Source/FallingWordComponent.cpp`
- `backend/src/websocket.ts` (optional)
- `docs/VST_INSTANCE_BROADCASTING_PLAN.md` (this file)

### Modified Files
- `backend/src/types.ts` - Update `DAWTrackState`
- `backend/src/index.ts` - Add `/instances` and `/sync-status` routes
- `InspireVST/Source/PluginProcessor.h` - Add `getHostTrackInfo()`
- `InspireVST/Source/PluginProcessor.cpp` - Implement track info extraction
- `InspireVST/Source/PluginEditor.h` - Add instance list components, timer
- `InspireVST/Source/PluginEditor.cpp` - Implement polling, display, focus mode

---

## API Specifications

### GET /api/rooms/:roomCode/instances
**Response:**
```json
{
  "roomCode": "ABC123",
  "instances": [
    {
      "pluginInstanceId": "A3F9D21C",
      "dawTrackIndex": 1,
      "dawTrackName": "Drums",
      "lastPushAt": 1709467200000,
      "lastPushBy": "user@example.com",
      "version": 12,
      "trackId": "vst-main-track"
    }
  ],
  "count": 1
}
```

### GET /api/rooms/:roomCode/sync-status?pluginInstanceId=X
**Response:**
```json
{
  "pluginInstanceId": "A3F9D21C",
  "myVersion": 12,
  "latestVersion": 12,
  "status": "up-to-date",
  "behindBy": 0,
  "recentPushes": [
    { "version": 12, "instanceId": "A3F9D21C", "updatedAt": 1709467200000 },
    { "version": 11, "instanceId": "B7E4A089", "updatedAt": 1709467100000 }
  ]
}
```

---

## Notes

1. **DAW Track Info Limitations**: Extracting track name/index is host-dependent. Some DAWs (Logic, Ableton) expose this via VST3/AU extensions, others don't. Fallback to instance ID if unavailable.

2. **WebSocket vs Polling**: WebSockets are more efficient but require JUCE WebSocket library (not built-in). Polling every 5 seconds is simpler and sufficient for most use cases.

3. **Focus Mode Animation Performance**: Test with 10+ falling words at 30 FPS. If laggy, reduce FPS to 20 or limit max visible words.

4. **Multi-User Testing**: Requires 2+ users in same collab room with VSTs open. Use Firebase-backed rooms for persistence.

---

**Ready to implement?** Start with Phase 1 (Track Location & Instance List), which has the most immediate value and is fully backward-compatible.
