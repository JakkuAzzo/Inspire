import React, { useState, useCallback, useEffect } from 'react';
import './SampleBrowser.css';

export interface AudioSample {
  id: string;
  name: string;
  duration: number; // in seconds
  url: string; // Preview or download URL
  source: 'freesound' | 'jamendo' | 'local';
  tags?: string[];
  tempo?: number;
}

interface SampleBrowserProps {
  onSampleSelect: (sample: AudioSample) => void;
  onSampleDrag: (sample: AudioSample) => void;
  disabled?: boolean;
}

export const SampleBrowser: React.FC<SampleBrowserProps> = ({
  onSampleSelect,
  onSampleDrag,
  disabled = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AudioSample[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  const searchFreesound = useCallback(async (query: string): Promise<AudioSample[]> => {
    const response = await fetch(`/api/audio/search?query=${encodeURIComponent(query)}&source=freesound&limit=20`);
    if (!response.ok) throw new Error('Freesound search failed');
    
    const data = await response.json();
    return data.sounds?.map((sound: any) => ({
      id: `freesound-${sound.id}`,
      name: sound.name,
      duration: sound.duration || 0,
      url: sound.previews?.['preview-hq-mp3'] || sound.previews?.['preview-lq-mp3'] || '',
      source: 'freesound' as const,
      tags: sound.tags
    })) || [];
  }, []);

  const searchJamendo = useCallback(async (query: string): Promise<AudioSample[]> => {
    const response = await fetch(`/api/audio/search?query=${encodeURIComponent(query)}&source=jamendo&limit=20`);
    if (!response.ok) throw new Error('Jamendo search failed');
    
    const data = await response.json();
    return data.tracks?.map((track: any) => ({
      id: `jamendo-${track.id}`,
      name: track.name,
      duration: track.duration || 0,
      url: track.audio || '',
      source: 'jamendo' as const,
      tags: [track.albumname, track.artist_name].filter(Boolean),
      tempo: track.audiodownload_allowed ? undefined : undefined
    })) || [];
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Search both APIs in parallel
      const [freesoundResults, jamendoResults] = await Promise.all([
        searchFreesound(searchQuery).catch(() => []),
        searchJamendo(searchQuery).catch(() => [])
      ]);

      const allResults = [...freesoundResults, ...jamendoResults];
      
      if (allResults.length === 0) {
        setError('No samples found. Try a different search term.');
      }
      
      setSearchResults(allResults);
    } catch (err) {
      console.error('Sample search error:', err);
      setError('Failed to search samples. Check your API credentials.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, searchFreesound, searchJamendo]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const playPreview = useCallback((sample: AudioSample) => {
    // Stop current audio if playing
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    // If clicking the same sample, stop playback
    if (currentlyPlaying === sample.id) {
      setCurrentlyPlaying(null);
      return;
    }

    // Play new audio
    const audio = new Audio(sample.url);
    audio.addEventListener('ended', () => setCurrentlyPlaying(null));
    audio.addEventListener('error', () => {
      console.error('Audio playback error:', sample.url);
      setCurrentlyPlaying(null);
    });
    
    audio.play().catch(err => {
      console.error('Failed to play audio:', err);
      setCurrentlyPlaying(null);
    });

    setAudioElement(audio);
    setCurrentlyPlaying(sample.id);
  }, [audioElement, currentlyPlaying]);

  // Commenting out unused stopPreview function
  // const stopPreview = useCallback(() => {
  //   if (audioElement) {
  //     audioElement.pause();
  //     audioElement.currentTime = 0;
  //   }
  //   setCurrentlyPlaying(null);
  // }, [audioElement]);

  const handleDragStart = useCallback((e: React.DragEvent, sample: AudioSample) => {
    e.dataTransfer.setData('application/json', JSON.stringify(sample));
    e.dataTransfer.effectAllowed = 'copy';
    onSampleDrag(sample);
  }, [onSampleDrag]);

  const loadPresetSamples = useCallback((category: string) => {
    setSearchQuery(category);
    setSearchQuery(() => {
      handleSearch();
      return category;
    });
  }, [handleSearch]);

  return (
    <div className="sample-browser">
      <div className="browser-header">
        <h3>Sample Browser</h3>
        <div className="preset-categories">
          <button onClick={() => loadPresetSamples('kick drum')} disabled={disabled}>Kicks</button>
          <button onClick={() => loadPresetSamples('snare')} disabled={disabled}>Snares</button>
          <button onClick={() => loadPresetSamples('hi-hat')} disabled={disabled}>Hi-Hats</button>
          <button onClick={() => loadPresetSamples('synth pad')} disabled={disabled}>Pads</button>
          <button onClick={() => loadPresetSamples('bass loop')} disabled={disabled}>Bass</button>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search samples (e.g., 'kick', 'synth', 'guitar')..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          className="search-input"
        />
        <button
          type="button"
          className="btn-search"
          onClick={handleSearch}
          disabled={disabled || isLoading}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="sample-list">
        {searchResults.length === 0 && !isLoading && !error && (
          <div className="empty-state">
            <p>🎵 Search for samples to get started</p>
            <p className="hint">Try "kick", "snare", "synth pad", or "guitar"</p>
          </div>
        )}

        {searchResults.map(sample => (
          <div
            key={sample.id}
            className={`sample-item ${currentlyPlaying === sample.id ? 'playing' : ''}`}
            draggable={!disabled}
            onDragStart={e => handleDragStart(e, sample)}
            onClick={() => onSampleSelect(sample)}
          >
            <div className="sample-info">
              <div className="sample-name">{sample.name}</div>
              <div className="sample-meta">
                <span className="sample-duration">{sample.duration.toFixed(1)}s</span>
                <span className="sample-source">{sample.source}</span>
                {sample.tempo && <span className="sample-tempo">{sample.tempo} BPM</span>}
              </div>
              {sample.tags && sample.tags.length > 0 && (
                <div className="sample-tags">
                  {sample.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="sample-actions">
              <button
                type="button"
                className="btn-preview"
                onClick={(e) => {
                  e.stopPropagation();
                  playPreview(sample);
                }}
                disabled={disabled}
                aria-label={currentlyPlaying === sample.id ? 'Stop preview' : 'Play preview'}
              >
                {currentlyPlaying === sample.id ? '⏸️' : '▶️'}
              </button>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Searching samples...</p>
          </div>
        )}
      </div>

      <div className="browser-hint">
        <p>Click to select • Drag to timeline • Play button to preview</p>
      </div>
    </div>
  );
};
