#include "NetworkClient.h"

namespace
{
const char* kCreateRoom = "https://us-central1-inspire-8c6e8.cloudfunctions.net/createRoom";
const char* kJoinRoom = "https://joinroom-kfjkqn5ysq-uc.a.run.app";
const char* kListFiles = "https://listfiles-kfjkqn5ysq-uc.a.run.app";
const char* kGetDownloadUrl = "https://getdownloadurl-kfjkqn5ysq-uc.a.run.app";
}

InspireNetworkClient::InspireNetworkClient()
{
  createRoomUrl = kCreateRoom;
  joinRoomUrl = kJoinRoom;
  listFilesUrl = kListFiles;
  getDownloadUrlUrl = kGetDownloadUrl;
}

void InspireNetworkClient::setEndpoints(const juce::String& joinUrl,
                                        const juce::String& listUrl,
                                        const juce::String& downloadUrl)
{
  joinRoomUrl = joinUrl;
  listFilesUrl = listUrl;
  getDownloadUrlUrl = downloadUrl;
}

InspireCreateRoomResult InspireNetworkClient::createRoom(const juce::String& serverUrl,
                                                             const juce::String& password,
                                                             bool isGuest)
{
  InspireCreateRoomResult result;
  juce::DynamicObject::Ptr payload = new juce::DynamicObject();
  
  if (password.isNotEmpty())
  {
    payload->setProperty("password", password);
  }
  payload->setProperty("isGuest", isGuest);

  const auto json = juce::JSON::toString(juce::var(payload));
  const auto response = postJson(serverUrl + "/api/vst/create-room", json);
  const auto parsed = juce::JSON::parse(response);
  
  if (parsed.isObject())
  {
    if (auto* obj = parsed.getDynamicObject())
    {
      result.roomId = obj->getProperty("roomId").toString();
      result.code = obj->getProperty("code").toString();
      result.expiresAtMs = parseTimestampMs(obj->getProperty("expiresAt"));
    }
  }
  return result;
}

InspireJoinResult InspireNetworkClient::joinRoom(const juce::String& serverUrl,
                                                 const juce::String& roomId,
                                                 const juce::String& code)
{
  InspireJoinResult result;
  juce::DynamicObject::Ptr payload = new juce::DynamicObject();
  payload->setProperty("roomId", roomId);
  payload->setProperty("code", code);

  const auto json = juce::JSON::toString(juce::var(payload));
  const auto response = postJson(serverUrl + "/api/vst/join-room", json);
  const auto parsed = juce::JSON::parse(response);
  if (parsed.isObject())
  {
    if (auto* obj = parsed.getDynamicObject())
    {
      result.token = obj->getProperty("token").toString();
      result.expiresAtMs = parseTimestampMs(obj->getProperty("expiresAt"));
    }
  }
  return result;
}

InspireJoinResult InspireNetworkClient::continueAsGuest(const juce::String& serverUrl)
{
  InspireJoinResult result;
  juce::DynamicObject::Ptr payload = new juce::DynamicObject();
  
  const auto json = juce::JSON::toString(juce::var(payload));
  const auto response = postJson(serverUrl + "/api/vst/guest-continue", json);
  const auto parsed = juce::JSON::parse(response);
  
  if (parsed.isObject())
  {
    if (auto* obj = parsed.getDynamicObject())
    {
      result.token = obj->getProperty("token").toString();
      result.expiresAtMs = parseTimestampMs(obj->getProperty("expiresAt"));
    }
  }
  return result;
}

InspireListResult InspireNetworkClient::listFiles(const juce::String& token,
                                                  int64_t sinceMs)
{
  InspireListResult result;
  juce::String url = listFilesUrl;
  if (sinceMs > 0)
  {
    url = url + "?since=" + juce::String(sinceMs);
  }
  const auto response = getJson(url, token);
  const auto parsed = juce::JSON::parse(response);
  if (parsed.isObject())
  {
    if (auto* obj = parsed.getDynamicObject())
    {
      const auto itemsVar = obj->getProperty("items");
      result.serverTimeMs = parseTimestampMs(obj->getProperty("serverTime"));
      if (itemsVar.isArray())
      {
        const auto* array = itemsVar.getArray();
        for (const auto& item : *array)
        {
          result.items.add(parseFileItem(item));
        }
      }
    }
  }
  return result;
}

