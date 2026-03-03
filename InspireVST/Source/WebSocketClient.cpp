/**
 * WebSocket Client Implementation
 * 
 * Phase 3: Real-time WebSocket communication with backend
 * Handles connection lifecycle and message queuing
 */

#include "WebSocketClient.h"
#include <juce_events/juce_events.h>
#include <juce_core/juce_core.h>
#include <CommonCrypto/CommonDigest.h>
#include <cstdint>
#include <cstring>

namespace
{
constexpr const char* kWebSocketGuid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
constexpr uint8_t kOpcodeContinuation = 0x0;
constexpr uint8_t kOpcodeText = 0x1;
constexpr uint8_t kOpcodeClose = 0x8;
constexpr uint8_t kOpcodePing = 0x9;
constexpr uint8_t kOpcodePong = 0xA;
}

WebSocketClient::WebSocketClient()
  : juce::Thread("WebSocketClient", 8192)
{
}

WebSocketClient::~WebSocketClient()
{
  disconnect();
  if (isThreadRunning())
    stopThread(5000);
}

void WebSocketClient::connect(const juce::String& url)
{
  if (isThreadRunning())
  {
    shouldStop = true;
    stopThread(5000);
  }
  
  wsUrl = url;
  shouldStop = false;
  disconnectNotified = false;
  startThread();
}

void WebSocketClient::disconnect()
{
  shouldStop = true;

  if (socket)
    socket->close();

  if (isThreadRunning())
    stopThread(2000);

  connected = false;

  if (!disconnectNotified.exchange(true) && onDisconnect)
    juce::MessageManager::callAsync([this] { onDisconnect(); });
}

bool WebSocketClient::isConnected() const
{
  return connected.load();
}

void WebSocketClient::sendMessage(const juce::String& jsonMessage)
{
  if (!isConnected())
    return;

  queueOutboundMessage(jsonMessage);
}

void WebSocketClient::processMessages()
{
  // Process any queued messages on UI thread
  const juce::ScopedLock locker(queueLock);
  
  while (!messageQueue.empty())
  {
    VSWSMessage msg = messageQueue.front();
    messageQueue.pop();
    
    if (onMessage)
      onMessage(msg);
  }
}

void WebSocketClient::run()
{
  internalConnect();

  while (!shouldStop && connected.load())
  {
    std::queue<juce::String> pending;
    {
      const juce::ScopedLock locker(queueLock);
      std::swap(pending, outboundQueue);
    }

    while (!pending.empty() && connected.load())
    {
      if (!sendTextFrame(pending.front()))
      {
        connected = false;
        break;
      }
      pending.pop();
    }

    if (!connected.load() || !socket)
      break;

    const auto ready = socket->waitUntilReady(true, 50);
    if (ready < 0)
    {
      connected = false;
      break;
    }

    if (ready == 0)
      continue;

    char buffer[4096];
    const int bytesRead = socket->read(buffer, static_cast<int>(sizeof(buffer)), false);
    if (bytesRead <= 0)
    {
      connected = false;
      break;
    }

    processIncomingData(buffer, bytesRead);
  }

  internalDisconnect();
}

void WebSocketClient::internalConnect()
{
  juce::String host;
  juce::String path;
  int port = 0;
  bool secure = false;

  if (!parseWebSocketUrl(wsUrl, host, port, path, secure))
  {
    if (onError)
      juce::MessageManager::callAsync([this] { onError("Invalid WebSocket URL"); });
    connected = false;
    return;
  }

  if (secure)
  {
    if (onError)
      juce::MessageManager::callAsync([this] { onError("wss:// is not supported in this build"); });
    connected = false;
    return;
  }

  socket = std::make_unique<juce::StreamingSocket>();
  if (!socket->connect(host, port, 3000))
  {
    socket.reset();
    if (onError)
      juce::MessageManager::callAsync([this, host, port]
      {
        onError("Connection failed: " + host + ":" + juce::String(port));
      });
    connected = false;
    return;
  }

  if (!performHandshake(host, port, path))
  {
    if (onError)
      juce::MessageManager::callAsync([this] { onError("WebSocket handshake failed"); });
    connected = false;
    socket.reset();
    return;
  }

  connected = true;
  disconnectNotified = false;

  if (onConnect)
    juce::MessageManager::callAsync([this] { onConnect(); });

  DBG("[WebSocket] Connected to: " + wsUrl);
}

void WebSocketClient::internalDisconnect()
{
  if (connected.load())
    sendCloseFrame();

  if (socket)
  {
    socket->close();
    socket.reset();
  }

  connected = false;

  if (!disconnectNotified.exchange(true) && onDisconnect)
    juce::MessageManager::callAsync([this] { onDisconnect(); });

  DBG("[WebSocket] Disconnected");
}

