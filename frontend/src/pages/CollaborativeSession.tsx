/**
 * CollaborativeSessionDetail
 * 
 * Main page for viewing/participating in a collaborative session.
 * Displays video streams, shared DAW, comments, and viewer list.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type {
  CollaborativeSession,
  CommentThread,
  DAWNote,
  DAWSession,
  DAWTrack,
  DAWTrackState
} from '../types';
import { VideoStreamManager } from '../components/workspace/VideoStreamManager';
import { CollaborativeDAW } from '../components/workspace/CollaborativeDAW';
import { useAuth } from '../context/AuthContext';
import { liveExportService } from '../services/liveExportService';
import { pullTrackState, pushTrackState } from '../services/dawSyncService';
import './CollaborativeSessionDetail.css';

interface SessionTimer {
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export interface CollaborativeSessionDetailProps {
  session: CollaborativeSession;
  localUserId: string;
  localUsername: string;
  userRole: 'host' | 'collaborator' | 'viewer';
  onSessionUpdate?: (session: CollaborativeSession) => void;
  onLeaveSession?: () => void;
}

interface NewComment {
  content: string;
}

export function CollaborativeSessionDetail({
  session,
  localUserId,
  localUsername,
  userRole,
  onSessionUpdate,
  onLeaveSession
}: CollaborativeSessionDetailProps) {
  const [comments, setComments] = useState<CommentThread[]>(session.comments);
  const [newComment, setNewComment] = useState<NewComment>({ content: '' });
  const [showComments, setShowComments] = useState(true);
  const [userVotes, setUserVotes] = useState<Map<string, 'upvote' | 'downvote'>>(new Map());
  const [sessionTimer, setSessionTimer] = useState<SessionTimer>({ minutes: 0, seconds: 0, isExpired: false });
  const { user, loading: authLoading } = useAuth();
  const [activeHubTab, setActiveHubTab] = useState<'daw' | 'packs' | 'analytics' | 'create'>('daw');
  const [liveDestinations, setLiveDestinations] = useState<{ tiktok: boolean; instagram: boolean }>({ tiktok: false, instagram: false });
  const [recentPacks, setRecentPacks] = useState<any[]>([]);
  const trackVersionsRef = useRef<Map<string, number>>(new Map());
  const [syncConflict, setSyncConflict] = useState<{
    trackId: string;
    server: { version: number; updatedAt: number; updatedBy?: string; state: DAWTrackState };
    local: DAWTrackState;
  } | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const isHost = userRole === 'host';
  const canCollaborate = isHost || userRole === 'collaborator';

  const isAuthorized = !!user || !!localUserId || Boolean((session as any).isGuestSession);
  const isSessionExpired = sessionTimer.isExpired && (session as any).isGuestSession;

  // Timer for guest sessions
  useEffect(() => {
    if (!session || !(session as any).expiresAt) return;

    const updateTimer = () => {
      const expiresAt = (session as any).expiresAt;
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);
      
      if (remaining === 0) {
        setSessionTimer({ minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setSessionTimer({ minutes, seconds, isExpired: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session]);

  // Show expired modal when session expires
  useEffect(() => {
    if (sessionTimer.isExpired && (session as any).isGuestSession && !showExpiredModal) {
      setShowExpiredModal(true);
    }
  }, [sessionTimer.isExpired, session, showExpiredModal]);

  // Update comments when session changes
  useEffect(() => {
    setComments(session.comments);
  }, [session.comments]);

  // Fetch recent packs for the Packs tab
  useEffect(() => {
    const fetchRecentPacks = async () => {
      try {
        const response = await fetch(`/api/packs/recent?limit=5`);
        if (response.ok) {
          const packs = await response.json();
          setRecentPacks(Array.isArray(packs) ? packs : []);
        }
      } catch (err) {
        console.warn('Failed to load recent packs:', err);
        // Fallback to empty list
        setRecentPacks([]);
      }
    };
    
    if (activeHubTab === 'packs') {
      void fetchRecentPacks();
    }
  }, [activeHubTab]);

  // Keyboard shortcuts for tab navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        const updatedSession = { ...session, daw: { ...session.daw, isPlaying: !session.daw.isPlaying } };
        onSessionUpdate?.(updatedSession);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [session, onSessionUpdate]);

  // Sync live exports with playback and destination toggles
  useEffect(() => {
    if (!isHost) return;

    // Start/stop exports based on playback state and enabled destinations
    if (session.daw.isPlaying) {
      if (liveDestinations.tiktok) {
        liveExportService.startExport({
          sessionId: session.id,
          destination: 'tiktok',
          isEnabled: true
        }).catch(err => console.error('Failed to start TikTok export:', err));
      }
      if (liveDestinations.instagram) {
        liveExportService.startExport({
          sessionId: session.id,
          destination: 'instagram',
          isEnabled: true
        }).catch(err => console.error('Failed to start Instagram export:', err));
      }
    } else {
      // Stop exports when playback stops
      liveExportService.stopExport(session.id, 'tiktok');
      liveExportService.stopExport(session.id, 'instagram');
    }

    return () => {
      // Cleanup on unmount
      liveExportService.stopSessionExports(session.id);
    };
  }, [session.daw.isPlaying, liveDestinations, session.id, isHost]);

  // Add a comment
  const handleAddComment = useCallback(async () => {
    if (!newComment.content.trim()) return;

    const comment: CommentThread = {
      id: `comment-${Date.now()}`,
      userId: localUserId,
      username: localUsername,
      content: newComment.content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isEdited: false,
      voteCount: 0
    };

    setComments(prev => [comment, ...prev]);
    setNewComment({ content: '' });

    // Emit to server
    onSessionUpdate?.({
      ...session,
      comments: [comment, ...session.comments]
    });
  }, [newComment, localUserId, localUsername, session, onSessionUpdate]);

  // Handle comment vote
  const handleCommentVote = useCallback(
    (commentId: string, voteType: 'upvote' | 'downvote') => {
      setUserVotes(prev => {
        const newVotes = new Map(prev);
        const existingVote = newVotes.get(commentId);

        // Toggle vote if same type, replace if different, add if none
        if (existingVote === voteType) {
          newVotes.delete(commentId);
        } else {
          newVotes.set(commentId, voteType);
        }
        return newVotes;
      });

      // Update comment vote count
      setComments(prev =>
        prev.map(c => {
          if (c.id !== commentId) return c;
          const currentVote = userVotes.get(commentId);
          let delta = voteType === 'upvote' ? 1 : -1;
          if (currentVote === voteType) delta *= -1; // Toggle
          if (currentVote && currentVote !== voteType) delta *= 2; // Switch vote type
          return { ...c, voteCount: Math.max(0, c.voteCount + delta) };
        })
      );
    },
    [userVotes]
  );

  const buildTrackState = useCallback(
    (track: DAWTrack, trackIndex: number): DAWTrackState => {
      const notesForTrack = session.daw.notes.filter((note) => note.track === trackIndex);
      return {
        roomCode: session.id,
        trackId: track.id,
        trackIndex,
        trackName: track.name,
        trackType: track.type,
        bpm: session.daw.bpm,
        tempo: session.daw.tempo ?? session.daw.bpm,
        timeSignature: session.daw.timeSignature,
        currentBeat: session.daw.currentBeat,
        clips: track.clips ?? [],
        notes: notesForTrack,
        updatedAt: Date.now(),
        updatedBy: localUserId || localUsername
      };
    },
    [localUserId, localUsername, session]
  );

  const pushTracksToSync = useCallback(
    async (tracksToPush: DAWTrack[]) => {
      if (!tracksToPush.length) return;
      await Promise.all(
        tracksToPush.map(async (track) => {
          const primaryIndex = tracksToPush.findIndex((item) => item.id === track.id);
          const fallbackIndex = (session.daw.tracks ?? []).findIndex((item) => item.id === track.id);
          const resolvedIndex = primaryIndex >= 0 ? primaryIndex : fallbackIndex >= 0 ? fallbackIndex : 0;
          const state = buildTrackState(track, resolvedIndex);
          const baseVersion = trackVersionsRef.current.get(track.id);

          try {
            const response = await pushTrackState({
              roomCode: session.id,
              trackId: track.id,
              baseVersion,
              state,
              updatedBy: localUserId || localUsername
            });

            if (response.conflict && response.current) {
              setSyncConflict({
                trackId: track.id,
                server: response.current,
                local: state
              });
              return;
            }

            if (response.version !== undefined) {
              trackVersionsRef.current.set(track.id, response.version);
              setLastSyncAt(Date.now());
            }
          } catch (err) {
            console.error('Failed to sync track:', err);
          }
        })
      );
    },
    [buildTrackState, localUserId, localUsername, session.id, session.daw.tracks]
  );

  const applyServerTrackState = useCallback(
    (trackId: string, serverState: DAWTrackState, serverVersion: number) => {
      const existingTracks = session.daw.tracks ?? [];
      const trackIndex = serverState.trackIndex ?? existingTracks.findIndex((track) => track.id === trackId);
      const resolvedIndex = trackIndex >= 0 ? trackIndex : 0;
      const existingTrack = existingTracks.find((track) => track.id === trackId);
      const updatedTracks = existingTrack
        ? existingTracks.map((track) =>
            track.id === trackId
              ? {
                  ...track,
                  name: serverState.trackName ?? track.name,
                  type: serverState.trackType ?? track.type,
                  clips: serverState.clips
                }
              : track
          )
        : [
            ...existingTracks,
            {
              id: trackId,
              name: serverState.trackName ?? 'Track',
              type: serverState.trackType ?? 'audio',
              volume: 0.8,
              isMuted: false,
              isSolo: false,
              isArmed: false,
              clips: serverState.clips
            }
          ];
      const filteredNotes = session.daw.notes.filter((note) => note.track !== resolvedIndex);
      const updatedNotes = [...filteredNotes, ...serverState.notes.map((note) => ({ ...note, track: resolvedIndex }))];
      const updatedSession = {
        ...session,
        daw: {
          ...session.daw,
          bpm: serverState.bpm,
          tempo: serverState.tempo,
          timeSignature: serverState.timeSignature,
          currentBeat: serverState.currentBeat ?? session.daw.currentBeat,
          tracks: updatedTracks,
          notes: updatedNotes
        }
      } as CollaborativeSession;

      onSessionUpdate?.(updatedSession);
      trackVersionsRef.current.set(trackId, serverVersion);
      setLastSyncAt(Date.now());
    },
    [onSessionUpdate, session]
  );

  const handleSyncConflictResolve = useCallback(
    async (action: 'use-server' | 'overwrite-server') => {
      if (!syncConflict) return;

      if (action === 'use-server') {
        applyServerTrackState(syncConflict.trackId, syncConflict.server.state, syncConflict.server.version);
        setSyncConflict(null);
        return;
      }

      try {
        const response = await pushTrackState({
          roomCode: session.id,
          trackId: syncConflict.trackId,
          baseVersion: syncConflict.server.version,
          state: syncConflict.local,
          updatedBy: localUserId || localUsername
        });

        if (response.conflict && response.current) {
          setSyncConflict({
            trackId: syncConflict.trackId,
            server: response.current,
            local: syncConflict.local
          });
          return;
        }

        if (response.version !== undefined) {
          trackVersionsRef.current.set(syncConflict.trackId, response.version);
          setLastSyncAt(Date.now());
        }

        setSyncConflict(null);
      } catch (err) {
        console.error('Failed to overwrite server state:', err);
      }
    },
    [applyServerTrackState, localUserId, localUsername, session.id, syncConflict]
  );

  // Handle note added to DAW
  const handleNoteAdd = useCallback(
    (note: DAWNote) => {
      const updatedDAW: DAWSession = {
        ...session.daw,
        notes: [...session.daw.notes, note]
      };
      onSessionUpdate?.({
        ...session,
        daw: updatedDAW
      });

      const targetTrack = session.daw.tracks?.[note.track];
      if (targetTrack) {
        void pushTracksToSync([targetTrack]);
      }
    },
    [onSessionUpdate, pushTracksToSync, session]
  );

  // Handle note removed from DAW
  const handleNoteRemove = useCallback(
    (noteId: string) => {
      const noteToRemove = session.daw.notes.find((note) => note.id === noteId);
      const updatedDAW: DAWSession = {
        ...session.daw,
        notes: session.daw.notes.filter(n => n.id !== noteId)
      };
      onSessionUpdate?.({
        ...session,
        daw: updatedDAW
      });

      if (noteToRemove) {
        const targetTrack = session.daw.tracks?.[noteToRemove.track];
        if (targetTrack) {
          void pushTracksToSync([targetTrack]);
        }
      }
    },
    [onSessionUpdate, pushTracksToSync, session]
  );

  // Handle playback state change
  const handlePlaybackStateChange = useCallback(
    (isPlaying: boolean) => {
      const updatedDAW: DAWSession = {
        ...session.daw,
        isPlaying
      };
      onSessionUpdate?.({
        ...session,
        daw: updatedDAW
      });
    },
    [session, onSessionUpdate]
  );

  const handleTempoChange = useCallback(
    (tempo: number) => {
      const updatedDAW: DAWSession = {
        ...session.daw,
        bpm: tempo,
        tempo
      };
      onSessionUpdate?.({
        ...session,
        daw: updatedDAW
      });

      const tracks = updatedDAW.tracks ?? [];
      if (tracks.length) {
        void pushTracksToSync(tracks);
      }
    },
    [onSessionUpdate, pushTracksToSync, session]
  );

  const handleTracksChange = useCallback(
    (tracks: DAWSession['tracks']) => {
      const updatedSession = {
        ...session,
        daw: { ...session.daw, tracks }
      };
      
      // Persist to backend
      fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daw: updatedSession.daw })
      }).catch(err => console.error('Failed to persist tracks:', err));
      
      // Update UI
      onSessionUpdate?.(updatedSession);

      if (tracks && tracks.length) {
        void pushTracksToSync(tracks);
      }
    },
    [onSessionUpdate, pushTracksToSync, session]
  );

  const handleRecordToggle = useCallback(
    (isRecording: boolean) => {
      const updatedSession = {
        ...session,
        daw: { ...session.daw, isRecording }
      };
      
      // Persist to backend
      fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daw: updatedSession.daw })
      }).catch(err => console.error('Failed to persist record state:', err));
      
      // Update UI
      onSessionUpdate?.(updatedSession);
    },
    [session, onSessionUpdate]
  );

  const handleLiveToggle = useCallback((destination: 'tiktok' | 'instagram') => {
    setLiveDestinations(prev => {
      const next = { ...prev, [destination]: !prev[destination] };
      const updatedSession = { ...session, liveDestinations: next } as unknown as CollaborativeSession;
      
      // Persist to backend
      fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liveDestinations: next })
      }).catch(err => console.error('Failed to persist live destinations:', err));
      
      // Update UI
      onSessionUpdate?.(updatedSession);
      return next;
    });
  }, [onSessionUpdate, session]);

  useEffect(() => {
    if (!isAuthorized) return;

    const tracks = session.daw.tracks ?? [];
    if (!tracks.length) return;

    let isActive = true;

    const syncOnce = async () => {
      await Promise.all(
        tracks.map(async (track) => {
          if (syncConflict?.trackId === track.id) return;
          const sinceVersion = trackVersionsRef.current.get(track.id) ?? 0;

          try {
            const response = await pullTrackState(session.id, track.id, sinceVersion);
            if (!isActive || !response.state) return;
            if (response.version > sinceVersion) {
              applyServerTrackState(track.id, response.state, response.version);
            }
          } catch (err) {
            console.error('Failed to pull track state:', err);
          }
        })
      );
    };

    const interval = window.setInterval(() => {
      void syncOnce();
    }, 1500);

    void syncOnce();

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [applyServerTrackState, isAuthorized, session.daw.tracks, session.id, syncConflict]);

  return (
    <div className="collaborative-session-detail">
      {/* Expired Session Modal */}
      {showExpiredModal && isSessionExpired && (
        <div className="modal-overlay" role="dialog" aria-labelledby="expired-title" aria-modal="true">
          <div className="modal-content expired-session-modal">
            <div className="modal-header">
              <h2 id="expired-title">⏱️ Guest Session Expired</h2>
            </div>
            <div className="modal-body">
              <p className="expired-message">
                Your guest collaboration session has expired after 1 hour.
              </p>
              <p className="expired-explanation">
                Guest sessions are limited to help maintain server performance. 
                To continue collaborating without time limits, please sign up for a free account.
              </p>
              <div className="expired-stats">
                <div className="stat-item">
                  <span className="stat-label">Room:</span>
                  <strong>{session.title}</strong>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Session Duration:</span>
                  <strong>60 minutes</strong>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => window.location.href = '/signup'}
              >
                Sign Up (Unlimited Sessions)
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setShowExpiredModal(false);
                  onLeaveSession?.();
                }}
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expired Session Banner (for users who dismiss modal) */}
      {isSessionExpired && !showExpiredModal && (
        <div className="expired-banner" role="alert">
          <span className="expired-banner-icon">⏱️</span>
          <div className="expired-banner-content">
            <strong>Session Expired</strong>
            <span>This guest session expired after 1 hour. Actions are disabled.</span>
          </div>
          <div className="expired-banner-actions">
            <button
              type="button"
              className="btn micro primary"
              onClick={() => window.location.href = '/signup'}
            >
              Sign Up
            </button>
            <button
              type="button"
              className="btn micro secondary"
              onClick={onLeaveSession}
            >
              Leave
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="session-header">
        <div className="header-content">
          <div>
            <h1>{session.title}</h1>
            <p className="session-meta">
              Hosted by <strong>{session.hostUsername}</strong> •{' '}
              {session.participants.length} collaborator{session.participants.length !== 1 ? 's' : ''}
              {session.viewers.length > 0 && (
                <>
                  {' '}
                  • 👁️ {session.viewers.length} viewer{session.viewers.length !== 1 ? 's' : ''}
                </>
              )}
              {(session as any).isGuestSession && (
                <>
                  {' '}
                  • ⏱️{' '}
                  {sessionTimer.isExpired ? (
                    <span className="timer expired">Session Expired</span>
                  ) : (
                    <span className="timer">
                      {sessionTimer.minutes}:{String(sessionTimer.seconds).padStart(2, '0')} remaining
                    </span>
                  )}
                </>
              )}
            </p>
            {session.description && <p className="session-description">{session.description}</p>}
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="btn tertiary"
              onClick={onLeaveSession}
              title="Leave this session"
            >
              Leave Session
            </button>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="session-body">
        {syncConflict && (
          <div className="sync-conflict-banner" role="alert">
            <div className="sync-conflict-text">
              <strong>Sync conflict detected</strong>
              <span>
                Track {syncConflict.trackId} changed by {syncConflict.server.updatedBy ?? 'another user'}.
              </span>
            </div>
            <div className="sync-conflict-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => handleSyncConflictResolve('use-server')}
              >
                Use server version
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => handleSyncConflictResolve('overwrite-server')}
              >
                Keep my version
              </button>
            </div>
          </div>
        )}
        {!isAuthorized && !authLoading && (
          <div className="auth-gate">
            <h3>Sign in or continue as guest</h3>
            <p>Collaboration controls unlock when you are authenticated.</p>
            <div className="auth-gate-actions">
              <a className="btn primary" href="/login">Sign in</a>
              <button type="button" className="btn secondary" onClick={() => window.location.assign('/guest')}>Enter as guest</button>
            </div>
          </div>
        )}

        <div className={`session-stage ${!isAuthorized ? 'locked' : ''}`}>
          <div className="corner-video-layer">
            <VideoStreamManager
              localUserId={localUserId}
              localUsername={localUsername}
              participants={session.participants}
              viewers={session.viewers}
              maxStreams={session.maxStreams}
              layoutMode="corners"
            />
          </div>

            {canCollaborate ? (
              <div className="center-hub">
                <div className="hub-header">
                  <div className="hub-tabs" role="tablist" aria-label="Collaboration workspace tabs">
                    {(['daw', 'packs', 'analytics', 'create'] as const).map(tab => (
                      <button
                        key={tab}
                        type="button"
                        role="tab"
                        className={`hub-tab ${activeHubTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveHubTab(tab)}
                        aria-selected={activeHubTab === tab}
                        aria-controls={`tab-panel-${tab}`}
                        tabIndex={activeHubTab === tab ? 0 : -1}
                      >
                        {tab === 'daw' && '🎹 DAW'}
                        {tab === 'packs' && '📦 Packs'}
                        {tab === 'analytics' && '📊 Analytics'}
                        {tab === 'create' && '➕ Create'}
                      </button>
                    ))}
                  </div>

                  <div className="live-destinations" aria-label="Live export destinations">
                    <span className="live-label">Multi-stream</span>
                    <button
                      type="button"
                      className={`live-toggle ${liveDestinations.tiktok ? 'on' : ''}`}
                      onClick={() => isHost ? handleLiveToggle('tiktok') : null}
                      disabled={!isHost}
                      title={isHost ? 'Toggle TikTok export' : 'Only host can enable exports'}
                    >
                      TikTok
                    </button>
                    <button
                      type="button"
                      className={`live-toggle ${liveDestinations.instagram ? 'on' : ''}`}
                      onClick={() => isHost ? handleLiveToggle('instagram') : null}
                      disabled={!isHost}
                      title={isHost ? 'Toggle Instagram export' : 'Only host can enable exports'}
                    >
                      Instagram
                    </button>
                    <span className="sync-pill">Playback sync locked</span>
                    {lastSyncAt && (
                      <span className="sync-timestamp">Last sync {new Date(lastSyncAt).toLocaleTimeString()}</span>
                    )}
                  </div>
                </div>

                <div className="hub-panels">
                  {activeHubTab === 'daw' && (
                    <section className="hub-panel" aria-label="DAW">
                      {!isAuthorized && (
                        <div className="interaction-warning">
                          <p>⚠️ Sign in or continue as guest to edit the DAW.</p>
                        </div>
                      )}
                      <CollaborativeDAW
                        sessionId={session.id}
                        dawSession={session.daw}
                        audioSyncState={session.audioSyncState}
                        isHost={isHost && isAuthorized}
                        onNoteAdd={isAuthorized ? handleNoteAdd : undefined}
                        onNoteRemove={isAuthorized && !isSessionExpired ? handleNoteRemove : undefined}
                        onPlaybackStateChange={isAuthorized && !isSessionExpired ? handlePlaybackStateChange : undefined}
                        onTempoChange={isAuthorized && !isSessionExpired ? handleTempoChange : undefined}
                        onTracksChange={isAuthorized && !isSessionExpired ? handleTracksChange : undefined}
                        onRecordToggle={isAuthorized && !isSessionExpired ? handleRecordToggle : undefined}
                      />
                    </section>
                  )}

                  {activeHubTab === 'packs' && (
                    <section className="hub-panel" aria-label="Packs">
                      <div className="packs-panel">
                        <h3>Pack Deck</h3>
                        <p>Quick access to recently generated packs and remix seeds. Drag into the DAW to audition.</p>
                        {recentPacks.length > 0 ? (
                          <ul className="packs-list">
                            {recentPacks.map((pack: any) => (
                              <li
                                key={pack.id}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.effectAllowed = 'copy';
                                  e.dataTransfer.setData('application/json', JSON.stringify(pack));
                                }}
                                className="pack-item"
                              >
                                <span className="pack-info">
                                  <strong>{pack.title || 'Untitled Pack'}</strong>
                                  <span className="pack-subtitle">{pack.mode}</span>
                                </span>
                                <button type="button" className="btn micro">Audition</button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <ul className="packs-list">
                            <li>
                              <span>No recent packs</span>
                              <button 
                                type="button" 
                                className="btn micro" 
                                disabled={isSessionExpired}
                                title={isSessionExpired ? 'Session expired - please leave and create a new session' : 'Generate a new pack'}
                              >
                                Generate
                              </button>
                            </li>
                            <li>
                              <span>Import MIDI</span>
                              <button 
                                type="button" 
                                className="btn micro" 
                                disabled={isSessionExpired}
                                title={isSessionExpired ? 'Session expired' : 'Upload MIDI file'}
                              >
                                Upload
                              </button>
                            </li>
                          </ul>
                        )}
                      </div>
                    </section>
                  )}

                  {activeHubTab === 'analytics' && (
                    <section className="hub-panel" aria-label="Analytics">
                      <div className="analytics-grid">
                        <div className="stat-card">
                          <span className="label">Session Duration</span>
                          <strong>
                            {session.startedAt
                              ? Math.floor((Date.now() - session.startedAt) / 60000) + ' min'
                              : 'Not started'}
                          </strong>
                        </div>
                        <div className="stat-card">
                          <span className="label">Collaborators</span>
                          <strong>{session.participants.length}</strong>
                        </div>
                        <div className="stat-card">
                          <span className="label">Viewers</span>
                          <strong>{session.viewers.length}</strong>
                        </div>
                        <div className="stat-card">
                          <span className="label">Clips Added</span>
                          <strong>
                            {session.daw.tracks?.reduce((acc, track) => acc + (track.clips?.length || 0), 0) || 0}
                          </strong>
                        </div>
                        <div className="stat-card">
                          <span className="label">Notes Recorded</span>
                          <strong>{session.daw.notes.length}</strong>
                        </div>
                        <div className="stat-card">
                          <span className="label">Tempo</span>
                          <strong>{session.daw.bpm} BPM</strong>
                        </div>
                        <div className="stat-card">
                          <span className="label">Live Destinations</span>
                          <strong>{[liveDestinations.tiktok ? 'TikTok' : null, liveDestinations.instagram ? 'Instagram' : null].filter(Boolean).join(' • ') || 'Off'}</strong>
                        </div>
                        <div className="stat-card">
                          <span className="label">Recording Status</span>
                          <strong className={session.daw.isRecording ? 'recording' : ''}>{session.daw.isRecording ? '⚫ Recording' : 'Idle'}</strong>
                        </div>
                      </div>
                      <p className="hint">Real-time stats. Reload to see latest metrics. Live exports stay frame-locked to the playhead.</p>
                    </section>
                  )}

                  {activeHubTab === 'create' && (
                    <section className="hub-panel" aria-label="Quick actions">
                      <div className="quick-create">
                        <h3>Quick Actions</h3>
                        <p>Start a new track lane, invite collaborators, or drop stems.</p>
                        <div className="quick-actions">
                          <button type="button" className="btn primary small" onClick={() => setActiveHubTab('daw')}>+ Add Track Lane</button>
                          <button type="button" className="btn secondary small">Invite collaborator</button>
                          <button type="button" className="btn tertiary small">Upload stems</button>
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              </div>
            ) : (
              <div className="center-hub spectator-locked" role="note">
                <p>You're spectating. Only the host and collaborators can access the workspace and live export settings.</p>
              </div>
            )}
        </div>
      </div>

      {/* Sidebar: Comments and info */}
      <aside className={`session-sidebar ${showComments ? 'expanded' : 'collapsed'}`}>
        <div className="sidebar-header">
          <h2>Comments & Reactions</h2>
          <button
            type="button"
            className="btn tertiary micro"
            onClick={() => setShowComments(!showComments)}
            aria-label={showComments ? 'Collapse' : 'Expand'}
          >
            {showComments ? '−' : '+'}
          </button>
        </div>

        {showComments && (
          <div className="sidebar-content">
            {/* Comment input */}
            <div className="comment-input-section">
              <div className="comment-form">
                <textarea
                  value={newComment.content}
                  onChange={e => setNewComment({ content: e.target.value })}
                  placeholder="Add a comment..."
                  className="comment-textarea"
                  rows={2}
                />
                <button
                  type="button"
                  className="btn primary small"
                  onClick={handleAddComment}
                  disabled={!newComment.content.trim()}
                >
                  Post
                </button>
              </div>
            </div>

            {/* Comments thread */}
            <div className="comments-thread">
              {comments.length === 0 ? (
                <p className="empty-state">No comments yet. Be the first to share!</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-author">{comment.username}</span>
                      <span className="comment-time">
                        {new Date(comment.createdAt).toLocaleDateString('en', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <p className="comment-content">{comment.content}</p>
                    <div className="comment-actions">
                      <button
                        type="button"
                        className={`vote-btn upvote ${
                          userVotes.get(comment.id) === 'upvote' ? 'active' : ''
                        }`}
                        onClick={() => handleCommentVote(comment.id, 'upvote')}
                        title="Upvote this comment"
                        aria-label="Upvote"
                      >
                        👍 {comment.voteCount > 0 ? comment.voteCount : ''}
                      </button>
                      <button
                        type="button"
                        className={`vote-btn downvote ${
                          userVotes.get(comment.id) === 'downvote' ? 'active' : ''
                        }`}
                        onClick={() => handleCommentVote(comment.id, 'downvote')}
                        title="Downvote this comment"
                        aria-label="Downvote"
                      >
                        👎
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Footer: Participant list */}
      <footer className="session-footer">
        <div className="participants-list">
          <div className="participant-group">
            <h4>Collaborators</h4>
            <ul>
              {session.participants.map(p => (
                <li key={p.userId} className={`participant ${p.isActive ? 'active' : 'inactive'}`}>
                  <span className="participant-name">{p.username}</span>
                  {p.userId === session.hostId && <span className="badge">Host</span>}
                  <span className={`status-indicator ${p.isActive ? 'online' : 'offline'}`} />
                </li>
              ))}
            </ul>
          </div>

          {session.viewers.length > 0 && (
            <div className="participant-group">
              <h4>Spectators</h4>
              <ul>
                {session.viewers.map(v => (
                  <li key={v.userId} className="participant viewer">
                    <span className="participant-name">{v.username}</span>
                    <span className="status-indicator online" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