juce::String InspireNetworkClient::getDownloadUrl(const juce::String& token,
                                                  const juce::String& fileId)
{
  juce::DynamicObject::Ptr payload = new juce::DynamicObject();
  payload->setProperty("fileId", fileId);
  const auto json = juce::JSON::toString(juce::var(payload));
  const auto response = postJson(getDownloadUrlUrl, json, token);
  const auto parsed = juce::JSON::parse(response);
  if (parsed.isObject())
  {
    if (auto* obj = parsed.getDynamicObject())
    {
      return obj->getProperty("url").toString();
    }
  }
  return {};
}

bool InspireNetworkClient::downloadFile(const juce::String& url,
                                        const juce::File& destination)
{
  juce::URL target(url);
  juce::File parent = destination.getParentDirectory();
  if (!parent.exists())
  {
    parent.createDirectory();
  }
  // Read from URL stream and write to file
  auto options = juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inPostData)
    .withConnectionTimeoutMs(30000);
  auto stream = target.createInputStream(options);
  if (stream != nullptr)
  {
    auto output = destination.createOutputStream();
    if (output != nullptr)
    {
      output->writeFromInputStream(*stream, -1);
      return true;
    }
  }
  return false;
}

DAWSyncPushResponse InspireNetworkClient::pushTrackState(const juce::String& serverUrl,
                                                        const DAWTrackState& state,
                                                        int baseVersion)
{
  DAWSyncPushResponse result;
  
  juce::DynamicObject::Ptr payload = new juce::DynamicObject();
  payload->setProperty("roomCode", state.roomCode);
  payload->setProperty("trackId", state.trackId);
  payload->setProperty("baseVersion", baseVersion);
  
  juce::DynamicObject::Ptr stateObj = new juce::DynamicObject();
  stateObj->setProperty("trackIndex", state.trackIndex);
  stateObj->setProperty("trackName", state.trackName);
  stateObj->setProperty("bpm", state.bpm);
  stateObj->setProperty("timeSignature", state.timeSignature);
  stateObj->setProperty("currentBeat", state.currentBeat);
  stateObj->setProperty("updatedBy", state.updatedBy);
  stateObj->setProperty("clipsJson", state.clipsJson);
  stateObj->setProperty("notesJson", state.notesJson);
  
  payload->setProperty("state", juce::var(stateObj));
  payload->setProperty("updatedBy", "VST_" + state.updatedBy);
  
  const auto json = juce::JSON::toString(juce::var(payload));
  const auto response = postJson(serverUrl + "/api/daw-sync/push", json);
  const auto parsed = juce::JSON::parse(response);
  
  if (parsed.isObject())
  {
    if (auto* obj = parsed.getDynamicObject())
    {
      result.ok = obj->getProperty("ok");
      result.version = static_cast<int>(obj->getProperty("version"));
      result.conflict = obj->getProperty("conflict");
      result.conflictReason = obj->getProperty("conflictReason").toString();
    }
  }
  return result;
}