void WebSocketClient::parseAndQueueMessage(const juce::String& jsonStr)
{
  // Phase 3: Parse incoming WebSocket message
  auto parsed = juce::JSON::parse(jsonStr);
  if (!parsed.isObject())
    return;
  
  auto* obj = parsed.getDynamicObject();
  VSWSMessage msg;
  msg.type = obj->getProperty("type").toString();
  msg.pluginInstanceId = obj->getProperty("pluginInstanceId").toString();
  msg.roomCode = obj->getProperty("roomCode").toString();
  msg.username = obj->getProperty("username").toString();
  msg.version = obj->getProperty("version");
  msg.timestamp = obj->getProperty("timestamp");
  msg.raw = jsonStr;
  
  const juce::ScopedLock locker(queueLock);
  messageQueue.push(msg);
}

void WebSocketClient::queueOutboundMessage(const juce::String& jsonMessage)
{
  const juce::ScopedLock locker(queueLock);
  outboundQueue.push(jsonMessage);
}

bool WebSocketClient::parseWebSocketUrl(const juce::String& url, juce::String& host, int& port, juce::String& path, bool& secure)
{
  juce::URL parsed(url);
  const auto scheme = parsed.getScheme().toLowerCase();

  secure = (scheme == "wss");
  if (scheme != "ws" && scheme != "wss")
    return false;

  host = parsed.getDomain();
  if (host.isEmpty())
    return false;

  port = parsed.getPort();
  if (port <= 0)
    port = secure ? 443 : 80;

  path = parsed.getSubPath();
  if (path.isEmpty())
    path = "/";
  if (!path.startsWithChar('/'))
    path = "/" + path;

  return true;
}

bool WebSocketClient::performHandshake(const juce::String& host, int port, const juce::String& path)
{
  if (!socket)
    return false;

  juce::MemoryBlock randomKey(16);
  juce::Random random;
  for (size_t i = 0; i < randomKey.getSize(); ++i)
    static_cast<uint8_t*>(randomKey.getData())[i] = static_cast<uint8_t>(random.nextInt(256));

  const auto secWebSocketKey = juce::Base64::toBase64(randomKey.getData(), randomKey.getSize());

  juce::String request;
  request << "GET " << path << " HTTP/1.1\r\n";
  request << "Host: " << host << ":" << port << "\r\n";
  request << "Upgrade: websocket\r\n";
  request << "Connection: Upgrade\r\n";
  request << "Sec-WebSocket-Key: " << secWebSocketKey << "\r\n";
  request << "Sec-WebSocket-Version: 13\r\n\r\n";

  if (socket->write(request.toRawUTF8(), static_cast<int>(request.getNumBytesAsUTF8())) <= 0)
    return false;

  juce::String response;
  char buffer[1024];
  const auto start = juce::Time::getMillisecondCounter();

  while (!response.contains("\r\n\r\n"))
  {
    if (juce::Time::getMillisecondCounter() - start > 3000)
      return false;

    const auto ready = socket->waitUntilReady(true, 200);
    if (ready <= 0)
      continue;

    const int bytesRead = socket->read(buffer, static_cast<int>(sizeof(buffer)), false);
    if (bytesRead <= 0)
      return false;

    response += juce::String::fromUTF8(buffer, bytesRead);
  }

  if (!response.startsWithIgnoreCase("HTTP/1.1 101") && !response.startsWithIgnoreCase("HTTP/1.0 101"))
    return false;

  const auto expectedAcceptSource = secWebSocketKey + kWebSocketGuid;
  unsigned char sha1Digest[CC_SHA1_DIGEST_LENGTH] = { 0 };
  CC_SHA1(expectedAcceptSource.toRawUTF8(), static_cast<CC_LONG>(expectedAcceptSource.getNumBytesAsUTF8() - 1), sha1Digest);
  const auto expectedAccept = juce::Base64::toBase64(sha1Digest, CC_SHA1_DIGEST_LENGTH);

  const auto headers = juce::StringArray::fromLines(response.upToFirstOccurrenceOf("\r\n\r\n", false, false));
  juce::String receivedAccept;
  for (const auto& header : headers)
  {
    if (header.startsWithIgnoreCase("Sec-WebSocket-Accept:"))
    {
      receivedAccept = header.fromFirstOccurrenceOf(":", false, false).trim();
      break;
    }
  }

  if (receivedAccept.isEmpty())
    return false;

  return receivedAccept == expectedAccept;
}

