/**
 * WebSocket Server for Real-Time VST Instance Sync
 * 
 * Handles real-time communication between VST instances in collaborative rooms.
 * Message types:
 * - 'join': Instance connects to room
 * - 'track-pushed': Instance pushed track state update
 * - 'instance-left': Instance disconnected
 */

import { WebSocket, WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import type { InspirePluginRole } from './types';

const normalizePluginRole = (value: unknown): InspirePluginRole => {
  const role = String(value ?? '').toLowerCase();
  if (role === 'master' || role === 'relay' || role === 'create') return role;
  return 'legacy';
};

const buildPresenceLabel = (role: InspirePluginRole, username: string): string =>
  `[${role.toUpperCase()}] ${username || 'Unknown'}`;

export interface WSClient {
  ws: WebSocket;
  roomCode: string;
  pluginInstanceId: string;
  username: string;
  pluginRole: InspirePluginRole;
  masterInstanceId?: string;
  presenceLabel: string;
  connectedAt: number;
}

export interface WSMessage {
  type: 'join' | 'track-pushed' | 'instance-left' | 'sync-request' | 'sync-response';
  pluginInstanceId: string;
  roomCode: string;
  username?: string;
  pluginRole?: InspirePluginRole;
  masterInstanceId?: string;
  version?: number;
  timestamp?: number;
  [key: string]: any;
}

export interface ConnectedVSTInstance {
  pluginInstanceId: string;
  roomCode: string;
  username: string;
  pluginRole: InspirePluginRole;
  masterInstanceId?: string;
  presenceLabel: string;
  connectedAt: number;
}

export class VSTSyncManager extends EventEmitter {
  private wss: WebSocketServer;
  private clients = new Map<string, WSClient>();
  private recentPushes = new Map<string, Array<{ pluginInstanceId: string; version: number; timestamp: number }>>();

  constructor(server: any) {
    super();
    this.wss = new WebSocketServer({ server, path: '/ws/sync' });
    this.setupConnectionHandler();
  }

  private setupConnectionHandler() {
    this.wss.on('connection', (ws: WebSocket) => {
      let clientId: string = '';
      let roomCode: string = '';

      ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString()) as WSMessage;

          if (!msg.type || !msg.roomCode) {
            ws.send(JSON.stringify({ error: 'Invalid message format' }));
            return;
          }

          roomCode = msg.roomCode;
          clientId = msg.pluginInstanceId;

          switch (msg.type) {
            case 'join':
              this.handleJoin(clientId, msg, ws);
              break;

            case 'track-pushed':
              this.handleTrackPushed(clientId, msg);
              break;

            case 'sync-request':
              this.handleSyncRequest(clientId, msg, ws);
              break;

            default:
              console.log(`[WSS] Unknown message type: ${msg.type}`);
          }
        } catch (err) {
          console.error('[WSS] Message parsing error:', err);
          ws.send(JSON.stringify({ error: 'Message parse failed' }));
        }
      });

      ws.on('close', () => {
        if (clientId && roomCode) {
          this.handleDisconnect(clientId, roomCode);
        }
      });

      ws.on('error', (err: Error) => {
        console.error('[WSS] Connection error:', err);
      });
    });
  }

  private handleJoin(clientId: string, msg: WSMessage, ws: WebSocket) {
    const { roomCode } = msg;
    const pluginRole = normalizePluginRole(msg.pluginRole);
    const username = String(msg.username || 'Unknown').trim() || 'Unknown';
    const presenceLabel = buildPresenceLabel(pluginRole, username);

    this.clients.set(clientId, {
      ws,
      roomCode,
      pluginInstanceId: clientId,
      username,
      pluginRole,
      masterInstanceId: msg.masterInstanceId,
      presenceLabel,
      connectedAt: Date.now()
    });

    console.log(`[WSS] Instance ${clientId.slice(0, 8)} joined room ${roomCode} as ${pluginRole}`);

    // Broadcast instance joined to room
    this.broadcastToRoom(roomCode, {
      type: 'instance-joined',
      pluginInstanceId: clientId,
      username: presenceLabel,
      displayName: username,
      pluginRole,
      masterInstanceId: msg.masterInstanceId,
      presenceLabel,
      timestamp: Date.now()
    });

    // Send current instances list to joining client
    this.sendInstancesList(clientId, roomCode);
  }

  private handleTrackPushed(clientId: string, msg: WSMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { roomCode } = client;
    const { version, timestamp } = msg;

    // Track recent push for this room
    if (!this.recentPushes.has(roomCode)) {
      this.recentPushes.set(roomCode, []);
    }

    const pushRecord = {
      pluginInstanceId: clientId,
      version: version || 0,
      timestamp: timestamp || Date.now()
    };

    const pushList = this.recentPushes.get(roomCode)!;
    pushList.splice(0, 0, pushRecord);  // Add to front
    if (pushList.length > 50) pushList.pop();  // Keep last 50

    console.log(`[WSS] Track pushed: ${clientId.slice(0, 8)} v${version} in ${roomCode}`);

    // Broadcast to room
    this.broadcastToRoom(roomCode, {
      type: 'track-update',
      pluginInstanceId: clientId,
      username: client.presenceLabel,
      displayName: client.username,
      pluginRole: client.pluginRole,
      masterInstanceId: client.masterInstanceId,
      version: version || 0,
      timestamp: timestamp || Date.now()
    });
  }

  private handleSyncRequest(clientId: string, msg: WSMessage, ws: WebSocket) {
    const { roomCode } = msg;
    const recentList = this.recentPushes.get(roomCode) || [];

    ws.send(JSON.stringify({
      type: 'sync-response',
      roomCode,
      recentPushes: recentList.slice(0, 20)
    }));
  }

  private handleDisconnect(clientId: string, roomCode: string) {
    const disconnectedClient = this.clients.get(clientId);
    this.clients.delete(clientId);
    console.log(`[WSS] Instance ${clientId.slice(0, 8)} left room ${roomCode}`);

    this.broadcastToRoom(roomCode, {
      type: 'instance-left',
      pluginInstanceId: clientId,
      username: disconnectedClient?.presenceLabel,
      displayName: disconnectedClient?.username,
      pluginRole: disconnectedClient?.pluginRole,
      masterInstanceId: disconnectedClient?.masterInstanceId,
      presenceLabel: disconnectedClient?.presenceLabel,
      timestamp: Date.now()
    });
  }

  private broadcastToRoom(roomCode: string, message: any, excludeId?: string) {
    this.clients.forEach((client, id) => {
      if (client.roomCode === roomCode && id !== excludeId) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify(message));
        }
      }
    });
  }

  private sendInstancesList(recipientId: string, roomCode: string) {
    const recipientClient = this.clients.get(recipientId);
    if (!recipientClient || recipientClient.ws.readyState !== WebSocket.OPEN) return;

    const instances = Array.from(this.clients.values())
      .filter(c => c.roomCode === roomCode)
      .map(c => ({
        instanceId: c.pluginInstanceId,
        username: c.presenceLabel,
        displayName: c.username,
        pluginRole: c.pluginRole,
        masterInstanceId: c.masterInstanceId,
        presenceLabel: c.presenceLabel,
        connectedAt: c.connectedAt
      }));

    recipientClient.ws.send(JSON.stringify({
      type: 'instances-list',
      roomCode,
      instances,
      timestamp: Date.now()
    }));
  }

  /**
   * Get recent pushes for a room (used by polling endpoint)
   */
  public getRecentPushes(roomCode: string, since?: number): Array<{
    pluginInstanceId: string;
    version: number;
    timestamp: number;
  }> {
    const pushList = this.recentPushes.get(roomCode) || [];

    if (since) {
      return pushList.filter(p => p.timestamp > since);
    }

    return pushList;
  }

  /**
   * Record a push from REST API (for instances that don't use WebSocket)
   */
  public recordPush(roomCode: string, pluginInstanceId: string, version: number) {
    if (!this.recentPushes.has(roomCode)) {
      this.recentPushes.set(roomCode, []);
    }

    const pushList = this.recentPushes.get(roomCode)!;
    pushList.splice(0, 0, {
      pluginInstanceId,
      version,
      timestamp: Date.now()
    });

    if (pushList.length > 50) pushList.pop();

    // Also broadcast via WebSocket to connected clients
    this.broadcastToRoom(roomCode, {
      type: 'track-update',
      pluginInstanceId,
      version,
      timestamp: Date.now()
    });
  }

  /**
   * Get connected client count
   */
  public getActiveClients(roomCode?: string): number {
    if (roomCode) {
      return Array.from(this.clients.values()).filter(c => c.roomCode === roomCode).length;
    }
    return this.clients.size;
  }

  /**
   * Get connected VST instances, optionally filtered by room.
   */
  public getConnectedInstances(roomCode?: string): ConnectedVSTInstance[] {
    return Array.from(this.clients.values())
      .filter(c => !roomCode || c.roomCode === roomCode)
      .map(c => ({
        pluginInstanceId: c.pluginInstanceId,
        roomCode: c.roomCode,
        username: c.presenceLabel,
        pluginRole: c.pluginRole,
        masterInstanceId: c.masterInstanceId,
        presenceLabel: c.presenceLabel,
        connectedAt: c.connectedAt
      }));
  }

  /**
   * Broadcast arbitrary message to room
   */
  public broadcastMessage(roomCode: string, message: any, excludeId?: string) {
    this.broadcastToRoom(roomCode, message, excludeId);
  }
}

export function setupWebSocketServer(server: any): VSTSyncManager {
  return new VSTSyncManager(server);
}
