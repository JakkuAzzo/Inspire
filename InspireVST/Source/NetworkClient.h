#pragma once

#include <juce_core/juce_core.h>

struct InspireFileItem
{
  juce::String id;
  juce::String name;
  juce::String mime;
  juce::String storagePath;
  int64_t bytes = 0;
  int64_t updatedAtMs = 0;
};

struct InspireJoinResult
{
  juce::String token;
  juce::String roomId;
  juce::String roomCode;
  juce::String roomName;
  juce::String errorMessage;
  int64_t expiresAtMs = 0;
};

struct InspireCreateRoomResult
{
  juce::String roomId;
  juce::String code;
  int64_t expiresAtMs = 0;
};

struct InspireListResult
{
  juce::Array<InspireFileItem> items;
  int64_t serverTimeMs = 0;
};

struct DAWTrackState
{
  juce::String roomCode;
  juce::String trackId;
  int trackIndex = 0;
  juce::String trackName;
  float bpm = 120.0f;
  juce::String timeSignature = "4/4";
  int currentBeat = 0;
  int64_t updatedAt = 0;
  juce::String updatedBy;
  juce::String clipsJson;  // Serialized clips array
  juce::String notesJson;  // Serialized notes array
  // Phase 1: VST Instance Broadcasting
  juce::String pluginInstanceId;  // VST instance unique ID
  int dawTrackIndex = -1;         // DAW track number (1, 2, 3...)
  juce::String dawTrackName;      // Host-provided track name
  juce::String pluginRole;
  juce::String masterInstanceId;
};

struct DAWSyncPushResponse
{
  bool ok = false;
  int version = 0;
  juce::String eventId;
  bool conflict = false;
  juce::String conflictReason;
  bool masterRequired = false;
};

struct CollabAssetUploadResult
{
  bool ok = false;
  juce::String uploadId;
  juce::String assetId;
  juce::String errorMessage;
};

struct DAWSyncPullResponse
{
  juce::String roomCode;
  juce::String trackId;
  int version = 0;
  DAWTrackState state;
  bool hasState = false;
  juce::String errorMessage;
  bool masterRequired = false;
};

struct PluginAttachResult
{
  bool ok = false;
  juce::String roomCode;
  juce::String pluginRole;
  juce::String masterInstanceId;
  juce::String errorMessage;
};

struct MasterRoomStateResult
{
  bool ok = false;
  juce::String roomCode;
  bool active = false;
  juce::String masterInstanceId;
  int relayCount = 0;
  int createCount = 0;
  juce::String errorMessage;
};

struct VstAuthBridgeConsumeResult
{
  bool completed = false;
  juce::String accessToken;
  juce::String displayName;
  bool isGuest = false;
  juce::String errorMessage;
};

class InspireNetworkClient
{
public:
  InspireNetworkClient();

  InspireCreateRoomResult createRoom(const juce::String& serverUrl,
                                     const juce::String& password = {},
                                     bool isGuest = false,
                                     const juce::String& pluginRole = "master",
                                     const juce::String& pluginInstanceId = {});
  InspireJoinResult joinRoom(const juce::String& serverUrl,
                             const juce::String& roomId,
                             const juce::String& code,
                             const juce::String& pluginRole = "master",
                             const juce::String& pluginInstanceId = {},
                             const juce::String& masterInstanceId = {});
  InspireJoinResult continueAsGuest(const juce::String& serverUrl,
                                    const juce::String& pluginRole = "master");
  InspireListResult listFiles(const juce::String& token, int64_t sinceMs);
  juce::String getDownloadUrl(const juce::String& token, const juce::String& fileId);
  bool downloadFile(const juce::String& url, const juce::File& destination);
  bool downloadFileWithAuth(const juce::String& url,
                            const juce::String& bearerToken,
                            const juce::File& destination);

