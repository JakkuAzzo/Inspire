import React from 'react';
import './InstrumentSelector.css';

export type InstrumentType = 'piano' | 'synth' | 'bass' | 'drums' | 'sampler';

export interface InstrumentConfig {
  type: InstrumentType;
  waveform?: OscillatorType; // 'sine', 'square', 'sawtooth', 'triangle'
  attack?: number; // ADSR envelope in seconds
  decay?: number;
  sustain?: number; // 0-1 level
  release?: number;
}

interface InstrumentSelectorProps {
  currentInstrument: InstrumentConfig;
  onChange: (instrument: InstrumentConfig) => void;
  disabled?: boolean;
}

const INSTRUMENT_PRESETS: Record<InstrumentType, InstrumentConfig> = {
  piano: {
    type: 'piano',
    waveform: 'sine',
    attack: 0.01,
    decay: 0.2,
    sustain: 0.5,
    release: 0.8
  },
  synth: {
    type: 'synth',
    waveform: 'sawtooth',
    attack: 0.05,
    decay: 0.1,
    sustain: 0.7,
    release: 0.3
  },
  bass: {
    type: 'bass',
    waveform: 'triangle',
    attack: 0.01,
    decay: 0.2,
    sustain: 0.9,
    release: 0.1
  },
  drums: {
    type: 'drums',
    // Drums use samples, not oscillators
    attack: 0.001,
    decay: 0.1,
    sustain: 0,
    release: 0.05
  },
  sampler: {
    type: 'sampler',
    // Sampler plays loaded audio files
    attack: 0,
    decay: 0,
    sustain: 1,
    release: 0.05
  }
};

export const InstrumentSelector: React.FC<InstrumentSelectorProps> = ({
  currentInstrument,
  onChange,
  disabled = false
}) => {
  const handleInstrumentChange = (type: InstrumentType) => {
    onChange(INSTRUMENT_PRESETS[type]);
  };

  const handleWaveformChange = (waveform: OscillatorType) => {
    onChange({ ...currentInstrument, waveform });
  };

  const handleEnvelopeChange = (param: keyof InstrumentConfig, value: number) => {
    onChange({ ...currentInstrument, [param]: value });
  };

  const showWaveformSelector = ['piano', 'synth', 'bass'].includes(currentInstrument.type);

  return (
    <div className="instrument-selector">
      <div className="instrument-tabs">
        {(Object.keys(INSTRUMENT_PRESETS) as InstrumentType[]).map(type => (
          <button
            key={type}
            type="button"
            className={`instrument-tab ${currentInstrument.type === type ? 'active' : ''}`}
            onClick={() => handleInstrumentChange(type)}
            disabled={disabled}
            aria-label={`Select ${type} instrument`}
          >
            <span className="instrument-icon">
              {type === 'piano' && '🎹'}
              {type === 'synth' && '🎛️'}
              {type === 'bass' && '🎸'}
              {type === 'drums' && '🥁'}
              {type === 'sampler' && '🎼'}
            </span>
            <span className="instrument-name">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
          </button>
        ))}
      </div>

      {/* Waveform selector (for oscillator-based instruments) */}
      {showWaveformSelector && (
        <div className="waveform-selector">
          <label htmlFor="waveform-select">Waveform:</label>
          <select
            id="waveform-select"
            value={currentInstrument.waveform || 'sine'}
            onChange={e => handleWaveformChange(e.target.value as OscillatorType)}
            disabled={disabled}
            className="waveform-select"
          >
            <option value="sine">Sine</option>
            <option value="square">Square</option>
            <option value="sawtooth">Sawtooth</option>
            <option value="triangle">Triangle</option>
          </select>
        </div>
      )}

      {/* ADSR Envelope controls */}
      <div className="envelope-controls">
        <div className="envelope-param">
          <label htmlFor="attack-slider">Attack:</label>
          <input
            id="attack-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={currentInstrument.attack || 0}
            onChange={e => handleEnvelopeChange('attack', parseFloat(e.target.value))}
            disabled={disabled}
            className="envelope-slider"
          />
          <span className="envelope-value">{(currentInstrument.attack || 0).toFixed(2)}s</span>
        </div>

        <div className="envelope-param">
          <label htmlFor="decay-slider">Decay:</label>
          <input
            id="decay-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={currentInstrument.decay || 0}
            onChange={e => handleEnvelopeChange('decay', parseFloat(e.target.value))}
            disabled={disabled}
            className="envelope-slider"
          />
          <span className="envelope-value">{(currentInstrument.decay || 0).toFixed(2)}s</span>
        </div>

        <div className="envelope-param">
          <label htmlFor="sustain-slider">Sustain:</label>
          <input
            id="sustain-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={currentInstrument.sustain || 0}
            onChange={e => handleEnvelopeChange('sustain', parseFloat(e.target.value))}
            disabled={disabled}
            className="envelope-slider"
          />
          <span className="envelope-value">{(currentInstrument.sustain || 0).toFixed(2)}</span>
        </div>

        <div className="envelope-param">
          <label htmlFor="release-slider">Release:</label>
          <input
            id="release-slider"
            type="range"
            min="0"
            max="2"
            step="0.01"
            value={currentInstrument.release || 0}
            onChange={e => handleEnvelopeChange('release', parseFloat(e.target.value))}
            disabled={disabled}
            className="envelope-slider"
          />
          <span className="envelope-value">{(currentInstrument.release || 0).toFixed(2)}s</span>
        </div>
      </div>
    </div>
  );
};
