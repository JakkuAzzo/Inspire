import React from 'react';

interface FlowPromptsProps {
	prompts?: string[];
	defaultPrompt: string;
	renderInteractiveText: (text: string) => React.ReactNode;
	onGenerateFlowBeats: () => void;
}

export function FlowPrompts({ prompts = [], defaultPrompt, renderInteractiveText, onGenerateFlowBeats }: FlowPromptsProps) {
	const previewPrompt = prompts[0] ?? defaultPrompt;

	return (
		<div className="flow-prompts-detail">
			<ul className="focus-list">
				{(prompts.length ? prompts : [previewPrompt]).map((prompt) => (
					<li key={prompt}>{renderInteractiveText(prompt)}</li>
				))}
			</ul>
			<div className="flow-prompts-action" style={{ marginTop: '1rem' }}>
				<button type="button" className="btn primary" onClick={onGenerateFlowBeats}>
					🎵 Generate Flow Beats
				</button>
				<p className="hint" style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'rgba(148, 163, 184, 0.7)' }}>
					Create custom metronomes and beat patterns to inspire your flow.
				</p>
			</div>
		</div>
	);
}
