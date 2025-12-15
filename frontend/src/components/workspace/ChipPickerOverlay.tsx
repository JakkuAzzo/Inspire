import type { ReactNode } from 'react';

export interface ChipPickerOverlayProps {
	open: boolean;
	options: string[];
	onClose: () => void;
	onChoose: (value: string) => void;
	title?: string;
	emptyHint?: ReactNode;
}

export function ChipPickerOverlay({
	open,
	options,
	onClose,
	onChoose,
	title = 'Swap chip',
	emptyHint = <p className="hint">No alternatives found.</p>
}: ChipPickerOverlayProps) {
	if (!open) return null;
	return (
		<div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Choose a chip option">
			<div className="chip-picker glass">
				<div className="overlay-header">
					<h3>{title}</h3>
					<button type="button" className="icon-button" aria-label="Close chip chooser" onClick={onClose}>✕</button>
				</div>
				<div className="chip-picker-grid">
					{options.length === 0 && emptyHint}
					{options.map((option) => (
						<button key={option} type="button" className="chip" onClick={() => onChoose(option)}>
							{option}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
