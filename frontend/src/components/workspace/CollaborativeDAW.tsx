/**
 * CollaborativeDAW
 * 
 * A shared Digital Audio Workstation with a piano roll interface.
 * Inspired by accessible-piano-roll and Flow Prompts.
 * Supports real-time multi-user editing and playback synchronization.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { DAWSession, DAWNote, AudioSyncState } from '../../types';
import audioSyncService, { type SyncMetrics } from '../../services/audioSyncService';
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
}

const PIANO_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVE_MIN = 2;
const OCTAVE_MAX = 6;
const OCTAVES = Array.from({ length: OCTAVE_MAX - OCTAVE_MIN + 1 }, (_, i) => i + OCTAVE_MIN);

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
  onSync
}: CollaborativeDAwProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pianoRollRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);

  const [tempo, setTempo] = useState(dawSession.bpm);
  const [isPlaying, setIsPlaying] = useState(dawSession.isPlaying);
  const [notes, setNotes] = useState<DAWNote[]>(dawSession.notes);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(0.25); // 1/4 note
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [syncMetrics, setSyncMetrics] = useState<SyncMetrics | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const beatWidth = 80; // pixels per beat
  const trackHeight = 20; // pixels per semitone

  // Update notes when DAW session changes
  useEffect(() => {
    setNotes(dawSession.notes);
  }, [dawSession.notes]);

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
      }
      return;
    }

    const startTime = performance.now();
    const startPosition = playheadPosition;

    const animate = (currentTime: number) => {
      const elapsedMs = currentTime - startTime;
      const beatsDuration = (tempo / 60) * (elapsedMs / 1000);
      const newPosition = startPosition + beatsDuration;

      setPlayheadPosition(newPosition);

      // Sync periodically (every 500ms)
      if (elapsedMs % 500 < 16) {
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
      }
    };
  }, [isPlaying, playheadPosition, tempo, audioSyncState]);

  const togglePlayback = useCallback(() => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    onPlaybackStateChange?.(newState);
  }, [isPlaying, onPlaybackStateChange]);

  const handleTempoChange = useCallback((newTempo: number) => {
    setTempo(newTempo);
    onTempoChange?.(newTempo);
  }, [onTempoChange]);

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

  // Calculate max beat for grid sizing
  const maxBeat = Math.max(...notes.map(n => n.startTime + n.duration), 16);

  return (
    <div
      className="collaborative-daw"
      ref={containerRef}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Collaborative DAW"
    >
      {/* Control panel */}
      <div className="daw-controls">
        <div className="transport-controls">
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

      {/* Piano roll viewport */}
      <div className="piano-roll-container">
        {/* Piano keys (left sidebar) */}
        <div className="piano-keys">
          {OCTAVES.flatMap(octave =>
            PIANO_KEYS.map((key, index) => {
              const isBlackKey = key.includes('#');
              return (
                <div
                  key={`${octave}-${key}`}
                  className={`piano-key ${isBlackKey ? 'black' : 'white'}`}
                  title={`${key}${octave}`}
                  style={{ height: `${trackHeight}px` }}
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
