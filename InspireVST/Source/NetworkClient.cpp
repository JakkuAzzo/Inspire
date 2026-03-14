#include "NetworkClient.h"

namespace
{
const char* kCreateRoom = "https://us-central1-inspire-8c6e8.cloudfunctions.net/createRoom";
const char* kJoinRoom = "https://joinroom-kfjkqn5ysq-uc.a.run.app";
const char* kListFiles = "https://listfiles-kfjkqn5ysq-uc.a.run.app";
const char* kGetDownloadUrl = "https://getdownloadurl-kfjkqn5ysq-uc.a.run.app";
}

namespace
{
juce::String jsonEscape(const juce::String& input)
{
  auto escaped = input;
  escaped = escaped.replace("\\", "\\\\");
  escaped = escaped.replace("\"", "\\\"");
  return escaped;
}
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
                                                         bool isGuest,
                                                         const juce::String& pluginRole,
                                                         const juce::String& pluginInstanceId)
{
  InspireCreateRoomResult result;
  juce::DynamicObject::Ptr payload = new juce::DynamicObject();
  
  if (password.isNotEmpty())
  {
    payload->setProperty("password", password);
  }
  payload->setProperty("isGuest", isGuest);
  payload->setProperty("pluginRole", pluginRole);
  if (pluginInstanceId.isNotEmpty())
    payload->setProperty("pluginInstanceId", pluginInstanceId);

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
                                                 const juce::String& code,
                                                 const juce::String& pluginRole,
                                                 const juce::String& pluginInstanceId,
                                                 const juce::String& masterInstanceId)
{
  InspireJoinResult result;
  juce::DynamicObject::Ptr payload = new juce::DynamicObject();
  payload->setProperty("roomId", roomId);
  payload->setProperty("code", code);
  payload->setProperty("pluginRole", pluginRole);
  if (pluginInstanceId.isNotEmpty())
    payload->setProperty("pluginInstanceId", pluginInstanceId);
  if (masterInstanceId.isNotEmpty())
    payload->setProperty("masterInstanceId", masterInstanceId);

  const auto json = juce::JSON::toString(juce::var(payload));
  const auto response = postJson(serverUrl + "/api/vst/join-room", json);
  const auto parsed = juce::JSON::parse(response);
  if (parsed.isObject())
  {
    if (auto* obj = parsed.getDynamicObject())
    {
      result.token = obj->getProperty("token").toString();
      result.roomId = obj->getProperty("roomId").toString();
      result.roomCode = obj->getProperty("roomCode").toString();
      result.roomName = obj->getProperty("roomName").toString();
      result.errorMessage = obj->getProperty("error").toString();
      result.expiresAtMs = parseTimestampMs(obj->getProperty("expiresAt"));
    }
  }
  else if (response.isNotEmpty())
  {
    result.errorMessage = response.substring(0, juce::jmin(240, response.length()));
  }
  else
  {
    result.errorMessage = "No response from server";
  }
  return result;
}

