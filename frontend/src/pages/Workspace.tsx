import { useCallback, useMemo, type CSSProperties, type ReactNode } from 'react';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { RelevanceSlider } from '../components/RelevanceSlider';
import YouTubePlaylistEmbed from '../components/YouTubePlaylistEmbed';
import type {
	InspireAnyPack,
	RelevanceFilter,
	WorkspaceQueueItem
} from '../types';

// Interfaces defined in App.tsx that need to be exported or duplicated
interface DeckCard {
	id: string;
	label: string;
	preview: string;
	detail: ReactNode;
	accent?: string;
}

interface YouTubeVideoPreview {
	videoId: string;
	title: string;
	channelTitle: string;
	thumbnailUrl?: string;
}

interface WorkspaceProps {
	filters: RelevanceFilter;
	onFiltersChange: (filters: RelevanceFilter) => void;
	fuelPack: InspireAnyPack | null;
	loading: boolean;
	controlsCollapsed: boolean;
	onToggleControls: () => void;
	onGeneratePack: () => void;
	onRemixPack: () => void;
	onSaveCurrentPack: () => void;
	onSharePack: () => void;
	lookupId: string;
	onLookupIdChange: (id: string) => void;
	onLoadById: () => void;
	orderedPackDeck: DeckCard[];
	expandedCard: string | null;
	onCardExpanded: (cardId: string | null) => void;
	focusMode: boolean;
	onFocusModeToggle: () => void;
	onOpenWordExplorer: () => void;
	onOpenSavedPacks: () => void;
	workspaceQueue: WorkspaceQueueItem[];
	youtubeVideos: Record<string, YouTubeVideoPreview>;
	youtubePlaylists: Record<string, YouTubeVideoPreview[]>;
	youtubeError: string | null;
	queueCollapsed: boolean;
	onToggleQueueCollapsed: () => void;
	selectedCard: DeckCard | null;
	mixerHover: boolean;
	onMixerDragOver: (e: React.DragEvent) => void;
	onMixerDragLeave: () => void;
	onMixerDrop: (e: React.DragEvent) => void;
	combinedFocusCardIds: string[];
	onClearCombinedFocus: () => void;
	visibleFocusItems: string[];
	focusSpeedMs: number;
	focusStyle: 'scroll' | 'rain' | 'flash';
	newsHeadlines: Array<{ title: string; url: string; source?: string }>;
	newsLoading: boolean;
	newsError: string | null;
	challengeText: string;
	autoRefreshMs: number | null;
	onAutoRefreshSelect: (ms: number | null) => void;
	modeLabel: string;
	submodeLabel: string;
	onBackToModes: () => void;
}

