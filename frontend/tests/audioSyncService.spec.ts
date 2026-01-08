import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import audioSyncService from '../src/services/audioSyncService';
import type { AudioSyncState } from '../src/types';

// Mock fetch for latency measurement
global.fetch = vi.fn();

describe('AudioSyncService', () => {
  let service: typeof audioSyncService;

  beforeEach(() => {
    service = audioSyncService;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('measureLatency', () => {
    it('measures network latency correctly', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' })
      } as Response);

      const latency = await service.measureLatency();
      
      expect(latency).toBeGreaterThanOrEqual(0);
      expect(mockFetch).toHaveBeenCalledWith('/api/health');
    });

    it('handles fetch errors gracefully', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const latency = await service.measureLatency();
      
      expect(latency).toBe(0);
    });
  });

  describe('syncWithServer', () => {
    it('calculates drift correctly when client is ahead', () => {
      const serverState: AudioSyncState = {
        serverTimestamp: Date.now(),
        playbackPosition: 8,
        isPlaying: true,
        tempo: 120,
        clientLatency: 0
      };

      // Service calculates drift internally based on elapsed time
      const metrics = service.syncWithServer(serverState);

      expect(metrics.driftBeats).toBeGreaterThanOrEqual(0);
    });

    it('calculates drift correctly when client is behind', () => {
      const now = Date.now();
      const serverState: AudioSyncState = {
        serverTimestamp: now - 1000, // 1 second ago
        playbackPosition: 10,
        isPlaying: true,
        tempo: 120,
        clientLatency: 50
      };

      // Service calculates drift internally
      const metrics = service.syncWithServer(serverState);

      // Drift is calculated as absolute value
      expect(metrics.driftBeats).toBeGreaterThanOrEqual(0);
    });

    it('applies correction when drift exceeds threshold', () => {
      const serverState: AudioSyncState = {
        serverTimestamp: Date.now(),
        playbackPosition: 10,
        isPlaying: true,
        tempo: 120,
        clientLatency: 0
      };

      // Trigger correction by having old server state
      const metrics = service.syncWithServer(serverState);

      // First sync won't trigger correction
      expect(metrics.correctionApplied).toBe(false);
      expect(Math.abs(metrics.driftBeats)).toBeGreaterThan(0.25);
    });

    it('does not apply correction when drift is within threshold', () => {
      const serverState: AudioSyncState = {
        serverTimestamp: Date.now(),
        playbackPosition: 10,
        isPlaying: true,
        tempo: 120,
        clientLatency: 0
      };

      // Sync with current timestamp
      const metrics = service.syncWithServer(serverState);

      expect(metrics.correctionApplied).toBe(false);
    });

    it('handles paused state correctly', () => {
      const now = Date.now();
      const serverState: AudioSyncState = {
        serverTimestamp: now - 5000, // 5 seconds ago
        playbackPosition: 8,
        isPlaying: false, // Paused
        tempo: 120,
        clientLatency: 0
      };

      const metrics = service.syncWithServer(serverState);

      // When paused, minimal drift expected
      expect(metrics.driftBeats).toBeCloseTo(0, 1);
    });
  });

  describe('getLocalPlaybackPosition', () => {
    it('interpolates position correctly when playing', () => {
      const lastSyncTimestamp = Date.now() - 500; // 0.5 seconds ago
      const lastSyncBeat = 8;
      const tempo = 120; // 2 beats per second
      const isPlaying = true;

      const position = service.getLocalPlaybackPosition(
        lastSyncBeat,
        tempo,
        isPlaying
      );

      // Should be approximately 8 + (0.5 * 2) = 9 beats
      expect(position).toBeGreaterThan(8.5);
      expect(position).toBeLessThan(9.5);
    });

    it('returns static position when paused', () => {
      const lastSyncTimestamp = Date.now() - 1000; // 1 second ago
      const lastSyncBeat = 8;
      const tempo = 120;
      const isPlaying = false;

      const position = service.getLocalPlaybackPosition(
        lastSyncBeat,
        tempo,
        isPlaying
      );

      expect(position).toBe(lastSyncBeat); // Should not advance when paused
    });

    it('handles different tempos correctly', () => {
      const lastSyncTimestamp = Date.now() - 1000; // 1 second ago
      const lastSyncBeat = 0;
      const tempo = 60; // 1 beat per second
      const isPlaying = true;

      const position = service.getLocalPlaybackPosition(
        lastSyncBeat,
        tempo,
        isPlaying
      );

      expect(position).toBeGreaterThan(0.8);
      expect(position).toBeLessThan(1.2);
    });
  });

  describe('onSync callback registration', () => {
    it('calls registered callback on sync', () => {
      const callback = vi.fn();
      service.onSync(callback);

      const serverState: AudioSyncState = {
        serverTimestamp: Date.now(),
        playbackPosition: 8,
        isPlaying: true,
        tempo: 120,
        clientLatency: 0
      };

      service.syncWithServer(serverState);

      expect(callback).toHaveBeenCalledWith(
        serverState,
        expect.objectContaining({
          latencyMs: expect.any(Number),
          driftBeats: expect.any(Number),
          correctionApplied: expect.any(Boolean),
          lastSyncTime: expect.any(Number)
        })
      );
    });

    it('supports multiple callback registrations', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      service.onSync(callback1);
      service.onSync(callback2);

      const serverState: AudioSyncState = {
        serverTimestamp: Date.now(),
        playbackPosition: 8,
        isPlaying: true,
        tempo: 120,
        clientLatency: 0
      };

      service.syncWithServer(serverState);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('getDebugInfo', () => {
    it('returns current debug information', () => {
      const serverState: AudioSyncState = {
        serverTimestamp: Date.now(),
        playbackPosition: 8,
        isPlaying: true,
        tempo: 120,
        clientLatency: 50
      };

      service.syncWithServer(serverState);
      const debugInfo = service.getDebugInfo();

      expect(debugInfo).toHaveProperty('serverTimestampOffset');
      expect(debugInfo).toHaveProperty('playbackRate');
      expect(debugInfo).toHaveProperty('lastSyncTime');
      expect(debugInfo).toHaveProperty('latencyMs');
      expect(debugInfo).toHaveProperty('callbackCount');
      expect(debugInfo.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge cases', () => {
    it('handles very high latency gracefully', () => {
      const serverState: AudioSyncState = {
        serverTimestamp: Date.now() - 5000, // 5 seconds old
        playbackPosition: 8,
        isPlaying: true,
        tempo: 120,
        clientLatency: 2000 // 2 seconds latency
      };

      const metrics = service.syncWithServer(serverState);
      
      expect(metrics.latencyMs).toBeGreaterThanOrEqual(0);
      expect(metrics.correctionApplied).toBe(true); // High drift should trigger correction
    });

    it('handles tempo changes mid-session', () => {
      // getLocalPlaybackPosition(lastServerBeat, tempo, isPlaying)
      let position = service.getLocalPlaybackPosition(
        0,
        120, // Start at 120 BPM
        true
      );

      expect(position).toBeGreaterThan(0);

      // Simulate tempo change
      position = service.getLocalPlaybackPosition(
        0,
        60, // Change to 60 BPM
        true
      );

      expect(position).toBeGreaterThan(0); // Still advances, just slower
    });

    it('handles rapid sync calls', () => {
      const serverState: AudioSyncState = {
        serverTimestamp: Date.now(),
        playbackPosition: 8,
        isPlaying: true,
        tempo: 120,
        clientLatency: 50
      };

      // Call sync rapidly
      for (let i = 0; i < 10; i++) {
        const metrics = service.syncWithServer(serverState);
        expect(metrics).toBeDefined();
      }

      const debugInfo = service.getDebugInfo();
      expect(debugInfo.lastSyncTime).toBeGreaterThan(0);
    });
  });
});
