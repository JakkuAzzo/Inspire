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
};

struct DAWSyncPushResponse
{
  bool ok = false;
  int version = 0;
  bool conflict = false;
  juce::String conflictReason;
};

struct DAWSyncPullResponse
{
  juce::String roomCode;
  juce::String trackId;
  int version = 0;
  DAWTrackState state;
  bool hasState = false;
};

class InspireNetworkClient
{
public:
  InspireNetworkClient();

  InspireCreateRoomResult createRoom(const juce::String& serverUrl, const juce::String& password = {}, bool isGuest = false);
  InspireJoinResult joinRoom(const juce::String& serverUrl, const juce::String& roomId, const juce::String& code);
  InspireJoinResult continueAsGuest(const juce::String& serverUrl);
  InspireListResult listFiles(const juce::String& token, int64_t sinceMs);
  juce::String getDownloadUrl(const juce::String& token, const juce::String& fileId);
  bool downloadFile(const juce::String& url, const juce::File& destination);

  // Mode & pack helpers (public)
  juce::String getModeDefinitions(const juce::String& serverUrl, const juce::String& bearerToken = {});
  juce::String createModePack(const juce::String& serverUrl, const juce::String& jsonPayload, const juce::String& bearerToken = {});
  juce::String createModePackForMode(const juce::String& serverUrl, const juce::String& mode, const juce::String& jsonPayload, const juce::String& bearerToken = {});
  juce::String savePack(const juce::String& serverUrl, const juce::String& jsonPayload, const juce::String& bearerToken = {});
  juce::String getCommunityFeed(const juce::String& serverUrl, const juce::String& bearerToken = {});
  juce::String searchCommunityFeed(const juce::String& serverUrl,
                                   const juce::String& query,
                                   int page = 1,
                                   int pageSize = 20,
                                   const juce::String& bearerToken = {});

  void setEndpoints(const juce::String& joinUrl,
                    const juce::String& listUrl,
                    const juce::String& downloadUrl);

  // DAW Sync endpoints - room code based local database sync
  DAWSyncPushResponse pushTrackState(const juce::String& serverUrl, const DAWTrackState& state, int baseVersion = -1);
  DAWSyncPullResponse pullTrackState(const juce::String& serverUrl, const juce::String& roomCode, const juce::String& trackId, int sinceVersion = 0);

private:
  juce::String createRoomUrl;
  juce::String joinRoomUrl;
  juce::String listFilesUrl;
  juce::String getDownloadUrlUrl;

  juce::String postJson(const juce::String& url,
                        const juce::String& json,
                        const juce::String& bearerToken = {});
  juce::String getJson(const juce::String& url,
                       const juce::String& bearerToken = {});
  int64_t parseTimestampMs(const juce::var& value);
  InspireFileItem parseFileItem(const juce::var& value);
};
