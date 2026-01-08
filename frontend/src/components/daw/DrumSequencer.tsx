import React, { useState, useCallback } from 'react';
import './DrumSequencer.css';

export interface DrumStep {
  step: number; // 0-15
  drum: DrumType;
  velocity: number; // 0-127
  enabled: boolean;
}

export type DrumType = 'kick' | 'snare' | 'hihat' | 'clap' | 'tom' | 'crash' | 'ride' | 'perc';

export type PatternPreset = 'four-on-floor' | 'breakbeat' | 'trap' | 'dnb' | 'techno' | 'hip-hop' | 'blank';

interface DrumSequencerProps {
  steps: DrumStep[];
  currentStep: number; // Which step is currently playing (0-15, or -1 if stopped)
  onStepsChange: (steps: DrumStep[]) => void;
  disabled?: boolean;
}

const DRUM_TYPES: DrumType[] = ['kick', 'snare', 'hihat', 'clap', 'tom', 'crash', 'ride', 'perc'];

const DRUM_LABELS: Record<DrumType, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hihat: 'Hi-Hat',
  clap: 'Clap',
  tom: 'Tom',
  crash: 'Crash',
  ride: 'Ride',
  perc: 'Perc'
};

const PRESET_PATTERNS: Record<PatternPreset, DrumStep[]> = {
  'four-on-floor': [
    // Kick on every beat (0, 4, 8, 12)
    { step: 0, drum: 'kick', velocity: 100, enabled: true },
    { step: 4, drum: 'kick', velocity: 100, enabled: true },
    { step: 8, drum: 'kick', velocity: 100, enabled: true },
    { step: 12, drum: 'kick', velocity: 100, enabled: true },
    // Hi-hat on every other step
    ...Array.from({ length: 16 }, (_, i) => ({
      step: i,
      drum: 'hihat' as DrumType,
      velocity: i % 4 === 0 ? 100 : 80,
      enabled: true
    })),
    // Snare on 2 & 4 (steps 4 & 12)
    { step: 4, drum: 'snare', velocity: 100, enabled: true },
    { step: 12, drum: 'snare', velocity: 100, enabled: true }
  ],
  'breakbeat': [
    // Classic breakbeat pattern
    { step: 0, drum: 'kick', velocity: 100, enabled: true },
    { step: 3, drum: 'kick', velocity: 90, enabled: true },
    { step: 6, drum: 'kick', velocity: 80, enabled: true },
    { step: 4, drum: 'snare', velocity: 100, enabled: true },
    { step: 12, drum: 'snare', velocity: 100, enabled: true },
    { step: 0, drum: 'hihat', velocity: 80, enabled: true },
    { step: 2, drum: 'hihat', velocity: 70, enabled: true },
    { step: 4, drum: 'hihat', velocity: 80, enabled: true },
    { step: 6, drum: 'hihat', velocity: 70, enabled: true },
    { step: 8, drum: 'hihat', velocity: 80, enabled: true },
    { step: 10, drum: 'hihat', velocity: 70, enabled: true },
    { step: 12, drum: 'hihat', velocity: 80, enabled: true },
    { step: 14, drum: 'hihat', velocity: 70, enabled: true }
  ],
  'trap': [
    // 808 trap pattern
    { step: 0, drum: 'kick', velocity: 100, enabled: true },
    { step: 6, drum: 'kick', velocity: 90, enabled: true },
    { step: 4, drum: 'snare', velocity: 100, enabled: true },
    { step: 12, drum: 'snare', velocity: 100, enabled: true },
    // Hi-hat rolls
    ...Array.from({ length: 16 }, (_, i) => ({
      step: i,
      drum: 'hihat' as DrumType,
      velocity: i % 2 === 0 ? 90 : 70,
      enabled: true
    })),
    { step: 7, drum: 'clap', velocity: 80, enabled: true }
  ],
  'dnb': [
    // Drum & Bass pattern (fast)
    { step: 0, drum: 'kick', velocity: 100, enabled: true },
    { step: 8, drum: 'kick', velocity: 100, enabled: true },
    { step: 4, drum: 'snare', velocity: 100, enabled: true },
    { step: 12, drum: 'snare', velocity: 100, enabled: true },
    // Fast hi-hats
    ...Array.from({ length: 16 }, (_, i) => ({
      step: i,
      drum: 'hihat' as DrumType,
      velocity: i % 2 === 0 ? 85 : 65,
      enabled: true
    }))
  ],
  'techno': [
    // Four-on-floor with ride
    ...Array.from({ length: 4 }, (_, i) => ({
      step: i * 4,
      drum: 'kick' as DrumType,
      velocity: 100,
      enabled: true
    })),
    { step: 4, drum: 'snare', velocity: 90, enabled: true },
    { step: 12, drum: 'snare', velocity: 90, enabled: true },
    // Continuous ride
    ...Array.from({ length: 16 }, (_, i) => ({
      step: i,
      drum: 'ride' as DrumType,
      velocity: 75,
      enabled: true
    }))
  ],
  'hip-hop': [
    // Classic hip-hop boom-bap
    { step: 0, drum: 'kick', velocity: 100, enabled: true },
    { step: 4, drum: 'snare', velocity: 100, enabled: true },
    { step: 8, drum: 'kick', velocity: 100, enabled: true },
    { step: 12, drum: 'snare', velocity: 100, enabled: true },
    // Sparse hi-hats
    { step: 2, drum: 'hihat', velocity: 80, enabled: true },
    { step: 6, drum: 'hihat', velocity: 80, enabled: true },
    { step: 10, drum: 'hihat', velocity: 80, enabled: true },
    { step: 14, drum: 'hihat', velocity: 80, enabled: true }
  ],
  'blank': []
};

