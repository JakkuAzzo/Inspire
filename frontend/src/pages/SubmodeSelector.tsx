import type { ModeDefinition } from '../types';

interface SubmodeSelectionProps {
	modeDefinition: ModeDefinition;
	onSubmodeSelect: (submodeId: string) => void;
	onBack: () => void;
}

export function SubmodeSelector({ modeDefinition, onSubmodeSelect, onBack }: SubmodeSelectionProps) {
	return (
		<section className="submode-panel glass">
			<button className="back-button" type="button" onClick={onBack}>
				← Choose another mode
			</button>
			<h2>{modeDefinition.icon} {modeDefinition.label}</h2>
			<p>Select how you want to play inside this studio.</p>
			<div className="submode-grid">
				{modeDefinition.submodes.map((option) => (
					<button
						key={option.id}
						className="submode-card"
						type="button"
						onClick={() => onSubmodeSelect(option.id)}
					>
						<strong>{option.label}</strong>
						<span>{option.description}</span>
					</button>
				))}
			</div>
		</section>
	);
}
