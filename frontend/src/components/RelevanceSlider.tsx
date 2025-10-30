import type { RelevanceFilter, RelevanceSemantic, RelevanceTimeframe, RelevanceTone } from '../types';

interface RelevanceSliderProps {
  value: RelevanceFilter;
  onChange: (next: RelevanceFilter) => void;
}

const TIMEFRAME_OPTIONS: Array<{ value: RelevanceTimeframe; label: string; helper: string }> = [
  { value: 'fresh', label: 'Fresh', helper: 'This week' },
  { value: 'recent', label: 'Recent', helper: 'Past season' },
  { value: 'timeless', label: 'Timeless', helper: 'Evergreen' }
];

const TONE_OPTIONS: Array<{ value: RelevanceTone; label: string; helper: string }> = [
  { value: 'funny', label: 'Playful', helper: 'Punchlines & levity' },
  { value: 'deep', label: 'Deep', helper: 'Feels & reflection' },
  { value: 'dark', label: 'Dark', helper: 'Grit & edge' }
];

const SEMANTIC_OPTIONS: Array<{ value: RelevanceSemantic; label: string; helper: string }> = [
  { value: 'tight', label: 'Tight', helper: 'Keep it focused' },
  { value: 'balanced', label: 'Balanced', helper: 'Blend directions' },
  { value: 'wild', label: 'Wild', helper: 'Max chaos' }
];

export function RelevanceSlider({ value, onChange }: RelevanceSliderProps) {
  return (
    <div className="relevance-panel glass">
      <header>
        <h3>Relevance Blend</h3>
        <p>Select how current, emotional, and experimental this pack should feel.</p>
      </header>

      <div className="slider-row">
        <span className="label">Recency</span>
        <div className="option-group">
          {TIMEFRAME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === value.timeframe ? 'chip active' : 'chip'}
              onClick={() => onChange({ ...value, timeframe: option.value })}
            >
              <strong>{option.label}</strong>
              <small>{option.helper}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="slider-row">
        <span className="label">Tone</span>
        <div className="option-group">
          {TONE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === value.tone ? 'chip active' : 'chip'}
              onClick={() => onChange({ ...value, tone: option.value })}
            >
              <strong>{option.label}</strong>
              <small>{option.helper}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="slider-row">
        <span className="label">Semantic Distance</span>
        <div className="option-group">
          {SEMANTIC_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === value.semantic ? 'chip active' : 'chip'}
              onClick={() => onChange({ ...value, semantic: option.value })}
            >
              <strong>{option.label}</strong>
              <small>{option.helper}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
