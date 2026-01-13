import React from 'react';

interface WordExplorerProps {
	powerWords: string[];
	wordResults: Array<{ word: string; score?: number; numSyllables?: number }>;
	wordStartsWith: string;
	wordRhymeWith: string;
	wordSyllables: string;
	wordMaxResults: string;
	wordTopic: string;
	customWordInput: string;
	wordLoading: boolean;
	wordError: string | null;
	onWordStartsWith: (value: string) => void;
	onWordRhymeWith: (value: string) => void;
	onWordSyllables: (value: string) => void;
	onWordMaxResults: (value: string) => void;
	onWordTopic: (value: string) => void;
	onCustomWordInput: (value: string) => void;
	onCustomWordSubmit: () => void;
	onSearchWords: () => void;
	onWordResultClick: (word: string) => void;
	onWordChipClick: (index: number) => void;
	onFocusModeToggle?: () => void;
}

export const WordExplorerDetail: React.FC<WordExplorerProps> = ({
	powerWords,
	wordResults,
	wordStartsWith,
	wordRhymeWith,
	wordSyllables,
	wordMaxResults,
	wordTopic,
	customWordInput,
	wordLoading,
	wordError,
	onWordStartsWith,
	onWordRhymeWith,
	onWordSyllables,
	onWordMaxResults,
	onWordTopic,
	onCustomWordInput,
	onCustomWordSubmit,
	onSearchWords,
	onWordResultClick,
	onWordChipClick,
	onFocusModeToggle
}) => {
	return (
		<div className="word-explorer-panel">
			{/* Word Search Form */}
			<div className="word-settings">
				<div className="word-form">
					<input
						type="text"
						placeholder="Starts with"
						value={wordStartsWith}
						onChange={(e) => onWordStartsWith(e.target.value)}
					/>
					<input
						type="text"
						placeholder="Rhyme with"
						value={wordRhymeWith}
						onChange={(e) => onWordRhymeWith(e.target.value)}
					/>
					<input
						type="number"
						placeholder="Syllables"
						value={wordSyllables}
						onChange={(e) => onWordSyllables(e.target.value)}
					/>
					<input
						type="number"
						placeholder="Max results"
						value={wordMaxResults}
						onChange={(e) => onWordMaxResults(e.target.value)}
					/>
					<input
						type="text"
						placeholder="Topic (eg: music)"
						value={wordTopic}
						onChange={(e) => onWordTopic(e.target.value)}
					/>
				</div>
				{wordLoading && <p className="status-text loading">Searching…</p>}
				{!wordLoading && wordError && <p className="status-text error">{wordError}</p>}
			</div>
			<div className="word-explorer-actions" style={{ marginBottom: 12 }}>
				<button type="button" className="btn" onClick={onSearchWords} disabled={wordLoading}>
					{wordLoading ? 'Searching…' : 'Search words'}
				</button>
			</div>
			<div className="word-grid">
				{powerWords.map((word, index) => (
					<button
						key={word}
						type="button"
						className="word-chip interactive"
						onClick={() => onWordChipClick(index)}
					>
						{word}
					</button>
				))}
			</div>
			<div className="word-results">			{!wordLoading && !wordError && wordResults.length > 0 && onFocusModeToggle && (
				<button
					type="button"
					className="btn secondary focus-toggle"
					onClick={onFocusModeToggle}
					style={{ marginBottom: 12, width: '100%' }}
				>
					Focus Mode
				</button>
			)}				{!wordLoading && !wordError && wordResults.length === 0 && <p className="status-text">No results yet. Try a search.</p>}
				{!wordLoading && !wordError && wordResults.length > 0 && (
					<div className="word-grid results">
						{wordResults.map((word) => (
							<button
								key={word.word}
								type="button"
								className="word-chip interactive"
								onClick={() => onWordResultClick(word.word)}
							>
								{word.word}
							</button>
						))}
					</div>
				)}
			</div>
			<div className="word-explorer-actions">
				<input
					type="text"
					placeholder="Add custom word"
					value={customWordInput}
					onChange={(e) => onCustomWordInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') onCustomWordSubmit();
					}}
				/>
				<button type="button" className="btn micro" onClick={onCustomWordSubmit}>
					Add
				</button>
			</div>
		</div>
	);
};
