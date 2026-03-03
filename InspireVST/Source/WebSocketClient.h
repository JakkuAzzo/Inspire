/**
 * WebSocket Client for VST Instance Real-Time Sync
 * 
 * Connects to backend WebSocket server at /ws/sync
 * Handles real-time messages for instance updates
 * Implements message queue for thread-safe delivery
 * 
 * Phase 3: Real-time WebSocket sync (instant updates)
 */

#pragma once

#include <juce_core/juce_core.h>
#include <functional>
#include <queue>
#include <memory>
#include <atomic>
#include <cstdint>

/** Message received from WebSocket server */
struct VSWSMessage {
  juce::String type;           // 'instance-joined', 'track-update', 'instance-left', etc
  juce::String pluginInstanceId;
  juce::String roomCode;
  juce::String username;
  int version = 0;
  juce::int64 timestamp = 0;
  juce::String raw;           // Raw JSON for advanced parsing
};

/** Callback for WebSocket events */
using OnWSMessageCallback = std::function<void(const VSWSMessage&)>;
using OnWSConnectCallback = std::function<void()>;
using OnWSDisconnectCallback = std::function<void()>;
using OnWSErrorCallback = std::function<void(const juce::String&)>;

/**
 * WebSocket client for VST instance synchronization
 * 
 * Usage:
 *   auto client = std::make_unique<WebSocketClient>();
 *   client->setOnMessageCallback([this](auto& msg) { handleMessage(msg); });
 *   client->connect("ws://localhost:3001/ws/sync");
 */
class WebSocketClient : private juce::Thread
{
public:
  WebSocketClient();
  ~WebSocketClient();

  /** Connect to WebSocket server */
  void connect(const juce::String& wsUrl);
  
  /** Disconnect from server */
  void disconnect();
  
  /** Send JSON message to server */
  void sendMessage(const juce::String& jsonMessage);
  
  /** Check if connected */
  bool isConnected() const;
  
  /** Set message callback */
  void setOnMessageCallback(OnWSMessageCallback cb) { onMessage = cb; }
  void setOnConnectCallback(OnWSConnectCallback cb) { onConnect = cb; }
  void setOnDisconnectCallback(OnWSDisconnectCallback cb) { onDisconnect = cb; }
  void setOnErrorCallback(OnWSErrorCallback cb) { onError = cb; }
  
  /** Process queued messages (call from UI thread) */
  void processMessages();

private:
  void run() override;          // Thread::run implementation
  void internalConnect();       // Perform connection
  void internalDisconnect();    // Clean disconnect
  void parseAndQueueMessage(const juce::String& jsonStr);
  void queueOutboundMessage(const juce::String& jsonMessage);
  bool performHandshake(const juce::String& host, int port, const juce::String& path);
  void processIncomingData(const char* data, int length);
  bool sendWebSocketFrame(uint8_t opcode, const void* payload, size_t payloadSize);
  bool sendTextFrame(const juce::String& text);
  bool sendCloseFrame();
  bool sendPongFrame(const juce::MemoryBlock& payload);
  bool parseWebSocketUrl(const juce::String& url, juce::String& host, int& port, juce::String& path, bool& secure);
  
  // Connection state
  juce::String wsUrl;
  std::atomic<bool> connected { false };
  std::atomic<bool> shouldStop { false };
  std::atomic<bool> disconnectNotified { false };

  std::unique_ptr<juce::StreamingSocket> socket;
  juce::MemoryBlock receiveBuffer;
  
  // Message queue (thread-safe)
  juce::CriticalSection queueLock;
  std::queue<VSWSMessage> messageQueue;
  std::queue<juce::String> outboundQueue;
  
  // Callbacks
  OnWSMessageCallback onMessage;
  OnWSConnectCallback onConnect;
  OnWSDisconnectCallback onDisconnect;
  OnWSErrorCallback onError;
};
