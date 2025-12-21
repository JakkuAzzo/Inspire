import React from 'react';

import { trackEvent } from '../../utils/analytics';

export interface FocusModeControlsProps {
        focusDensity: number;
        setFocusDensity: (value: number) => void;
        focusSpeed: number;
        setFocusSpeed: (value: number) => void;
        preview?: React.ReactNode;
        persistenceKey?: string;
}

export function FocusModeControls({
        focusDensity,
        setFocusDensity,
        focusSpeed,
        setFocusSpeed,
        preview,
        persistenceKey
}: FocusModeControlsProps) {
        React.useEffect(() => {
                if (!persistenceKey || typeof window === 'undefined') return;
                const raw = window.localStorage.getItem(`${persistenceKey}:controls`);
                if (!raw) return;
                try {
                        const parsed = JSON.parse(raw) as { density?: number; speed?: number };
                        if (typeof parsed.density === 'number') setFocusDensity(parsed.density);
                        if (typeof parsed.speed === 'number') setFocusSpeed(parsed.speed);
                } catch (err) {
                        console.warn('Failed to restore focus mode controls', err);
                }
        }, [persistenceKey, setFocusDensity, setFocusSpeed]);

        React.useEffect(() => {
                if (!persistenceKey || typeof window === 'undefined') return;
                window.localStorage.setItem(
                        `${persistenceKey}:controls`,
                        JSON.stringify({ density: focusDensity, speed: focusSpeed })
                );
        }, [focusDensity, focusSpeed, persistenceKey]);

        const handleDensityChange = (value: number) => {
                setFocusDensity(value);
                trackEvent('focus_mode_density_changed', { value });
        };

        const handleSpeedChange = (value: number) => {
                setFocusSpeed(value);
                trackEvent('focus_mode_speed_changed', { value });
        };

        return (
                <div className="focus-controls-inline" aria-label="Focus mode settings">
                        <div className="control-field">
                                <label htmlFor="focusDensityInline">Visible items</label>
                                <p className="hint" id="focusDensityHint">
                                        How many prompts fall at once. Lower counts make each card linger longer.
                                </p>
                                <input
                                        id="focusDensityInline"
                                        type="range"
                                        min={4}
                                        max={24}
                                        value={focusDensity}
                                        aria-describedby="focusDensityHint"
                                        title="Choose how many items appear in the focus stream"
                                        onChange={(event) => handleDensityChange(Number(event.target.value))}
                                />
                                <span className="range-value" aria-live="polite">
                                        {focusDensity}
                                </span>
                        </div>
                        <div className="control-field">
                                <label htmlFor="focusSpeedInline">Speed</label>
                                <p className="hint" id="focusSpeedHint">
                                        Adjust the falling speed for the focus animation.
                                </p>
                                <input
                                        id="focusSpeedInline"
                                        type="range"
                                        min={0.5}
                                        max={3}
                                        step={0.1}
                                        value={focusSpeed}
                                        aria-describedby="focusSpeedHint"
                                        title="Change how fast prompts move"
                                        onChange={(event) => handleSpeedChange(Number(event.target.value))}
                                />
                                <span className="range-value" aria-live="polite">
                                        {focusSpeed.toFixed(1)}x
                                </span>
                        </div>
                        {preview ? <div className="control-preview">{preview}</div> : null}
                </div>
        );
}
