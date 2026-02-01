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

class InspireNetworkClient
{
public:
  InspireNetworkClient();

  InspireCreateRoomResult createRoom(const juce::String& password = {});
  InspireJoinResult joinRoom(const juce::String& roomId, const juce::String& code);
  InspireListResult listFiles(const juce::String& token, int64_t sinceMs);
  juce::String getDownloadUrl(const juce::String& token, const juce::String& fileId);
  bool downloadFile(const juce::String& url, const juce::File& destination);

  void setEndpoints(const juce::String& joinUrl,
                    const juce::String& listUrl,
                    const juce::String& downloadUrl);

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