DAWSyncPullResponse InspireNetworkClient::pullTrackState(const juce::String& serverUrl,
                                                        const juce::String& roomCode,
                                                        const juce::String& trackId,
                                                        int sinceVersion)
{
  DAWSyncPullResponse result;
  
  juce::String url = serverUrl + "/api/daw-sync/pull?roomCode=" + juce::URL::addEscapeChars(roomCode, true) +
                     "&trackId=" + juce::URL::addEscapeChars(trackId, true);
  if (sinceVersion > 0)
  {
    url += "&sinceVersion=" + juce::String(sinceVersion);
  }
  
  const auto response = getJson(url, "");
  const auto parsed = juce::JSON::parse(response);
  
  if (parsed.isObject())
  {
    if (auto* obj = parsed.getDynamicObject())
    {
      result.roomCode = obj->getProperty("roomCode").toString();
      result.trackId = obj->getProperty("trackId").toString();
      result.version = static_cast<int>(obj->getProperty("version"));
      
      const auto stateVar = obj->getProperty("state");
      if (stateVar.isObject())
      {
        result.hasState = true;
        if (auto* stateObj = stateVar.getDynamicObject())
        {
          result.state.roomCode = result.roomCode;
          result.state.trackId = result.trackId;
          result.state.trackIndex = static_cast<int>(stateObj->getProperty("trackIndex"));
          result.state.trackName = stateObj->getProperty("trackName").toString();
          result.state.bpm = static_cast<float>(stateObj->getProperty("bpm"));
          result.state.timeSignature = stateObj->getProperty("timeSignature").toString();
          result.state.currentBeat = static_cast<int>(stateObj->getProperty("currentBeat"));
          result.state.updatedAt = parseTimestampMs(stateObj->getProperty("updatedAt"));
          result.state.updatedBy = stateObj->getProperty("updatedBy").toString();
          result.state.clipsJson = stateObj->getProperty("clipsJson").toString();
          result.state.notesJson = stateObj->getProperty("notesJson").toString();
        }
      }
    }
  }
  return result;
}

juce::String InspireNetworkClient::postJson(const juce::String& url,
                                            const juce::String& json,
                                            const juce::String& bearerToken)
{
  // For endpoints that don't need JSON body (like /vst/guest-continue),
  // just make a plain POST request. The json parameter is still passed for
  // compatibility with other endpoints that might need it.
  juce::URL target(url);
  // Ensure the JSON payload is sent as POST body
  juce::URL postUrl = target.withPOSTData(json);

  juce::String authHeader = bearerToken.isNotEmpty() ? "Authorization: Bearer " + bearerToken + "\r\n" : "";
  juce::String headers = authHeader + "Content-Type: application/json";

  auto options = juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inPostData)
    .withExtraHeaders(headers)
    .withConnectionTimeoutMs(30000);  // Increased timeout to 30 seconds

  juce::String response;
  try
  {
    auto stream = postUrl.createInputStream(options);
    if (stream != nullptr)
    {
      response = stream->readEntireStreamAsString();
      if (response.isEmpty())
      {
        juce::Logger::getCurrentLogger()->writeToLog("[NetworkClient] WARNING: Empty response from " + url);
      }
    }
    else
    {
      juce::Logger::getCurrentLogger()->writeToLog("[NetworkClient] ERROR: Failed to create stream for " + url);
    }
  }
  catch (const std::exception& e)
  {
    juce::Logger::getCurrentLogger()->writeToLog("[NetworkClient] EXCEPTION: " + juce::String(e.what()) + " at " + url);
  }
  catch (...)
  {
    juce::Logger::getCurrentLogger()->writeToLog("[NetworkClient] UNKNOWN ERROR at " + url);
  }
  return response;
}

juce::String InspireNetworkClient::getJson(const juce::String& url,
                                           const juce::String& bearerToken)
{
  juce::URL target(url);
  
  juce::String headers = bearerToken.isNotEmpty() ? "Authorization: Bearer " + bearerToken : "";
  
  auto options = juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inPostData)
    .withExtraHeaders(headers)
    .withConnectionTimeoutMs(30000);  // Increased timeout
  
  juce::String response;
  try
  {
    auto stream = target.createInputStream(options);
    if (stream != nullptr)
    {
      response = stream->readEntireStreamAsString();
    }
    else
    {
      juce::Logger::getCurrentLogger()->writeToLog("[NetworkClient] ERROR: Failed to create GET stream for " + url);
    }
  }
  catch (const std::exception& e)
  {
    juce::Logger::getCurrentLogger()->writeToLog("[NetworkClient] GET EXCEPTION: " + juce::String(e.what()));
  }
  catch (...)
  {
    juce::Logger::getCurrentLogger()->writeToLog("[NetworkClient] GET UNKNOWN ERROR");
  }
  return response;
}

juce::String InspireNetworkClient::getModeDefinitions(const juce::String& serverUrl,
                                                     const juce::String& bearerToken)
{
  // Backend exposes development mode definitions at /dev/api/mode-definitions
  juce::String url = serverUrl;
  if (url.endsWithChar('/'))
    url = url.dropLastCharacters(1);
  url += "/dev/api/mode-definitions";

  return getJson(url, bearerToken);
}

