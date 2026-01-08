/**
 * Audio Sync Service
 * 
 * Manages real-time audio playback synchronization across collaborative sessions.
 * Ensures all participants have a consistent playback position despite network latency.
 */

import type { AudioSyncState } from '../types';

export interface SyncMetrics {
  latencyMs: number;
  driftBeats: number;
  correctionApplied: boolean;
  lastSyncTime: number;
}

export interface AudioSyncConfig {
  maxDriftBeats: number; // threshold for correction (default 0.25 beats)
  syncIntervalMs: number; // how often to sync (default 500ms)
  latencyCompensation: boolean; // apply latency offset
}

class AudioSyncService {
  private serverTimestampOffset: number = 0; // local - server time difference
  private playbackRate: number = 1.0;
  private lastSyncTime: number = 0;
  private latencyMs: number = 0;
  private config: AudioSyncConfig;
  private syncCallbacks: Array<(state: AudioSyncState, metrics: SyncMetrics) => void> = [];

  constructor(config: Partial<AudioSyncConfig> = {}) {
    this.config = {
      maxDriftBeats: config.maxDriftBeats ?? 0.25,
      syncIntervalMs: config.syncIntervalMs ?? 500,
      latencyCompensation: config.latencyCompensation ?? true
    };
  }

  /**
   * Measure round-trip latency to server
   */
  async measureLatency(): Promise<number> {
    const start = performance.now();
    try {
      const response = await fetch('/api/health', {
        method: 'GET'
      });
      if (!response.ok) throw new Error('Health check failed');
      const elapsed = performance.now() - start;
      this.latencyMs = elapsed / 2; // assume symmetric latency
      return this.latencyMs;
    } catch (err) {
      console.warn('[AudioSync] Failed to measure latency:', err);
      return this.latencyMs; // return last known value
    }
  }

  /**
   * Sync with server time and playback state
   * Call this whenever you receive an update from the server
   */
  syncWithServer(serverState: AudioSyncState): SyncMetrics {
    const now = performance.now();
    const timeSinceLastSync = now - this.lastSyncTime;

    // Calculate how far the playhead should have moved locally
    const expectedBeatsAdvanced = (timeSinceLastSync / 1000) * (serverState.tempo / 60);
    const expectedPlaybackPosition = 
      this.config.latencyCompensation 
        ? serverState.playbackPosition + expectedBeatsAdvanced 
        : serverState.playbackPosition;

    // Detect drift
    const driftBeats = Math.abs(expectedPlaybackPosition - serverState.playbackPosition);
    const correctionNeeded = driftBeats > this.config.maxDriftBeats && serverState.isPlaying;

    if (correctionNeeded) {
      // Apply correction: jump to server position (with latency compensation)
      this.serverTimestampOffset = Math.floor(now - serverState.serverTimestamp);
    }

    this.lastSyncTime = now;

    const metrics: SyncMetrics = {
      latencyMs: this.latencyMs,
      driftBeats,
      correctionApplied: correctionNeeded,
      lastSyncTime: now
    };

    // Notify listeners
    this.syncCallbacks.forEach(cb => {
      try {
        cb(serverState, metrics);
      } catch (err) {
        console.error('[AudioSync] Callback error:', err);
      }
    });

    return metrics;
  }

  /**
   * Get the current playback position accounting for local playback
   * Call frequently during playback to smooth out position updates
   */
  getLocalPlaybackPosition(
    lastServerBeat: number,
    tempo: number,
    isPlaying: boolean
  ): number {
    if (!isPlaying) return lastServerBeat;

    const now = performance.now();
    const elapsedSeconds = (now - this.lastSyncTime) / 1000;
    const beatsElapsed = (elapsedSeconds * tempo) / 60;

    return lastServerBeat + beatsElapsed;
  }

  /**
   * Estimate where the playhead should be for smooth visual feedback
   * (interpolation between sync updates)
   */
  interpolatePlayheadPosition(
    basePosition: number,
    tempo: number,
    elapsedMs: number
  ): number {
    const beatsDuration = (tempo / 60) * (elapsedMs / 1000);
    return basePosition + beatsDuration;
  }

  /**
   * Register a callback to be notified on sync events
   */
  onSync(callback: (state: AudioSyncState, metrics: SyncMetrics) => void): () => void {
    this.syncCallbacks.push(callback);
    return () => {
      const idx = this.syncCallbacks.indexOf(callback);
      if (idx >= 0) this.syncCallbacks.splice(idx, 1);
    };
  }

  /**
   * Get current sync state for debugging
   */
  getDebugInfo() {
    return {
      serverTimestampOffset: this.serverTimestampOffset,
      playbackRate: this.playbackRate,
      lastSyncTime: this.lastSyncTime,
      latencyMs: this.latencyMs,
      callbackCount: this.syncCallbacks.length
    };
  }

  /**
   * Reset sync state (call when stopping playback or leaving session)
   */
  reset(): void {
    this.serverTimestampOffset = 0;
    this.playbackRate = 1.0;
    this.lastSyncTime = 0;
    this.latencyMs = 0;
  }
}

// Export singleton instance
export const audioSyncService = new AudioSyncService();

export default audioSyncService;