export function Workspace({
	filters,
	onFiltersChange,
	fuelPack,
	loading,
	controlsCollapsed,
	onToggleControls,
	onGeneratePack,
	onSaveCurrentPack,
	onSharePack,
	orderedPackDeck,
	expandedCard,
	onCardExpanded,
	focusMode,
	workspaceQueue,
	youtubeVideos,
	youtubePlaylists,
	queueCollapsed,
	onToggleQueueCollapsed,
	youtubeError,
	selectedCard,
	mixerHover,
	onMixerDragOver,
	onMixerDragLeave,
	onMixerDrop,
	combinedFocusCardIds,
	onClearCombinedFocus,
	visibleFocusItems,
	focusSpeedMs,
	focusStyle,
	newsHeadlines,
	newsLoading,
	newsError,
	challengeText,
	autoRefreshMs,
	onAutoRefreshSelect,
	modeLabel,
	submodeLabel,
	onBackToModes,
	lookupId,
	onLookupIdChange,
	onLoadById,
	onFocusModeToggle,
	onOpenWordExplorer,
	onOpenSavedPacks
}: WorkspaceProps) {
	const showingDetail = Boolean(selectedCard);

	const headlineStream = useMemo(() => (
		<div
			className={`headline-stream ${focusMode ? 'focus-active' : 'idle'} mode-${focusStyle}`}
			style={{ '--stream-speed': `${focusSpeedMs}s` } as CSSProperties}
			aria-hidden="true"
		>
			{visibleFocusItems.map((text, index) => {
				const stagger = (index % 5) * 0.65;
				const delay = focusStyle === 'scroll' ? `${stagger * -1}s` : `${stagger}s`;
				const duration = focusStyle === 'rain' ? `${Math.max(4, focusSpeedMs * 0.6)}s` : `${focusSpeedMs}s`;
				const drift = (index % 4) * 8 - 12;
				return (
					<span
						key={`stream-${index}-${text}`}
						className="stream-chip"
						style={{ animationDelay: delay, animationDuration: duration, '--drift': `${drift}px` } as CSSProperties}
					>
						{text}
					</span>
				);
			})}
		</div>
	), [focusSpeedMs, focusStyle, focusMode, visibleFocusItems]);

	const renderPackDetail = useCallback((inFocusOverlay: boolean) => {
		if (!selectedCard) return null;
		return (
			<div className={`pack-card-detail glass${inFocusOverlay ? ' focus-mode' : ''}`}>
				<div className="detail-toolbox">
					<div className="timer-toggle" role="group" aria-label="Auto refresh timer">
						<span className="label">Auto refresh</span>
						{[2000, 5000, 30000].map((interval) => (
							<button
								key={interval}
								type="button"
								className={autoRefreshMs === interval ? 'chip active' : 'chip'}
								onClick={() => onAutoRefreshSelect(interval)}
							>
								{interval < 1000 ? `${interval}ms` : `${interval / 1000}s`}
							</button>
						))}
						<button
							type="button"
							className={!autoRefreshMs ? 'chip active' : 'chip'}
							onClick={() => onAutoRefreshSelect(null)}
						>
							Off
						</button>
					</div>
					<button
						type="button"
						className={`btn secondary focus-toggle${focusMode ? ' active' : ''}`}
						onClick={onFocusModeToggle}
					>
						{focusMode ? 'Exit Focus Mode' : 'Focus Mode'}
					</button>
				</div>
				<div className="detail-content">
					<h4>{selectedCard.label}</h4>
					<div className="detail-body">{selectedCard.detail}</div>
				</div>
				{fuelPack && (
					<>
						{headlineStream}
						<div className="detail-challenge">
							<span className="label">Prompt Challenge</span>
							<p>{challengeText}</p>
						</div>
						<div className="news-headlines">
							<span className="label">Linked Headlines</span>
							{newsLoading && <p className="hint">Loading headlines…</p>}
							{!newsLoading && newsError && <p className="error">{newsError}</p>}
							{!newsLoading && !newsError && newsHeadlines.length > 0 && (
								<ul>
									{newsHeadlines.map((item, idx) => (
										<li key={`${item.url}-${idx}`}>
											<a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
											{item.source && <span className="news-source"> · {item.source}</span>}
										</li>
									))}
								</ul>
							)}
							{!newsLoading && !newsError && !newsHeadlines.length && <p className="hint">No linked headlines yet.</p>}
						</div>
					</>
				)}
			</div>
		);
	}, [selectedCard, focusMode, focusSpeedMs, focusStyle, visibleFocusItems, fuelPack, challengeText, newsLoading, newsError, newsHeadlines, autoRefreshMs, onAutoRefreshSelect, onFocusModeToggle, headlineStream]);

	return (
		<>
			<header className="top-nav glass">
				<div className="nav-left">
					<button className="back-button" type="button" onClick={onBackToModes}>
						← Studios
					</button>
					<div className="nav-title-block">
						<h2>{modeLabel}</h2>
						<p>{submodeLabel}</p>
					</div>
				</div>
				<div className="nav-actions">
					<div className="actions-group" role="group" aria-label="Workspace actions">
						<button
							type="button"
							className="icon-button"
							title="Generate fuel pack"
							aria-label="Generate fuel pack"
							onClick={onGeneratePack}
							disabled={loading}
						>
							⚡
						</button>
						<button
							type="button"
							className="icon-button"
							title="Share pack link"
							aria-label="Share pack link"
							onClick={onSharePack}
							disabled={!fuelPack}
						>
							🔗
						</button>
						<button
							type="button"
							className="icon-button"
							title="Save to archive"
							aria-label="Save to archive"
							onClick={onSaveCurrentPack}
							disabled={!fuelPack}
						>
							💾
						</button>
						<button
							type="button"
							className="icon-button"
							title="Open saved packs"
							aria-label="Open saved packs"
							onClick={onOpenSavedPacks}
						>
							📁
						</button>
						<button
							type="button"
							className="icon-button"
							title="Word Explorer"
							aria-label="Open Word Explorer"
							onClick={onOpenWordExplorer}
						>
							🔤
						</button>
						<button
							type="button"
							className="icon-button"
							title={controlsCollapsed ? 'Show Controls ▸' : 'Hide Controls ◂'}
							aria-label={controlsCollapsed ? 'Show Controls ▸' : 'Hide Controls ◂'}
							aria-pressed={!controlsCollapsed}
							aria-controls="workspaceControls"
							onClick={onToggleControls}
						>
							🎛️
						</button>
					</div>
				</div>
			</header>

			{!controlsCollapsed && !focusMode && !showingDetail && (
				<div className="workspace-controls-overlay" role="dialog" aria-modal="true" aria-label="Workspace controls" onClick={onToggleControls}>
					<div className="workspace-controls" id="workspaceControls" onClick={(event) => event.stopPropagation()}>
						<div className="controls-overlay-header">
							<h3>Workspace Controls</h3>
							<button type="button" className="btn ghost micro" onClick={onToggleControls}>Close</button>
						</div>
						<div className="controls-columns">
							{/* Left Column: Relevance Blend */}
							<div className="controls-column left">
								<CollapsibleSection title="Relevance Blend" icon="🧭" description="Weight news, tone, and semantic distance." defaultOpen>
									<RelevanceSlider value={filters} onChange={onFiltersChange} />
								</CollapsibleSection>
							</div>

							{/* Right Column: Archive */}
							<div className="controls-column right">
								<CollapsibleSection title="Archive" icon="🗄️" description="Load any pack by id." defaultOpen={false}>
									<div className="lookup-inline">
										<input
											placeholder="Enter pack id to load"
											value={lookupId}
											onChange={(event) => onLookupIdChange(event.target.value)}
										/>
											<button className="btn tertiary" type="button" onClick={onLoadById} disabled={!lookupId.trim() || loading}>
											Load
										</button>
									</div>
								</CollapsibleSection>
							</div>
						</div>
					</div>
				</div>
			)}

			<main className={`mode-workspace${controlsCollapsed ? ' controls-collapsed' : ''}`}>
				<div className={`workspace-main${workspaceQueue.length > 0 && !focusMode && !showingDetail ? ' with-queue' : ''}${focusMode || showingDetail ? ' detail-expanded' : ''}`}>
					<section className="pack-stage glass">
						{fuelPack ? (
							<>
								{!showingDetail && (
									<div className="pack-deck" role="list">
										{orderedPackDeck.map((card) => (
											<article
												key={card.id}
												className={`pack-card${expandedCard === card.id ? ' active' : ''}`}
												role="listitem"
												onClick={() => onCardExpanded(expandedCard === card.id ? null : card.id)}
												onDragStart={(event) => {
													event.dataTransfer.effectAllowed = 'copy';
													event.dataTransfer.setData('text/plain', card.id);
												}}
												draggable
											>
												<div className="card-preview">{card.preview}</div>
												<div className="card-label">{card.label}</div>
											</article>
										))}
									</div>
								)}
								{!focusMode && !showingDetail && (
									<section
										className={`focus-mixer glass${mixerHover ? ' hover' : ''}`}
										onDragOver={onMixerDragOver}
										onDragLeave={onMixerDragLeave}
										onDrop={onMixerDrop}
									>
										<div className="mixer-header">
											<h3>Combined Focus Mixer</h3>
											{combinedFocusCardIds.length > 0 && (
												<button type="button" className="btn micro ghost" onClick={onClearCombinedFocus}>
													Clear
												</button>
											)}
										</div>
										<div className={`mixer-drop${mixerHover ? ' hover' : ''}`} aria-label="Drop area for combined focus">
											{combinedFocusCardIds.length === 0 ? (
												<>
													<span className="drop-instruction">Drop pack cards here</span>
													<span className="drop-sub">Combine multiple elements for a blended focus stream</span>
												</>
											) : (
												<div className="mixer-active">
													<span>Combined {combinedFocusCardIds.length} cards</span>
													{headlineStream}
												</div>
											)}
										</div>
									</section>
								)}
								{selectedCard && !focusMode && renderPackDetail(false)}
							</>
						) : (
							<div className="empty-state">
								<h3>No pack yet</h3>
								<p>Use the generator to craft a pack tuned to your filters.</p>
							</div>
						)}
					</section>

					{workspaceQueue.length > 0 && !focusMode && !showingDetail && (
						<aside className={`workspace-queue glass${queueCollapsed ? ' collapsed' : ''}`} aria-label="Suggested inspiration queue">
							<div className="queue-header">
								<div className="queue-heading">
									<h3>Inspiration Queue</h3>
									<p>Clips and references tuned to your pack.</p>
								</div>
								<button
									type="button"
									className="btn ghost micro queue-toggle"
									onClick={onToggleQueueCollapsed}
									aria-expanded={!queueCollapsed}
									aria-controls="workspaceQueueList"
								>
									{queueCollapsed ? 'Expand queue' : 'Collapse queue'}
								</button>
							</div>
							{!queueCollapsed && youtubeError && <p className="queue-hint" role="status">{youtubeError}</p>}
							{!queueCollapsed && (
								<ul id="workspaceQueueList" className="queue-list">
									{workspaceQueue.map((item) => (
										<li key={item.id} className="queue-item">
											<div className="queue-meta">
												<strong>{item.title}</strong>
												{item.author && <span>{item.author}</span>}
											</div>
											{item.type === 'youtube' && youtubeVideos[item.id] && (
												<YouTubePlaylistEmbed
													videoId={youtubeVideos[item.id].videoId}
													playlist={(youtubePlaylists[item.id] || []).map(v => v.videoId)}
													title={item.title}
													width="100%"
													height={120}
													noteSelector=".queue-item"
												/>
											)}
										</li>
									))}
								</ul>
							)}
						</aside>
					)}
				</div>
			</main>
		</>
	);
}
