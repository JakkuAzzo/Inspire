import React from 'react';

export interface CombinedFocusModeProps {
	mixerHover: boolean;
	combinedCount: number;
	onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
	onDragLeave: () => void;
	onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
	onClear: () => void;
	stream: React.ReactNode;
}

export function CombinedFocusMode({
	mixerHover,
	combinedCount,
	onDragOver,
	onDragLeave,
	onDrop,
	onClear,
	stream
}: CombinedFocusModeProps) {
	return (
		<div
			className={`combined-focus glass${mixerHover ? ' hover' : ''}`}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
		>
			{stream}
			<div className="combined-focus-header">
				<div>
					<p className="label">Combined focus</p>
					<h3>Drop pack cards to mix</h3>
				</div>
				<div className="mixer-actions">
					<button type="button" className="btn ghost micro" onClick={onClear}>Clear</button>
				</div>
			</div>
			<div className={`combined-drop${mixerHover ? ' hover' : ''}`} aria-label="Combined focus drop area">
				<span className="drop-instruction">Drop pack cards here</span>
				<span className="drop-sub">{combinedCount ? `${combinedCount} added` : 'Drag from the pack deck to build this mix.'}</span>
			</div>
		</div>
	);
}
