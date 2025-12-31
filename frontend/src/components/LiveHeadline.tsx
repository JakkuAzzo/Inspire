import React from 'react';

export interface NewsHeadline {
	title: string;
	url: string;
	source?: string;
	description?: string;
	publishedAt?: string;
	imageUrl?: string;
}

export interface NewsPrompt {
	headline: string;
	context: string;
	source: string;
}

interface LiveHeadlineProps {
	newsPrompt: NewsPrompt | undefined;
	headlineTopic: string;
	headlineKeywords: string;
	headlineDateFrom: string;
	headlineDateTo: string;
	newsHeadlines: NewsHeadline[];
	newsLoading: boolean;
	newsError: string | null;
	onHeadlineTopic: (value: string) => void;
	onHeadlineKeywords: (value: string) => void;
	onHeadlineDateFrom: (value: string) => void;
	onHeadlineDateTo: (value: string) => void;
	onApplyFilters: () => void;
	onRandomize: () => void;
	onSwap: () => void;
	focusMode?: boolean;
}

export const LiveHeadlineDetail: React.FC<LiveHeadlineProps> = ({
	newsPrompt,
	headlineTopic,
	headlineKeywords,
	headlineDateFrom,
	headlineDateTo,
	newsHeadlines,
	newsLoading,
	newsError,
	onHeadlineTopic,
	onHeadlineKeywords,
	onHeadlineDateFrom,
	onHeadlineDateTo,
	onApplyFilters,
	onRandomize,
	onSwap,
	focusMode = false
}) => {
	// Focus mode: Show only headlines summary, hide all controls
	if (focusMode) {
		return (
			<div className="word-explorer-panel" style={{ pointerEvents: 'auto', padding: '1rem' }}>
				<h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1em', fontWeight: 600 }}>Live Headlines</h4>
				
				{/* Current headline summary */}
				{newsPrompt && (
					<div style={{ 
						padding: '0.75rem', 
						background: 'rgba(148, 163, 184, 0.08)', 
						borderRadius: '4px',
						marginBottom: '1rem' 
					}}>
						<p style={{ fontSize: '0.95em', fontWeight: 500, margin: '0 0 0.25rem 0' }}>
							{newsPrompt.headline}
						</p>
						<p style={{ fontSize: '0.85em', color: 'rgba(148, 163, 184, 0.75)', margin: '0' }}>
							{newsPrompt.context}
						</p>
						<small style={{ color: 'rgba(148, 163, 184, 0.6)' }}>{newsPrompt.source}</small>
					</div>
				)}
				
				{/* Headlines list */}
				{newsLoading && <p style={{ color: 'rgba(148, 163, 184, 0.7)' }}>Loading headlines...</p>}
				{newsError && <p style={{ color: 'rgba(239, 68, 68, 0.8)' }}>Error: {newsError}</p>}
				{newsHeadlines.length > 0 ? (
					<div className="news-headlines">
						<strong style={{ fontSize: '0.9em', marginBottom: '0.5rem', display: 'block', color: 'rgba(148, 163, 184, 0.85)' }}>
							Related Headlines ({newsHeadlines.length}):
						</strong>
						<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
							{newsHeadlines.map((hl) => (
								<li key={hl.url} style={{ 
									marginBottom: '0.75rem', 
									paddingBottom: '0.75rem',
									borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
								}}>
									<strong style={{ fontSize: '0.9em', display: 'block', marginBottom: '0.25rem' }}>
										{hl.title}
									</strong>
									{hl.description && (
										<p style={{ 
											margin: '0.25rem 0', 
											color: 'rgba(148, 163, 184, 0.75)', 
											fontSize: '0.8em',
											lineHeight: 1.4
										}}>
											{hl.description}
										</p>
									)}
									{hl.source && (
										<small style={{ color: 'rgba(148, 163, 184, 0.6)', fontSize: '0.75em' }}>
											— {hl.source}
										</small>
									)}
								</li>
							))}
						</ul>
					</div>
				) : !newsLoading && !newsError ? (
					<p style={{ color: 'rgba(148, 163, 184, 0.6)', fontSize: '0.85em', textAlign: 'center', margin: '2rem 0' }}>
						No headlines loaded
					</p>
				) : null}
			</div>
		);
	}

	// Regular mode: Show all controls
	return (
		<div className="word-explorer-panel" style={{ pointerEvents: 'auto' }}>
			{/* Headline display section */}
			<div className="card-detail-copy">
				<div className="headline-row">
					<p className="headline">{newsPrompt?.headline ?? 'No headline available'}</p>
					<button type="button" className="btn micro tertiary" onClick={onSwap}>
						Swap
					</button>
				</div>
				<p>{newsPrompt?.context ?? ''}</p>
				<small>{newsPrompt?.source ?? 'Unknown source'}</small>
			</div>

			{/* Filter controls section */}
			<div className="word-settings" style={{ marginTop: 12 }}>
				<div className="word-form">
					<input
						type="text"
						value={headlineTopic}
						onChange={(e) => onHeadlineTopic(e.target.value)}
						placeholder="Topic (e.g. tour announcements, AI collabs)"
					/>
					<input
						type="text"
						value={headlineKeywords}
						onChange={(e) => onHeadlineKeywords(e.target.value)}
						placeholder="Keywords (comma-separated, e.g. producer, remix)"
					/>
					<div style={{ display: 'grid', gap: 0.6, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
						<input
							type="date"
							value={headlineDateFrom}
							onChange={(e) => onHeadlineDateFrom(e.target.value)}
							title="From date"
						/>
						<input
							type="date"
							value={headlineDateTo}
							onChange={(e) => onHeadlineDateTo(e.target.value)}
							title="To date"
						/>
					</div>
				</div>
				<div className="word-explorer-actions">
					<button type="button" className="btn micro" onClick={onApplyFilters}>
						Update headlines
					</button>
					<button type="button" className="btn micro ghost" onClick={onRandomize}>
						Random
					</button>
				</div>
				<p className="hint" style={{ margin: 0, fontSize: '0.85em', color: 'rgba(148, 163, 184, 0.7)' }}>
					Leave blank to use pack context. Random pulls timely content.
				</p>
			</div>

			{/* Loading/Error/Results section */}
			{newsLoading && <p style={{ color: 'rgba(148, 163, 184, 0.7)' }}>Loading headlines...</p>}
			{newsError && <p style={{ color: 'rgba(239, 68, 68, 0.8)' }}>Error: {newsError}</p>}
			{newsHeadlines.length > 0 ? (
				<div className="news-headlines">
					<strong style={{ fontSize: '0.95em', marginBottom: '0.5rem', display: 'block' }}>Related Headlines:</strong>
					<ul>
						{newsHeadlines.map((hl) => (
							<li key={hl.url} style={{ marginBottom: '0.5rem' }}>
								<strong>{hl.title}</strong>
								<p style={{ margin: '0.25rem 0 0 0', color: 'rgba(148, 163, 184, 0.75)', fontSize: '0.85em' }}>
									{hl.description}
								</p>
								{hl.source && <small style={{ color: 'rgba(148, 163, 184, 0.6)' }}>— {hl.source}</small>}
							</li>
						))}
					</ul>
				</div>
			) : !newsLoading && !newsError ? (
				<p className="hint" style={{ marginTop: '0.5rem', color: 'rgba(148, 163, 184, 0.75)' }}>
					No headlines yet. Try Update or Random.
				</p>
			) : null}
		</div>
	);
};
