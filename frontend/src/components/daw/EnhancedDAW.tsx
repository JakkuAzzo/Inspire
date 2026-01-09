import React, { useState, useCallback, useRef, useEffect } from 'react';
import './EnhancedDAW.css';
import { InstrumentSelector, type InstrumentConfig } from './InstrumentSelector';
import { DrumSequencer, type DrumStep } from './DrumSequencer';
import { SampleBrowser, type AudioSample } from './SampleBrowser';
import { SampleChopper } from './SampleChopper';

// Track types
export interface DAWTrack {
  id: string;
  name: string;
  type: 'instrument' | 'drum' | 'sample' | 'audio';
  instrument?: InstrumentConfig;
  volume: number; // 0-1
  pan: number; // -1 to 1
  solo: boolean;
  mute: boolean;
  notes: DAWNote[];
  samples?: AudioSample[];
}

export interface DAWNote {
  id: string;
  pitch: number; // MIDI note number
  startTime: number; // in beats
  duration: number; // in beats
  velocity: number; // 0-127
  trackId: string;
}

interface EnhancedDAWProps {
  initialTempo?: number;
  initialTracks?: DAWTrack[];
  onSave?: (tracks: DAWTrack[], tempo: number) => void;
  standalone?: boolean; // If true, includes all features. If false, lighter version for collaborative mode
}

const BEAT_WIDTH = 80; // pixels per beat
const TRACK_HEIGHT = 40; // pixels per track row

const createDefaultTrack = (index: number): DAWTrack => ({
  id: `track-${Date.now()}-${index}`,
  name: `Track ${index + 1}`,
  type: index === 0 ? 'drum' : 'instrument',
  instrument: index === 0 ? undefined : {
    type: 'piano',
    waveform: 'sine',
    attack: 0.01,
    decay: 0.2,
    sustain: 0.5,
    release: 0.8
  },
  volume: 0.7,
  pan: 0,
  solo: false,
  mute: false,
  notes: [],
  samples: []
});

