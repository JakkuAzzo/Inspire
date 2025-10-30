import { useCallback, useEffect, useRef, useState } from 'react';
import type { CreativeMode } from '../types';

const SOUND_PROFILES: Record<'landing' | CreativeMode, Array<{ type: OscillatorType; frequency: number; gain: number; detune?: number }>> = {
  landing: [
    { type: 'sine', frequency: 72, gain: 0.18 },
    { type: 'triangle', frequency: 144, gain: 0.12, detune: -12 }
  ],
  lyricist: [
    { type: 'sine', frequency: 96, gain: 0.22 },
    { type: 'triangle', frequency: 192, gain: 0.1, detune: 7 },
    { type: 'sawtooth', frequency: 48, gain: 0.08 }
  ],
  producer: [
    { type: 'square', frequency: 64, gain: 0.18, detune: -14 },
    { type: 'triangle', frequency: 128, gain: 0.12 },
    { type: 'sine', frequency: 256, gain: 0.08, detune: 11 }
  ],
  editor: [
    { type: 'triangle', frequency: 54, gain: 0.2 },
    { type: 'sine', frequency: 162, gain: 0.14, detune: -5 },
    { type: 'sawtooth', frequency: 216, gain: 0.1 }
  ]
};

interface SceneNodes {
  gain: GainNode;
  oscillators: OscillatorNode[];
  lfos: OscillatorNode[];
}

interface AmbientAudioToggleProps {
  mode: CreativeMode | null;
}

const STORAGE_KEY = 'inspire:ambientAudioEnabled';

export function AmbientAudioToggle({ mode }: AmbientAudioToggleProps) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });
  const contextRef = useRef<AudioContext | null>(null);
  const sceneRef = useRef<SceneNodes | null>(null);

  const teardownScene = useCallback(() => {
    const context = contextRef.current;
    if (!context) return;
    const scene = sceneRef.current;
    if (!scene) return;
    scene.oscillators.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch (err) {
        console.warn('oscillator already stopped', err);
      }
      oscillator.disconnect();
    });
    scene.lfos.forEach((lfo) => {
      try {
        lfo.stop();
      } catch (err) {
        /* ignore */
      }
      lfo.disconnect();
    });
    scene.gain.disconnect();
    sceneRef.current = null;
  }, []);

  const buildScene = useCallback(
    async (targetMode: CreativeMode | null) => {
      if (typeof window === 'undefined') return;
      const profile = SOUND_PROFILES[targetMode ?? 'landing'];
      if (!profile) return;

      if (!contextRef.current) {
        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextCtor) {
          console.warn('AudioContext not available in this browser');
          return;
        }
        contextRef.current = new AudioContextCtor();
      }

      const context = contextRef.current;
      if (!context) return;
      if (context.state === 'suspended') {
        try {
          await context.resume();
        } catch (err) {
          console.warn('Unable to resume audio context', err);
          return;
        }
      }

      teardownScene();

      const masterGain = context.createGain();
      masterGain.gain.value = 0.0001;
      masterGain.connect(context.destination);

      const oscillators: OscillatorNode[] = [];
      const lfos: OscillatorNode[] = [];
      profile.forEach((config, index) => {
        const osc = context.createOscillator();
        osc.type = config.type;
        osc.frequency.value = config.frequency;
        if (config.detune) {
          osc.detune.value = config.detune * 10;
        }
        const gainNode = context.createGain();
        gainNode.gain.value = config.gain * 0.08;
        const lfo = context.createOscillator();
        lfo.frequency.value = 0.03 + index * 0.015;
        const lfoGain = context.createGain();
        lfoGain.gain.value = config.gain * 0.06;
        lfo.connect(lfoGain).connect(gainNode.gain);
        osc.connect(gainNode).connect(masterGain);
        osc.start();
        lfo.start();
        oscillators.push(osc);
        lfos.push(lfo);
      });

      masterGain.gain.linearRampToValueAtTime(0.12, context.currentTime + 1.6);
      sceneRef.current = { gain: masterGain, oscillators, lfos };
    },
    [teardownScene]
  );

  useEffect(() => {
    return () => {
      teardownScene();
      const context = contextRef.current;
      if (context) {
        if (typeof context.close === 'function') {
          context.close().catch(() => undefined);
        }
        contextRef.current = null;
      }
    };
  }, [teardownScene]);

  useEffect(() => {
    if (!enabled) {
      teardownScene();
      return;
    }
    void buildScene(mode);
  }, [enabled, mode, buildScene, teardownScene]);

  const handleToggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      }
      if (!next) {
        teardownScene();
      }
      return next;
    });
  }, [teardownScene]);

  return (
    <button type="button" className={`ambient-audio-toggle${enabled ? ' active' : ''}`} onClick={handleToggle}>
      <span className="icon" aria-hidden="true">🔊</span>
      <span>{enabled ? 'Ambient audio on' : 'Ambient audio off'}</span>
    </button>
  );
}
