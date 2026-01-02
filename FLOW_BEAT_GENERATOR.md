# Flow Beat Generator Implementation

## Overview
The Flow Beat Generator is an interactive dual-metronome system that creates rhythmic inspiration for lyricists. It provides:

1. **Steady Beat Metronome** - A customizable quarter-note foundation beat
2. **Flow Pattern Metronome** - A flexible, user-editable beat pattern with variable note lengths

## Features

### Steady Beat (Left Column)
- **Adjustable BPM**: 40-240 BPM (real-time adjustment disabled during playback)
- **Time Signature Selection**: 2/4, 3/4, 4/4, or 6/8
- **Visual Beat Indicator**: Shows active beat with glowing highlight
- **Downbeat Distinction**: Lower frequency tone for downbeats, higher for regular beats
- **Play/Stop Toggle**: Easy transport controls

### Flow Pattern (Right Column)
- **Custom BPM**: Independent BPM for the flow pattern
- **Interactive Pattern Grid**: 
  - Click note letters to cycle through lengths (Quarter → Eighth → Sixteenth → Half)
  - Letters display: Q (Quarter), E (Eighth), S (Sixteenth), H (Half)
  - Visual feedback for active beat during playback
  - Silence indicators for removed notes

- **Pattern Controls**:
  - 🔇 Toggle: Mute/unmute individual beats (silence appears as red outline)
  - ✕ Remove: Delete a beat (disabled if only 1 beat remains)
  - + Add: Insert a new quarter-note beat after current position
  - 🎲 Random: Randomize all note lengths and silences
  - 📍 Quantize: Snap all notes to quarter notes for a grid-aligned beat

### Audio Synthesis
- **Web Audio API**: Uses oscillator synthesis for metronome tones
- **Frequency Differentiation**: 
  - Downbeats: 1000 Hz
  - Regular beats: 800 Hz
  - Flow notes: 600 Hz
- **Duration**: All beeps last 50-100ms for clear distinction
- **Gain Ramping**: Exponential fade-out for natural sound

## Integration Points

### Component File
- Location: `frontend/src/components/FlowBeatGenerator.tsx`
- Exports: `FlowBeatGenerator` React component
- Props: Optional `onClose` callback

### App Integration
- **State Management**: Added in `App.tsx` line 927:
  ```tsx
  const [showFlowBeatGenerator, setShowFlowBeatGenerator] = useState(false);
  ```

- **Flow Prompts Card Modified**: Updated to include action button:
  - Shows list of flow prompts from current pack
  - Button: "🎵 Generate Flow Beats" opens the generator
  - Help text explains the feature

- **Overlay Component**: Renders within `FocusModeOverlay` for consistent styling

### Styling
- Location: `frontend/src/App.css` (lines ~4032-4250)
- Features:
  - Responsive grid layout (2 columns on desktop, 1 on mobile)
  - Glass-morphism aesthetic matching app theme
  - Color-coded beat indicators (blue for active, red for silences)
  - Smooth transitions and hover states
  - Accessible focus indicators

## Usage Flow

1. **Enter Lyricist Mode** → Select "Rapper" or "Singer" submode
2. **Generate Pack** → Click ⚡ to create a fuel pack
3. **Find Flow Prompts Card** → Scroll to "Flow Prompts" section
4. **Click "Generate Flow Beats"** → Opens Flow Beat Generator overlay
5. **Set Steady Beat**:
   - Adjust BPM (e.g., 120)
   - Select time signature (e.g., 4/4)
   - Click "Play Steady"
6. **Create Flow Pattern**:
   - Adjust Flow BPM
   - Click note letters to change lengths
   - Use 🔇 to add silences
   - Use + to add beats
   - Use ✕ to remove beats
   - Use 🎲 Random for inspiration
   - Click "Play Flow"
7. **Layer Both**: Play steady beat and flow pattern simultaneously
8. **Refine**: Adjust BPM, pattern, or use Quantize/Random as needed
9. **Close** → Click "Close Flow Generator" or close overlay

## Technical Implementation Details

### State Management
```tsx
interface BeatPattern {
  notes: NoteLength[];          // Note lengths: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth'
  silences: boolean[];          // Track which beats are silenced
}

// Local state for each metronome
const [bpm, setBpm]                    // Steady beat BPM (40-240)
const [timeSignature, setTimeSignature] // Time signature ('2/4' | '3/4' | '4/4' | '6/8')
const [flowBpm, setFlowBpm]            // Flow pattern BPM (40-240)
const [beatPattern, setBeatPattern]    // Flow pattern structure
const [isPlayingMetronome1, setIsPlayingMetronome1] // Steady beat playing?
const [isPlayingFlow, setIsPlayingFlow]             // Flow pattern playing?
const [currentBeatIndex, setCurrentBeatIndex]       // Current beat in steady beat
const [currentFlowBeatIndex, setCurrentFlowBeatIndex] // Current beat in flow pattern
```

### Audio Context
- Initialized lazily on first playback to comply with browser audio policies
- Uses `Web Audio API` oscillators for synthesis
- Supports automatic resume if audio context suspended

### Timing Calculation
```tsx
// Convert note length to milliseconds based on BPM
getNoteDelayMs(noteLength, bpm) {
  const beatMs = (60 / bpm) * 1000;  // 1 quarter note duration
  const durations = {
    whole: beatMs * 4,
    half: beatMs * 2,
    quarter: beatMs,
    eighth: beatMs / 2,
    sixteenth: beatMs / 4
  };
  return durations[noteLength];
}
```

### Pattern Editing
- Clicking a note cycles: Q → E → S → H → Q
- Silences don't generate audio but still occupy grid space
- Adding/removing beats maintains pattern length
- Quantize forces all to quarter notes for alignment
- Random preserves pattern length but changes note lengths

## Responsive Design

### Desktop (>1024px)
- Two-column layout side-by-side
- Full-size pattern grid

### Tablet (1024px - 640px)
- Single-column stacked layout
- Adjusted pattern grid size

### Mobile (<640px)
- Compact spacing
- Smaller pattern grid (50px minimum width per beat)
- Reduced font sizes for note letters and buttons

## Future Enhancement Ideas

1. **Pattern Presets**: Save/load custom beat patterns
2. **MIDI Export**: Send pattern to DAW or MIDI device
3. **Recording**: Capture beats to audio file
4. **Multi-track**: Add swing, delay, or effects
5. **Visual Waveform**: Show pattern as waveform
6. **Tap Tempo**: Tap BPM instead of typing
7. **Swing Amount**: Add triplet shuffle or swing
8. **Note Velocity**: Vary volume by beat
9. **Pattern Library**: Browse community patterns
10. **Key Alignment**: Sync with harmonic content

## Accessibility Features

- **ARIA Labels**: Descriptive labels on buttons and controls
- **Keyboard Navigation**: Focus management in overlay
- **Color Indication**: Active beats use both color and scale changes
- **Disabled States**: Cannot modify BPM/time signature during playback
- **Visual Feedback**: Clear state changes on all interactive elements

## Browser Compatibility

- **Web Audio API**: Supported in all modern browsers
- **AudioContext**: Falls back to webkitAudioContext for Safari
- **Audio Permissions**: Handles suspended audio contexts for autoplay policies
- **Tested on**: Chrome, Firefox, Safari, Edge

## Performance Considerations

- **No Web Workers**: Audio timing uses standard JS intervals (acceptable for metronome use)
- **Memory**: Clean up audio nodes on unmount
- **CPU**: Minimal overhead; oscillators are efficient
- **Network**: Entirely client-side; no API calls
