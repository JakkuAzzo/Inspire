import React from 'react';

interface RhymeResult {
	word: string;
	[key: string]: any;
}

interface RhymeFamiliesProps {
	rhymeFamilies: string[];
	rhymeResults: RhymeResult[];
	rhymeTarget: string;
	rhymeMaxResults: string;
	rhymeFocusMode: boolean;
	rhymeLoading: boolean;
	rhymeError: string | null;
	onRhymeTarget: (value: string) => void;
	onRhymeMaxResults: (value: string) => void;
	onSearchRhymes: () => void;
	onRandomRhymes: () => void;
	onFocusMode: () => void;
	onFamilyChipClick: (family: string) => void;
	onAddAllRhymes: () => void;
}

export const RhymeFamiliesDetail: React.FC<RhymeFamiliesProps> = ({
	rhymeFamilies,
	rhymeResults,
	rhymeTarget,
	rhymeMaxResults,
	rhymeFocusMode,
	rhymeLoading,
	rhymeError,
	onRhymeTarget,
	onRhymeMaxResults,
	onSearchRhymes,
	onRandomRhymes,
	onFocusMode,
	onFamilyChipClick,
	onAddAllRhymes
}) => {
	const families = rhymeResults.length ? rhymeResults.map((r) => r.word) : rhymeFamilies ?? [];

	return (
		<div className="word-explorer-panel">
			<div className="word-settings">
				<div className="word-form">
					<input
						type="text"
						placeholder="Word to rhyme with"
						value={rhymeTarget}
						onChange={(e) => onRhymeTarget(e.target.value)}
					/>
					<input
						type="text"
						placeholder="Max results"
						value={rhymeMaxResults}
						onChange={(e) => onRhymeMaxResults(e.target.value)}
					/>
					<button type="button" className="btn micro" onClick={onSearchRhymes} disabled={rhymeLoading}>
						Search rhymes
					</button>
					<button type="button" className="btn ghost micro" onClick={onRandomRhymes} disabled={rhymeLoading}>
						Random word
					</button>
					<button
						type="button"
						className={`btn secondary focus-toggle${rhymeFocusMode ? ' active' : ''}`}
						onClick={onFocusMode}
						disabled={rhymeLoading}
					>
						Focus Mode
					</button>
				</div>
				{rhymeLoading && <p className="status-text loading">Finding rhyme families…</p>}
				{!rhymeLoading && rhymeError && <p className="status-text error">{rhymeError}</p>}
			</div>
			<div className="word-grid">
				{families.map((family) => (
					<button
						key={family}
						type="button"
						className="word-chip interactive"
						onClick={() => onFamilyChipClick(family)}
					>
						{family}
					</button>
				))}
				{!rhymeLoading && !rhymeError && !rhymeResults.length && !rhymeFamilies?.length ? (
					<p className="status-text">No rhyme families yet</p>
				) : null}
			</div>
			<div className="word-explorer-actions">
				<button
					type="button"
					className="btn micro"
					onClick={onAddAllRhymes}
					disabled={!rhymeResults.length}
				>
					Add all to pack
				</button>
			</div>
		</div>
	);
};
