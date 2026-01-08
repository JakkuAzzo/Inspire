/**
 * Audio Synthesizer Service
 * 
 * Provides simple Web Audio API synthesis for MIDI notes.
 * Used by CollaborativeDAW to play piano roll notes.
 */

export interface SynthesizerConfig {
  attack: number;   // Attack time in seconds
  decay: number;    // Decay time in seconds
  sustain: number;  // Sustain level (0-1)
  release: number;  // Release time in seconds
  volume: number;   // Master volume (0-1)
}

const DEFAULT_CONFIG: SynthesizerConfig = {
  attack: 0.01,
  decay: 0.1,
  sustain: 0.3,
  release: 0.2,
  volume: 0.3
};

class AudioSynthesizer {
  private audioContext: AudioContext | null = null;
  private config: SynthesizerConfig = DEFAULT_CONFIG;
  private masterGain: GainNode | null = null;
  private activeNotes: Map<number, { osc: OscillatorNode; gain: GainNode; startTime: number }> = new Map();

  constructor(config?: Partial<SynthesizerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  init(): AudioContext {
    if (!this.audioContext) {
      const ctor = window.AudioContext ?? 
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      
      if (!ctor) {
        throw new Error('Web Audio API not supported');
      }

      this.audioContext = new ctor();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.setValueAtTime(this.config.volume, this.audioContext.currentTime);
      this.masterGain.connect(this.audioContext.destination);
    }

    return this.audioContext;
  }

  /**
   * Convert MIDI note number to frequency in Hz
   */
  private midiToFrequency(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  /**
   * Play a note with the given MIDI pitch
   * @param midiNote MIDI note number (0-127)
   * @param duration Duration in seconds (optional, for one-shot notes)
   */
  playNote(midiNote: number, duration?: number) {
    try {
      const ctx = this.init();
      if (!this.masterGain) return;

      const frequency = this.midiToFrequency(midiNote);
      const now = ctx.currentTime;

      // Create oscillator
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, now);

      // Create gain envelope
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);

      // ADSR envelope
      gain.gain.linearRampToValueAtTime(1, now + this.config.attack);
      gain.gain.linearRampToValueAtTime(this.config.sustain, now + this.config.attack + this.config.decay);

      // Connect and play
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);

      // If duration specified, stop after duration
      if (duration) {
        gain.gain.linearRampToValueAtTime(0, now + duration - this.config.release);
        osc.stop(now + duration);
      } else {
        // Store active note for manual stopping
        this.activeNotes.set(midiNote, { osc, gain, startTime: now });
      }
    } catch (err) {
      console.warn('Audio synthesis error:', err);
    }
  }

  /**
   * Stop playing a note
   * @param midiNote MIDI note number (0-127)
   */
  stopNote(midiNote: number) {
    const note = this.activeNotes.get(midiNote);
    if (!note || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const { osc, gain } = note;

    // Release envelope
    gain.gain.linearRampToValueAtTime(0, now + this.config.release);
    osc.stop(now + this.config.release);

    this.activeNotes.delete(midiNote);
  }

  /**
   * Stop all playing notes
   */
  stopAll() {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    for (const [, { osc, gain }] of this.activeNotes) {
      gain.gain.linearRampToValueAtTime(0, now + this.config.release);
      osc.stop(now + this.config.release);
    }
    this.activeNotes.clear();
  }

  /**
   * Update synthesizer configuration
   */
  setConfig(config: Partial<SynthesizerConfig>) {
    this.config = { ...this.config, ...config };

    // Update master volume if changed
    if (this.masterGain && config.volume !== undefined) {
      const ctx = this.audioContext;
      if (ctx) {
        this.masterGain.gain.linearRampToValueAtTime(config.volume, ctx.currentTime + 0.1);
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SynthesizerConfig {
    return { ...this.config };
  }

  /**
   * Check if a note is currently playing
   */
  isNotePlaying(midiNote: number): boolean {
    return this.activeNotes.has(midiNote);
  }

  /**
   * Get number of active voices
   */
  getActiveVoiceCount(): number {
    return this.activeNotes.size;
  }
}

// Singleton instance
let synthesizerInstance: AudioSynthesizer | null = null;

export function getSynthesizer(config?: Partial<SynthesizerConfig>): AudioSynthesizer {
  if (!synthesizerInstance) {
    synthesizerInstance = new AudioSynthesizer(config);
  }
  return synthesizerInstance;
}

export default getSynthesizer;