export const EnhancedDAW: React.FC<EnhancedDAWProps> = ({
  initialTempo = 120,
  initialTracks,
  onSave,
  standalone = true
}) => {
  // Core state
  const [tempo, setTempo] = useState(initialTempo);
  const [tracks, setTracks] = useState<DAWTrack[]>(
    initialTracks || Array.from({ length: 4 }, (_, i) => createDefaultTrack(i))
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [selectedTrackId, setSelectedTrackId] = useState<string>(tracks[0]?.id || '');
  const [drumPattern, setDrumPattern] = useState<DrumStep[]>([]);
  const [selectedSample, setSelectedSample] = useState<AudioSample | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'browser' | 'chopper'>('timeline');

  // UI state
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(0.25); // Quarter note
  const [zoom, setZoom] = useState(1);

  // Refs
  const animationFrameRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Playback engine
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    } else {
      setIsPlaying(true);
      playbackStartTimeRef.current = performance.now();
      
      const animate = () => {
        const elapsed = (performance.now() - playbackStartTimeRef.current) / 1000; // seconds
        const beatsPerSecond = tempo / 60;
        const beat = elapsed * beatsPerSecond;
        setCurrentBeat(beat);

        // Continue animation
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, tempo]);

  // Track management
  const addTrack = useCallback(() => {
    const newTrack = createDefaultTrack(tracks.length);
    setTracks(prev => [...prev, newTrack]);
  }, [tracks.length]);

  const removeTrack = useCallback((trackId: string) => {
    setTracks(prev => prev.filter(t => t.id !== trackId));
    if (selectedTrackId === trackId && tracks.length > 1) {
      setSelectedTrackId(tracks.find(t => t.id !== trackId)?.id || '');
    }
  }, [selectedTrackId, tracks]);

  const updateTrack = useCallback((trackId: string, updates: Partial<DAWTrack>) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId ? { ...track, ...updates } : track
    ));
  }, []);

  const updateTrackInstrument = useCallback((trackId: string, instrument: InstrumentConfig) => {
    updateTrack(trackId, { instrument });
  }, [updateTrack]);

  // Note management
  // Commenting out unused addNote function (for future use)
  // const addNote = useCallback((trackId: string, pitch: number, startTime: number, duration: number = 1) => {
  //   const newNote: DAWNote = {
  //     id: `note-${Date.now()}-${Math.random()}`,
  //     pitch,
  //     startTime,
  //     duration,
  //     velocity: 100,
  //     trackId
  //   };
  //   setTracks(prev => prev.map(track =>
  //     track.id === trackId
  //       ? { ...track, notes: [...track.notes, newNote] }
  //       : track
  //   ));
  // }, []);

  const removeNote = useCallback((noteId: string) => {
    setTracks(prev => prev.map(track => ({
      ...track,
      notes: track.notes.filter(n => n.id !== noteId)
    })));
  }, []);

  // Sample management
  const handleSampleSelect = useCallback((sample: AudioSample) => {
    setSelectedSample(sample);
    setViewMode('chopper');
  }, []);

  const handleSampleDrag = useCallback((sample: AudioSample) => {
    // For future: handle drag-to-timeline
    console.log('Sample dragged:', sample.name);
  }, []);

  const handleChopComplete = useCallback((chops: AudioSample[]) => {
    if (!selectedTrackId) return;

    // Add chopped samples to selected track
    setTracks(prev => prev.map(track =>
      track.id === selectedTrackId
        ? { ...track, samples: [...(track.samples || []), ...chops] }
        : track
    ));
    
    setViewMode('timeline');
    setSelectedSample(null);
  }, [selectedTrackId]);

  // Drum pattern management
  const handleDrumStepsChange = useCallback((steps: DrumStep[]) => {
    setDrumPattern(steps);
    
    // Update drum track with pattern (convert to notes)
    const drumTrack = tracks.find(t => t.type === 'drum');
    if (!drumTrack) return;

    // TODO: Convert drum steps to notes for playback
    // For now, just store the pattern
    updateTrack(drumTrack.id, { notes: [] }); // Will implement drum note conversion
  }, [tracks, updateTrack]);

  // Calculate current step for drum sequencer
  const currentDrumStep = Math.floor((currentBeat % 4) * 4) % 16; // 16 steps per 4 beats

  // Get selected track
  const selectedTrack = tracks.find(t => t.id === selectedTrackId);

  // Save/export
  const handleSave = useCallback(() => {
    onSave?.(tracks, tempo);
  }, [tracks, tempo, onSave]);

  return (
    <div className="enhanced-daw">
      {/* Header with transport controls */}
      <div className="daw-header">
        <div className="daw-title">
          <h2>🎹 Enhanced DAW</h2>
          {standalone && (
            <button className="btn-save" onClick={handleSave}>
              💾 Save
            </button>
          )}
        </div>

        <div className="transport-controls">
          <button
            className={`btn-transport ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlayback}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>

          <div className="tempo-control">
            <label htmlFor="tempo">BPM:</label>
            <input
              id="tempo"
              type="number"
              min="40"
              max="300"
              value={tempo}
              onChange={e => setTempo(Number(e.target.value))}
            />
          </div>

          <div className="beat-display">
            Beat: <span className="beat-value">{currentBeat.toFixed(2)}</span>
          </div>
        </div>

        <div className="view-controls">
          <button
            className={`btn-view ${viewMode === 'timeline' ? 'active' : ''}`}
            onClick={() => setViewMode('timeline')}
          >
            Timeline
          </button>
          <button
            className={`btn-view ${viewMode === 'browser' ? 'active' : ''}`}
            onClick={() => setViewMode('browser')}
          >
            Browser
          </button>
          <button
            className={`btn-view ${viewMode === 'chopper' ? 'active' : ''}`}
            onClick={() => setViewMode('chopper')}
            disabled={!selectedSample}
          >
            Chopper
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="daw-content">
        {viewMode === 'timeline' && (
          <div className="timeline-view">
            {/* Instrument selector for selected track */}
            {selectedTrack && selectedTrack.type === 'instrument' && selectedTrack.instrument && (
              <InstrumentSelector
                currentInstrument={selectedTrack.instrument}
                onChange={(instrument) => updateTrackInstrument(selectedTrack.id, instrument)}
              />
            )}

            {/* Drum sequencer for drum tracks */}
            {tracks.some(t => t.type === 'drum') && (
              <DrumSequencer
                steps={drumPattern}
                currentStep={isPlaying ? currentDrumStep : -1}
                onStepsChange={handleDrumStepsChange}
              />
            )}

            {/* Track list */}
            <div className="track-list">
              <div className="track-list-header">
                <h3>Tracks</h3>
                <button className="btn-add-track" onClick={addTrack}>
                  + Add Track
                </button>
              </div>

              {tracks.map((track, index) => (
                <div
                  key={track.id}
                  className={`track-row ${selectedTrackId === track.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTrackId(track.id)}
                >
                  <div className="track-controls">
                    <span className="track-number">{index + 1}</span>
                    <input
                      type="text"
                      className="track-name"
                      value={track.name}
                      onChange={e => updateTrack(track.id, { name: e.target.value })}
                      onClick={e => e.stopPropagation()}
                    />
                    
                    <button
                      className={`btn-solo ${track.solo ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTrack(track.id, { solo: !track.solo });
                      }}
                      title="Solo"
                    >
                      S
                    </button>
                    
                    <button
                      className={`btn-mute ${track.mute ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTrack(track.id, { mute: !track.mute });
                      }}
                      title="Mute"
                    >
                      M
                    </button>

                    <input
                      type="range"
                      className="volume-slider"
                      min="0"
                      max="1"
                      step="0.01"
                      value={track.volume}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateTrack(track.id, { volume: parseFloat(e.target.value) });
                      }}
                      title="Volume"
                    />

                    <button
                      className="btn-remove-track"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTrack(track.id);
                      }}
                      title="Remove track"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="track-content">
                    {track.notes.map(note => (
                      <div
                        key={note.id}
                        className="note-block"
                        style={{
                          left: `${note.startTime * BEAT_WIDTH * zoom}px`,
                          width: `${note.duration * BEAT_WIDTH * zoom}px`,
                          height: `${TRACK_HEIGHT - 4}px`
                        }}
                        onDoubleClick={() => removeNote(note.id)}
                      >
                        <span className="note-label">Note</span>
                      </div>
                    ))}
                    
                    {track.samples && track.samples.map((sample, idx) => (
                      <div
                        key={`${sample.id}-${idx}`}
                        className="sample-block"
                        style={{
                          left: `${idx * BEAT_WIDTH * 2 * zoom}px`,
                          width: `${(sample.duration / (60 / tempo)) * BEAT_WIDTH * zoom}px`,
                          height: `${TRACK_HEIGHT - 4}px`
                        }}
                      >
                        <span className="sample-label">{sample.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Grid options */}
            <div className="grid-options">
              <label>
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={e => setSnapToGrid(e.target.checked)}
                />
                Snap to grid
              </label>

              <select
                value={gridSize}
                onChange={e => setGridSize(Number(e.target.value))}
              >
                <option value={0.25}>1/4 note</option>
                <option value={0.5}>1/2 note</option>
                <option value={1}>Whole note</option>
                <option value={0.125}>1/8 note</option>
                <option value={0.0625}>1/16 note</option>
              </select>

              <div className="zoom-control">
                <label>Zoom:</label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.25"
                  value={zoom}
                  onChange={e => setZoom(parseFloat(e.target.value))}
                />
                <span>{zoom}x</span>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'browser' && (
          <div className="browser-view">
            <SampleBrowser
              onSampleSelect={handleSampleSelect}
              onSampleDrag={handleSampleDrag}
            />
          </div>
        )}

        {viewMode === 'chopper' && (
          <div className="chopper-view">
            <SampleChopper
              sample={selectedSample}
              onChopComplete={handleChopComplete}
            />
          </div>
        )}
      </div>

      {/* Footer with hints */}
      <div className="daw-footer">
        <p className="hint">
          {viewMode === 'timeline' && 'Select a track and add notes • Use drum sequencer for beats • Browse samples to import'}
          {viewMode === 'browser' && 'Search for samples • Click to preview • Select to chop'}
          {viewMode === 'chopper' && 'Click waveform to add chop points • Export to add to timeline'}
        </p>
      </div>
    </div>
  );
};