InspireJoinResult InspireNetworkClient::continueAsGuest(const juce::String& serverUrl,
                                                        const juce::String& pluginRole)
{
  InspireJoinResult result;
  juce::DynamicObject::Ptr payload = new juce::DynamicObject();
  payload->setProperty("pluginRole", pluginRole);
  
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

PluginAttachResult InspireNetworkClient::attachPluginToMaster(const juce::String& serverUrl,
                                                              const juce::String& bearerToken,
                                                              const juce::String& pluginRole,
                                                              const juce::String& roomCode,
                                                              const juce::String& pluginInstanceId)
{
  PluginAttachResult result;
  juce::DynamicObject::Ptr payload = new juce::DynamicObject();
  payload->setProperty("roomCode", roomCode);
  payload->setProperty("pluginInstanceId", pluginInstanceId);

  const auto route = pluginRole.toLowerCase() == "create" ? "/api/vst/create/attach" : "/api/vst/relay/attach";
  const auto json = juce::JSON::toString(juce::var(payload));
  const auto response = postJson(serverUrl + route, json, bearerToken);
  const auto parsed = juce::JSON::parse(response);
  if (parsed.isObject())
  {
    if (auto* obj = parsed.getDynamicObject())
    {
      result.ok = (bool) obj->getProperty("ok");
      result.roomCode = obj->getProperty("roomCode").toString();
      result.pluginRole = obj->getProperty("pluginRole").toString();
      result.masterInstanceId = obj->getProperty("masterInstanceId").toString();
      result.errorMessage = obj->getProperty("message").toString();
      if (result.errorMessage.isEmpty())
        result.errorMessage = obj->getProperty("error").toString();
    }
  }
  if (!result.ok && result.errorMessage.isEmpty())
    result.errorMessage = response.substring(0, juce::jmin(240, response.length()));
  return result;
}

bool InspireNetworkClient::sendMasterHeartbeat(const juce::String& serverUrl,
                                               const juce::String& bearerToken,
                                               const juce::String& roomCode,
                                               const juce::String& pluginInstanceId,
                                               juce::String* errorOut)
{
  juce::DynamicObject::Ptr payload = new juce::DynamicObject();
  payload->setProperty("roomCode", roomCode);
  payload->setProperty("pluginInstanceId", pluginInstanceId);
  const auto json = juce::JSON::toString(juce::var(payload));
  const auto response = postJson(serverUrl + "/api/vst/master/heartbeat", json, bearerToken);
  const auto parsed = juce::JSON::parse(response);
  if (parsed.isObject())
  {
    if (auto* obj = parsed.getDynamicObject())
    {
      const bool ok = (bool) obj->getProperty("ok");
      if (!ok && errorOut != nullptr)
      {
        *errorOut = obj->getProperty("error").toString();
        if (errorOut->isEmpty())
          *errorOut = obj->getProperty("message").toString();
      }
      return ok;
    }
  }
  if (errorOut != nullptr)
    *errorOut = response.substring(0, juce::jmin(240, response.length()));
  return false;
}

MasterRoomStateResult InspireNetworkClient::getMasterRoomState(const juce::String& serverUrl,
                                                               const juce::String& roomCode,
                                                               const juce::String& bearerToken)
{
  MasterRoomStateResult result;
  const auto response = getJson(serverUrl + "/api/master/room/" + juce::URL::addEscapeChars(roomCode, true) + "/state", bearerToken);
  const auto parsed = juce::JSON::parse(response);
  if (parsed.isObject())
  {
    if (auto* obj = parsed.getDynamicObject())
    {
      result.ok = true;
      result.roomCode = obj->getProperty("roomCode").toString();
      result.active = (bool) obj->getProperty("active");
      result.masterInstanceId = obj->getProperty("masterInstanceId").toString();
      result.relayCount = static_cast<int>(obj->getProperty("relayCount"));
      result.createCount = static_cast<int>(obj->getProperty("createCount"));
      result.errorMessage = obj->getProperty("error").toString();
    }
  }
  if (!result.ok)
    result.errorMessage = response.substring(0, juce::jmin(240, response.length()));
  return result;
}

VstAuthBridgeConsumeResult InspireNetworkClient::consumeVstAuthBridge(const juce::String& serverUrl,
                                                                      const juce::String& bridgeId)
{
  VstAuthBridgeConsumeResult result;

  if (bridgeId.isEmpty())
  {
    result.errorMessage = "Missing bridgeId";
    return result;
  }

  const auto endpoint = serverUrl + "/api/vst/auth-bridge/consume?bridgeId=" +
                        juce::URL::addEscapeChars(bridgeId, true);
  const auto response = getJson(endpoint);
  const auto parsed = juce::JSON::parse(response);

  if (parsed.isObject())
  {
    if (auto* obj = parsed.getDynamicObject())
    {
      const auto status = obj->getProperty("status").toString();
      if (status == "complete")
      {
        result.completed = true;
        result.accessToken = obj->getProperty("accessToken").toString();
        result.displayName = obj->getProperty("displayName").toString();
        result.isGuest = static_cast<bool>(obj->getProperty("isGuest"));
      }
      result.errorMessage = obj->getProperty("error").toString();
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
                                                        int baseVersion,
                                                        const juce::String& bearerToken,
                                                        const juce::String& pluginRole,
                                                        const juce::String& masterInstanceId)
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
  // Phase 1: VST Instance Broadcasting
  stateObj->setProperty("pluginInstanceId", state.pluginInstanceId);
  stateObj->setProperty("dawTrackIndex", state.dawTrackIndex);
  stateObj->setProperty("dawTrackName", state.dawTrackName);
  stateObj->setProperty("pluginRole", pluginRole);
  if (masterInstanceId.isNotEmpty())
    stateObj->setProperty("masterInstanceId", masterInstanceId);
  
  payload->setProperty("state", juce::var(stateObj));
  payload->setProperty("updatedBy", "VST_" + state.updatedBy);
  payload->setProperty("pluginRole", pluginRole);
  if (masterInstanceId.isNotEmpty())
    payload->setProperty("masterInstanceId", masterInstanceId);
  
  const auto json = juce::JSON::toString(juce::var(payload));
  const auto response = postJson(serverUrl + "/api/daw-sync/push", json, bearerToken);
  const auto parsed = juce::JSON::parse(response);
  
  if (parsed.isObject())
  {
    if (auto* obj = parsed.getDynamicObject())
    {
      result.ok = obj->getProperty("ok");
      result.version = static_cast<int>(obj->getProperty("version"));
      result.eventId = obj->getProperty("eventId").toString();
      result.conflict = obj->getProperty("conflict");
      result.conflictReason = obj->getProperty("conflictReason").toString();
      if (result.conflictReason.isEmpty())
        result.conflictReason = obj->getProperty("message").toString();
      if (result.conflictReason.isEmpty())
        result.conflictReason = obj->getProperty("error").toString();
      result.masterRequired = result.conflictReason.containsIgnoreCase("master_required");
    }
  }
  return result;
}

DAWSyncPullResponse InspireNetworkClient::pullTrackState(const juce::String& serverUrl,
                                                        const juce::String& roomCode,
                                                        const juce::String& trackId,
                                                        int sinceVersion,
                                                        const juce::String& bearerToken,
                                                        const juce::String& pluginRole,
                                                        const juce::String& masterInstanceId)
{
  DAWSyncPullResponse result;
  
  juce::String url = serverUrl + "/api/daw-sync/pull?roomCode=" + juce::URL::addEscapeChars(roomCode, true) +
                     "&trackId=" + juce::URL::addEscapeChars(trackId, true);
  if (sinceVersion > 0)
  {
    url += "&sinceVersion=" + juce::String(sinceVersion);
  }
  url += "&pluginRole=" + juce::URL::addEscapeChars(pluginRole, true);
  if (masterInstanceId.isNotEmpty())
    url += "&masterInstanceId=" + juce::URL::addEscapeChars(masterInstanceId, true);
  
  const auto response = getJson(url, bearerToken);
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
          result.state.pluginInstanceId = stateObj->getProperty("pluginInstanceId").toString();
          result.state.dawTrackIndex = static_cast<int>(stateObj->getProperty("dawTrackIndex"));
          result.state.dawTrackName = stateObj->getProperty("dawTrackName").toString();
          result.state.pluginRole = stateObj->getProperty("pluginRole").toString();
          result.state.masterInstanceId = stateObj->getProperty("masterInstanceId").toString();
        }
      }
      result.errorMessage = obj->getProperty("message").toString();
      if (result.errorMessage.isEmpty())
        result.errorMessage = obj->getProperty("error").toString();
      result.masterRequired = result.errorMessage.containsIgnoreCase("master_required");
    }
  }
  return result;
}

