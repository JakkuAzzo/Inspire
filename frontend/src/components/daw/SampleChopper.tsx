import React, { useState, useCallback, useEffect, useRef } from 'react';
import './SampleChopper.css';
import type { AudioSample } from './SampleBrowser';

interface ChopPoint {
  id: string;
  position: number; // 0-1 normalized position
  time: number; // seconds
}

interface SampleChopperProps {
  sample: AudioSample | null;
  onChopComplete: (chops: AudioSample[]) => void;
  disabled?: boolean;
}

export const SampleChopper: React.FC<SampleChopperProps> = ({
  sample,
  onChopComplete,
  disabled = false
}) => {
  const [chopPoints, setChopPoints] = useState<ChopPoint[]>([]);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize Audio Context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Load and analyze sample
  useEffect(() => {
    if (!sample || !audioContextRef.current) {
      setWaveformData([]);
      setAudioBuffer(null);
      setChopPoints([]);
      return;
    }

    const loadAudio = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(sample.url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
        
        setAudioBuffer(buffer);
        
        // Generate waveform data (downsample for visualization)
        const rawData = buffer.getChannelData(0);
        const samples = 500; // Number of bars in waveform
        const blockSize = Math.floor(rawData.length / samples);
        const waveform: number[] = [];

        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[i * blockSize + j]);
          }
          waveform.push(sum / blockSize);
        }

        setWaveformData(waveform);
      } catch (err) {
        console.error('Failed to load audio:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAudio();
  }, [sample]);

  // Draw waveform
  useEffect(() => {
    if (!canvasRef.current || waveformData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / waveformData.length;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, width, height);

    // Draw waveform
    ctx.fillStyle = 'rgba(96, 165, 250, 0.6)';
    waveformData.forEach((value, index) => {
      const barHeight = value * height * zoom;
      const x = index * barWidth;
      const y = (height - barHeight) / 2;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });

    // Draw chop points
    chopPoints.forEach(point => {
      const x = point.position * width;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Draw handle
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x - 4, 0, 8, 20);
      ctx.fillRect(x - 4, height - 20, 8, 20);
    });

    // Draw playhead
    if (isPlaying && audioBuffer) {
      const x = playheadPosition * width;
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }, [waveformData, chopPoints, zoom, playheadPosition, isPlaying, audioBuffer]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !audioBuffer || disabled) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = x / rect.width;
    const time = position * audioBuffer.duration;

    const newChopPoint: ChopPoint = {
      id: `chop-${Date.now()}`,
      position,
      time
    };

    setChopPoints(prev => [...prev, newChopPoint].sort((a, b) => a.position - b.position));
  }, [audioBuffer, disabled]);

  const removeChopPoint = useCallback((id: string) => {
    setChopPoints(prev => prev.filter(point => point.id !== id));
  }, []);

  const clearChopPoints = useCallback(() => {
    setChopPoints([]);
  }, []);

  const playFullSample = useCallback(() => {
    if (!audioBuffer || !audioContextRef.current) return;

    // Stop any existing playback
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    const startTime = audioContextRef.current.currentTime;
    source.start();
    sourceNodeRef.current = source;
    setIsPlaying(true);

    // Animate playhead
    const animate = () => {
      const elapsed = audioContextRef.current!.currentTime - startTime;
      setPlayheadPosition(Math.min(elapsed / audioBuffer.duration, 1));

      if (elapsed < audioBuffer.duration) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        setPlayheadPosition(0);
      }
    };
    animationFrameRef.current = requestAnimationFrame(animate);

    source.onended = () => {
      setIsPlaying(false);
      setPlayheadPosition(0);
      sourceNodeRef.current = null;
    };
  }, [audioBuffer]);

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsPlaying(false);
    setPlayheadPosition(0);
  }, []);

  const exportChops = useCallback(() => {
    if (!audioBuffer || !sample || chopPoints.length === 0) return;

    // Create chops from segments between chop points
    const segments: AudioSample[] = [];
    const sortedPoints = [
      { id: 'start', position: 0, time: 0 },
      ...chopPoints,
      { id: 'end', position: 1, time: audioBuffer.duration }
    ];

    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const start = sortedPoints[i];
      const end = sortedPoints[i + 1];
      
      segments.push({
        id: `${sample.id}-chop-${i}`,
        name: `${sample.name} (chop ${i + 1})`,
        duration: end.time - start.time,
        url: sample.url, // In production, would extract actual audio segment
        source: sample.source,
        tags: [...(sample.tags || []), 'chopped']
      });
    }

    onChopComplete(segments);
  }, [audioBuffer, sample, chopPoints, onChopComplete]);

  if (!sample) {
    return (
      <div className="sample-chopper empty">
        <p className="empty-message">🎵 Select a sample from the browser to start chopping</p>
      </div>
    );
  }

  return (
    <div className="sample-chopper">
      <div className="chopper-header">
        <h3>Sample Chopper</h3>
        <div className="sample-info-brief">
          <span className="sample-name-brief">{sample.name}</span>
          <span className="sample-duration-brief">{sample.duration.toFixed(2)}s</span>
        </div>
      </div>

      <div className="waveform-container">
        {isLoading ? (
          <div className="loading-waveform">
            <div className="spinner"></div>
            <p>Loading waveform...</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={800}
            height={200}
            className="waveform-canvas"
            onClick={handleCanvasClick}
          />
        )}
      </div>

      <div className="chopper-controls">
        <div className="playback-controls">
          <button
            type="button"
            className="btn-play"
            onClick={isPlaying ? stopPlayback : playFullSample}
            disabled={disabled || !audioBuffer}
          >
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>
          
          <div className="zoom-control">
            <label htmlFor="zoom-slider">Zoom:</label>
            <input
              id="zoom-slider"
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              disabled={disabled}
              className="zoom-slider"
            />
            <span className="zoom-value">{zoom}x</span>
          </div>
        </div>

        <div className="chop-actions">
          <button
            type="button"
            className="btn-clear"
            onClick={clearChopPoints}
            disabled={disabled || chopPoints.length === 0}
          >
            Clear Points
          </button>
          
          <button
            type="button"
            className="btn-export"
            onClick={exportChops}
            disabled={disabled || chopPoints.length === 0}
          >
            Export {chopPoints.length + 1} Chops
          </button>
        </div>
      </div>

      {chopPoints.length > 0 && (
        <div className="chop-list">
          <h4>Chop Points ({chopPoints.length})</h4>
          <div className="chop-items">
            {chopPoints.map((point, index) => (
              <div key={point.id} className="chop-item">
                <span className="chop-number">#{index + 1}</span>
                <span className="chop-time">{point.time.toFixed(2)}s</span>
                <button
                  type="button"
                  className="btn-remove-chop"
                  onClick={() => removeChopPoint(point.id)}
                  disabled={disabled}
                  aria-label="Remove chop point"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="chopper-hint">
        <p>Click on waveform to add chop points • Red lines mark segments • Export to create individual samples</p>
      </div>
    </div>
  );
};
