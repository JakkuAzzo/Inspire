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
							{item.type === 'youtube' && youtubeVideos[item.id] && (
								<div className="queue-embed">
									<div className="queue-embed-frame">
										{(() => {
											const mainId = youtubeVideos[item.id].videoId;
											const extras = (youtubePlaylists[item.id] || []).map((v) => v.videoId).filter((v) => v && v !== mainId);
											return (
												<YouTubePlaylistEmbed
													videoId={mainId}
													playlist={extras}
													title={`YouTube preview for ${youtubeVideos[item.id].title}`}
													height={220}
													noteSelector={`span.queue-embed-pruned-note[data-note-for='${item.id}']`}
												/>
											);
										})()}
									</div>
									<div className="queue-embed-meta">
										<strong>{youtubeVideos[item.id].title}</strong>
										<span className="queue-embed-pruned-note" data-note-for={item.id}></span>
										<span>via {youtubeVideos[item.id].channelTitle}</span>
									</div>
								</div>
							)}
						</li>
					))}
				</ul>
			)}
		</aside>
	);
}