juce::String InspireNetworkClient::getCollabVisualization(const juce::String& serverUrl,
                                                          const juce::String& roomCode,
                                                          const juce::String& bearerToken,
                                                          int limit,
                                                          juce::int64 since)
{
  juce::String endpoint = serverUrl + "/api/collab/" + juce::URL::addEscapeChars(roomCode, true) +
                          "/visualization?limit=" + juce::String(limit > 0 ? limit : 200);
  if (since > 0)
  {
    endpoint += "&since=" + juce::String(since);
  }
  return getJson(endpoint, bearerToken);
}

CollabAssetUploadResult InspireNetworkClient::uploadCollabAssetChunked(const juce::String& serverUrl,
                                                                        const juce::String& roomCode,
                                                                        const juce::String& bearerToken,
                                                                        const juce::String& eventId,
                                                                        const juce::String& trackId,
                                                                        const juce::File& file,
                                                                        const juce::String& mimeType,
                                                                        double durationSeconds,
                                                                        int chunkSizeBytes)
{
  CollabAssetUploadResult result;

  if (!file.existsAsFile())
  {
    result.errorMessage = "Asset file not found";
    return result;
  }

  auto input = file.createInputStream();
  if (input == nullptr)
  {
    result.errorMessage = "Unable to open asset file";
    return result;
  }

  const juce::int64 totalBytes = file.getSize();
  const int totalChunks = (int) juce::jmax<juce::int64>(1, (totalBytes + chunkSizeBytes - 1) / chunkSizeBytes);
  const juce::String uploadId = juce::Uuid().toString().retainCharacters("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789").substring(0, 24);
  result.uploadId = uploadId;

  for (int chunkIndex = 0; chunkIndex < totalChunks; ++chunkIndex)
  {
    const juce::int64 remaining = totalBytes - (juce::int64) chunkIndex * chunkSizeBytes;
    const int thisChunkSize = (int) juce::jlimit<juce::int64>(1, chunkSizeBytes, remaining);
    juce::MemoryBlock chunk;
    chunk.setSize((size_t) thisChunkSize);
    const int bytesRead = input->read(chunk.getData(), thisChunkSize);
    if (bytesRead <= 0)
    {
      result.errorMessage = "Failed while reading file chunk";
      return result;
    }
    chunk.setSize((size_t) bytesRead);

    juce::String endpoint = serverUrl + "/api/collab/" + juce::URL::addEscapeChars(roomCode, true) + "/assets/upload-chunk";
    juce::String headers;
    if (bearerToken.isNotEmpty())
      headers << "Authorization: Bearer " << bearerToken << "\r\n";
    headers << "Content-Type: application/octet-stream\r\n";
    headers << "x-upload-id: " << uploadId << "\r\n";
    headers << "x-file-name: " << file.getFileName() << "\r\n";
    headers << "x-file-type: " << (mimeType.isNotEmpty() ? mimeType : "application/octet-stream") << "\r\n";
    headers << "x-track-id: " << trackId << "\r\n";
    headers << "x-event-id: " << eventId << "\r\n";
    headers << "x-total-chunks: " << juce::String(totalChunks) << "\r\n";
    headers << "x-chunk-index: " << juce::String(chunkIndex) << "\r\n";
    if (durationSeconds > 0.0)
      headers << "x-duration-seconds: " << juce::String(durationSeconds, 3) << "\r\n";

    int statusCode = 0;
    const auto chunkResponse = postBinary(endpoint, chunk, headers, statusCode);
    if (statusCode < 200 || statusCode >= 300)
    {
      result.errorMessage = "Chunk upload failed (HTTP " + juce::String(statusCode) + ") " + chunkResponse.substring(0, 120);
      return result;
    }
  }

  const juce::String finalizeUrl = serverUrl + "/api/collab/" + juce::URL::addEscapeChars(roomCode, true) + "/assets/complete-upload";
  juce::String finalizePayload = "{";
  finalizePayload << "\"uploadId\":\"" << jsonEscape(uploadId) << "\",";
  finalizePayload << "\"eventId\":\"" << jsonEscape(eventId) << "\",";
  finalizePayload << "\"trackId\":\"" << jsonEscape(trackId) << "\",";
  finalizePayload << "\"fileName\":\"" << jsonEscape(file.getFileName()) << "\",";
  finalizePayload << "\"fileType\":\"" << jsonEscape(mimeType.isNotEmpty() ? mimeType : "application/octet-stream") << "\",";
  finalizePayload << "\"totalChunks\":" << juce::String(totalChunks);
  if (durationSeconds > 0.0)
    finalizePayload << ",\"durationSeconds\":" << juce::String(durationSeconds, 3);
  finalizePayload << "}";

  const auto finalizeResponse = postJson(finalizeUrl, finalizePayload, bearerToken);
  auto parsed = juce::JSON::parse(finalizeResponse);
  if (parsed.isObject())
  {
    if (auto* obj = parsed.getDynamicObject())
    {
      result.ok = (bool) obj->getProperty("ok");
      auto assetVar = obj->getProperty("asset");
      if (assetVar.isObject())
      {
        if (auto* assetObj = assetVar.getDynamicObject())
          result.assetId = assetObj->getProperty("id").toString();
      }
      if (!result.ok)
        result.errorMessage = obj->getProperty("error").toString();
    }
  }

  if (!result.ok && result.errorMessage.isEmpty())
    result.errorMessage = "Finalize upload failed";

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

juce::String InspireNetworkClient::postBinary(const juce::String& url,
                                              const juce::MemoryBlock& body,
                                              const juce::String& headers,
                                              int& statusCode)
{
  juce::URL target(url);
  juce::URL postUrl = target.withPOSTData(body);

  juce::StringPairArray responseHeaders;
  auto options = juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inPostData)
    .withExtraHeaders(headers)
    .withHttpRequestCmd("POST")
    .withStatusCode(&statusCode)
    .withResponseHeaders(&responseHeaders)
    .withConnectionTimeoutMs(30000);

  auto stream = postUrl.createInputStream(options);
  if (stream == nullptr)
  {
    statusCode = 0;
    return {};
  }

  return stream->readEntireStreamAsString();
}

juce::String InspireNetworkClient::getJson(const juce::String& url,
                                           const juce::String& bearerToken)
{
  juce::URL target(url);
  
  juce::String headers = bearerToken.isNotEmpty() ? "Authorization: Bearer " + bearerToken : "";
  
  auto options = juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inAddress)
    .withHttpRequestCmd("GET")
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
