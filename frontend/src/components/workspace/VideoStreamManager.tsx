/**
 * VideoStreamManager
 * 
 * Manages up to 4 concurrent video streams in a collaborative session.
 * Handles WebRTC peer connections, stream controls, layout switching.
 * Supports audio/video capture, muting, and viewer spectating.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { CollaborativeSessionParticipant } from '../../types';
import './VideoStreamManager.css';

export interface VideoStreamManagerProps {
  localUserId: string;
  localUsername: string;
  participants: CollaborativeSessionParticipant[];
  viewers: CollaborativeSessionParticipant[];
  maxStreams?: number;
  onStreamJoin?: (userId: string, stream: MediaStream) => void;
  onStreamLeave?: (userId: string) => void;
  onControlChange?: (userId: string, control: 'audio' | 'video', enabled: boolean) => void;
}

interface StreamTrack {
  userId: string;
  username: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  stream?: MediaStream;
  isLocal: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}

const GRID_LAYOUTS = {
  1: 'stream-grid-1',
  2: 'stream-grid-2',
  3: 'stream-grid-3',
  4: 'stream-grid-4'
} as const;

export function VideoStreamManager({
  localUserId,
  localUsername,
  participants,
  viewers,
  maxStreams = 4,
  onStreamJoin,
  onStreamLeave,
  onControlChange
}: VideoStreamManagerProps) {
  const [streams, setStreams] = useState<Map<string, StreamTrack>>(new Map());
  const [layout, setLayout] = useState<1 | 2 | 3 | 4>(1);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Request user's camera/microphone
  const initializeLocalStream = useCallback(async () => {
    try {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices) {
        const isHTTPS = window.location.protocol === 'https:';
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        let errorMsg = 'Camera/microphone access not available. ';
        if (!isLocalhost && !isHTTPS) {
          errorMsg += 'You must use HTTPS or access via localhost (http://localhost:8080).';
        } else {
          errorMsg += 'mediaDevices API is not supported in your browser or context. Try a modern browser (Chrome, Firefox, Safari).';
        }
        
        setError(errorMsg);
        console.warn('[VideoStreamManager]', {
          mediaDevices: !!navigator.mediaDevices,
          protocol: window.location.protocol,
          hostname: window.location.hostname,
          isLocalhost,
          isHTTPS
        });
        return;
      }

      if (!navigator.mediaDevices.getUserMedia) {
        setError('getUserMedia is not supported. Please use a modern browser (Chrome, Firefox, Safari Edge).');
        console.warn('[VideoStreamManager] getUserMedia not supported');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      setLocalStream(stream);
      setError(null);

      // Create local stream track
      const localTrack: StreamTrack = {
        userId: localUserId,
        username: localUsername,
        videoRef: React.createRef<HTMLVideoElement>(),
        audioRef: React.createRef<HTMLAudioElement>(),
        stream,
        isLocal: true,
        isAudioEnabled: true,
        isVideoEnabled: true
      };

      setStreams(prev => new Map(prev).set(localUserId, localTrack));
      onStreamJoin?.(localUserId, stream);
    } catch (err) {
      let message = 'Failed to access camera/microphone';
      
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          message = '🔒 Camera/microphone access denied. Click the lock icon in your address bar and allow camera/microphone, then refresh.';
        } else if (err.name === 'NotFoundError') {
          message = '📷 No camera or microphone detected. Connect a camera or use a virtual camera (OBS Virtual Camera).';
        } else if (err.name === 'NotReadableError') {
          message = '⚠️ Camera/microphone is already in use. Close other apps using your camera (Zoom, FaceTime, etc).';
        } else if (err.name === 'SecurityError') {
          message = '🔐 Security error. Ensure you\'re using localhost (http://localhost:8080) or HTTPS. Check browser console for details.';
        } else {
          message = `Error: ${err.name} - ${err.message}`;
        }
      } else if (err instanceof Error) {
        message = `Error: ${err.message}`;
      }
      
      setError(message);
      console.error('[VideoStreamManager] Failed to initialize local stream:', {
        error: err,
        errorName: err instanceof DOMException ? err.name : 'Unknown',
        location: window.location.href,
        protocol: window.location.protocol,
        hostname: window.location.hostname
      });
    }
  }, [localUserId, localUsername, onStreamJoin]);

  // Initialize local stream on mount
  useEffect(() => {
    void initializeLocalStream();

    return () => {
      // Cleanup: stop all tracks
      localStream?.getTracks().forEach(track => track.stop());
    };
  }, [initializeLocalStream, localStream]);

  // Add remote streams when participants join
  useEffect(() => {
    const activeParticipants = participants.filter(p => p.isActive && p.userId !== localUserId);
    const activeCount = Math.min(activeParticipants.length, maxStreams - 1);

    // Update grid layout based on participant count (including local)
    const newLayout = Math.min(
      Math.max(1, Math.min(4, activeCount + 1)) as 1 | 2 | 3 | 4,
      4
    );
    setLayout(newLayout as 1 | 2 | 3 | 4);

    // In production, you'd handle WebRTC peer connections here
    // For now, we'll show placeholder streams
    activeParticipants.slice(0, maxStreams - 1).forEach(participant => {
      if (!streams.has(participant.userId)) {
        const streamTrack: StreamTrack = {
          userId: participant.userId,
          username: participant.username,
          videoRef: React.createRef<HTMLVideoElement>(),
          audioRef: React.createRef<HTMLAudioElement>(),
          isLocal: false,
          isAudioEnabled: participant.audioEnabled,
          isVideoEnabled: participant.videoEnabled
        };
        setStreams(prev => new Map(prev).set(participant.userId, streamTrack));
      }
    });
  }, [participants, localUserId, maxStreams]);

  // Attach local stream to video element
  useEffect(() => {
    const localTrack = streams.get(localUserId);
    if (localTrack?.videoRef.current && localStream) {
      localTrack.videoRef.current.srcObject = localStream;
    }
  }, [streams, localStream, localUserId]);

  const toggleAudio = useCallback((userId: string) => {
    const track = streams.get(userId);
    if (!track || !track.stream) return;

    track.stream.getAudioTracks().forEach(audioTrack => {
      audioTrack.enabled = !audioTrack.enabled;
    });

    const newEnabled = track.stream.getAudioTracks()[0]?.enabled ?? false;
    setStreams(prev => {
      const updated = new Map(prev);
      const streamTrack = updated.get(userId);
      if (streamTrack) {
        streamTrack.isAudioEnabled = newEnabled;
      }
      return updated;
    });

    onControlChange?.(userId, 'audio', newEnabled);
  }, [streams, onControlChange]);

  const toggleVideo = useCallback((userId: string) => {
    const track = streams.get(userId);
    if (!track || !track.stream) return;

    track.stream.getVideoTracks().forEach(videoTrack => {
      videoTrack.enabled = !videoTrack.enabled;
    });

    const newEnabled = track.stream.getVideoTracks()[0]?.enabled ?? false;
    setStreams(prev => {
      const updated = new Map(prev);
      const streamTrack = updated.get(userId);
      if (streamTrack) {
        streamTrack.isVideoEnabled = newEnabled;
      }
      return updated;
    });

    onControlChange?.(userId, 'video', newEnabled);
  }, [streams, onControlChange]);

  const leaveSession = useCallback(() => {
    // Stop all local tracks
    localStream?.getTracks().forEach(track => track.stop());
    setLocalStream(null);
    setStreams(new Map());
    onStreamLeave?.(localUserId);
  }, [localStream, localUserId, onStreamLeave]);

  const layoutClass = GRID_LAYOUTS[layout];
  const activeStreamCount = streams.size;

  return (
    <div className="video-stream-manager">
      {/* Error banner with helpful instructions */}
      {error && (
        <div className="video-error-banner">
          <div style={{ marginBottom: '8px' }}>
            <p style={{ margin: '0 0 6px 0', fontWeight: 'bold' }}>⚠️ Camera/Microphone Error</p>
            <p style={{ margin: '0 0 6px 0' }}>{error}</p>
            <details style={{ margin: '8px 0', fontSize: '0.9em', color: '#666' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 500 }}>Need help?</summary>
              <div style={{ marginTop: '8px', lineHeight: '1.4', paddingLeft: '12px' }}>
                <p style={{ margin: '4px 0' }}>
                  <strong>✓ Make sure you're using:</strong> http://<strong>localhost</strong>:8080
                </p>
                <p style={{ margin: '4px 0' }}>
                  <strong>✗ Not:</strong> http://127.0.0.1:8080 or an IP address
                </p>
                <p style={{ margin: '4px 0' }}>
                  1. Check your address bar shows "localhost"
                </p>
                <p style={{ margin: '4px 0' }}>
                  2. Grant camera permissions in browser settings
                </p>
                <p style={{ margin: '4px 0' }}>
                  3. Close other apps using your camera
                </p>
                <p style={{ margin: '4px 0' }}>
                  See <a href="/CAMERA_TROUBLESHOOTING.md" target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc' }}>CAMERA_TROUBLESHOOTING.md</a> for more help
                </p>
              </div>
            </details>
          </div>
          <button
            type="button"
            className="btn secondary micro"
            onClick={() => {
              setError(null);
              void initializeLocalStream();
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Video grid */}
      <div className={`video-grid ${layoutClass}`} ref={containerRef}>
        {Array.from(streams.values()).map(track => (
          <div key={track.userId} className={`video-tile ${track.isLocal ? 'local' : 'remote'}`}>
            {/* Video element (only show if video enabled) */}
            {track.isVideoEnabled && (
              <video
                ref={track.videoRef}
                autoPlay
                playsInline
                muted={track.isLocal}
                className="video-feed"
              />
            )}

            {/* Placeholder if video is off */}
            {!track.isVideoEnabled && (
              <div className="video-placeholder">
                <div className="avatar">{track.username.charAt(0).toUpperCase()}</div>
              </div>
            )}

            {/* Audio element (remote only, local is muted via video element) */}
            {!track.isLocal && (
              <audio
                ref={track.audioRef}
                autoPlay
                playsInline
              />
            )}

            {/* User info and controls */}
            <div className="video-overlay">
              <div className="video-info">
                <span className="username">{track.username}</span>
                {track.isLocal && <span className="badge">You</span>}
              </div>

              <div className="video-controls">
                <button
                  type="button"
                  className={`btn-control ${track.isAudioEnabled ? 'enabled' : 'disabled'}`}
                  title={track.isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                  onClick={() => toggleAudio(track.userId)}
                  aria-label={`Toggle audio for ${track.username}`}
                >
                  {track.isAudioEnabled ? '🎤' : '🔇'}
                </button>
                <button
                  type="button"
                  className={`btn-control ${track.isVideoEnabled ? 'enabled' : 'disabled'}`}
                  title={track.isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                  onClick={() => toggleVideo(track.userId)}
                  aria-label={`Toggle video for ${track.username}`}
                >
                  {track.isVideoEnabled ? '📹' : '📷'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Layout and controls bar */}
      <div className="video-controls-bar">
        <div className="layout-selector">
          <label htmlFor="layout-select">Layout:</label>
          <select
            id="layout-select"
            value={layout}
            onChange={e => setLayout(Number(e.target.value) as 1 | 2 | 3 | 4)}
            className="select"
          >
            {[1, 2, 3, 4].map(n => (
              <option key={n} value={n}>
                {n} stream{n > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="stream-count">
          {activeStreamCount} / {maxStreams} active
        </div>

        <div className="control-actions">
          <button
            type="button"
            className="btn tertiary"
            onClick={leaveSession}
            title="Leave the session"
          >
            Leave Session
          </button>
        </div>
      </div>

      {/* Viewer count */}
      {viewers.length > 0 && (
        <div className="viewer-count-badge">
          👁️ {viewers.length} viewer{viewers.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