juce::String InspireNetworkClient::createModePack(const juce::String& serverUrl,
                                                  const juce::String& jsonPayload,
                                                  const juce::String& bearerToken)
{
  juce::String url = serverUrl;
  if (url.endsWithChar('/'))
    url = url.dropLastCharacters(1);
  // Try the primary path first, then a set of fallbacks if the server returns HTML error pages
  juce::String primary = url + "/api/mode-pack";
  juce::String response = postJson(primary, jsonPayload, bearerToken);

  auto looksLikeHtml = [](const juce::String& s) {
    juce::String lower = s.toLowerCase();
    return lower.contains("<html") || lower.contains("<pre>") || lower.contains("cannot post");
  };

  if (!response.isEmpty() && !looksLikeHtml(response))
    return response;

  // Fallback endpoints to try when the server uses a different route for VST requests
  const char* fallbacks[] = {
    "/api/vst/mode-pack",
    "/api/v1/mode-pack",
    "/api/create-mode-pack",
    "/mode-pack",
    nullptr
  };

  for (int i = 0; fallbacks[i] != nullptr; ++i)
  {
    juce::String tryUrl = url + fallbacks[i];
    juce::String altResp = postJson(tryUrl, jsonPayload, bearerToken);
    if (!altResp.isEmpty() && !looksLikeHtml(altResp))
      return altResp;
    // If we got a non-empty HTML response, keep it as candidate to return later
    if (!altResp.isEmpty() && response.isEmpty())
      response = altResp;
  }

  // If all attempts produced empty or HTML responses, return the last response we have.
  return response;
}

juce::String InspireNetworkClient::createModePackForMode(const juce::String& serverUrl,
                                                       const juce::String& mode,
                                                       const juce::String& jsonPayload,
                                                       const juce::String& bearerToken)
{
  juce::String url = serverUrl;
  if (url.endsWithChar('/'))
    url = url.dropLastCharacters(1);

  // Primary endpoint used by the web frontend
  juce::String primary = url + "/api/modes/" + mode + "/fuel-pack";
  juce::String response = postJson(primary, jsonPayload, bearerToken);

  auto looksLikeHtml = [](const juce::String& s) {
    juce::String lower = s.toLowerCase();
    return lower.contains("<html") || lower.contains("<pre>") || lower.contains("cannot post");
  };

  if (!response.isEmpty() && !looksLikeHtml(response))
    return response;

  // sensible fallbacks to try if the primary path isn't working
  const char* fallbacks[] = {
    "/api/mode-pack",
    "/api/vst/mode-pack",
    "/api/modes/" , // placeholder, will be combined below
    nullptr
  };

  // Try generic fallbacks first
  for (int i = 0; fallbacks[i] != nullptr; ++i)
  {
    juce::String tryUrl = url + fallbacks[i];
    juce::String altResp = postJson(tryUrl, jsonPayload, bearerToken);
    if (!altResp.isEmpty() && !looksLikeHtml(altResp))
      return altResp;
    if (!altResp.isEmpty() && response.isEmpty())
      response = altResp;
  }

  // last attempt: try a few constructed mode-specific variants
  juce::String variants[] = { 
    url + "/api/modes/" + mode + "/pack", 
    url + "/api/modes/" + mode + "/fuelpack", 
    url + "/api/create-mode-pack"
  };
  for (auto& v : variants)
  {
    juce::String r = postJson(v, jsonPayload, bearerToken);
    if (!r.isEmpty() && !looksLikeHtml(r))
      return r;
    if (!r.isEmpty() && response.isEmpty()) response = r;
  }

  return response;
}

juce::String InspireNetworkClient::getCommunityFeed(const juce::String& serverUrl,
                                                    const juce::String& bearerToken)
{
  juce::String url = serverUrl;
  if (url.endsWithChar('/'))
    url = url.dropLastCharacters(1);
  url += "/api/community-feed";

  return getJson(url, bearerToken);
}

