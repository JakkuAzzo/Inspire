import React from 'react';
import type { StoryArcScaffold, EmotionalArc } from '../types';

export interface StoryArcDetailProps {
	storyArc?: EmotionalArc;
	storyArcSummary: string;
	storyArcTheme: string;
	storyArcGenre: string;
	storyArcBpm: string;
	storyArcNodeCount: number;
	storyArcLoading: boolean;
	storyArcError: string | null;
	storyArcScaffold?: StoryArcScaffold;
	onStoryArcSummary: (value: string) => void;
	onStoryArcTheme: (value: string) => void;
	onStoryArcGenre: (value: string) => void;
	onStoryArcBpm: (value: string) => void;
	onStoryArcNodeCount: (value: number) => void;
	onGenerateStoryArc: () => void;
	onStoryArcScaffoldChange?: (scaffold: StoryArcScaffold) => void;
}

export const StoryArcDetail: React.FC<StoryArcDetailProps> = ({
	storyArc,
	storyArcSummary,
	storyArcTheme,
	storyArcGenre,
	storyArcBpm,
	storyArcNodeCount,
	storyArcLoading,
	storyArcError,
	storyArcScaffold,
	onStoryArcSummary,
	onStoryArcTheme,
	onStoryArcGenre,
	onStoryArcBpm,
	onStoryArcNodeCount,
	onGenerateStoryArc,
	onStoryArcScaffoldChange,
}) => {
	return (
		<div className="word-explorer-panel">
			<div className="arc-track" style={{ marginBottom: 10 }}>
				<span>{storyArc?.start ?? 'start'}</span>
				<span className="arc-arrow">→</span>
				<span>{storyArc?.middle ?? 'middle'}</span>
				<span className="arc-arrow">→</span>
				<span>{storyArc?.end ?? 'end'}</span>
			</div>

			<div className="word-settings">
				<div className="word-form">
					<textarea
						placeholder="Summary (what happens?)"
						value={storyArcSummary}
						onChange={(e) => onStoryArcSummary(e.target.value)}
						rows={3}
					/>
					<input
						type="text"
						placeholder="Theme (optional)"
						value={storyArcTheme}
						onChange={(e) => onStoryArcTheme(e.target.value)}
					/>
					<input
						type="text"
						placeholder="Genre (optional)"
						value={storyArcGenre}
						onChange={(e) => onStoryArcGenre(e.target.value)}
					/>
					<input
						type="text"
						placeholder="BPM (optional)"
						value={storyArcBpm}
						onChange={(e) => onStoryArcBpm(e.target.value)}
					/>
				</div>

				<div className="slider-row" style={{ marginTop: 10 }}>
					<span className="label">Detail</span>
					<div className="option-group">
						{[3, 4, 5, 6, 7].map((count) => (
							<button
								key={count}
								type="button"
								className={count === storyArcNodeCount ? 'chip active' : 'chip'}
								onClick={() => onStoryArcNodeCount(count)}
							>
								<strong>{count}</strong>
								<small>nodes</small>
							</button>
						))}
					</div>
				</div>

				<div className="word-explorer-actions" style={{ marginTop: 10 }}>
					<button
						type="button"
						className="btn micro"
						onClick={onGenerateStoryArc}
						disabled={storyArcLoading}
					>
						{storyArcLoading ? 'Generating…' : 'Generate scaffold'}
					</button>
				</div>

				{storyArcError && <p className="status-text error">{storyArcError}</p>}
			</div>

			{storyArcScaffold ? (
				<div style={{ marginTop: 12 }}>
					<div className="card-detail-copy">
						<p><strong>Theme:</strong> {storyArcScaffold.theme}</p>
						<p><strong>POV:</strong> {storyArcScaffold.protagonistPOV}</p>
						<p><strong>Hook idea:</strong> {storyArcScaffold.chorusThesis}</p>
					</div>

					<div className="focus-list" style={{ marginTop: 10 }}>
						{storyArcScaffold.nodes.map((node, index) => (
							<div key={node.id} className="focus-line" style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
								<strong>{index + 1}. {node.label}</strong>
								<textarea
									value={node.text}
									onChange={(e) => {
										const nextText = e.target.value;
										if (onStoryArcScaffoldChange) {
											const nodes = storyArcScaffold.nodes.map((n) => (n.id === node.id ? { ...n, text: nextText } : n));
											onStoryArcScaffoldChange({ ...storyArcScaffold, nodes });
										}
									}}
									rows={2}
								/>
								<div style={{ display: 'flex', gap: 8 }}>
									<button
										type="button"
										className="btn micro ghost"
										disabled={index === 0}
										onClick={() => {
											if (onStoryArcScaffoldChange) {
												const nodes = [...storyArcScaffold.nodes];
												[nodes[index - 1], nodes[index]] = [nodes[index], nodes[index - 1]];
												onStoryArcScaffoldChange({ ...storyArcScaffold, nodes });
											}
										}}
									>
										Up
									</button>
									<button
										type="button"
										className="btn micro ghost"
										disabled={index === storyArcScaffold.nodes.length - 1}
										onClick={() => {
											if (onStoryArcScaffoldChange) {
												const nodes = [...storyArcScaffold.nodes];
												[nodes[index + 1], nodes[index]] = [nodes[index], nodes[index + 1]];
												onStoryArcScaffoldChange({ ...storyArcScaffold, nodes });
											}
										}}
									>
										Down
									</button>
								</div>
							</div>
						))}
					</div>

					{storyArcScaffold.motifs?.length ? (
						<div className="card-detail-copy" style={{ marginTop: 10 }}>
							<p><strong>Motifs:</strong> {storyArcScaffold.motifs.join(' · ')}</p>
						</div>
					) : null}

					{storyArcScaffold.punchyLines?.length ? (
						<ul className="focus-list" style={{ marginTop: 10 }}>
							{storyArcScaffold.punchyLines.slice(0, 10).map((line, idx) => (
								<li key={`${idx}-${line}`}>{line}</li>
							))}
						</ul>
					) : null}
				</div>
			) : null}
		</div>
	);
};