bool WebSocketClient::sendWebSocketFrame(uint8_t opcode, const void* payload, size_t payloadSize)
{
  if (!socket)
    return false;

  juce::MemoryOutputStream frame;
  const uint8_t finAndOpcode = static_cast<uint8_t>(0x80 | (opcode & 0x0F));
  frame.writeByte(static_cast<char>(finAndOpcode));

  const bool masked = true;
  uint8_t payloadLenByte = static_cast<uint8_t>(masked ? 0x80 : 0x00);

  if (payloadSize <= 125)
  {
    payloadLenByte = static_cast<uint8_t>(payloadLenByte | static_cast<uint8_t>(payloadSize));
    frame.writeByte(static_cast<char>(payloadLenByte));
  }
  else if (payloadSize <= 65535)
  {
    payloadLenByte = static_cast<uint8_t>(payloadLenByte | 126);
    frame.writeByte(static_cast<char>(payloadLenByte));
    frame.writeShortBigEndian(static_cast<short>(payloadSize));
  }
  else
  {
    payloadLenByte = static_cast<uint8_t>(payloadLenByte | 127);
    frame.writeByte(static_cast<char>(payloadLenByte));
    frame.writeInt64BigEndian(static_cast<juce::int64>(payloadSize));
  }

  uint8_t mask[4];
  juce::Random random;
  for (int i = 0; i < 4; ++i)
    mask[i] = static_cast<uint8_t>(random.nextInt(256));

  frame.write(mask, 4);

  const auto* bytes = static_cast<const uint8_t*>(payload);
  for (size_t i = 0; i < payloadSize; ++i)
  {
    const uint8_t maskedByte = static_cast<uint8_t>(bytes[i] ^ mask[i % 4]);
    frame.writeByte(static_cast<char>(maskedByte));
  }

  return socket->write(frame.getData(), static_cast<int>(frame.getDataSize())) > 0;
}

bool WebSocketClient::sendTextFrame(const juce::String& text)
{
  const auto utf8 = text.toUTF8();
  return sendWebSocketFrame(kOpcodeText, utf8.getAddress(), static_cast<size_t>(utf8.sizeInBytes() - 1));
}

bool WebSocketClient::sendCloseFrame()
{
  return sendWebSocketFrame(kOpcodeClose, nullptr, 0);
}

bool WebSocketClient::sendPongFrame(const juce::MemoryBlock& payload)
{
  return sendWebSocketFrame(kOpcodePong, payload.getData(), payload.getSize());
}

void WebSocketClient::processIncomingData(const char* data, int length)
{
  if (length <= 0)
    return;

  receiveBuffer.append(data, static_cast<size_t>(length));

  while (receiveBuffer.getSize() >= 2)
  {
    const auto* bytes = static_cast<const uint8_t*>(receiveBuffer.getData());
    size_t offset = 0;

    const uint8_t byte1 = bytes[offset++];
    const uint8_t byte2 = bytes[offset++];

    const bool fin = (byte1 & 0x80) != 0;
    const uint8_t opcode = static_cast<uint8_t>(byte1 & 0x0F);
    const bool masked = (byte2 & 0x80) != 0;
    uint64_t payloadLength = static_cast<uint64_t>(byte2 & 0x7F);

    if (payloadLength == 126)
    {
      if (receiveBuffer.getSize() < offset + 2)
        return;
      payloadLength = static_cast<uint64_t>((bytes[offset] << 8) | bytes[offset + 1]);
      offset += 2;
    }
    else if (payloadLength == 127)
    {
      if (receiveBuffer.getSize() < offset + 8)
        return;
      payloadLength = 0;
      for (int i = 0; i < 8; ++i)
        payloadLength = (payloadLength << 8) | bytes[offset + static_cast<size_t>(i)];
      offset += 8;
    }

    uint8_t maskKey[4] = { 0, 0, 0, 0 };
    if (masked)
    {
      if (receiveBuffer.getSize() < offset + 4)
        return;
      std::memcpy(maskKey, bytes + offset, 4);
      offset += 4;
    }

    if (receiveBuffer.getSize() < offset + payloadLength)
      return;

    juce::MemoryBlock payload(bytes + offset, static_cast<size_t>(payloadLength));
    if (masked)
    {
      auto* payloadBytes = static_cast<uint8_t*>(payload.getData());
      for (size_t i = 0; i < payload.getSize(); ++i)
        payloadBytes[i] ^= maskKey[i % 4];
    }

    if ((opcode == kOpcodeText || opcode == kOpcodeContinuation) && fin)
    {
      parseAndQueueMessage(juce::String::fromUTF8(static_cast<const char*>(payload.getData()), static_cast<int>(payload.getSize())));
    }
    else if (opcode == kOpcodePing)
    {
      sendPongFrame(payload);
    }
    else if (opcode == kOpcodeClose)
    {
      connected = false;
    }

    const size_t consumed = offset + static_cast<size_t>(payloadLength);
    if (consumed >= receiveBuffer.getSize())
    {
      receiveBuffer.reset();
      return;
    }

    juce::MemoryBlock remaining(bytes + consumed, receiveBuffer.getSize() - consumed);
    receiveBuffer.swapWith(remaining);
  }
}
