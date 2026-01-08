/**
 * CollaborativeSessionDetail
 * 
 * Main page for viewing/participating in a collaborative session.
 * Displays video streams, shared DAW, comments, and viewer list.
 */

import { useEffect, useState, useCallback } from 'react';
import type {
  CollaborativeSession,
  CommentThread,
  DAWNote,
  DAWSession
} from '../types';
import { VideoStreamManager } from '../components/workspace/VideoStreamManager';
import { CollaborativeDAW } from '../components/workspace/CollaborativeDAW';
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
  const [expandedLayout, setExpandedLayout] = useState<'video' | 'daw' | 'split'>('split');
  const [sessionTimer, setSessionTimer] = useState<SessionTimer>({ minutes: 0, seconds: 0, isExpired: false });

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

  // Update comments when session changes
  useEffect(() => {
    setComments(session.comments);
  }, [session.comments]);

  const isHost = userRole === 'host';

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
    },
    [session, onSessionUpdate]
  );

  // Handle note removed from DAW
  const handleNoteRemove = useCallback(
    (noteId: string) => {
      const updatedDAW: DAWSession = {
        ...session.daw,
        notes: session.daw.notes.filter(n => n.id !== noteId)
      };
      onSessionUpdate?.({
        ...session,
        daw: updatedDAW
      });
    },
    [session, onSessionUpdate]
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

  return (
    <div className="collaborative-session-detail">
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
        {/* Layout selector */}
        <div className="layout-controls">
          <label htmlFor="layout-toggle">Layout:</label>
          <div className="toggle-group">
            <button
              id="layout-toggle"
              type="button"
              className={`btn small ${expandedLayout === 'video' ? 'active' : ''}`}
              onClick={() => setExpandedLayout('video')}
            >
              Video
            </button>
            <button
              type="button"
              className={`btn small ${expandedLayout === 'daw' ? 'active' : ''}`}
              onClick={() => setExpandedLayout('daw')}
            >
              DAW
            </button>
            <button
              type="button"
              className={`btn small ${expandedLayout === 'split' ? 'active' : ''}`}
              onClick={() => setExpandedLayout('split')}
            >
              Split
            </button>
          </div>
        </div>

        <div className={`content-grid layout-${expandedLayout}`}>
          {/* Video streams section */}
          {(expandedLayout === 'video' || expandedLayout === 'split') && (
            <section className="video-section" aria-label="Video streams">
              <VideoStreamManager
                localUserId={localUserId}
                localUsername={localUsername}
                participants={session.participants}
                viewers={session.viewers}
                maxStreams={session.maxStreams}
                onStreamJoin={() => {
                  // Emit to server
                }}
                onStreamLeave={() => {
                  // Emit to server
                }}
                onControlChange={() => {
                  // Emit to server
                }}
              />
            </section>
          )}

          {/* DAW section */}
          {(expandedLayout === 'daw' || expandedLayout === 'split') && (
            <section className="daw-section" aria-label="Shared DAW">
              <CollaborativeDAW
                sessionId={session.id}
                dawSession={session.daw}
                audioSyncState={session.audioSyncState}
                isHost={isHost}
                onNoteAdd={handleNoteAdd}
                onNoteRemove={handleNoteRemove}
                onPlaybackStateChange={handlePlaybackStateChange}
                onTempoChange={tempo => {
                  onSessionUpdate?.({
                    ...session,
                    daw: { ...session.daw, bpm: tempo }
                  });
                }}
              />
            </section>
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
