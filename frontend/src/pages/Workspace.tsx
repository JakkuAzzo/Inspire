import { useCallback, useMemo, useState, useEffect, type CSSProperties, type ReactNode } from 'react';
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
	description?: string;
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
	// Local interactive state for playlist operations in Workspace context
	const [selectedMainByItem, setSelectedMainByItem] = useState<Record<string, string>>({});
	const [customPlaylistsByItem, setCustomPlaylistsByItem] = useState<Record<string, YouTubeVideoPreview[]>>({});
	const [trackAddInputByItem, setTrackAddInputByItem] = useState<Record<string, string>>({});

	// Resize state for pack stage and queue
	const [packStageWidth, setPackStageWidth] = useState(60); // percentage
	const [isResizing, setIsResizing] = useState(false);

	const parseVideoId = (input: string): string | null => {
		const trimmed = (input || '').trim();
		if (!trimmed) return null;
		if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
		const short = trimmed.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
		if (short) return short[1];
		const watch = trimmed.match(/[?&]v=([A-Za-z0-9_-]{11})/);
		if (watch) return watch[1];
		return null;
	};

	const onSelectTrack = (itemId: string, videoId: string) => {
		setSelectedMainByItem((prev) => ({ ...prev, [itemId]: videoId }));
	};
	const onRemoveTrack = (itemId: string, videoId: string) => {
		setCustomPlaylistsByItem((prev) => {
			const baseList = prev[itemId] ?? youtubePlaylists[itemId] ?? [];
			const nextList = baseList.filter((v) => v.videoId !== videoId);
			const next = { ...prev, [itemId]: nextList };
			setSelectedMainByItem((mPrev) => {
				if (mPrev[itemId] === videoId) {
					const newMain = nextList[0]?.videoId;
					const copy = { ...mPrev };
					if (newMain) copy[itemId] = newMain; else delete copy[itemId];
					return copy;
				}
				return mPrev;
			});
			return next;
		});
	};
	const onAddTrack = (itemId: string, input: string) => {
		const id = parseVideoId(input);
		if (!id) return;
		const video: YouTubeVideoPreview = {
			videoId: id,
			title: 'Added track',
			channelTitle: 'Custom',
			thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
		};
		setCustomPlaylistsByItem((prev) => {
			const baseList = prev[itemId] ?? youtubePlaylists[itemId] ?? [];
			return { ...prev, [itemId]: [...baseList, video] };
		});
		setTrackAddInputByItem((prev) => ({ ...prev, [itemId]: '' }));
	};

	// Resize handlers
	const handleMouseDown = () => {
		setIsResizing(true);
	};

	const handleMouseUp = () => {
		setIsResizing(false);
	};

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isResizing) return;
			const container = document.querySelector('.workspace-main');
			if (!container) return;
			const rect = container.getBoundingClientRect();
			const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
			// Constrain width between 40% and 80%
			setPackStageWidth(Math.max(40, Math.min(80, newWidth)));
		},
		[isResizing]
	);

	// Add event listeners for resize
	useEffect(() => {
		if (isResizing) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			return () => {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			};
		}
	}, [isResizing, handleMouseMove]);

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
						{selectedCard.id === 'headline' && (
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
						)}
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
				<div
					className={`workspace-main${workspaceQueue.length > 0 && !focusMode && !showingDetail ? ' with-queue has-divider' : ''}${focusMode || showingDetail ? ' detail-expanded' : ''}`}
					style={workspaceQueue.length > 0 && !focusMode && !showingDetail ? { gridTemplateColumns: `minmax(0, ${packStageWidth}%) 8px minmax(280px, ${Math.max(20, 100 - packStageWidth)}%)` } : undefined}
				>
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
						<div
							className="workspace-resize-divider"
							onMouseDown={handleMouseDown}
							role="separator"
							aria-label="Resize divider"
							aria-orientation="vertical"
							aria-valuemin={40}
							aria-valuemax={80}
							aria-valuenow={Math.round(packStageWidth)}
						/>
					)}

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
												{item.description && <span className="queue-description">{item.description}</span>}
												{item.author && <span className="queue-author">{item.author}</span>}
											</div>
											{item.type === 'youtube' && (
												<div className="queue-embed">
													{(() => {
														const baseList = (customPlaylistsByItem[item.id] && customPlaylistsByItem[item.id].length)
															? customPlaylistsByItem[item.id]
															: (youtubePlaylists[item.id] || []);
														const selectedId = selectedMainByItem[item.id];
														const fallbackMain = youtubeVideos[item.id] || baseList[0];
														const mainVideo = selectedId ? baseList.find(v => v.videoId === selectedId) || fallbackMain : fallbackMain;
														const mainId = mainVideo?.videoId;
														const extras = baseList
															.map((v) => v.videoId)
															.filter((id) => id && id !== mainId);

														if (!mainId) {
															return (
																<div className="queue-embed-placeholder" role="status">
																	<span>Loading playlist preview...</span>
																</div>
															);
														}

														return (
															<>
																<div className="queue-embed-frame">
																	<YouTubePlaylistEmbed
																		videoId={mainId}
																		playlist={extras}
																		title={item.title}
																		width="100%"
																		height={160}
																		noteSelector={`span.queue-embed-pruned-note[data-note-for='${item.id}']`}
																	/>
																</div>
																<div className="queue-embed-meta">
																	<strong>{mainVideo.title}</strong>
																	<span className="queue-embed-pruned-note" data-note-for={item.id}></span>
																	<span>via {mainVideo.channelTitle}</span>
																</div>
																{baseList.length ? (
																	<div className="queue-tracklist" aria-label="Playlist tracklist">
																		{baseList.map((video: YouTubeVideoPreview, index: number) => (
																			<div
																				key={`${item.id}-${video.videoId || index}`}
																				className={`queue-track${video.videoId === mainId ? ' active' : ''}`}
																				onClick={() => onSelectTrack(item.id, video.videoId)}
																				role="button"
																				aria-pressed={video.videoId === mainId}
																			>
																				<div className="queue-track-thumb" aria-hidden="true">
																					{video.thumbnailUrl ? (
																						<img src={video.thumbnailUrl} alt="" />
																					) : (
																						<span className="queue-track-fallback">{index + 1}</span>
																					)}
																				</div>
																				<div className="queue-track-body">
																					<span className="queue-track-title">{video.title}</span>
																					<span className="queue-track-desc">{video.description || video.channelTitle}</span>
																				</div>
																				<div className="queue-track-controls">
																					<span className="queue-track-index">{index + 1}</span>
																					<button type="button" className="icon-button" title="Remove" onClick={(e) => { e.stopPropagation(); onRemoveTrack(item.id, video.videoId); }}>✕</button>
																				</div>
																			</div>
																		))}
																		<div className="queue-tracklist-actions">
																			<input
																				placeholder="Add track URL or ID"
																				value={trackAddInputByItem[item.id] || ''}
																				onChange={(e) => setTrackAddInputByItem((prev) => ({ ...prev, [item.id]: e.target.value }))}
																			/>
																			<button type="button" className="btn micro" onClick={() => onAddTrack(item.id, trackAddInputByItem[item.id] || '')}>Add</button>
																		</div>
																	</div>
																) : null}
															</>
														);
																									})()}
												</div>
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
