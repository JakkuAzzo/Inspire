import React from 'react';

export interface FocusModeControlsProps {
	focusDensity: number;
	setFocusDensity: (value: number) => void;
	focusSpeed: number;
	setFocusSpeed: (value: number) => void;
	preview?: React.ReactNode;
}

export function FocusModeControls({ focusDensity, setFocusDensity, focusSpeed, setFocusSpeed, preview }: FocusModeControlsProps) {
	return (
		<div className="focus-controls-inline" aria-label="Focus mode settings">
			<div className="control-field">
				<label htmlFor="focusDensityInline">Visible items</label>
				<input
					id="focusDensityInline"
					type="range"
					min={4}
					max={24}
					value={focusDensity}
					onChange={(event) => setFocusDensity(Number(event.target.value))}
				/>
				<span className="range-value">{focusDensity}</span>
			</div>
			<div className="control-field">
				<label htmlFor="focusSpeedInline">Speed</label>
				<input
					id="focusSpeedInline"
					type="range"
					min={0.5}
					max={3}
					step={0.1}
					value={focusSpeed}
					onChange={(event) => setFocusSpeed(Number(event.target.value))}
				/>
				<span className="range-value">{focusSpeed.toFixed(1)}x</span>
			</div>
			{preview ? <div className="control-preview">{preview}</div> : null}
		</div>
	);
}