export const DrumSequencer: React.FC<DrumSequencerProps> = ({
  steps,
  currentStep,
  onStepsChange,
  disabled = false
}) => {
  const [selectedDrum, setSelectedDrum] = useState<DrumType>('kick');

  const toggleStep = useCallback((stepIndex: number, drum: DrumType) => {
    const existingStepIndex = steps.findIndex(s => s.step === stepIndex && s.drum === drum);
    
    if (existingStepIndex >= 0) {
      // Remove step
      onStepsChange(steps.filter((_, i) => i !== existingStepIndex));
    } else {
      // Add step
      onStepsChange([...steps, {
        step: stepIndex,
        drum,
        velocity: 100,
        enabled: true
      }]);
    }
  }, [steps, onStepsChange]);

  const setVelocity = useCallback((stepIndex: number, drum: DrumType, velocity: number) => {
    onStepsChange(steps.map(s =>
      s.step === stepIndex && s.drum === drum
        ? { ...s, velocity }
        : s
    ));
  }, [steps, onStepsChange]);

  const loadPreset = useCallback((preset: PatternPreset) => {
    onStepsChange(PRESET_PATTERNS[preset]);
  }, [onStepsChange]);

  const clearPattern = useCallback(() => {
    onStepsChange([]);
  }, [onStepsChange]);

  const isStepActive = (stepIndex: number, drum: DrumType) => {
    return steps.some(s => s.step === stepIndex && s.drum === drum && s.enabled);
  };

  const getStepVelocity = (stepIndex: number, drum: DrumType) => {
    const step = steps.find(s => s.step === stepIndex && s.drum === drum);
    return step?.velocity || 100;
  };

  return (
    <div className="drum-sequencer">
      <div className="sequencer-header">
        <h3>Drum Sequencer</h3>
        <div className="preset-buttons">
          <select
            className="preset-select"
            onChange={e => loadPreset(e.target.value as PatternPreset)}
            disabled={disabled}
            defaultValue=""
          >
            <option value="" disabled>Load Preset...</option>
            <option value="four-on-floor">Four-on-Floor</option>
            <option value="breakbeat">Breakbeat</option>
            <option value="trap">Trap</option>
            <option value="dnb">Drum & Bass</option>
            <option value="techno">Techno</option>
            <option value="hip-hop">Hip-Hop</option>
            <option value="blank">Clear All</option>
          </select>
          <button
            type="button"
            className="btn-clear"
            onClick={clearPattern}
            disabled={disabled}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="sequencer-grid">
        {/* Column headers (step numbers) */}
        <div className="grid-header">
          <div className="drum-label-header"></div>
          {Array.from({ length: 16 }, (_, i) => (
            <div
              key={i}
              className={`step-header ${currentStep === i ? 'playing' : ''}`}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Drum rows */}
        {DRUM_TYPES.map(drum => (
          <div key={drum} className="drum-row">
            <div
              className={`drum-label ${selectedDrum === drum ? 'selected' : ''}`}
              onClick={() => setSelectedDrum(drum)}
              role="button"
              aria-label={`Select ${DRUM_LABELS[drum]}`}
              tabIndex={0}
            >
              {DRUM_LABELS[drum]}
            </div>
            
            {Array.from({ length: 16 }, (_, stepIndex) => {
              const isActive = isStepActive(stepIndex, drum);
              const velocity = getStepVelocity(stepIndex, drum);
              const isCurrent = currentStep === stepIndex;
              
              return (
                <div
                  key={stepIndex}
                  className={`step-cell ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
                  onClick={() => !disabled && toggleStep(stepIndex, drum)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (!disabled && isActive) {
                      // Right-click to adjust velocity
                      const newVelocity = prompt(`Velocity (0-127):`, velocity.toString());
                      if (newVelocity !== null) {
                        const val = Math.max(0, Math.min(127, parseInt(newVelocity) || 100));
                        setVelocity(stepIndex, drum, val);
                      }
                    }
                  }}
                  role="button"
                  aria-label={`Step ${stepIndex + 1}, ${DRUM_LABELS[drum]}`}
                  tabIndex={0}
                  style={{
                    opacity: isActive ? velocity / 127 : 0.3
                  }}
                >
                  {isActive && (
                    <div className="step-indicator" style={{ height: `${(velocity / 127) * 100}%` }}></div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="sequencer-hint">
        <p>Click to toggle steps • Right-click active steps to adjust velocity</p>
      </div>
    </div>
  );
};