juce::String InspireNetworkClient::searchCommunityFeed(const juce::String& serverUrl,
                                                       const juce::String& query,
                                                       int page,
                                                       int pageSize,
                                                       const juce::String& bearerToken)
{
  juce::String url = serverUrl;
  if (url.endsWithChar('/'))
    url = url.dropLastCharacters(1);
  url += "/api/community-feed";

  juce::URL u(url);
  if (query.isNotEmpty()) u = u.withParameter("q", query);
  if (page > 1) u = u.withParameter("page", juce::String(page));
  if (pageSize > 0) u = u.withParameter("pageSize", juce::String(pageSize));

  const auto response = getJson(u.toString(true), bearerToken);
  if (response.isNotEmpty())
    return response;

  // Offline / fallback mock data when backend is unreachable
  // Construct a simple JSON payload with items that can be forked locally.
  juce::DynamicObject::Ptr root = new juce::DynamicObject();
  juce::Array<juce::var> items;
  for (int i = 0; i < juce::jmax(6, pageSize); ++i)
  {
    juce::DynamicObject::Ptr it = new juce::DynamicObject();
    int idx = (page - 1) * juce::jmax(1, pageSize) + i + 1;
    juce::String title = "Offline Pack " + juce::String(idx);
    it->setProperty("id", "offline-pack-" + juce::String(idx));
    it->setProperty("title", title);
    it->setProperty("author", "Local Demo");
    it->setProperty("tags", juce::StringArray{ "demo", "offline" }.joinIntoString(","));
    it->setProperty("summary", "A local demo pack for offline testing (" + title + ")");
    items.add(juce::var(it));
  }
  root->setProperty("items", juce::var(items));
  root->setProperty("total", (int)items.size());
  return juce::JSON::toString(juce::var(root));
}

juce::String InspireNetworkClient::savePack(const juce::String& serverUrl,
                                           const juce::String& jsonPayload,
                                           const juce::String& bearerToken)
{
  juce::String url = serverUrl;
  if (url.endsWithChar('/'))
    url = url.dropLastCharacters(1);
  
  // Extract pack ID from JSON payload
  auto parsedJson = juce::JSON::parse(jsonPayload);
  if (parsedJson.isObject())
  {
    auto* obj = parsedJson.getDynamicObject();
    if (obj)
    {
      auto packId = obj->getProperty("id").toString();
      if (!packId.isEmpty())
      {
        url += "/api/packs/" + packId + "/save";
      }
      else
      {
        url += "/api/save";  // Fallback if no ID
      }
    }
    else
    {
      url += "/api/save";
    }
  }
  else
  {
    url += "/api/save";
  }

  return postJson(url, jsonPayload, bearerToken);
}

int64_t InspireNetworkClient::parseTimestampMs(const juce::var& value)
{
  if (value.isInt() || value.isInt64())
  {
    return static_cast<int64_t>(value);
  }
  if (value.isDouble())
  {
    return static_cast<int64_t>(static_cast<double>(value));
  }
  if (value.isString())
  {
    return value.toString().getLargeIntValue();
  }
  if (value.isObject())
  {
    if (auto* obj = value.getDynamicObject())
    {
      auto secondsVar = obj->getProperty("_seconds");
      if (secondsVar.isInt() || secondsVar.isInt64())
      {
        const auto seconds = static_cast<int64_t>(secondsVar);
        return seconds * 1000;
      }
    }
  }
  return 0;
}

InspireFileItem InspireNetworkClient::parseFileItem(const juce::var& value)
{
  InspireFileItem item;
  if (!value.isObject())
  {
    return item;
  }
  auto* obj = value.getDynamicObject();
  item.id = obj->getProperty("id").toString();
  item.name = obj->getProperty("name").toString();
  item.mime = obj->getProperty("mime").toString();
  item.storagePath = obj->getProperty("storagePath").toString();
  item.bytes = static_cast<int64_t>(obj->getProperty("bytes"));
  item.updatedAtMs = parseTimestampMs(obj->getProperty("updatedAt"));
  if (item.updatedAtMs == 0)
  {
    item.updatedAtMs = parseTimestampMs(obj->getProperty("createdAt"));
  }
  return item;
}