  // Mode & pack helpers (public)
  juce::String getModeDefinitions(const juce::String& serverUrl, const juce::String& bearerToken = {});
  juce::String createModePack(const juce::String& serverUrl, const juce::String& jsonPayload, const juce::String& bearerToken = {});
  juce::String createModePackForMode(const juce::String& serverUrl, const juce::String& mode, const juce::String& jsonPayload, const juce::String& bearerToken = {});
  juce::String savePack(const juce::String& serverUrl, const juce::String& jsonPayload, const juce::String& bearerToken = {});
  juce::String getCommunityFeed(const juce::String& serverUrl, const juce::String& bearerToken = {});
  juce::String getMyRooms(const juce::String& serverUrl, const juce::String& bearerToken = {});
  juce::String searchCommunityFeed(const juce::String& serverUrl,
                                   const juce::String& query,
                                   int page = 1,
                                   int pageSize = 20,
                                   const juce::String& bearerToken = {});

  void setEndpoints(const juce::String& joinUrl,
                    const juce::String& listUrl,
                    const juce::String& downloadUrl);

  PluginAttachResult attachPluginToMaster(const juce::String& serverUrl,
                                          const juce::String& bearerToken,
                                          const juce::String& pluginRole,
                                          const juce::String& roomCode,
                                          const juce::String& pluginInstanceId);
  bool sendMasterHeartbeat(const juce::String& serverUrl,
                           const juce::String& bearerToken,
                           const juce::String& roomCode,
                           const juce::String& pluginInstanceId,
                           juce::String* errorOut = nullptr);
  MasterRoomStateResult getMasterRoomState(const juce::String& serverUrl,
                                           const juce::String& roomCode,
                                           const juce::String& bearerToken = {});
  VstAuthBridgeConsumeResult consumeVstAuthBridge(const juce::String& serverUrl,
                                                  const juce::String& bridgeId);

  // DAW Sync endpoints - room code based local database sync
  DAWSyncPushResponse pushTrackState(const juce::String& serverUrl,
                                     const DAWTrackState& state,
                                     int baseVersion = -1,
                                     const juce::String& bearerToken = {},
                                     const juce::String& pluginRole = "legacy",
                                     const juce::String& masterInstanceId = {});
  DAWSyncPullResponse pullTrackState(const juce::String& serverUrl,
                                     const juce::String& roomCode,
                                     const juce::String& trackId,
                                     int sinceVersion = 0,
                                     const juce::String& bearerToken = {},
                                     const juce::String& pluginRole = "legacy",
                                     const juce::String& masterInstanceId = {});

  // Collaboration visualization endpoint (used by Updates mode timeline tree)
  juce::String getCollabVisualization(const juce::String& serverUrl,
                                      const juce::String& roomCode,
                                      const juce::String& bearerToken = {},
                                      int limit = 200,
                                      juce::int64 since = 0);

  // Chunked upload API for large collaboration assets (wav/mp3/midi)
  CollabAssetUploadResult uploadCollabAssetChunked(const juce::String& serverUrl,
                                                   const juce::String& roomCode,
                                                   const juce::String& bearerToken,
                                                   const juce::String& eventId,
                                                   const juce::String& trackId,
                                                   const juce::File& file,
                                                   const juce::String& mimeType,
                                                   double durationSeconds = 0.0,
                                                   int chunkSizeBytes = 256 * 1024);

private:
  juce::String createRoomUrl;
  juce::String joinRoomUrl;
  juce::String listFilesUrl;
  juce::String getDownloadUrlUrl;

  juce::String postJson(const juce::String& url,
                        const juce::String& json,
                        const juce::String& bearerToken = {});
  juce::String postBinary(const juce::String& url,
                          const juce::MemoryBlock& body,
                          const juce::String& headers,
                          int& statusCode);
  juce::String getJson(const juce::String& url,
                       const juce::String& bearerToken = {});
  int64_t parseTimestampMs(const juce::var& value);
  InspireFileItem parseFileItem(const juce::var& value);
};
