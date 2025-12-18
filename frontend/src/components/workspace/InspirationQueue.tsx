import { useState } from 'react';
import type { WorkspaceQueueItem } from '../../types';
import YouTubePlaylistEmbed from '../YouTubePlaylistEmbed';

function formatQueueType(type: WorkspaceQueueItem['type']): string {
	switch (type) {
		case 'youtube':
			return 'YouTube';
		case 'stream':
			return 'Live';
		case 'instrumental':
			return 'Track';
		case 'reference':
		default:
			return 'Ref';
	}
}

function formatQueueSource(url: string): string {
	try {
		const parsed = new URL(url);
		return parsed.hostname.replace(/^www\./, '');
	} catch {
		return '';
	}
}

export interface InspirationQueueProps {
	packTitle: string;
	queueCollapsed: boolean;
	workspaceQueue: WorkspaceQueueItem[];
	youtubeError: string | null;
	youtubeVideos: Record<string, { videoId: string; title: string; channelTitle: string; thumbnailUrl?: string }>;
	youtubePlaylists: Record<string, Array<{ videoId: string; title: string; channelTitle: string; thumbnailUrl?: string }>>;
	onToggleCollapsed: () => void;
}

export function InspirationQueue({
	packTitle,
	queueCollapsed,
	workspaceQueue,
	youtubeError,
	youtubeVideos,
	youtubePlaylists,
	onToggleCollapsed
}: InspirationQueueProps) {
	// Local interactive state for this queue component
	const [selectedMainByItem, setSelectedMainByItem] = useState<Record<string, string>>({});
	const [customPlaylistsByItem, setCustomPlaylistsByItem] = useState<Record<string, Array<{ videoId: string; title: string; channelTitle: string; thumbnailUrl?: string }>>>({});
	const [trackAddInputByItem, setTrackAddInputByItem] = useState<Record<string, string>>({});

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

	const onSelectTrack = (itemId: string, videoId: string) => setSelectedMainByItem(prev => ({ ...prev, [itemId]: videoId }));
	const onRemoveTrack = (itemId: string, videoId: string) => {
		setCustomPlaylistsByItem(prev => {
			const baseList = prev[itemId] ?? youtubePlaylists[itemId] ?? [];
			const nextList = baseList.filter(v => v.videoId !== videoId);
			const next = { ...prev, [itemId]: nextList };
			setSelectedMainByItem(mPrev => {
				if (mPrev[itemId] === videoId) {
					const newMain = nextList[0]?.videoId;
					const copy = { ...mPrev };
					if (newMain) copy[itemId] = newMain; else delete copy[itemId];
					return copy;
				}
				return mPrev;
			});
			return next;
		})
	};
	const onAddTrack = (itemId: string, input: string) => {
		const id = parseVideoId(input);
		if (!id) return;
		const video = { videoId: id, title: 'Added track', channelTitle: 'Custom', thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
		setCustomPlaylistsByItem(prev => {
			const baseList = prev[itemId] ?? youtubePlaylists[itemId] ?? [];
			return { ...prev, [itemId]: [...baseList, video] };
		});
		setTrackAddInputByItem(prev => ({ ...prev, [itemId]: '' }));
	};
	return (
		<aside className={`workspace-queue glass${queueCollapsed ? ' collapsed' : ''}`} aria-label="Suggested inspiration queue">
			<div className="queue-header">
				<div className="queue-heading">
					<h3>
						Inspiration Queue
						<span className="queue-count" aria-label={`${workspaceQueue.length} recommendations`}>
							{workspaceQueue.length}
						</span>
					</h3>
					<p>
						Clips and references tuned to <strong>{packTitle}</strong>.
					</p>
				</div>
				<button
					type="button"
					className="btn ghost micro queue-toggle"
					onClick={onToggleCollapsed}
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
								<span className="queue-pill">{formatQueueType(item.type)}</span>
								<div className="queue-text">
									<strong>{item.title}</strong>
									{item.description && <span className="queue-description">{item.description}</span>}
									{formatQueueSource(item.url) && <span className="queue-source">Source: {formatQueueSource(item.url)}</span>}
									{item.author && <span className="queue-author">{item.author}</span>}
									{item.matchesPack && <span className="queue-match">Matches: {item.matchesPack}</span>}
									{item.searchQuery && <span className="queue-query">Query: {item.searchQuery}</span>}
									{item.duration && <span className="queue-duration">{item.duration}</span>}
								</div>
							</div>
							<div className="queue-actions">
								<a className="btn micro" href={item.url} target="_blank" rel="noopener noreferrer">
									Open
								</a>
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
														title={`YouTube preview for ${mainVideo.title}`}
														height={220}
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
														{baseList.map((video: { videoId: string; title: string; channelTitle: string; thumbnailUrl?: string }, index: number) => (
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
																	<span className="queue-track-desc">{(video as any).description || video.channelTitle}</span>
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
	);
}
