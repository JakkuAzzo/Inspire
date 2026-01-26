/**
 * CollaborativeDAW
 * 
 * A shared Digital Audio Workstation with a piano roll interface.
 * Inspired by accessible-piano-roll and Flow Prompts.
 * Supports real-time multi-user editing and playback synchronization.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { DAWSession, DAWNote, AudioSyncState, DAWTrack, DAWClip } from '../../types';
import audioSyncService, { type SyncMetrics } from '../../services/audioSyncService';
import getSynthesizer from '../../services/audioSynthesizer';
import './CollaborativeDAW.css';

export interface CollaborativeDAwProps {
  sessionId?: string; // Reserved for future Socket.io room features
  dawSession: DAWSession;
  audioSyncState: AudioSyncState;
  isHost: boolean;
  onNoteAdd?: (note: DAWNote) => void;
  onNoteRemove?: (noteId: string) => void;
  onTempoChange?: (tempo: number) => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  onSync?: (metrics: SyncMetrics) => void;
  onTracksChange?: (tracks: DAWTrack[]) => void;
  onRecordToggle?: (isRecording: boolean) => void;
}

const PIANO_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVE_MIN = 2;
const OCTAVE_MAX = 6;
const OCTAVES = Array.from({ length: OCTAVE_MAX - OCTAVE_MIN + 1 }, (_, i) => i + OCTAVE_MIN);
const DEFAULT_TRACK: DAWTrack = {
  id: 'track-1',
  name: 'Main Track',
  type: 'hybrid',
  color: '#22d3ee',
  volume: 0.8,
  isMuted: false,
  isSolo: false,
  isArmed: true,
  clips: []
};

// Get MIDI note number for a key/octave
function getMidiNote(keyName: string, octave: number): number {
  const keyIndex = PIANO_KEYS.indexOf(keyName);
  return (octave + 1) * 12 + keyIndex;
}

// Get display name for MIDI note
function getMidiNoteName(midiNote: number): string {
  const octave = Math.floor(midiNote / 12) - 1;
  const keyIndex = midiNote % 12;
  return `${PIANO_KEYS[keyIndex]}${octave}`;
}

export function CollaborativeDAW({
  dawSession,
  audioSyncState,
  isHost,
  onNoteAdd,
  onNoteRemove,
  onTempoChange,
  onPlaybackStateChange,
  onSync,
  onTracksChange,
  onRecordToggle
}: CollaborativeDAwProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pianoRollRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const playedNotesRef = useRef<Set<string>>(new Set()); // Track played note IDs to avoid re-triggering
  const audioPlayersRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const [tempo, setTempo] = useState(dawSession.bpm);
  const [isPlaying, setIsPlaying] = useState(dawSession.isPlaying);
  const [isRecording, setIsRecording] = useState<boolean>(dawSession.isRecording ?? false);
  const [notes, setNotes] = useState<DAWNote[]>(dawSession.notes);
  const [tracks, setTracks] = useState<DAWTrack[]>(dawSession.tracks?.length ? dawSession.tracks : [DEFAULT_TRACK]);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(0.25); // 1/4 note
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [syncMetrics, setSyncMetrics] = useState<SyncMetrics | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef<number | null>(null);
  const playbackStartPositionRef = useRef<number>(0);

  const beatWidth = 80; // pixels per beat
  const trackHeight = 20; // pixels per semitone

  // Update notes when DAW session changes
  useEffect(() => {
    setNotes(dawSession.notes);
  }, [dawSession.notes]);

  // Sync tracks when DAW session changes
  useEffect(() => {
    setTracks(dawSession.tracks && dawSession.tracks.length ? dawSession.tracks : [DEFAULT_TRACK]);
    setIsRecording(dawSession.isRecording ?? false);
  }, [dawSession.tracks, dawSession.isRecording]);

  // Emit track changes upward
  useEffect(() => {
    onTracksChange?.(tracks);
  }, [tracks, onTracksChange]);

  // Audio sync listener
  useEffect(() => {
    const unsubscribe = audioSyncService.onSync((state, metrics) => {
      setSyncMetrics(metrics);
      onSync?.(metrics);

      if (state.isPlaying) {
        const expectedPosition = audioSyncService.getLocalPlaybackPosition(
          state.playbackPosition,
          state.tempo,
          state.isPlaying
        );
        setPlayheadPosition(expectedPosition);
      }
    });

    return unsubscribe;
  }, [onSync]);

  // Sync with server on mount
  useEffect(() => {
    void audioSyncService.measureLatency();
  }, []);

  // Playhead animation during playback
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Stop all synthesizer notes when playback stops
      const synth = getSynthesizer();
      synth.stopAll();
      playedNotesRef.current.clear();
      playbackStartTimeRef.current = null;
      return;
    }

    // Reset playhead to 0 when starting playback
    if (playbackStartTimeRef.current === null) {
      setPlayheadPosition(0);
      playbackStartPositionRef.current = 0;
      playbackStartTimeRef.current = performance.now();
      playedNotesRef.current.clear();
    }

    const startTime = playbackStartTimeRef.current;
    const startPosition = playbackStartPositionRef.current;

    const animate = (currentTime: number) => {
      const elapsedMs = currentTime - startTime;
      const beatsDuration = (tempo / 60) * (elapsedMs / 1000);
      const newPosition = startPosition + beatsDuration;

      setPlayheadPosition(newPosition);

      // Check which notes should be playing at this position
      const synth = getSynthesizer();
      const tolerance = 0.05; // 50ms lookahead

      for (const note of notes) {
        const noteId = note.id;
        const noteStart = note.startTime;
        const noteEnd = note.startTime + note.duration;

        // Play note if we just crossed its start time
        if (
          newPosition >= noteStart &&
          newPosition < noteStart + tolerance &&
          !playedNotesRef.current.has(noteId)
        ) {
          synth.playNote(note.pitch, note.duration);
          playedNotesRef.current.add(noteId);
        }

        // Reset tracking when playback passes the note's end
        if (newPosition > noteEnd && playedNotesRef.current.has(noteId)) {
          playedNotesRef.current.delete(noteId);
        }
      }

      // Sync periodically (every 500ms)
      if (Math.floor(elapsedMs / 500) !== Math.floor((elapsedMs - 16) / 500)) {
        const syncState: AudioSyncState = {
          ...audioSyncState,
          playbackPosition: newPosition,
          isPlaying: true,
          tempo
        };
        audioSyncService.syncWithServer(syncState);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, tempo, audioSyncState, notes]);

  const togglePlayback = useCallback(() => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    if (!newState && isRecording) {
      setIsRecording(false);
      onRecordToggle?.(false);
    }
    onPlaybackStateChange?.(newState);
  }, [isPlaying, isRecording, onPlaybackStateChange, onRecordToggle]);

  const handleTempoChange = useCallback((newTempo: number) => {
    setTempo(newTempo);
    onTempoChange?.(newTempo);
  }, [onTempoChange]);

  const toggleRecord = useCallback(() => {
    if (!isHost) return;
    const next = !isRecording;
    setIsRecording(next);
    onRecordToggle?.(next);
  }, [isHost, isRecording, onRecordToggle]);

  const handleAddTrack = useCallback(() => {
    if (!isHost) return;
    const nextTrackIndex = tracks.length + 1;
    const newTrack: DAWTrack = {
      id: `track-${nextTrackIndex}-${Date.now()}`,
      name: `Track ${nextTrackIndex}`,
      type: 'hybrid',
      color: ['#22d3ee', '#ec4899', '#a855f7', '#10b981'][nextTrackIndex % 4],
      volume: 0.8,
      isMuted: false,
      isSolo: false,
      isArmed: false,
      clips: []
    };
    setTracks(prev => [...prev, newTrack]);
  }, [isHost, tracks.length]);

  const updateTrack = useCallback((trackId: string, updater: (track: DAWTrack) => DAWTrack) => {
    setTracks(prev => prev.map(track => (track.id === trackId ? updater(track) : track)));
  }, []);

  const handleFileDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!isHost) return;
      const droppedFiles = Array.from(event.dataTransfer.files || []);
      if (!droppedFiles.length) return;

      // Ensure at least one track exists
      if (!tracks.length) {
        setTracks([DEFAULT_TRACK]);
      }

      setTracks(prevTracks => {
        const targetTrack = prevTracks[0];
        const now = Date.now();
        const updatedTrack: DAWTrack = {
          ...targetTrack,
          clips: [
            ...targetTrack.clips,
            ...droppedFiles.map((file, idx): DAWClip => ({
              id: `clip-${now}-${idx}`,
              trackId: targetTrack.id,
              type: file.type.includes('audio') ? 'audio' : 'midi',
              startBeat: playheadPosition,
              durationBeats: 4,
              fileName: file.name,
              fileType: file.type,
              previewUrl: URL.createObjectURL(file),
              createdAt: now,
              addedBy: isHost ? 'host' : 'collaborator'
            }))
          ]
        };

        return [updatedTrack, ...prevTracks.slice(1)];
      });
    },
    [isHost, playheadPosition, tracks.length]
  );

  const handleClipPreview = useCallback((clip: DAWClip) => {
    if (!clip.previewUrl || clip.type !== 'audio') return;
    const existing = audioPlayersRef.current.get(clip.id);
    if (existing) {
      existing.currentTime = 0;
      void existing.play();
      return;
    }
    const audio = new Audio(clip.previewUrl);
    audioPlayersRef.current.set(clip.id, audio);
    void audio.play();
  }, []);

  const toggleSolo = useCallback((trackId: string) => {
    updateTrack(trackId, track => ({ ...track, isSolo: !track.isSolo }));
  }, [updateTrack]);

  const toggleMute = useCallback((trackId: string) => {
    updateTrack(trackId, track => ({ ...track, isMuted: !track.isMuted }));
  }, [updateTrack]);

  const toggleArm = useCallback((trackId: string) => {
    updateTrack(trackId, track => ({ ...track, isArmed: !track.isArmed }));
  }, [updateTrack]);

  const handleTrackVolumeChange = useCallback((trackId: string, volume: number) => {
    updateTrack(trackId, track => ({ ...track, volume }));
  }, [updateTrack]);

  const addNote = useCallback((pitch: number, startBeat: number, duration: number = 0.5) => {
    const note: DAWNote = {
      id: `note-${Date.now()}-${Math.random()}`,
      pitch,
      startTime: startBeat,
      duration,
      velocity: 100,
      track: 0
    };
    setNotes(prev => [...prev, note]);
    onNoteAdd?.(note);
  }, [onNoteAdd]);

  const removeNote = useCallback((noteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
    setSelectedNotes(prev => {
      const newSet = new Set(prev);
      newSet.delete(noteId);
      return newSet;
    });
    onNoteRemove?.(noteId);
  }, [onNoteRemove]);

  const handlePianoRollClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHost) return;

    const rect = pianoRollRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const beatPosition = x / beatWidth;
    const pitchOffset = Math.floor(y / trackHeight);
    const pitch = getMidiNote('C', OCTAVE_MIN) + pitchOffset;

    // Quantize to grid
    const snappedBeat = snapToGrid ? Math.round(beatPosition / gridSize) * gridSize : beatPosition;

    addNote(pitch, snappedBeat);
  }, [isHost, addNote, beatWidth, trackHeight, snapToGrid, gridSize]);

  const handleNoteClick = useCallback((e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    setSelectedNotes(prev => {
      const newSet = new Set(prev);
      if (e.ctrlKey || e.metaKey) {
        // Toggle selection
        if (newSet.has(noteId)) {
          newSet.delete(noteId);
        } else {
          newSet.add(noteId);
        }
      } else {
        // Single selection
        newSet.clear();
        newSet.add(noteId);
      }
      return newSet;
    });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      selectedNotes.forEach(noteId => removeNote(noteId));
      setSelectedNotes(new Set());
    }
  }, [selectedNotes, removeNote]);

  // Play note when piano key is clicked (for testing)
  const handlePianoKeyClick = useCallback((midiNote: number) => {
    try {
      const synth = getSynthesizer();
      synth.playNote(midiNote, 0.5); // Play for 500ms
    } catch (err) {
      console.warn('Could not play note:', err);
    }
  }, []);

  // Calculate max beat for grid sizing (notes + clips)
  const noteExtent = notes.length ? Math.max(...notes.map(n => n.startTime + n.duration)) : 0;
  const clipExtent = tracks.length
    ? Math.max(...tracks.flatMap(track => track.clips.map(clip => clip.startBeat + clip.durationBeats)), 0)
    : 0;
  const maxBeat = Math.max(noteExtent, clipExtent, 16);

  return (
    <div
      className="collaborative-daw"
      ref={containerRef}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleFileDrop}
      role="region"
      aria-label="Collaborative DAW"
    >
      {/* Control panel */}
      <div className="daw-controls">
        <div className="transport-controls">
          <button
            type="button"
            className={`btn transport-btn record ${isRecording ? 'armed' : ''}`}
            onClick={toggleRecord}
            disabled={!isHost}
            title={isHost ? 'Arm/Disarm record' : 'Only host can record'}
            aria-label={isRecording ? 'Stop recording' : 'Arm record'}
          >
            {isRecording ? '⏺︎' : '●'}
          </button>
          <button
            type="button"
            className={`btn transport-btn ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlayback}
            disabled={!isHost}
            title={isHost ? (isPlaying ? 'Pause' : 'Play') : 'Only host can control playback'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>

          <div className="tempo-control">
            <label htmlFor="tempo-input">BPM:</label>
            <input
              id="tempo-input"
              type="number"
              min="40"
              max="300"
              value={tempo}
              onChange={e => handleTempoChange(Number(e.target.value))}
              disabled={!isHost}
              className="tempo-input"
            />
          </div>

          <div className="playback-position">
            <span className="label">Position:</span>
            <span className="value">{playheadPosition.toFixed(2)} beats</span>
          </div>
        </div>

        <div className="daw-options">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={e => setSnapToGrid(e.target.checked)}
              disabled={!isHost}
            />
            <span>Snap to grid</span>
          </label>

          <select
            value={gridSize}
            onChange={e => setGridSize(Number(e.target.value))}
            disabled={!isHost}
            className="grid-select"
          >
            <option value={0.25}>1/4 note</option>
            <option value={0.5}>1/2 note</option>
            <option value={1}>Whole note</option>
            <option value={0.125}>1/8 note</option>
            <option value={0.0625}>1/16 note</option>
          </select>
        </div>

        {/* Sync status indicator */}
        {syncMetrics && (
          <div className={`sync-status ${syncMetrics.correctionApplied ? 'correcting' : 'synced'}`}>
            <span className="dot"></span>
            <span className="text">
              Latency: {syncMetrics.latencyMs.toFixed(0)}ms
              {syncMetrics.correctionApplied && ' (correcting)'}
            </span>
          </div>
        )}
      </div>

      {/* Track lanes + drag/drop surface */}
      <div className="track-import-bar">
        <div>
          <p className="hint">Drag MIDI or audio (MP3/WAV) files anywhere in this area to add as clips.</p>
          <small>Clips align to the current playhead at {playheadPosition.toFixed(1)} beats.</small>
        </div>
        <div className="track-import-actions">
          <button type="button" className="btn secondary small" onClick={handleAddTrack} disabled={!isHost}>
            + Track
          </button>
          <span className={`record-pill ${isRecording ? 'armed' : ''}`}>{isRecording ? 'Recording armed' : 'Record idle'}</span>
        </div>
      </div>

      <div className="track-lanes" role="list">
        {tracks.map(track => (
          <div className="track-row" key={track.id} role="listitem">
            <div className="track-meta">
              <span className="track-dot" style={{ background: track.color || '#22d3ee' }} aria-hidden="true" />
              <div className="track-title">
                <strong>{track.name}</strong>
                <span className="track-type">{track.type.toUpperCase()}</span>
              </div>
              <div className="track-buttons">
                <button type="button" className={`pill-btn ${track.isArmed ? 'active' : ''}`} onClick={() => toggleArm(track.id)} disabled={!isHost}>
                  ● Rec
                </button>
                <button type="button" className={`pill-btn ${track.isSolo ? 'active' : ''}`} onClick={() => toggleSolo(track.id)} disabled={!isHost}>
                  Solo
                </button>
                <button type="button" className={`pill-btn ${track.isMuted ? 'active' : ''}`} onClick={() => toggleMute(track.id)} disabled={!isHost}>
                  Mute
                </button>
              </div>
            </div>

            <div className="track-volume">
              <label>Vol</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={track.volume}
                onChange={(e) => handleTrackVolumeChange(track.id, Number(e.target.value))}
                disabled={!isHost}
              />
              <span className="volume-value">{Math.round(track.volume * 100)}%</span>
            </div>

            <div className="track-clips" onClick={(e) => e.stopPropagation()}>
              {track.clips.map(clip => (
                <button
                  key={clip.id}
                  type="button"
                  className={`clip-pill ${clip.type}`}
                  onClick={() => handleClipPreview(clip)}
                  title={clip.fileName || 'Clip'}
                >
                  <span className="clip-name">{clip.fileName || clip.type.toUpperCase()}</span>
                  <span className="clip-meta">{clip.durationBeats}b • {clip.type}</span>
                </button>
              ))}
              {track.clips.length === 0 && <span className="clip-empty">Drop MIDI/MP3 to populate this track</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Piano roll viewport */}
      <div className="piano-roll-container">
        {/* Piano keys (left sidebar) */}
        <div className="piano-keys">
          {OCTAVES.flatMap(octave =>
            PIANO_KEYS.map((key, index) => {
              const isBlackKey = key.includes('#');
              const midiNote = getMidiNote(key, octave);
              return (
                <div
                  key={`${octave}-${key}`}
                  className={`piano-key ${isBlackKey ? 'black' : 'white'}`}
                  title={`${key}${octave}`}
                  style={{ height: `${trackHeight}px` }}
                  onClick={() => handlePianoKeyClick(midiNote)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handlePianoKeyClick(midiNote);
                    }
                  }}
                >
                  {index === 0 && <span className="key-label">{key}4</span>}
                </div>
              );
            })
          )}
        </div>

        {/* Piano roll grid */}
        <div
          className="piano-roll"
          ref={pianoRollRef}
          onClick={handlePianoRollClick}
          style={{ '--beat-width': `${beatWidth}px` } as any}
        >
          {/* Grid background */}
          <div className="grid-background">
            {Array.from({ length: Math.ceil(maxBeat / gridSize) }, (_, i) => (
              <div
                key={i}
                className="grid-line"
                style={{
                  left: `${(i * gridSize * beatWidth)}px`,
                  opacity: i % (1 / gridSize) === 0 ? 0.3 : 0.1
                }}
              />
            ))}
          </div>

          {/* Playhead */}
          <div
            className="playhead"
            ref={playheadRef}
            style={{ left: `${playheadPosition * beatWidth}px` }}
          />

          {/* Notes */}
          <div className="notes-layer">
            {notes.map(note => (
              <div
                key={note.id}
                className={`note ${selectedNotes.has(note.id) ? 'selected' : ''}`}
                style={{
                  left: `${note.startTime * beatWidth}px`,
                  top: `${(note.pitch - getMidiNote('C', OCTAVE_MIN)) * trackHeight}px`,
                  width: `${note.duration * beatWidth}px`,
                  height: `${trackHeight - 1}px`
                }}
                onClick={e => handleNoteClick(e, note.id)}
                onDoubleClick={e => {
                  e.stopPropagation();
                  removeNote(note.id);
                }}
                role="button"
                aria-label={`${getMidiNoteName(note.pitch)} at ${note.startTime}s`}
                tabIndex={0}
              >
                <span className="note-label">{getMidiNoteName(note.pitch)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info footer */}
      <div className="daw-info">
        <p className="hint">
          {isHost
            ? 'Click to add notes • Double-click to delete • Ctrl+click to multi-select'
            : 'Spectating: host controls playback'}
        </p>
        {selectedNotes.size > 0 && (
          <p className="selection-info">{selectedNotes.size} note(s) selected</p>
        )}
      </div>
    </div>
  );
}
