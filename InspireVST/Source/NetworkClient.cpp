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

InspireCreateRoomResult InspireNetworkClient::createRoom(const juce::String& password)
{
  InspireCreateRoomResult result;
  juce::DynamicObject::Ptr payload = new juce::DynamicObject();
  
  if (password.isNotEmpty())
  {
    payload->setProperty("password", password);
  }

  const auto json = juce::JSON::toString(juce::var(payload));
  const auto response = postJson(createRoomUrl, json);
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

InspireJoinResult InspireNetworkClient::joinRoom(const juce::String& roomId,
                                                 const juce::String& code)
{
  InspireJoinResult result;
  juce::DynamicObject::Ptr payload = new juce::DynamicObject();
  payload->setProperty("roomId", roomId);
  payload->setProperty("code", code);

  const auto json = juce::JSON::toString(juce::var(payload));
  const auto response = postJson(joinRoomUrl, json);
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

juce::String InspireNetworkClient::postJson(const juce::String& url,
                                            const juce::String& json,
                                            const juce::String& bearerToken)
{
  juce::URL target(url);
  
  juce::String authHeader = bearerToken.isNotEmpty() ? "Authorization: Bearer " + bearerToken + "\r\n" : "";
  juce::String headers = authHeader + "Content-Type: application/json";
  
  // POST data needs special handling
  juce::String dataUrl = url + "?data=" + juce::URL::addEscapeChars(json, true);
  juce::URL postUrl(dataUrl);
  
  auto options = juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inPostData)
    .withExtraHeaders(headers)
    .withConnectionTimeoutMs(10000);
  
  juce::String response;
  auto stream = postUrl.createInputStream(options);
  if (stream != nullptr)
  {
    response = stream->readEntireStreamAsString();
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
    .withConnectionTimeoutMs(10000);
  
  juce::String response;
  auto stream = target.createInputStream(options);
  if (stream != nullptr)
  {
    response = stream->readEntireStreamAsString();
  }
  return response;
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
