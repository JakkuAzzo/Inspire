import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, DragEvent as ReactDragEvent, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import './App.css';
import inspireLogo from './assets/Inspire_transparent_white.png';
import lyricistCardImage from './assets/images/Lyracist_Studio.jpeg';
import lyricistRapperImage from './assets/images/rapper.jpeg';
import lyricistSingerImage from './assets/images/singer.jpg';
import producerCardImage from './assets/images/Producer_Lab.jpeg';
import editorCardImage from './assets/images/Editor_Suite.jpeg';

import type {
	ChallengeActivity,
	CommunityPost,
	CreativeMode,
	DailyChallenge,
	EditorModePack,
	FuelPack,
	InspireAnyPack,
	LyricistModePack,
	ModeDefinition,
	ModePackBase,
	ModePack,
	ModePackRequest,
	MemeTemplate,
	ProducerModePack,
	RemixMeta,
	RelevanceFilter,
	RelevanceTone,
	WorkspaceQueueItem
} from './types';
import { RelevanceSlider } from './components/RelevanceSlider';
import { CollapsibleSection } from './components/CollapsibleSection';
import YouTubePlaylistEmbed from './components/YouTubePlaylistEmbed';
import MouseParticles from './components/MouseParticles';

const DEFAULT_FILTERS: RelevanceFilter = {
	timeframe: 'fresh',
	tone: 'funny',
	semantic: 'tight'
};

// Fallback map for mode background images
const MODE_BG_BY_ID: Record<string, string> = {
	lyricist: lyricistCardImage,
	producer: producerCardImage,
	editor: editorCardImage,
};

const LYRICIST_SUBMODE_BG_BY_ID: Record<string, string> = {
	rapper: lyricistRapperImage,
	singer: lyricistSingerImage,
};

const FALLBACK_MODE_DEFINITIONS: ModeDefinition[] = [
	{
		id: 'lyricist',
		label: 'Lyricist Studio',
		description: 'Storytelling, hooks, rhyme families, and emotions.',
		icon: '',
		backgroundImage: lyricistCardImage,
		accent: '#ec4899',
		submodes: [
			{ id: 'rapper', label: 'Rapper', description: 'Punchlines + flow prompts.' },
			{ id: 'singer', label: 'Singer', description: 'Melodic phrasing + chord moods.' }
		]
	},
	{
		id: 'producer',
		label: 'Producer Lab',
		description: 'Samples, FX, constraints, and sonic experiments.',
		icon: '',
		backgroundImage: producerCardImage,
		accent: '#22d3ee',
		submodes: [
			{ id: 'musician', label: 'Musician', description: 'Chord progressions + live textures.' },
			{ id: 'sampler', label: 'Sampler', description: 'Flip obscure clips into gold.' },
			{ id: 'sound-designer', label: 'Sound Designer', description: 'FX-only rule sets and manipulations.' }
		]
	},
	{
		id: 'editor',
		label: 'Editor Suite',
		description: 'Visual storytelling, pacing, and timeline beats.',
		icon: '',
		backgroundImage: editorCardImage,
		accent: '#a855f7',
		submodes: [
			{ id: 'image-editor', label: 'Image', description: 'Graphic + meme templates with palette nudges.' },
			{ id: 'video-editor', label: 'Video', description: 'Trending cuts, pacing, and clip remixes.' },
			{ id: 'audio-editor', label: 'Audio', description: 'Mixing prompts and remix briefs.' }
		]
	}
];

const LYRICIST_GENRES = [
	{ value: 'r&b', label: 'R&B' },
	{ value: 'drill', label: 'Drill' },
	{ value: 'pop', label: 'Pop' },
	{ value: 'afrobeats', label: 'Afrobeats' },
	{ value: 'lo-fi', label: 'Lo-Fi' },
	{ value: 'electronic', label: 'Electronic' }
];

const MODE_BACKGROUNDS: Record<CreativeMode, string> = {
	lyricist: 'mode-lyricist',
	producer: 'mode-producer',
	editor: 'mode-editor'
};

const THEME_OPTIONS = [
	{ id: 'default', label: 'Aurora', emoji: '✨' },
	{ id: 'lofi', label: 'Lo-Fi', emoji: '🌙' },
	{ id: 'neon', label: 'Neon', emoji: '🌈' },
	{ id: 'vaporwave', label: 'Vaporwave', emoji: '🌅' },
	{ id: 'noir', label: 'Noir', emoji: '🖤' }
];

const SHARE_PARAM = 'pack';
const STATS_KEY_PREFIX = 'inspire:creatorStats:';
const ONBOARDING_KEY = 'inspire:onboardingComplete';
const THEME_KEY = 'inspire:theme';
const CONTROLS_COLLAPSED_KEY = 'inspire:workspaceControlsCollapsed';
// Replaced direct YouTube Data API with backend Piped proxy.
// Inline previews now come from `/api/instrumentals/search`.

type LoadingState = null | 'generate' | 'load' | 'remix';

interface CreatorStats {
	totalGenerated: number;
	wildCount: number;
	streak: number;
	lastGeneratedISO: string | null;
	toneCounts: Record<RelevanceTone, number>;
	lastMode: CreativeMode | null;
	achievements: string[];
	favoriteTone: RelevanceTone | null;
}

interface DeckCard {
	id: string;
	label: string;
	preview: string;
	detail: ReactNode;
	accent?: string;
}

interface LiveSession {
	id: string;
	mode: CreativeMode;
	submode: string;
	owner: string;
	title: string;
	participants: number;
	status: 'live' | 'open';
}

interface YouTubeVideoPreview {
	videoId: string;
	title: string;
	channelTitle: string;
	thumbnailUrl?: string;
}

interface NewsHeadline {
	title: string;
	url: string;
	source?: string;
	description?: string;
	publishedAt?: string;
}

const LIVE_SESSION_PRESETS: LiveSession[] = [
	{ id: 'session-lyricist-01', mode: 'lyricist', submode: 'rapper', owner: '@auroraflow', title: 'Hook Draft Lab', participants: 128, status: 'live' },
	{ id: 'session-producer-01', mode: 'producer', submode: 'musician', owner: '@midnightloops', title: 'Texture Flip Collab', participants: 92, status: 'open' },
	{ id: 'session-editor-01', mode: 'editor', submode: 'video-editor', owner: '@cutcraft', title: 'Reel Speedrun', participants: 64, status: 'live' }
];

const DAILY_CHALLENGE_STORAGE_KEY = 'inspire:dailyChallengeState';

interface StoredDailyChallenge {
	dayId: string;
	challengeIndex: number;
	streak: number;
	completed: boolean;
}

const DAILY_CHALLENGE_ROTATION: Array<Omit<DailyChallenge, 'expiresAt' | 'streakCount'>> = [
	{
		id: 'challenge-city-lights',
		title: 'City Lights Cypher',
		description: 'Write or score something that captures the glow of the nighttime commute.',
		constraints: ['Reference a real street or landmark.', 'Layer at least one found-sound texture.'],
		reward: 'Keeps your streak glowing'
	},
	{
		id: 'challenge-one-take',
		title: 'One-Take Energy',
		description: 'Channel the rush of capturing a single take on camera or tape.',
		constraints: ['Limit yourself to three primary layers.', 'Add a bar or frame of deliberate silence.'],
		reward: 'Badge progress +1'
	},
	{
		id: 'challenge-remix-relay',
		title: 'Remix Relay',
		description: 'Remix someone else’s idea and push it one step further.',
		constraints: ['Keep one motif from the original.', 'Introduce a contrasting mood shift mid-way.'],
		reward: 'Unlock remix badge progress'
	}
];

const DEMO_LYRICIST_PACK: LyricistModePack = {
	id: 'pack-aurora-city-pulse',
	timestamp: Date.now() - 1000 * 60 * 60,
	mode: 'lyricist',
	submode: 'rapper',
	title: 'City Pulse Hook',
	headline: 'Metro nights hum with neon dreams',
	summary: 'A glowing hook about late-night energy and chosen family.',
	filters: { timeframe: 'fresh', tone: 'deep', semantic: 'tight' },
	author: '@auroraflow',
	genre: 'r&b',
	powerWords: ['neon', 'pulse', 'afterglow', 'midnight', 'heartbeat', 'anthem'],
	rhymeFamilies: ['ight', 'ow', 'ame'],
	flowPrompts: ['Bounce between triplets and straight time', 'Whispered second line backings', 'Switch bounce on bar seven'],
	memeSound: { name: 'City Pop Sweep', description: 'Retro synth swell with vinyl crackle', tone: 'deep', sampleUrl: 'https://example.com/audio/city-pop-sweep.mp3' },
	topicChallenge: 'Celebrate the people keeping the city alive past midnight.',
	newsPrompt: {
		headline: 'Local venues collaborate on 3AM arts trail',
		context: 'Indie promoters join forces for safe late-night art tours.',
		timeframe: 'fresh',
		source: 'Inspire City Wire',
		url: 'https://example.com/arts-trail'
	},
	storyArc: { start: 'Doors open with a hush', middle: 'Streetlights flicker with bass', end: 'Sky blushes at dawn' },
	chordMood: 'maj7 add9 over warm bass',
	lyricFragments: ['Neon veins in the crosswalk glow', 'Calling all the after-hours heroes', 'We chase down the hum of the stereo'],
	wordLab: [
		{ word: 'afterglow', score: 0.92 },
		{ word: 'skyline', score: 0.88 },
		{ word: 'heartbeat', score: 0.9 }
	]
};

const DEMO_PRODUCER_PACK: ProducerModePack = {
	id: 'pack-midnightloops-texture',
	timestamp: Date.now() - 1000 * 60 * 90,
	mode: 'producer',
	submode: 'musician',
	title: 'Glow Texture Flip',
	headline: 'Warm chords over crisp percussion',
	summary: 'Lo-fi bounce with tactile percussion layers and subway ambience.',
	filters: { timeframe: 'recent', tone: 'deep', semantic: 'balanced' },
	author: '@midnightloops',
	remixOf: { author: '@auroraflow', packId: DEMO_LYRICIST_PACK.id, generation: 1 },
	remixLineage: [{ author: '@auroraflow', packId: DEMO_LYRICIST_PACK.id, generation: 1 }],
	bpm: 86,
	key: 'C# minor',
	sample: {
		title: 'Analog Sweep 1987',
		source: 'Archive Audio',
		url: 'https://example.com/sample/analog-sweep',
		tags: ['analog', 'sweep', 'warm'],
		timeframe: 'timeless'
	},
	secondarySample: {
		title: 'Street Noise Layers',
		source: 'Inspire Field',
		url: 'https://example.com/sample/street-noise',
		tags: ['foley', 'texture'],
		timeframe: 'fresh'
	},
	constraints: ['No straight hi-hats', 'Sidechain to the subway recording'],
	fxIdeas: ['Tape wobble automation', 'Bit-crush the snare ghost notes', 'Granular stretch on intro pad'],
	instrumentPalette: ['DX7 electric piano', 'Sub-bass saw', 'Vocal chop resampled'],
	videoSnippet: {
		title: 'Night commute timelapse',
		description: 'Light streaks across rainy asphalt',
		url: 'https://example.com/video/night-commute',
		timeframe: 'recent',
		tone: 'deep'
	},
	referenceInstrumentals: [
		{
			title: 'Afterglow Transit',
			description: 'Glittering downtempo groove with heavy swing',
			url: 'https://example.com/audio/afterglow-transit',
			timeframe: 'recent',
			tone: 'deep'
		}
	],
	challenge: 'Build the drop using only household recordings.'
};

const COMMUNITY_POSTS: CommunityPost[] = [
	{
		id: 'community-post-1',
		author: '@auroraflow',
		contentType: 'video',
		content: 'Hook sketch recorded on last night’s stream. The crowd lost it on the second drop.',
		packId: DEMO_LYRICIST_PACK.id,
		createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
		reactions: 512,
		comments: 64,
		remixCount: 18,
		featuredPack: DEMO_LYRICIST_PACK
	},
	{
		id: 'community-post-2',
		author: '@midnightloops',
		contentType: 'audio',
		content: 'Texture flip built from kitchen percussion + subway rumble. Ready for someone to add vocals.',
		packId: DEMO_PRODUCER_PACK.id,
		remixOf: DEMO_PRODUCER_PACK.remixOf,
		createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
		reactions: 348,
		comments: 42,
		remixCount: 11,
		featuredPack: DEMO_PRODUCER_PACK
	}
];

const INITIAL_WORKSPACE_QUEUE: WorkspaceQueueItem[] = [];

function getTodayId(): string {
	return new Date().toISOString().slice(0, 10);
}

function computeChallengeExpiryIso(): string {
	const next = new Date();
	next.setHours(24, 0, 0, 0);
	return next.toISOString();
}

function persistDailyChallengeState(state: StoredDailyChallenge) {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(DAILY_CHALLENGE_STORAGE_KEY, JSON.stringify(state));
}

function computeDailyChallengeState(existing?: StoredDailyChallenge | null): { stored: StoredDailyChallenge; challenge: DailyChallenge } {
	const todayId = getTodayId();
	const rotationLength = DAILY_CHALLENGE_ROTATION.length || 1;
	let stored: StoredDailyChallenge = existing ?? {
		dayId: todayId,
		challengeIndex: 0,
		streak: 0,
		completed: false
	};
	if (stored.dayId !== todayId) {
		const baseStreak = stored.completed ? stored.streak : 0;
		const nextIndex = (stored.challengeIndex + 1) % rotationLength;
		stored = {
			dayId: todayId,
			challengeIndex: nextIndex,
			streak: baseStreak,
			completed: false
		};
	}
	const rotationEntry = DAILY_CHALLENGE_ROTATION[stored.challengeIndex % rotationLength] ?? DAILY_CHALLENGE_ROTATION[0];
	const challenge: DailyChallenge = {
		...rotationEntry,
		expiresAt: computeChallengeExpiryIso(),
		streakCount: stored.streak
	};
	return { stored, challenge };
}

function initializeDailyChallenge(): { stored: StoredDailyChallenge; challenge: DailyChallenge } {
	let stored: StoredDailyChallenge | null = null;
	if (typeof window !== 'undefined') {
		const raw = window.localStorage.getItem(DAILY_CHALLENGE_STORAGE_KEY);
		if (raw) {
			try {
				stored = JSON.parse(raw) as StoredDailyChallenge;
			} catch (err) {
				console.warn('Unable to parse daily challenge cache', err);
			}
		}
	}
	const state = computeDailyChallengeState(stored);
	persistDailyChallengeState(state.stored);
	return state;
}

function formatRelativeTime(timestamp: string): string {
	const base = new Date(timestamp);
	const diffMs = Date.now() - base.getTime();
	const diffMinutes = Math.floor(diffMs / (1000 * 60));
	if (diffMinutes < 1) return 'just now';
	if (diffMinutes < 60) return `${diffMinutes}m ago`;
	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `${diffHours}h ago`;
	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays}d ago`;
}

function formatChallengeCountdown(deadlineIso: string): string {
	const deadline = new Date(deadlineIso);
	if (Number.isNaN(deadline.getTime())) return '—';
	const diffMs = deadline.getTime() - Date.now();
	if (diffMs <= 0) return 'Expired';
	const totalSeconds = Math.floor(diffMs / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	if (hours > 0) {
		return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
	}
	return `${seconds}s`;
}


// Fetch multiple previews to build a lightweight playlist for embedding
async function searchInstrumentalPreviews(query: string, limit = 5, signal?: AbortSignal): Promise<YouTubeVideoPreview[]> {
  const params = new URLSearchParams({ q: query, limit: String(Math.max(2, Math.min(10, limit))) });
  const res = await fetch(`/api/instrumentals/search?${params.toString()}`, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: Array<{ id: string; title: string; uploader: string; thumbnail?: string }> };
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((it) => ({ videoId: it.id, title: it.title, channelTitle: it.uploader || 'Instrumental', thumbnailUrl: it.thumbnail }));
}

// Build a search query that respects workspace filters and genre
// Fetch YouTube videos using keyless search (no API key needed) via backend
async function searchYoutubePlaylist(query: string, limit = 5): Promise<YouTubeVideoPreview[]> {
	try {
		const params = new URLSearchParams({ q: query, limit: String(Math.max(2, Math.min(20, limit))) });
		const res = await fetch(`/api/youtube/search?${params.toString()}`);
		if (!res.ok) return [];
		const data = (await res.json()) as { items?: Array<{ videoId?: string; id?: string; title?: string; channelTitle?: string; thumbnail?: string }> };
		const items = Array.isArray(data.items) ? data.items : [];
		return items
			.map((result: any) => ({
				videoId: result.videoId || result.id || '',
				title: result.title || 'Untitled',
				channelTitle: result.channelTitle || 'Unknown Creator',
				thumbnailUrl: result.thumbnail || ''
			}))
			.filter(v => v.videoId);
	} catch (err) {
		console.warn('YouTube search failed:', err);
		return [];
	}
}

function buildWorkspaceQueue(pack: ModePack): WorkspaceQueueItem[] {
	const baseQueue: WorkspaceQueueItem[] = [
		{
			id: `${pack.id}-yt`,
			type: 'youtube',
			title: `${pack.title} inspiration mix`,
			url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${pack.title} ${pack.mode} inspiration`)}`,
			matchesPack: pack.title,
			searchQuery: `${pack.title} ${pack.mode} inspiration`
		},
		{
			id: `${pack.id}-instrumental`,
			type: 'instrumental',
			title: `${pack.mode === 'producer' ? 'Reference groove' : 'Instrumental backdrop'}`,
			url: `https://open.spotify.com/search/${encodeURIComponent(`${pack.title} instrumental`)}`,
			matchesPack: pack.headline
		}
	];
	const relatedSession = LIVE_SESSION_PRESETS.find((session) => session.mode === pack.mode);
	if (relatedSession) {
		baseQueue.push({
			id: `${pack.id}-session-${relatedSession.id}`,
			type: 'stream',
			title: `Drop into ${relatedSession.title}`,
			url: `https://inspire.live/${relatedSession.id}`,
			author: relatedSession.owner,
			matchesPack: pack.title
		});
	}
	if (pack.mode === 'producer') {
		baseQueue.push({
			id: `${pack.id}-daw`,
			type: 'reference',
			title: 'Load DAW session template',
			url: 'https://inspire.tools/templates/producer-session',
			duration: 'Setup',
			matchesPack: pack.submode
		});
	}
	if (pack.mode === 'editor') {
		baseQueue.push({
			id: `${pack.id}-timing`,
			type: 'reference',
			title: 'Pull matching b-roll pack',
			url: 'https://pexels.com/search/night%20city%20b-roll/',
			duration: 'Browse',
			matchesPack: pack.format
		});
	}
	return baseQueue;
}

function formatQueueType(type: WorkspaceQueueItem['type']): string {
	switch (type) {
		case 'youtube':
			return 'YouTube';
		case 'stream':
			return 'Live stream';
		case 'instrumental':
			return 'Track';
		case 'reference':
		default:
			return 'Reference';
	}
}

const EMPTY_STATS: CreatorStats = {
	totalGenerated: 0,
	wildCount: 0,
	streak: 0,
	lastGeneratedISO: null,
	toneCounts: {
		funny: 0,
		deep: 0,
		dark: 0
	},
	lastMode: null,
	achievements: [],
	favoriteTone: null
};

function mergeUniqueStrings(items: string[], limit?: number): string[] {
	const unique = Array.from(new Set(items.filter(Boolean)));
	return typeof limit === 'number' ? unique.slice(0, limit) : unique;
}

function mergeUniqueBy<T>(items: T[], key: (item: T) => string, limit?: number): T[] {
	const seen = new Set<string>();
	const result: T[] = [];
	for (const item of items) {
		const id = key(item);
		if (seen.has(id)) continue;
		seen.add(id);
		result.push(item);
		if (typeof limit === 'number' && result.length >= limit) break;
	}
	return result;
}

function base64Encode(text: string): string {
	if (typeof window === 'undefined') return '';
	const utf8 = encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(Number.parseInt(p1, 16)));
	return window.btoa(utf8);
}

function base64Decode(text: string): string {
	if (typeof window === 'undefined') return '';
	const binary = window.atob(text);
	const percentEncoded = Array.from(binary)
		.map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
		.join('');
	return decodeURIComponent(percentEncoded);
}

function encodePack(pack: InspireAnyPack): string {
	try {
		return base64Encode(JSON.stringify(pack));
	} catch (err) {
		console.error('Unable to encode pack', err);
		return '';
	}
}

function decodePack(encoded: string): InspireAnyPack | null {
	try {
		const data = base64Decode(encoded);
		return JSON.parse(data);
	} catch (err) {
		console.error('Unable to decode pack link', err);
		return null;
	}
}

function getPackId(pack: InspireAnyPack): string {
	if ((pack as ModePackBase | FuelPack)?.id) return pack.id;
	return 'unknown-pack';
}

function loadCreatorStats(userId: string): CreatorStats {
	if (typeof window === 'undefined') return { ...EMPTY_STATS };
	const raw = window.localStorage.getItem(`${STATS_KEY_PREFIX}${userId}`);
	if (!raw) return { ...EMPTY_STATS };
	try {
		const parsed = JSON.parse(raw) as Partial<CreatorStats>;
		return {
			...EMPTY_STATS,
			...parsed,
			toneCounts: {
				...EMPTY_STATS.toneCounts,
				...(parsed?.toneCounts ?? {})
			}
		};
	} catch (err) {
		console.error('Unable to parse creator stats', err);
		return { ...EMPTY_STATS };
	}
}

function persistCreatorStats(userId: string, stats: CreatorStats) {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(`${STATS_KEY_PREFIX}${userId}`, JSON.stringify(stats));
}

function computeFavoriteTone(toneCounts: Record<RelevanceTone, number>): RelevanceTone | null {
	const sorted = Object.entries(toneCounts).sort((a, b) => b[1] - a[1]);
	return sorted[0]?.[1] ? (sorted[0][0] as RelevanceTone) : null;
}

function loadStoredUserId() {
	if (typeof window === 'undefined') return `creator-${Date.now().toString(36)}`;
	return window.localStorage.getItem('inspire:userId') ?? `creator-${Date.now().toString(36)}`;
}

function formatShareText(pack: InspireAnyPack, userId: string) {
	if (isLyricistPack(pack)) {
		return [
			`🎤 Lyricist spark for ${userId}`,
			`Mode: ${pack.submode} · Genre: ${pack.genre.toUpperCase()}`,
			`Power words: ${pack.powerWords.join(', ')}`,
			`Headline: ${pack.newsPrompt.headline} (${pack.newsPrompt.source})`,
			`Challenge: ${pack.topicChallenge}`,
			`Meme sound: ${pack.memeSound.name}`,
			`Story arc: ${pack.storyArc.start} → ${pack.storyArc.middle} → ${pack.storyArc.end}`,
			`ID: ${pack.id}`
		].join('\n');
	}

	if (isProducerPack(pack)) {
		return [
			`🎚 Producer lab spark for ${userId}`,
			`Submode: ${pack.submode}`,
			`BPM: ${pack.bpm} · Key: ${pack.key}`,
			`Sample: ${pack.sample.title} (${pack.sample.source})`,
			`Constraints: ${pack.constraints.join(' | ')}`,
			`FX ideas: ${pack.fxIdeas.join(' | ')}`,
			`Challenge: ${pack.challenge}`,
			`ID: ${pack.id}`
		].join('\n');
	}

	if (isEditorPack(pack)) {
		return [
			`🎬 Editor suite spark for ${userId}`,
			`Submode: ${pack.submode} · Format: ${pack.format}`,
			`Moodboard: ${pack.moodboard.map((clip) => clip.title).join(', ')}`,
			`Audio prompts: ${pack.audioPrompts.map((sound) => sound.name).join(', ')}`,
			`Timeline beats: ${pack.timelineBeats.join(' | ')}`,
			`Challenge: ${pack.challenge}`,
			`ID: ${pack.id}`
		].join('\n');
	}

	const legacy = pack as FuelPack;
	return [
		`✨ Inspire Fuel Pack for ${userId}`,
		`Mood: ${legacy.mood} · Tempo: ${legacy.tempo}`,
		`Words: ${legacy.words.join(', ')}`,
		`Memes: ${legacy.memes.join(', ')}`,
		`Prompt: ${legacy.prompt}`,
		`Wildcard: ${legacy.wildcard}`,
		`Quote: “${legacy.inspiration.quote}” — ${legacy.inspiration.author}`,
		`ID: ${legacy.id}`
	].join('\n');
}

function createRemixPack(original: ModePack, fresh: ModePack): ModePack {
	if (original.mode !== fresh.mode) return fresh;
	if (fresh.mode === 'lyricist' && original.mode === 'lyricist') {
		const baseFresh = fresh as LyricistModePack;
		const baseOriginal = original as LyricistModePack;
		const mergedWords = mergeUniqueStrings([...baseOriginal.powerWords.slice(0, 3), ...baseFresh.powerWords], 6);
		const mergedFlow = mergeUniqueStrings([...baseFresh.flowPrompts.slice(0, 3), ...baseOriginal.flowPrompts.slice(0, 2)], 5);
		const mergedFragments = mergeUniqueStrings([...baseFresh.lyricFragments.slice(0, 3), ...baseOriginal.lyricFragments.slice(0, 2)], 6);
		return {
			...baseFresh,
			powerWords: mergedWords,
			flowPrompts: mergedFlow,
			lyricFragments: mergedFragments,
			storyArc: {
				start: baseOriginal.storyArc.start,
				middle: baseFresh.storyArc.middle,
				end: baseFresh.storyArc.end
			},
			memeSound: Math.random() > 0.5 ? baseOriginal.memeSound : baseFresh.memeSound,
			topicChallenge: Math.random() > 0.5 ? baseOriginal.topicChallenge : baseFresh.topicChallenge,
			summary: `${baseOriginal.summary.split('.').at(0) ?? baseOriginal.summary}. ${baseFresh.summary}`.trim()
		};
	}

	if (fresh.mode === 'producer' && original.mode === 'producer') {
		const baseFresh = fresh as ProducerModePack;
		const baseOriginal = original as ProducerModePack;
		const mergedConstraints = mergeUniqueStrings([...baseFresh.constraints, ...baseOriginal.constraints.slice(0, 2)], 6);
		const mergedFx = mergeUniqueStrings([...baseFresh.fxIdeas, ...baseOriginal.fxIdeas.slice(0, 2)], 6);
		const mergedPalette = mergeUniqueStrings([...baseFresh.instrumentPalette, ...baseOriginal.instrumentPalette.slice(0, 3)], 6);
		return {
			...baseFresh,
			sample: Math.random() > 0.5 ? baseOriginal.sample : baseFresh.sample,
			secondarySample: Math.random() > 0.5 ? baseOriginal.secondarySample : baseFresh.secondarySample,
			constraints: mergedConstraints,
			fxIdeas: mergedFx,
			instrumentPalette: mergedPalette,
			challenge: `${baseOriginal.challenge.split('.')[0] ?? baseOriginal.challenge}. Remix: ${baseFresh.challenge}`.trim()
		};
	}

	const baseFresh = fresh as EditorModePack;
	const baseOriginal = original as EditorModePack;
	const mergedMoodboard = mergeUniqueBy([...baseFresh.moodboard, ...baseOriginal.moodboard], (clip) => clip.title, 6);
	const mergedAudio = mergeUniqueBy([...baseFresh.audioPrompts, ...baseOriginal.audioPrompts], (prompt) => prompt.name, 6);
	const mergedTimeline = mergeUniqueStrings([...baseFresh.timelineBeats, ...baseOriginal.timelineBeats], 7);
	const mergedConstraints = mergeUniqueStrings([...baseFresh.visualConstraints, ...baseOriginal.visualConstraints], 6);
	return {
		...baseFresh,
		moodboard: mergedMoodboard,
		audioPrompts: mergedAudio,
		timelineBeats: mergedTimeline,
		visualConstraints: mergedConstraints,
		challenge: `${baseOriginal.challenge} | Remix: ${baseFresh.challenge}`.slice(0, 240)
	};
}

function isModePack(pack: InspireAnyPack | null): pack is ModePack {
	return Boolean(pack && (pack as ModePack).mode);
}

function isLyricistPack(pack: InspireAnyPack | null): pack is LyricistModePack {
	return isModePack(pack) && pack.mode === 'lyricist';
}

function isProducerPack(pack: InspireAnyPack | null): pack is ProducerModePack {
	return isModePack(pack) && pack.mode === 'producer';
}

function isEditorPack(pack: InspireAnyPack | null): pack is EditorModePack {
	return isModePack(pack) && pack.mode === 'editor';
}

function resolveChallengeText(pack: InspireAnyPack | null): string {
	if (!pack) return 'Spin up a fresh pack to unlock a challenge.';
	if (!isModePack(pack)) {
		const legacy = pack as FuelPack;
		return legacy.prompt ?? 'Use this classic prompt to get started.';
	}
	if (isLyricistPack(pack)) return pack.topicChallenge ?? 'Write something unexpected from the headline.';
	if (isProducerPack(pack)) return pack.challenge ?? 'Flip the palette into something new.';
	if (isEditorPack(pack)) return pack.challenge ?? 'Cut a sequence that bends expectations.';
	return 'Keep experimenting with new ideas.';
}

function App() {
	const initialUserId = typeof window === 'undefined' ? `creator-${Date.now().toString(36)}` : loadStoredUserId();
	const [modeDefinitions, setModeDefinitions] = useState<ModeDefinition[]>(FALLBACK_MODE_DEFINITIONS);
	const [mode, setMode] = useState<CreativeMode | null>(null);
	const [submode, setSubmode] = useState<string | null>(null);
	const [genre, setGenre] = useState<string>('r&b');
	const [filters, setFilters] = useState<RelevanceFilter>(DEFAULT_FILTERS);
	const [fuelPack, setFuelPack] = useState<InspireAnyPack | null>(null);
	const [loading, setLoading] = useState<LoadingState>(null);
	const [status, setStatus] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [userId, setUserId] = useState<string>(initialUserId);
	const [creatorStats, setCreatorStats] = useState<CreatorStats>(() => loadCreatorStats(initialUserId));
	const [lookupId, setLookupId] = useState('');
	const [packAnimationKey, setPackAnimationKey] = useState(0);
	const [expandedCard, setExpandedCard] = useState<string | null>(null);
	const [theme, setTheme] = useState<string>(() => {
		if (typeof window === 'undefined') return 'default';
		return window.localStorage.getItem(THEME_KEY) ?? 'default';
	});
	const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
		if (typeof window === 'undefined') return false;
		return false; // Don't show onboarding modal on initial load; use mode-gate instead
	});
	const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
	const [showAccountModal, setShowAccountModal] = useState(false);
	const [showCommunityOverlay, setShowCommunityOverlay] = useState(false);
	const [controlsCollapsed, setControlsCollapsed] = useState<boolean>(() => {
		if (typeof window === 'undefined') return true;
		const stored = window.localStorage.getItem(CONTROLS_COLLAPSED_KEY);
		if (stored === null) return true;
		return stored === 'true';
	});
	const [autoRefreshMs, setAutoRefreshMs] = useState<number | null>(null);
	const [focusMode, setFocusMode] = useState(false);
	const [focusModeType, setFocusModeType] = useState<'single' | 'combined'>('single');
	const [focusStyle, setFocusStyle] = useState<'scroll' | 'rain' | 'flash'>('scroll');
	const [focusDensity, setFocusDensity] = useState<number>(8);
	const [focusSpeed, setFocusSpeed] = useState<number>(1);
	const [focusControlsOpen, setFocusControlsOpen] = useState(false);
	const [collaborationMode, setCollaborationMode] = useState<'solo' | 'live' | 'collaborative'>('solo');
	const [activeSessions] = useState<LiveSession[]>(LIVE_SESSION_PRESETS);
	const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
	const [viewerMode, setViewerMode] = useState<'idle' | 'spectating' | 'joining'>('idle');
	const [deckOrder, setDeckOrder] = useState<string[]>([]);
	const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
	const [combinedFocusCardIds, setCombinedFocusCardIds] = useState<string[]>([]);
	const [customWordInput, setCustomWordInput] = useState('');
	const [mixerHover, setMixerHover] = useState(false);
	const [chipPicker, setChipPicker] = useState<{ type: 'powerWord' | 'instrument' | 'headline' | 'meme' | 'sample'; index?: number } | null>(null);
	const dragSourceRef = useRef<string | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const [communityPosts] = useState<CommunityPost[]>(COMMUNITY_POSTS);
	const [workspaceQueue, setWorkspaceQueue] = useState<WorkspaceQueueItem[]>(INITIAL_WORKSPACE_QUEUE);
	const [queueCollapsed, setQueueCollapsed] = useState(false);
	const [youtubeVideos, setYoutubeVideos] = useState<Record<string, YouTubeVideoPreview>>({});
	const youtubeVideosRef = useRef<Record<string, YouTubeVideoPreview>>({});

	// New: store playlists (arrays) keyed by queue item id
	const [youtubePlaylists, setYoutubePlaylists] = useState<Record<string, YouTubeVideoPreview[]>>({});
	const youtubePlaylistsRef = useRef<Record<string, YouTubeVideoPreview[]>>({});
	const [youtubeError, setYoutubeError] = useState<string | null>(null);
	const initialDailyChallenge = useMemo(() => initializeDailyChallenge(), []);
	const [, setDailyChallengeStored] = useState<StoredDailyChallenge>(initialDailyChallenge.stored);
	const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge>(initialDailyChallenge.challenge);
	const [challengeCompletedToday, setChallengeCompletedToday] = useState<boolean>(initialDailyChallenge.stored.completed);
	const [showChallengeOverlay, setShowChallengeOverlay] = useState(false);
	const [challengeCountdown, setChallengeCountdown] = useState<string>(() => formatChallengeCountdown(initialDailyChallenge.challenge.expiresAt));
	const [challengeActivity, setChallengeActivity] = useState<ChallengeActivity[]>([]);
	const [challengeActivityError, setChallengeActivityError] = useState<string | null>(null);
	const [showModePicker, setShowModePicker] = useState(false);

	// Saved packs overlay
	const [showSavedOverlay, setShowSavedOverlay] = useState(false);
	const [savedPacks, setSavedPacks] = useState<InspireAnyPack[]>([]);
	const [savedLoading, setSavedLoading] = useState(false);
	const [savedError, setSavedError] = useState<string | null>(null);

	// Word Explorer overlay
	const [showWordExplorer, setShowWordExplorer] = useState(false);
	const [wordStartsWith, setWordStartsWith] = useState('');
	const [wordRhymeWith, setWordRhymeWith] = useState('');
	const [wordSyllables, setWordSyllables] = useState('');
	const [wordMaxResults, setWordMaxResults] = useState('18');
	const [wordTopic, setWordTopic] = useState('');
	const [wordResults, setWordResults] = useState<Array<{ word: string; score?: number; numSyllables?: number }>>([]);
	const [wordLoading, setWordLoading] = useState(false);
	const [wordError, setWordError] = useState<string | null>(null);
	const [newsHeadlines, setNewsHeadlines] = useState<NewsHeadline[]>([]);
	const [newsLoading, setNewsLoading] = useState(false);
	const [newsError, setNewsError] = useState<string | null>(null);

	// Session peak expand states
	const [expandedPeak, setExpandedPeak] = useState<string | null>(null);

	// Inspiration Image (keyless Picsum via backend)
	const [inspirationImageUrl, setInspirationImageUrl] = useState<string | null>(null);
	const [inspirationImageLoading, setInspirationImageLoading] = useState(false);

	// Meme stimuli (pre-existing templates)
	const [memeStimuli, setMemeStimuli] = useState<MemeTemplate[]>([]);
	const [memeStimuliError, setMemeStimuliError] = useState<string | null>(null);

	useEffect(() => {
		if (!focusMode) {
			setMixerHover(false);
		}
	}, [focusMode]);


	useEffect(() => {
		youtubeVideosRef.current = youtubeVideos;
		youtubePlaylistsRef.current = youtubePlaylists;
	}, [youtubeVideos]);

	useEffect(() => {
		if (!isModePack(fuelPack)) {
			setMemeStimuli([]);
			setMemeStimuliError(null);
			return;
		}

		const controller = new AbortController();
		const params = new URLSearchParams({
			timeframe: fuelPack.filters.timeframe,
			tone: fuelPack.filters.tone,
			semantic: fuelPack.filters.semantic
		});

		const loadMemes = async () => {
			try {
				const res = await fetch(`/api/mock/memes?${params.toString()}`, { signal: controller.signal });
				if (!res.ok) throw new Error('Failed to load meme stimuli');
				const data = await res.json();
				setMemeStimuli(Array.isArray(data.items) ? data.items : []);
				setMemeStimuliError(null);
			} catch (err) {
				if (controller.signal.aborted) return;
				setMemeStimuli([]);
				setMemeStimuliError('Unable to load meme stimuli');
			}
		};

		void loadMemes();
		return () => controller.abort();
	}, [fuelPack]);

	const activeModeDefinition = mode ? modeDefinitions.find((entry) => entry.id === mode) ?? null : null;
	const activeSubmodeDefinition = useMemo(
		() => (activeModeDefinition ? activeModeDefinition.submodes.find((entry) => entry.id === submode) ?? null : null),
		[activeModeDefinition, submode]
	);
	const activeSession = useMemo(
		() => (selectedSessionId ? activeSessions.find((session) => session.id === selectedSessionId) ?? null : null),
		[activeSessions, selectedSessionId]
	);
	const liveSessions = useMemo(() => activeSessions.filter((session) => session.status === 'live'), [activeSessions]);
	const collaborativeSessions = useMemo(
		() => activeSessions.filter((session) => session.status === 'open'),
		[activeSessions]
	);
	const collaborationStatusLabel = useMemo(() => {
		if (viewerMode === 'spectating' && activeSession) {
			return `Spectating ${activeSession.owner}`;
		}
		if (viewerMode === 'joining' && activeSession) {
			return `Collaborating in ${activeSession.title}`;
		}
		if (collaborationMode === 'live') {
			return 'Broadcasting Live';
		}
		if (collaborationMode === 'collaborative') {
			return 'Collaboration Room Open';
		}
		return 'Solo Session';
	}, [activeSession, collaborationMode, viewerMode]);

	const challengeResetLabel = useMemo(() => {
		try {
			const expiry = new Date(dailyChallenge.expiresAt);
			return expiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} catch (err) {
			console.warn('Unable to parse challenge expiry', err);
			return 'midnight';
		}
	}, [dailyChallenge.expiresAt]);

	const isAuthenticated = useMemo(() => Boolean(userId) && !userId.startsWith('creator-'), [userId]);

	useEffect(() => {
		const updateCountdown = () => setChallengeCountdown(formatChallengeCountdown(dailyChallenge.expiresAt));
		updateCountdown();
		if (typeof window === 'undefined') return;
		const intervalId = window.setInterval(updateCountdown, 1000);
		return () => window.clearInterval(intervalId);
	}, [dailyChallenge.expiresAt]);

	useEffect(() => {
		if (!isModePack(fuelPack) || !workspaceQueue.length) {
			if (Object.keys(youtubeVideosRef.current).length) {
				setYoutubeVideos({});
			}
			setYoutubeError(null);
			return;
		}

	const youtubeItems = workspaceQueue.filter((item) => item.type === 'youtube');
	if (!youtubeItems.length) {
		if (Object.keys(youtubeVideosRef.current).length) {
			setYoutubeVideos({});
		}
		setYoutubeError(null);
		return;
	}

	setYoutubeVideos((prev) => {
		const relevantIds = new Set(youtubeItems.map((item) => item.id));
		const filteredEntries = Object.entries(prev).filter(([id]) => relevantIds.has(id));
		if (filteredEntries.length === Object.keys(prev).length) {
			return prev;
		}
		return Object.fromEntries(filteredEntries);
	});

	setYoutubeError(null);
	const controller = new AbortController();
	let cancelled = false;
	const missingItems = youtubeItems.filter((item) => !youtubeVideosRef.current[item.id] || !youtubePlaylistsRef.current[item.id]?.length);
	if (!missingItems.length) {
		return () => {
			controller.abort();
		};
	}

	const loadVideos = async () => {
		try {
			// Derive a reasonable playlist size; can adapt based on filters later
			const results = await Promise.all(
				missingItems.map(async (item) => {
					const query = item.searchQuery ?? item.matchesPack ?? item.title;
					// Use keyless YouTube search first, fallback to backend instrumental service
					const youtubePlaylist = await searchYoutubePlaylist(query, 5);
					const playlist = youtubePlaylist.length > 0 ? youtubePlaylist : await searchInstrumentalPreviews(query, 5, controller.signal);
					const video = playlist[0] ?? null;
					return { id: item.id, video, playlist };
				})
			);
			if (cancelled) return;
			setYoutubeVideos((prev) => {
				const next = { ...prev };
				for (const entry of results) {
					if (entry.video) {
						next[entry.id] = entry.video;
					}
				}
				return next;
			});
			setYoutubePlaylists((prev) => {
				const next = { ...prev };
				for (const entry of results) {
					if (entry.playlist?.length) {
						next[entry.id] = entry.playlist;
					}
				}
				return next;
			});
		} catch (err) {
			if (controller.signal.aborted) return;
			console.warn('YouTube search failed', err);
			if (!cancelled) {
				setYoutubeError('Unable to load preview clip right now.');
			}
		}
	};

	void loadVideos();

	return () => {
		cancelled = true;
		controller.abort();
	};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fuelPack, workspaceQueue]);

	useEffect(() => {
		if (!isModePack(fuelPack)) {
			setNewsHeadlines([]);
			setNewsError(null);
			setNewsLoading(false);
			return;
		}

		const controller = new AbortController();
		setNewsLoading(true);
		setNewsError(null);

		const loadHeadlines = async () => {
			try {
				// Use the new pack-aware headlines endpoint for smarter content
				const res = await fetch(`/api/packs/${encodeURIComponent(fuelPack.id)}/headlines?limit=5`, { signal: controller.signal });
				if (!res.ok) throw new Error('Failed to load headlines');
				const data = (await res.json()) as { items?: NewsHeadline[] };
				const items = Array.isArray(data.items) ? data.items : [];
				setNewsHeadlines(items);
				setNewsLoading(false);
			} catch (err) {
				if (controller.signal.aborted) return;
				console.warn('news headlines fetch failed', err);
				setNewsError('Unable to load news headlines right now.');
				setNewsHeadlines([]);
				setNewsLoading(false);
			}
		};

		void loadHeadlines();
		return () => controller.abort();
	}, [fuelPack]);

	const ensureAudioContext = useCallback(() => {
		if (typeof window === 'undefined') return null;
		const ctor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!ctor) return null;
		if (!audioContextRef.current) {
			audioContextRef.current = new ctor();
		}
		return audioContextRef.current;
	}, [audioContextRef]);

	const playCue = useCallback(
		(type: 'generate' | 'save') => {
			const ctx = ensureAudioContext();
			if (!ctx) return;
			if (ctx.state === 'suspended') {
				void ctx.resume().catch(() => undefined);
			}
			const now = ctx.currentTime;
			const primaryOsc = ctx.createOscillator();
			const primaryGain = ctx.createGain();
			primaryOsc.type = 'sine';
			primaryOsc.frequency.setValueAtTime(type === 'generate' ? 660 : 420, now);
			primaryGain.gain.setValueAtTime(0, now);
			primaryGain.gain.linearRampToValueAtTime(type === 'generate' ? 0.16 : 0.12, now + 0.02);
			const decayTime = type === 'generate' ? 0.45 : 0.35;
			primaryGain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);
			primaryOsc.connect(primaryGain);
			primaryGain.connect(ctx.destination);
			primaryOsc.start(now);
			primaryOsc.stop(now + decayTime);
			if (type === 'save') {
				const secondaryOsc = ctx.createOscillator();
				const secondaryGain = ctx.createGain();
				secondaryOsc.type = 'sine';
				secondaryOsc.frequency.setValueAtTime(540, now + 0.2);
				secondaryGain.gain.setValueAtTime(0, now + 0.2);
				secondaryGain.gain.linearRampToValueAtTime(0.1, now + 0.25);
				secondaryGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
				secondaryOsc.connect(secondaryGain);
				secondaryGain.connect(ctx.destination);
				secondaryOsc.start(now + 0.2);
				secondaryOsc.stop(now + 0.55);
			}
		},
		[ensureAudioContext]
	);

	const markDailyChallengeComplete = useCallback(() => {
		if (challengeCompletedToday) return;
		setChallengeCompletedToday(true);
		setDailyChallengeStored((prev) => {
			const updated: StoredDailyChallenge = {
				...prev,
				streak: prev.streak + 1,
				completed: true
			};
			persistDailyChallengeState(updated);
			setDailyChallenge((current) => ({
				...current,
				streakCount: updated.streak
			}));
			return updated;
		});
	}, [challengeCompletedToday]);


	const handleDismissOnboarding = useCallback(() => {
		setShowOnboarding(false);
		if (typeof window !== 'undefined') {
			window.localStorage.setItem(ONBOARDING_KEY, 'true');
		}
	}, []);

	const handleModeCardParallax = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
		const target = event.currentTarget;
		const rect = target.getBoundingClientRect();
		const pointerX = event.clientX - rect.left;
		const pointerY = event.clientY - rect.top;
		const centeredX = pointerX / rect.width - 0.5;
		const centeredY = pointerY / rect.height - 0.5;
		const rotateX = (centeredY * -1) * 16;
		const rotateY = centeredX * 18;
		target.style.setProperty('--tilt-x', `${rotateX}deg`);
		target.style.setProperty('--tilt-y', `${rotateY}deg`);
		target.style.setProperty('--glow-x', `${pointerX}px`);
		target.style.setProperty('--glow-y', `${pointerY}px`);
		target.classList.add('hovering');
	}, []);

	const handleModeCardLeave = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
		const target = event.currentTarget;
		target.style.removeProperty('--tilt-x');
		target.style.removeProperty('--tilt-y');
		target.style.removeProperty('--glow-x');
		target.style.removeProperty('--glow-y');
		target.classList.remove('hovering');
	}, []);

	const toggleWorkspaceControls = useCallback(() => {
		setControlsCollapsed((prev) => {
			const next = !prev;
			if (typeof window !== 'undefined') {
				window.localStorage.setItem(CONTROLS_COLLAPSED_KEY, next ? 'true' : 'false');
			}
			return next;
		});
	}, []);

	const toggleQueueCollapsed = useCallback(() => {
		setQueueCollapsed((prev) => !prev);
	}, []);

	const handleAutoRefreshSelect = useCallback((interval: number | null) => {
		setAutoRefreshMs((current) => {
			if (interval === null) return null;
			return current === interval ? null : interval;
		});
	}, []);

	const handleFocusModeToggle = useCallback(() => {
		setFocusModeType('single');
		setFocusMode((prev) => !prev);
	}, []);

	const handleBackToPackList = useCallback(() => {
		setExpandedCard(null);
		setFocusMode(false);
	}, []);

	const handleCollaborationModeToggle = useCallback(
		(next: 'live' | 'collaborative') => {
			setCollaborationMode((current) => (current === next ? 'solo' : next));
			setViewerMode('idle');
			setSelectedSessionId(null);
		},
		[]
	);

	const handleSpectateSession = useCallback((sessionId: string) => {
		const targetSession = activeSessions.find((session) => session.id === sessionId);
		if (!targetSession) return;
		setSelectedSessionId(sessionId);
		setViewerMode('spectating');
		setCollaborationMode('solo');
		setMode(targetSession.mode);
		setSubmode(targetSession.submode);
		setFuelPack(null);
		setExpandedCard(null);
		setStatus(`Spectating ${targetSession.owner}'s ${targetSession.title}`);
	}, [activeSessions]);

	const handleJoinSession = useCallback((sessionId: string) => {
		const targetSession = activeSessions.find((session) => session.id === sessionId);
		if (!targetSession) return;
		setSelectedSessionId(sessionId);
		setViewerMode('joining');
		setCollaborationMode('collaborative');
		setMode(targetSession.mode);
		setSubmode(targetSession.submode);
		setFuelPack(null);
		setExpandedCard(null);
		setStatus(`Joined ${targetSession.owner} in ${targetSession.title}`);
	}, [activeSessions]);

	const handleLeaveViewerMode = useCallback(() => {
		setSelectedSessionId(null);
		setViewerMode('idle');
	}, []);

	const handleCardDragStart = useCallback(
		(cardId: string) => (event: ReactDragEvent<HTMLButtonElement>) => {
			dragSourceRef.current = cardId;
			setDraggedCardId(cardId);
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', cardId);
		},
		[]
	);

	const handleCardDragEnter = useCallback(
		(targetId: string) => (event: ReactDragEvent<HTMLButtonElement>) => {
			event.preventDefault();
			const sourceId = dragSourceRef.current;
			if (!sourceId || sourceId === targetId) return;
			setDeckOrder((current) => {
				const next = [...current];
				const sourceIndex = next.indexOf(sourceId);
				const targetIndex = next.indexOf(targetId);
				if (sourceIndex === -1 || targetIndex === -1) return current;
				next.splice(sourceIndex, 1);
				next.splice(targetIndex, 0, sourceId);
				return next;
			});
		},
		[]
	);

	const handleCardDragOver = useCallback((event: ReactDragEvent<HTMLButtonElement>) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
	}, []);

	const handleCardDragEnd = useCallback(() => {
		dragSourceRef.current = null;
		setDraggedCardId(null);
	}, []);

	const setPack = useCallback(
		(pack: InspireAnyPack, message?: string) => {
			setFuelPack(pack);
			if (isModePack(pack)) {
				setMode(pack.mode);
				setSubmode(pack.submode);
				if (pack.mode === 'lyricist') setGenre(pack.genre);
			}
			setPackAnimationKey(Date.now());
			setExpandedCard(null);
			setDeckOrder([]);
			setDraggedCardId(null);
			if (isModePack(pack)) {
				setWorkspaceQueue(buildWorkspaceQueue(pack));
				playCue('generate');
			} else {
				setWorkspaceQueue([]);
			}
			if (message) setStatus(message);
		},
		[setFuelPack, setPackAnimationKey, setExpandedCard, setDeckOrder, setDraggedCardId, setWorkspaceQueue, playCue, setStatus]
	);

	const requestModePack = useCallback(
		async (overrides?: { modeId?: CreativeMode; submodeId?: string; filters?: RelevanceFilter; genre?: string }) => {
			const targetMode = overrides?.modeId ?? mode;
			const targetSubmode = overrides?.submodeId ?? submode;
			const targetFilters = overrides?.filters ?? filters;
			const targetGenre = overrides?.genre ?? genre;
			if (!targetMode || !targetSubmode) throw new Error('Pick a studio and lane first.');
			const payload: ModePackRequest = { submode: targetSubmode, filters: targetFilters };
			if (targetMode === 'lyricist') payload.genre = targetGenre;
			const res = await fetch(`/api/modes/${targetMode}/fuel-pack`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) throw new Error('Generator not responding');
			const data = await res.json();
			return data.pack as ModePack;
		},
		[mode, submode, filters, genre]
	);

	const registerPackGenerated = useCallback((pack: InspireAnyPack, activeFilters: RelevanceFilter) => {
		if (!isModePack(pack)) return;
		setCreatorStats((prev) => {
			const now = new Date();
			let streak = 1;
			if (prev.lastGeneratedISO) {
				const last = new Date(prev.lastGeneratedISO);
				const diffDays = Math.floor((now.getTime() - last.getTime()) / 86400000);
				if (diffDays === 0) {
					streak = prev.streak || 1;
				} else if (diffDays === 1) {
					streak = prev.streak + 1;
				} else {
					streak = 1;
				}
			}
			const toneCounts = {
				...prev.toneCounts,
				[activeFilters.tone]: (prev.toneCounts[activeFilters.tone] ?? 0) + 1
			};
			const wildCount = prev.wildCount + (activeFilters.semantic === 'wild' ? 1 : 0);
			const totalGenerated = prev.totalGenerated + 1;
			const achievements = new Set(prev.achievements);
			if (totalGenerated >= 5) achievements.add('5 Packs Deep');
			if (wildCount >= 5) achievements.add('5 Wild Packs Created');
			if (streak >= 3) achievements.add('Creative Streak ⚡️');
			return {
				...prev,
				totalGenerated,
				wildCount,
				streak,
				lastGeneratedISO: now.toISOString(),
				lastMode: pack.mode,
				toneCounts,
				favoriteTone: computeFavoriteTone(toneCounts),
				achievements: Array.from(achievements)
			};
		});
		markDailyChallengeComplete();
	}, [markDailyChallengeComplete]);

	const handleModeSelect = useCallback(
		(nextMode: CreativeMode) => {
			handleDismissOnboarding();
			setMode(nextMode);
			setSubmode(null);
			setFuelPack(null);
			setStatus(null);
			setFilters(DEFAULT_FILTERS);
			setExpandedCard(null);
			setShowModePicker(false);
			if (nextMode !== 'lyricist') {
				setGenre('r&b');
			}
		},
		[handleDismissOnboarding]
	);

	const handleSubmodeSelect = useCallback((nextSubmode: string) => {
		setSubmode(nextSubmode);
		setFuelPack(null);
		setStatus(null);
		setExpandedCard(null);
	}, []);

	const handleBackToModes = useCallback(() => {
		setMode(null);
		setSubmode(null);
		setFuelPack(null);
		setStatus(null);
		setFilters(DEFAULT_FILTERS);
		setExpandedCard(null);
		setShowSettingsOverlay(false);
		setShowAccountModal(false);
		setCollaborationMode('solo');
		setSelectedSessionId(null);
		setViewerMode('idle');
		setDeckOrder([]);
		setDraggedCardId(null);
		setShowModePicker(false);
		dragSourceRef.current = null;
	}, []);

	const handleGeneratePack = useCallback(async () => {
		if (!mode || !submode) {
			setError('Pick a studio to spin up a pack.');
			return;
		}
		setLoading('generate');
		setError(null);
		try {
			const pack = await requestModePack();
			setPack(pack, 'New pack ready ✨');
			registerPackGenerated(pack, filters);
		} catch (err) {
			console.error(err);
			setError(err instanceof Error ? err.message : 'Could not generate pack');
		} finally {
			setLoading(null);
		}
	}, [mode, submode, filters, requestModePack, setPack, registerPackGenerated]);

	const handleRemixPack = useCallback(async () => {
		if (!mode || !submode) {
			await handleGeneratePack();
			return;
		}
		if (!isModePack(fuelPack)) {
			await handleGeneratePack();
			return;
		}
		setLoading('remix');
		setError(null);
		try {
			const fresh = await requestModePack();
			const remixed = createRemixPack(fuelPack as ModePack, fresh);
			setPack(remixed, 'Remix spark ready 🔁');
			registerPackGenerated(remixed, filters);
		} catch (err) {
			console.error(err);
			setError(err instanceof Error ? err.message : 'Remix attempt failed');
		} finally {
			setLoading(null);
		}
	}, [mode, submode, fuelPack, requestModePack, setPack, registerPackGenerated, filters, handleGeneratePack]);

	const handleAddWordToPack = useCallback((word: string) => {
		const trimmed = word.trim();
		if (!trimmed) return;
		setFuelPack((current) => {
			if (!current || !isLyricistPack(current)) return current;
			const nextWords = Array.from(new Set([trimmed, ...current.powerWords])).slice(0, 8);
			return { ...current, powerWords: nextWords } as InspireAnyPack;
		});
	}, []);

	const handleCustomWordSubmit = useCallback(() => {
		if (!customWordInput.trim()) return;
		handleAddWordToPack(customWordInput.trim());
		setCustomWordInput('');
	}, [customWordInput, handleAddWordToPack]);

	const handleForkCommunityPost = useCallback(
		(post: CommunityPost) => {
			const sourcePack = post.featuredPack;
			if (!sourcePack || !isModePack(sourcePack)) return;
			const lineageEntry: RemixMeta = {
				author: sourcePack.author ?? post.author,
				packId: sourcePack.id,
				generation: (sourcePack.remixOf?.generation ?? 0) + 1
			};
			const forkedPack: ModePack = {
				...sourcePack,
				id: `${sourcePack.id}-fork-${Math.random().toString(36).slice(2, 8)}`,
				timestamp: Date.now(),
				author: userId,
				remixOf: { author: sourcePack.author ?? post.author, packId: sourcePack.id, generation: lineageEntry.generation },
				remixLineage: [...(sourcePack.remixLineage ?? []), lineageEntry]
			};
			setPack(forkedPack, `Remixed from ${sourcePack.author ?? post.author}`);
			setMode(forkedPack.mode);
			setSubmode(forkedPack.submode);
			setShowCommunityOverlay(false);
			if (forkedPack.mode === 'lyricist') setGenre(forkedPack.genre);
		},
		[userId, setPack, setMode, setSubmode, setGenre]
	);

	const handleDailyChallengeComplete = useCallback(() => {
		if (challengeCompletedToday) return;
		markDailyChallengeComplete();
		setStatus('Daily challenge cleared ✅');
	}, [challengeCompletedToday, markDailyChallengeComplete]);

	const handleChallengeCompleteAndClose = useCallback(() => {
		handleDailyChallengeComplete();
		setShowChallengeOverlay(false);
	}, [handleDailyChallengeComplete]);

	const fetchChallengeActivity = useCallback(async () => {
		try {
			const res = await fetch('/api/challenges/activity');
			if (!res.ok) throw new Error('Failed to load activity');
			const payload = (await res.json()) as { activity?: ChallengeActivity[] };
			const items = Array.isArray(payload.activity) ? payload.activity : [];
			setChallengeActivity(items);
			setChallengeActivityError(items.length ? null : 'No recent submissions yet.');
		} catch (err) {
			console.warn('Failed to fetch challenge activity', err);
			setChallengeActivity([]);
			setChallengeActivityError('Unable to load recent activity.');
		}
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const timer = window.setInterval(() => {
			const todayId = getTodayId();
			setDailyChallengeStored((prev) => {
				if (prev.dayId === todayId) return prev;
				const nextState = computeDailyChallengeState(prev);
				setDailyChallenge(nextState.challenge);
				setChallengeCompletedToday(nextState.stored.completed);
				persistDailyChallengeState(nextState.stored);
				return nextState.stored;
			});
		}, 60_000);
		return () => window.clearInterval(timer);
	}, [setDailyChallengeStored, setDailyChallenge, setChallengeCompletedToday]);

	useEffect(() => {
		void fetchChallengeActivity();
	}, [fetchChallengeActivity]);

	useEffect(() => {
		// Load a fresh inspiration image per pack
		if (!isModePack(fuelPack)) {
			setInspirationImageUrl(null);
			return;
		}
		const controller = new AbortController();
		(async () => {
			try {
				const q = fuelPack.title || fuelPack.mode;
				const res = await fetch(`/api/images/random?query=${encodeURIComponent(q)}`, { signal: controller.signal });
				if (!res.ok) return;
				const data = await res.json();
				const url = data?.image?.urls?.regular || data?.image?.urls?.small || null;
				setInspirationImageUrl(url);
			} catch (_) {
				/* ignore */
			}
		})();
		return () => controller.abort();
	}, [fuelPack]);

	const refreshInspirationImage = useCallback(async () => {
		if (!isModePack(fuelPack)) return;
		try {
			setInspirationImageLoading(true);
			const q = fuelPack.title || fuelPack.mode;
			const res = await fetch(`/api/images/random?query=${encodeURIComponent(q)}`);
			if (!res.ok) return;
			const data = await res.json();
			const url = data?.image?.urls?.regular || data?.image?.urls?.small || null;
			setInspirationImageUrl(url);
		} catch (_) {
			// ignore
		} finally {
			setInspirationImageLoading(false);
		}
	}, [fuelPack]);

	useEffect(() => {
		if (!showChallengeOverlay) return;
		void fetchChallengeActivity();
	}, [showChallengeOverlay, fetchChallengeActivity]);

	const handleLoadById = useCallback(async () => {
		const target = lookupId.trim();
		if (!target) return;
		setLoading('load');
		setError(null);
		try {
			const res = await fetch(`/api/packs/${encodeURIComponent(target)}`);
			if (!res.ok) throw new Error('Pack not found');
			const data = await res.json();
			setPack(data, 'Loaded from the archive');
			if (isModePack(data)) {
				setMode(data.mode);
				setSubmode(data.submode);
				if (isLyricistPack(data)) setGenre(data.genre);
			}
		} catch (err) {
			console.error(err);
			setError(err instanceof Error ? err.message : 'Unable to load that pack');
		} finally {
			setLoading(null);
		}
	}, [lookupId, setPack]);

	const handleSharePack = useCallback(
		async (pack: InspireAnyPack | null) => {
			if (!pack) return;
			const encoded = encodePack(pack);
			const shareUrl = typeof window !== 'undefined' && encoded ? `${window.location.origin}${window.location.pathname}?${SHARE_PARAM}=${encoded}` : '';
			const shareText = shareUrl ? `${formatShareText(pack, userId)}\n${shareUrl}` : formatShareText(pack, userId);
			if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
				setError('Clipboard not available. Try copying manually.');
				return;
			}
			try {
				await navigator.clipboard.writeText(shareText);
				playCue('save');
				setStatus('Share link copied 🔗');
			} catch (err) {
				console.error(err);
				setError('Clipboard permission denied. Try selecting manually.');
			}
		},
		[userId, playCue]
	);

	const handleUserHandleClick = useCallback(() => {
		if (isAuthenticated) {
			if (typeof window !== 'undefined') {
				window.location.assign('/dashboard');
			}
			return;
		}
		setShowAccountModal(true);
	}, [isAuthenticated, setShowAccountModal]);

	const handleUserIdChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setUserId(event.target.value.slice(0, 32));
	}, []);

	const handleUserIdBlur = useCallback(() => {
		setUserId((current) => {
			const trimmed = current.trim();
			if (!trimmed) return loadStoredUserId();
			return trimmed;
		});
	}, []);

	const handleUserIdKey = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			event.currentTarget.blur();
		}
	}, []);

	const handleThemeChange = useCallback((value: string) => {
		setTheme(value);
		if (typeof window !== 'undefined') {
			window.localStorage.setItem(THEME_KEY, value);
		}
	}, []);

	const packDeck = useMemo<DeckCard[]>(() => {
		if (!fuelPack || !isModePack(fuelPack)) return [];
		const renderInteractiveText = (text: string) => {
			if (!focusMode) return text;
			const words = text.split(/\s+/);
			return (
				<span className="focus-line">
					{words.map((word, index) => (
						<span key={`${word}-${index}`} className="focus-word">
							{word}
							{index < words.length - 1 ? ' ' : ''}
						</span>
					))}
				</span>
			);
		};

		const buildMemeCard = (): DeckCard | null => {
			if (memeStimuli.length === 0 && !memeStimuliError) {
				return {
					id: 'meme-stimuli',
					label: 'Meme Stimuli',
					preview: 'Loading meme templates…',
					detail: <p className="hint">Fetching pre-existing meme templates for this pack.</p>
				};
			}
			if (memeStimuliError) {
				return {
					id: 'meme-stimuli',
					label: 'Meme Stimuli',
					preview: memeStimuliError,
					detail: <p className="error">{memeStimuliError}</p>
				};
			}
			if (!memeStimuli.length) return null;
			const preview = memeStimuli
				.map((meme) => meme.name)
				.slice(0, 3)
				.join(' · ');
			return {
				id: 'meme-stimuli',
				label: 'Meme Stimuli',
				preview: preview || 'Meme templates',
				detail: (
					<div className="meme-stimuli-grid">
						{memeStimuli.map((meme) => (
							<a key={meme.id} className="meme-thumb" href={meme.url} target="_blank" rel="noreferrer">
								<img src={meme.url} alt={meme.name} loading="lazy" />
								<span>{meme.name}</span>
							</a>
						))}
					</div>
				)
			};
		};

		if (isLyricistPack(fuelPack)) {
			const lyricistCards = [
				{
					id: 'word-explorer',
					label: 'Word Explorer',
					preview: fuelPack.powerWords.slice(0, 3).join(' · '),
					detail: (
						<div className="word-explorer-panel">
							<div className="word-grid">
								{fuelPack.powerWords.map((word, index) => (
									<button key={word} type="button" className="word-chip interactive" onClick={() => setChipPicker({ type: 'powerWord', index })}>
										{word}
									</button>
								))}
							</div>
							<div className="word-explorer-actions">
								<input
									type="text"
									placeholder="Add custom word"
									value={customWordInput}
									onChange={(e) => setCustomWordInput(e.target.value)}
									onKeyDown={(e) => { if (e.key === 'Enter') handleCustomWordSubmit(); }}
								/>
								<button type="button" className="btn micro" onClick={handleCustomWordSubmit}>Add</button>
								<button type="button" className="btn tertiary micro" onClick={() => setShowWordExplorer(true)}>Open Word Explorer</button>
							</div>
						</div>
					)
				} as DeckCard,
				{
					id: 'story-arc',
					label: 'Story Arc',
					preview: `${fuelPack.storyArc.start} → ${fuelPack.storyArc.end}`,
					detail: (
						<div className="arc-track">
							<span>{fuelPack.storyArc.start}</span>
							<span className="arc-arrow">→</span>
							<span>{fuelPack.storyArc.middle}</span>
							<span className="arc-arrow">→</span>
							<span>{fuelPack.storyArc.end}</span>
						</div>
					)
				} as DeckCard,
				{
					id: 'headline',
					label: 'Live Headline',
					preview: fuelPack.newsPrompt.headline,
					detail: (
						<div className="card-detail-copy">
							<div className="headline-row">
								<p className="headline">{fuelPack.newsPrompt.headline}</p>
								<button type="button" className="btn micro tertiary" onClick={() => setChipPicker({ type: 'headline' })}>Swap</button>
							</div>
							<p>{fuelPack.newsPrompt.context}</p>
							<small>{fuelPack.newsPrompt.source}</small>
						</div>
					)
				} as DeckCard,
				{
					id: 'flow-prompts',
					label: 'Flow Prompts',
					preview: fuelPack.flowPrompts[0] ?? 'Switch cadence & bounce',
					detail: (
						<ul className="focus-list">
							{fuelPack.flowPrompts.map((prompt) => (
								<li key={prompt}>{renderInteractiveText(prompt)}</li>
							))}
						</ul>
					)
				} as DeckCard,
				{
					id: 'challenge',
					label: 'Prompt Challenge',
					preview: fuelPack.topicChallenge,
					detail: (
						<div className="card-detail-copy">
							<p>{fuelPack.topicChallenge}</p>
							<p className="chord">Chord mood: {fuelPack.chordMood}</p>
						</div>
					)
				} as DeckCard,
				{
					id: 'fragments',
					label: 'Lyric Fragments',
					preview: fuelPack.lyricFragments[0] ?? 'Sketch a new line',
					detail: (
						<ul className="focus-list">
							{fuelPack.lyricFragments.map((fragment) => (
								<li key={fragment}>{renderInteractiveText(fragment)}</li>
							))}
						</ul>
					)
				} as DeckCard,
				inspirationImageUrl ? ({
					id: 'inspire-image',
					label: 'Inspiration Image',
					preview: 'Visual spark loaded',
					detail: (
						<div className="image-wrap">
							<img src={inspirationImageUrl} alt="Inspiration" style={{ maxWidth: '100%', borderRadius: 8 }} />
							<div style={{ marginTop: 8 }}>
								<button type="button" className="btn micro" onClick={refreshInspirationImage} disabled={inspirationImageLoading}>
									{inspirationImageLoading ? 'Refreshing…' : 'Refresh image'}
								</button>
							</div>
						</div>
					)
				} as DeckCard) : null,
				buildMemeCard() as DeckCard | null
			].filter(Boolean) as DeckCard[];
			return lyricistCards;
		}

		if (isProducerPack(fuelPack)) {
			const constraints = fuelPack.constraints ?? [];
			const fxIdeas = fuelPack.fxIdeas ?? [];
			const palette = fuelPack.instrumentPalette ?? [];
			const sample = fuelPack.sample ?? { title: 'Sample unavailable', source: 'Inspire', tags: [] } as any;
			const videoSnippet = fuelPack.videoSnippet ?? { title: 'Visual cue', description: 'Build tension visually.' } as any;
			const challenge = fuelPack.challenge ?? 'Flip the palette into something new.';
			const previewFx = fxIdeas.length ? fxIdeas.slice(0, 2).join(' · ') : 'No FX ideas available';
			const previewPalette = palette.length ? palette.slice(0, 3).join(' · ') : 'Palette warming up';
			const producerCards = [
				{
					id: 'main-sample',
					label: 'Main Sample',
					preview: `${sample.title} • ${sample.source}`,
					detail: (
						<div className="card-detail-copy">
							<p>{sample.title}</p>
							<p>{sample.source}</p>
							<div className="tags">
								{sample.tags?.map((tag: string) => (
									<span key={tag} className="tag">{tag}</span>
								))}
							</div>
						</div>
					)
				} as DeckCard,
				{
					id: 'constraints',
					label: 'Constraints',
					preview: constraints[0] ?? 'Flip the arrangement',
					detail: (
						<ul>
							{constraints.map((constraint) => (
								<li key={constraint}>{constraint}</li>
							))}
						</ul>
					)
				} as DeckCard,
				{
					id: 'fx-ideas',
					label: 'FX Ideas',
					preview: previewFx,
					detail: (
						<ul className="fx-grid">
							{fxIdeas.map((idea) => (
								<li key={idea}>{idea}</li>
							))}
						</ul>
					)
				} as DeckCard,
				{
					id: 'palette',
					label: 'Instrument Palette',
					preview: previewPalette,
					detail: (
						<ul>
							{palette.map((item, index) => (
								<li key={item}>
									<button type="button" className="chip micro" onClick={() => setChipPicker({ type: 'instrument', index })}>
										{item}
									</button>
								</li>
							))}
						</ul>
					)
				} as DeckCard,
				{
					id: 'video-cue',
					label: 'Visual Cue',
					preview: videoSnippet.title ?? 'Visual cue',
					detail: (
						<div className="card-detail-copy">
							<p>{videoSnippet.title}</p>
							<p>{videoSnippet.description}</p>
						</div>
					)
				} as DeckCard,
				{
					id: 'challenge',
					label: 'Build Challenge',
					preview: challenge,
					detail: <p>{challenge}</p>
				} as DeckCard,
				inspirationImageUrl ? ({
					id: 'inspire-image',
					label: 'Inspiration Image',
					preview: 'Visual spark loaded',
					detail: (
						<div className="image-wrap">
							<img src={inspirationImageUrl} alt="Inspiration" style={{ maxWidth: '100%', borderRadius: 8 }} />
							<div style={{ marginTop: 8 }}>
								<button type="button" className="btn micro" onClick={refreshInspirationImage} disabled={inspirationImageLoading}>
									{inspirationImageLoading ? 'Refreshing…' : 'Refresh image'}
								</button>
							</div>
						</div>
					)
				} as DeckCard) : null,
				buildMemeCard() as DeckCard | null
			].filter(Boolean) as DeckCard[];
			return producerCards;
		}

		if (isEditorPack(fuelPack)) {
			const moodboard = fuelPack.moodboard ?? [];
			const audioPrompts = fuelPack.audioPrompts ?? [];
			const timelineBeats = fuelPack.timelineBeats ?? [];
			const visualConstraints = fuelPack.visualConstraints ?? [];
			const challenge = fuelPack.challenge ?? 'Cut a sequence that bends expectations.';
			const titlePrompt = fuelPack.titlePrompt ?? 'Craft a title that surprises the viewer.';
			const editorCards = [
				{
					id: 'moodboard',
					label: 'Moodboard Clips',
					preview: moodboard.map((clip) => clip.title).slice(0, 2).join(' · ') || 'Moodboard forming',
					detail: (
						<div className="clip-grid">
							{moodboard.map((clip) => (
								<div key={clip.title} className="clip-card">
									<strong>{clip.title}</strong>
									<span>{clip.description}</span>
								</div>
							))}
						</div>
					)
				} as DeckCard,
				{
					id: 'audio-prompts',
					label: 'Audio Prompts',
					preview: audioPrompts.map((prompt) => prompt.name).slice(0, 3).join(' · ') || 'Audio prompts loading',
					detail: (
						<div className="word-grid">
							{audioPrompts.map((prompt) => (
								<span key={prompt.name} className="word-chip">{prompt.name}</span>
							))}
						</div>
					)
				} as DeckCard,
				{
					id: 'timeline',
					label: 'Timeline Beats',
					preview: timelineBeats.slice(0, 2).join(' · ') || 'Timeline forming',
					detail: (
						<ul>
							{timelineBeats.map((beat) => (
								<li key={beat}>{beat}</li>
							))}
						</ul>
					)
				} as DeckCard,
				{
					id: 'constraints',
					label: 'Visual Constraints',
					preview: visualConstraints.slice(0, 2).join(' · ') || 'Visual constraints incoming',
					detail: (
						<ul>
							{visualConstraints.map((constraint) => (
								<li key={constraint}>{constraint}</li>
							))}
						</ul>
					)
				} as DeckCard,
				{
					id: 'challenge',
					label: 'Director Challenge',
					preview: challenge,
					detail: (
						<div className="card-detail-copy">
							<p>{challenge}</p>
							<p className="title-prompt">Title prompt: {titlePrompt}</p>
						</div>
					)
				} as DeckCard,
				inspirationImageUrl ? ({
					id: 'inspire-image',
					label: 'Inspiration Image',
					preview: 'Visual spark loaded',
					detail: (
						<div className="image-wrap">
							<img src={inspirationImageUrl} alt="Inspiration" style={{ maxWidth: '100%', borderRadius: 8 }} />
							<div style={{ marginTop: 8 }}>
								<button type="button" className="btn micro" onClick={refreshInspirationImage} disabled={inspirationImageLoading}>
									{inspirationImageLoading ? 'Refreshing…' : 'Refresh image'}
								</button>
							</div>
						</div>
					)
				} as DeckCard) : null,
				buildMemeCard() as DeckCard | null
			].filter(Boolean) as DeckCard[];
			return editorCards;
		}

		return [];
	}, [fuelPack, focusMode, memeStimuli, memeStimuliError, inspirationImageUrl, inspirationImageLoading]);

	useEffect(() => {
		if (!packDeck.length) {
			setDeckOrder([]);
			return;
		}
		setDeckOrder((current) => {
			const next = packDeck.map((card) => card.id);
			if (current.length === next.length && current.every((id) => next.includes(id))) {
				return current;
			}
			return next;
		});
	}, [packDeck]);

	const orderedPackDeck = useMemo(() => {
		if (!deckOrder.length) return packDeck;
		const orderMap = new Map(deckOrder.map((id, index) => [id, index]));
		return [...packDeck].sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
	}, [deckOrder, packDeck]);

	const selectedCard = orderedPackDeck.find((card) => card.id === expandedCard) ?? null;
	const showingDetail = Boolean(selectedCard);
	const handleMixerDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'copy';
		}
		setMixerHover(true);
	}, []);

	const handleMixerDragLeave = useCallback(() => {
		setMixerHover(false);
	}, []);

	const handleMixerDrop = useCallback(
		(event: ReactDragEvent<HTMLDivElement>) => {
			event.preventDefault();
			setMixerHover(false);
			const cardId = event.dataTransfer.getData('text/plain') || dragSourceRef.current;
			if (!cardId) return;
			const card = orderedPackDeck.find((entry) => entry.id === cardId);
			if (!card) return;
			setCombinedFocusCardIds((current) => (current.includes(card.id) ? current : [...current, card.id]));
		},
		[orderedPackDeck]
	);


		useEffect(() => {
			if (!focusMode) return;
			if (!selectedCard && orderedPackDeck.length) {
				setExpandedCard(orderedPackDeck[0].id);
			}
			const onKeyDown = (event: globalThis.KeyboardEvent) => {
				if (event.key === 'Escape') {
					setFocusMode(false);
					setFocusModeType('single');
					setExpandedCard(null);
				}
			};
			window.addEventListener('keydown', onKeyDown);
			return () => window.removeEventListener('keydown', onKeyDown);
		}, [focusMode, selectedCard, orderedPackDeck]);

	useEffect(() => {
		if (typeof window !== 'undefined') {
			window.localStorage.setItem('inspire:userId', userId);
		}
	}, [userId]);

	useEffect(() => {
		persistCreatorStats(userId, creatorStats);
	}, [creatorStats, userId]);

	useEffect(() => {
		setCreatorStats(loadCreatorStats(userId));
	}, [userId]);

	useEffect(() => {
		if (!status) return;
		const timeout = window.setTimeout(() => setStatus(null), 2600);
		return () => window.clearTimeout(timeout);
	}, [status]);

	useEffect(() => {
		if (!error) return;
		const timeout = window.setTimeout(() => setError(null), 4000);
		return () => window.clearTimeout(timeout);
	}, [error]);

	useEffect(() => {
		if (!autoRefreshMs || !mode || !submode) return;
		const refreshTimer = window.setInterval(() => {
			void handleGeneratePack();
		}, autoRefreshMs);
		return () => window.clearInterval(refreshTimer);
	}, [autoRefreshMs, mode, submode, handleGeneratePack]);

	useEffect(() => {
		async function loadModes() {
			try {
				const res = await fetch('/api/modes');
				if (!res.ok) throw new Error('Failed to fetch modes');
				const data = await res.json();
				if (Array.isArray(data.modes)) {
					setModeDefinitions(data.modes);
				}
			} catch (err) {
				console.error(err);
			}
		}
		void loadModes();
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams(window.location.search);
		const encodedPack = params.get(SHARE_PARAM);
		if (!encodedPack) return;
		const shared = decodePack(encodedPack);
		if (!shared) return;
		setPack(shared, 'Loaded shared pack 🔗');
		if (isModePack(shared)) {
			setMode(shared.mode);
			setSubmode(shared.submode);
			if (isLyricistPack(shared)) setGenre(shared.genre);
		}
		handleDismissOnboarding();
		params.delete(SHARE_PARAM);
		const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash ?? ''}`;
		window.history.replaceState({}, '', nextUrl);
	}, [setPack, handleDismissOnboarding]);

	const formattedHandle = isAuthenticated ? (userId.startsWith('@') ? userId : `@${userId}`) : 'Sign up / Log in';
	const handleTriggerLabel = isAuthenticated ? 'Open creator dashboard' : 'Sign up or log in to Inspire';
	const appClassName = `app theme-${theme} ${mode ? MODE_BACKGROUNDS[mode] : 'mode-landing'}${mode ? ' has-mode' : ''}${focusMode ? ' focus-mode-active' : ''}${showingDetail ? ' detail-mode' : ''}`;
	const workspaceClassName = `mode-workspace${controlsCollapsed ? ' controls-collapsed' : ''}`;
	const fatalError = error && !loading;

	const handleSaveCurrentPack = useCallback(async () => {
		if (!fuelPack || !isModePack(fuelPack)) return;
		try {
			const res = await fetch(`/api/packs/${encodeURIComponent(fuelPack.id)}/save`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: userId || 'guest' })
			});
			if (!res.ok) throw new Error('Save failed');
			setStatus('Saved to your archive');
		} catch (err) {
			setError('Could not save pack');
		}
	}, [fuelPack, userId]);

	const openSavedOverlay = useCallback(async () => {
		setShowSavedOverlay(true);
		setSavedLoading(true);
		setSavedError(null);
		try {
			const qs = new URLSearchParams({ userId: userId || 'guest' });
			const res = await fetch(`/api/packs/saved?${qs.toString()}`);
			if (!res.ok) throw new Error('Failed to load saved packs');
			const data = await res.json();
			setSavedPacks(Array.isArray(data.packs) ? data.packs : []);
		} catch (err) {
			setSavedPacks([]);
			setSavedError('Unable to load saved packs');
		} finally {
			setSavedLoading(false);
		}
	}, [userId]);

	const runWordSearch = useCallback(async () => {
		setWordLoading(true);
		setWordError(null);
		try {
			const params = new URLSearchParams();
			if (wordStartsWith) params.set('startsWith', wordStartsWith);
			if (wordRhymeWith) params.set('rhymeWith', wordRhymeWith);
			if (wordSyllables) params.set('syllables', wordSyllables);
			if (wordMaxResults) params.set('maxResults', wordMaxResults);
			if (wordTopic) params.set('topic', wordTopic);
			const res = await fetch(`/api/words/search?${params.toString()}`);
			if (!res.ok) throw new Error('Search failed');
			const data = await res.json();
			setWordResults(Array.isArray(data.items) ? data.items : []);
		} catch (err) {
			setWordError('Unable to search words right now');
			setWordResults([]);
		} finally {
			setWordLoading(false);
		}
	}, [wordStartsWith, wordRhymeWith, wordSyllables, wordMaxResults, wordTopic]);

	const workspaceMainClassName = `workspace-main${isModePack(fuelPack) && workspaceQueue.length > 0 && !focusMode && !showingDetail ? ' with-queue' : ''}${focusMode || showingDetail ? ' detail-expanded' : ''}`;
	const controlsToggleLabel = controlsCollapsed ? 'Show Controls ▸' : 'Hide Controls ◂';
	const packStageClassName = `pack-stage glass${focusMode ? ' focus-mode' : ''}`;
	const headerChips = useMemo(() => {
		if (!fuelPack || !isModePack(fuelPack)) return [] as Array<{ label: string; type: 'headline' | 'powerWord' | 'instrument' | 'meme' | 'sample'; index?: number }>;
		if (isLyricistPack(fuelPack)) {
			return [
				{ label: fuelPack.newsPrompt.headline, type: 'headline' },
				{ label: fuelPack.powerWords[0] ?? 'Swap word', type: 'powerWord', index: 0 },
				{ label: memeStimuli[0]?.name ?? 'Swap meme', type: 'meme' }
			];
		}
		if (isProducerPack(fuelPack)) {
			return [
				{ label: fuelPack.sample?.title ?? 'Swap sample', type: 'sample' },
				{ label: fuelPack.instrumentPalette?.[0] ?? 'Swap instrument', type: 'instrument', index: 0 },
				{ label: memeStimuli[0]?.name ?? 'Swap meme', type: 'meme' }
			];
		}
		if (isEditorPack(fuelPack)) {
			return [] as Array<{ label: string; type: 'headline' | 'powerWord' | 'instrument' | 'meme' | 'sample'; index?: number }>;
		}
		return [] as Array<{ label: string; type: 'headline' | 'powerWord' | 'instrument' | 'meme' | 'sample'; index?: number }>;
	}, [fuelPack, memeStimuli]);
	const challengeText = useMemo(() => resolveChallengeText(fuelPack), [fuelPack]);
	const lyricistPack = isLyricistPack(fuelPack) ? fuelPack : null;
	const producerPack = isProducerPack(fuelPack) ? fuelPack : null;
	const editorPack = isEditorPack(fuelPack) ? fuelPack : null;
	const focusItems = useMemo(() => {
		const items: string[] = [];
		if (lyricistPack) {
			items.push(lyricistPack.newsPrompt.headline, ...lyricistPack.powerWords, ...lyricistPack.flowPrompts, ...lyricistPack.lyricFragments, lyricistPack.topicChallenge, lyricistPack.chordMood);
		}
		if (producerPack) {
			items.push(
				producerPack.sample?.title ?? producerPack.title,
				...(producerPack.instrumentPalette ?? []),
				...(producerPack.fxIdeas ?? []),
				...(producerPack.constraints ?? []),
				producerPack.challenge ?? ''
			);
		}
		if (editorPack) {
			items.push(
				...editorPack.moodboard.map((clip) => clip.title),
				...editorPack.audioPrompts.map((prompt) => prompt.name),
				...editorPack.timelineBeats,
				...editorPack.visualConstraints,
				editorPack.challenge
			);
		}
		if (memeStimuli.length) {
			items.push(...memeStimuli.map((meme) => meme.name));
		}
		if (combinedFocusCardIds.length && orderedPackDeck.length) {
			combinedFocusCardIds.forEach((id) => {
				const card = orderedPackDeck.find((entry) => entry.id === id);
				if (!card) return;
				items.unshift(card.label, card.preview);
			});
		}
		return Array.from(new Set(items.filter(Boolean)));
	}, [combinedFocusCardIds, editorPack, lyricistPack, memeStimuli, orderedPackDeck, producerPack]);
	const visibleFocusItems = useMemo(() => focusItems.slice(0, Math.max(focusDensity, 6)), [focusDensity, focusItems]);
	const focusSpeedMs = useMemo(() => Math.max(4, 24 / Math.max(0.35, focusSpeed)), [focusSpeed]);

	const HeadlineStream = ({ anchored = false, compact = false, forceActive = false }: { anchored?: boolean; compact?: boolean; forceActive?: boolean }) => {
		if (!visibleFocusItems.length) return null;
		const baseClass = `headline-stream ${(focusMode || forceActive) ? 'focus-active' : 'idle'} mode-${focusStyle}${anchored ? ' anchored' : ''}${compact ? ' compact' : ''}`;
		return (
			<div
				className={baseClass}
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
		);
	};

	const renderPackDetail = (inFocusOverlay: boolean) => {
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
								onClick={() => handleAutoRefreshSelect(interval)}
							>
								{interval < 1000 ? `${interval}ms` : `${interval / 1000}s`}
							</button>
						))}
						<button
							type="button"
							className={!autoRefreshMs ? 'chip active' : 'chip'}
							onClick={() => handleAutoRefreshSelect(null)}
						>
							Off
						</button>
					</div>
					<button
						type="button"
						className={`btn secondary focus-toggle${focusMode ? ' active' : ''}`}
						onClick={() => {
							if (!selectedCard && orderedPackDeck.length) {
								setExpandedCard(orderedPackDeck[0].id);
							}
							setFocusModeType('single');
							handleFocusModeToggle();
						}}
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
						<HeadlineStream anchored forceActive={inFocusOverlay} />
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
	};

	const chipOptions = useMemo(() => {
		if (!chipPicker) return [] as string[];
		if (chipPicker.type === 'powerWord' && lyricistPack) {
			return Array.from(new Set([...lyricistPack.powerWords, ...lyricistPack.flowPrompts, ...lyricistPack.lyricFragments]));
		}
		if (chipPicker.type === 'headline' && lyricistPack) {
			return Array.from(new Set([lyricistPack.newsPrompt.headline, lyricistPack.topicChallenge, ...lyricistPack.lyricFragments]));
		}
		if (chipPicker.type === 'instrument' && producerPack) {
			return Array.from(new Set([producerPack.sample?.title ?? producerPack.title, ...(producerPack.instrumentPalette ?? []), ...(producerPack.fxIdeas ?? [])]));
		}
		if (chipPicker.type === 'sample' && producerPack) {
			return Array.from(new Set([
				producerPack.sample?.title,
				producerPack.secondarySample?.title,
				...(producerPack.instrumentPalette ?? []),
				...(producerPack.constraints ?? [])
			].filter(Boolean) as string[]));
		}
		if (chipPicker.type === 'meme' && memeStimuli.length) {
			return Array.from(new Set(memeStimuli.map((meme) => meme.name)));
		}
		return [] as string[];
	}, [chipPicker, lyricistPack, memeStimuli, producerPack]);

	const closeChipPicker = useCallback(() => setChipPicker(null), []);

	const handleChipChoice = useCallback(
		(value: string) => {
			if (!chipPicker) return;
			setChipPicker(null);
			setFuelPack((current) => {
				if (!current || !isModePack(current)) return current;
				if (chipPicker.type === 'powerWord' && isLyricistPack(current) && typeof chipPicker.index === 'number') {
					const nextWords = [...current.powerWords];
					nextWords[chipPicker.index] = value;
					return { ...current, powerWords: nextWords, topicChallenge: current.topicChallenge ?? value } as InspireAnyPack;
				}
				if (chipPicker.type === 'headline' && isLyricistPack(current)) {
					return { ...current, newsPrompt: { ...current.newsPrompt, headline: value } } as InspireAnyPack;
				}
				if (chipPicker.type === 'instrument' && isProducerPack(current) && typeof chipPicker.index === 'number') {
					const nextPalette = [...(current.instrumentPalette ?? [])];
					nextPalette[chipPicker.index] = value;
					return { ...current, instrumentPalette: nextPalette, challenge: current.challenge ?? `Flip ${value}` } as InspireAnyPack;
				}
				if (chipPicker.type === 'sample' && isProducerPack(current)) {
					const nextSample = { ...(current.sample ?? { source: 'Inspire', url: '', tags: [], timeframe: current.filters.timeframe }), title: value };
					return { ...current, sample: nextSample, challenge: current.challenge ?? `Flip ${value}` } as InspireAnyPack;
				}
				return current;
			});
			if (chipPicker.type === 'meme' && value && memeStimuli.length) {
				setMemeStimuli((current) => {
					const next = [...current];
					const found = current.find((meme) => meme.name === value);
					if (found) {
						return [found, ...next.filter((entry) => entry.name !== found.name)];
					}
					return current;
				});
			}
		},
		[chipPicker, memeStimuli.length]
	);
	const heroMetaContent = (
		<>
			<div className="theme-switcher">
				<span className="label">Mood themes</span>
				<div className="theme-options">
					{THEME_OPTIONS.map((option) => (
						<button
							key={option.id}
							type="button"
							className={option.id === theme ? 'active' : ''}
							onClick={() => handleThemeChange(option.id)}
						>
							<span aria-hidden="true">{option.emoji}</span>
							{option.label}
						</button>
					))}
				</div>
			</div>
			<div className="creator-metrics">
				<div className="metric-card">
					<span className="metric-label">Daily streak</span>
					<span className="metric-value">{creatorStats.streak ?? 0}<span aria-hidden="true">🔥</span></span>
				</div>
				<div className="metric-card">
					<span className="metric-label">Packs generated</span>
					<span className="metric-value">{creatorStats.totalGenerated}</span>
				</div>
				<div className="metric-card">
					<span className="metric-label">Favorite tone</span>
					<span className="metric-value">{creatorStats.favoriteTone ?? '—'}</span>
				</div>
				<button type="button" className="metric-card challenge-card" onClick={() => setShowChallengeOverlay(true)}>
					<span className="metric-label">Daily challenge</span>
					<span className="metric-value">{challengeCountdown}</span>
					<span className="metric-meta">{challengeCompletedToday ? 'Completed ✅' : `Resets ${challengeResetLabel}`}</span>
					<span className="metric-meta hint">View progress →</span>
				</button>
			</div>
			<div className="achievements">
				<span className="label">Achievements</span>
				<div className="badge-row">
					{creatorStats.achievements.length === 0 && <span className="badge placeholder">Create packs to unlock badges</span>}
					{creatorStats.achievements.map((badge) => (
						<span key={badge} className="badge">{badge}</span>
					))}
				</div>
			</div>
		</>
	);

	return (
		<div className={appClassName}>
			{!mode && <MouseParticles particleCount={500} repelDistance={300} colors={['#ec4899', '#22d3ee', '#a855f7', '#8b5cf6', '#06b6d4', '#f472b6']} particleSize={2} />}
			<button
				type="button"
				className="user-handle"
				onClick={handleUserHandleClick}
				aria-label={handleTriggerLabel}
			>
				<span>{formattedHandle}</span>
				<span className="handle-indicator" aria-hidden="true">↗</span>
			</button>
			<div className="ambient orb-left" aria-hidden="true" />
			<div className="ambient orb-right" aria-hidden="true" />
			<div className="noise-overlay" aria-hidden="true" />

			{fatalError && (
				<div className="fatal-fallback glass" role="alert">
					<h2>Something went wrong</h2>
					<p>{error}</p>
					<div className="fatal-actions">
						<button type="button" className="btn" onClick={() => { setError(null); setFuelPack(null); setMode(null); setSubmode(null); setWorkspaceQueue([]); }}>
							Back to studios
						</button>
					</div>
				</div>
			)}

			{mode ? (
				<header className="top-nav glass">
					<div className="nav-left">
						<button className="back-button" type="button" onClick={handleBackToModes}>
							← Studios
						</button>
						<div className="nav-title-block">
							<h2>{activeModeDefinition ? `${activeModeDefinition.icon} ${activeModeDefinition.label}` : 'Creative Studio'}</h2>
							{(activeSubmodeDefinition || activeModeDefinition) && (
								<p>{activeSubmodeDefinition?.description ?? activeModeDefinition?.description}</p>
							)}
						</div>
					</div>
					<div className="nav-actions">
						<div className="actions-group" role="group" aria-label="Workspace actions">
							<button
								type="button"
								className="icon-button"
								title="Generate fuel pack"
								aria-label="Generate fuel pack"
								onClick={handleGeneratePack}
								disabled={loading === 'generate'}
							>
								⚡
							</button>
							<button
								type="button"
								className="icon-button"
								title="Remix current pack"
								aria-label="Remix current pack"
								onClick={handleRemixPack}
								disabled={loading === 'remix' || !fuelPack}
							>
								♻️
							</button>
							<button
								type="button"
								className="icon-button"
								title="Share pack link"
								aria-label="Share pack link"
								onClick={() => handleSharePack(fuelPack)}
								disabled={!fuelPack}
							>
								🔗
							</button>
							<button
								type="button"
								className="icon-button"
								title="Save to archive"
								aria-label="Save to archive"
								onClick={handleSaveCurrentPack}
								disabled={!fuelPack}
							>
								💾
							</button>
							<button
								type="button"
								className="icon-button"
								title="Open saved packs"
								aria-label="Open saved packs"
								onClick={openSavedOverlay}
							>
								📁
							</button>
							<button
								type="button"
								className="icon-button"
								title="Word Explorer"
								aria-label="Open Word Explorer"
								onClick={() => setShowWordExplorer(true)}
							>
								🔤
							</button>
							<button
								type="button"
								className="icon-button"
								title={controlsToggleLabel}
								aria-label={controlsToggleLabel}
								aria-pressed={!controlsCollapsed}
								aria-controls="workspaceControls"
								onClick={toggleWorkspaceControls}
							>
								🎛️
							</button>
							<button
								type="button"
								className="icon-button"
								title="Focus animation mode"
								aria-label="Focus animation mode"
								onClick={() => setFocusControlsOpen(true)}
							>
								🌐
							</button>
						</div>
						<button
							type="button"
							className="nav-handle"
							onClick={handleUserHandleClick}
							aria-label={handleTriggerLabel}
						>
							{formattedHandle}
						</button>
						<button
							type="button"
							className="nav-settings"
							aria-label="Open creator settings"
							onClick={() => setShowSettingsOverlay(true)}
						>
							⚙️
						</button>
					</div>
				</header>
			) : (
				<>
					<header className="hero">
						<div className="hero-copy">
							<div className="hero-heading">
								<img src={inspireLogo} alt="Inspire" className="hero-logo" />
								<h1>Make Something</h1>
							</div>
							<p className="hero-tagline">Choose your creative studio and spin a fresh challenge.</p>
						</div>
						<div className="hero-meta glass">
							{heroMetaContent}
						</div>
					</header>

					{/* Three Separate Session Peaks */}
					<div className="session-peaks">
						{/* Spectate Live Peak */}
						<section 
							className={`session-peak glass ${expandedPeak === 'spectate' ? 'expanded' : ''}`}
							onMouseEnter={() => setExpandedPeak('spectate')}
							onMouseLeave={() => setExpandedPeak(null)}
						>
							<div className="session-peak-header">
								<h3>Spectate live</h3>
								<p>Jump into an active room.</p>
							</div>
							<ul className="session-peak-list">
								{liveSessions.map((session) => (
									<li key={session.id}>
										<div className="session-meta">
											<strong>{session.title}</strong>
											<span>{session.owner} · {session.participants} viewers</span>
										</div>
										<button type="button" className="btn micro" onClick={() => handleSpectateSession(session.id)}>
											Spectate
										</button>
									</li>
								))}
							</ul>
						</section>

						{/* Join Collab Peak */}
						<section 
							className={`session-peak glass ${expandedPeak === 'collab' ? 'expanded' : ''}`}
							onMouseEnter={() => setExpandedPeak('collab')}
							onMouseLeave={() => setExpandedPeak(null)}
						>
							<div className="session-peak-header">
								<h3>Join a collab</h3>
								<p>Build alongside other artists.</p>
							</div>
							<ul className="session-peak-list">
								{collaborativeSessions.map((session) => (
									<li key={session.id}>
										<div className="session-meta">
											<strong>{session.title}</strong>
											<span>{session.owner} · {session.participants} creators</span>
										</div>
										<button type="button" className="btn micro halo" onClick={() => handleJoinSession(session.id)}>
											Join
										</button>
									</li>
								))}
							</ul>
						</section>

						{/* Community Feed Peak */}
						<section 
							className={`session-peak glass ${expandedPeak === 'community' ? 'expanded' : ''}`}
							onMouseEnter={() => setExpandedPeak('community')}
							onMouseLeave={() => setExpandedPeak(null)}
						>
							<div className="session-peak-header">
								<h3>Community feed</h3>
								<p>Fresh remixes and drops.</p>
							</div>
							<ul className="session-peak-list">
								{communityPosts.slice(0, 4).map((post) => (
									<li key={post.id}>
										<div className="session-meta">
											<strong>{post.author}</strong>
											<span>{formatRelativeTime(post.createdAt)}</span>
										</div>
										<p className="session-snippet">{post.content.length > 120 ? `${post.content.slice(0, 120)}…` : post.content}</p>
										{post.featuredPack && (
											<button
												type="button"
												className="btn micro green"
												onClick={() => handleForkCommunityPost(post)}
												title="Fork this pack into your studio"
											>
												Fork
											</button>
										)}
									</li>
								))}
							</ul>
						</section>
					</div>
				</>
			)}

			{(loading || status || error) && (
				<div className="feedback-area" aria-live="polite">
					{loading === 'generate' && <div className="feedback loading">Assembling your spark…</div>}
					{loading === 'load' && <div className="feedback loading">Pulling from the archive…</div>}
					{loading === 'remix' && <div className="feedback loading">Remixing your pack…</div>}
					{status && <div className="feedback success">{status}</div>}
					{error && <div className="feedback error">⚠️ {error}</div>}
				</div>
			)}

			{!mode && (
				showModePicker ? (
					<>
						<section className="mode-selector">
							{modeDefinitions.map((entry) => (
								<button
									key={entry.id}
									type="button"
									className="mode-card"
									onClick={() => handleModeSelect(entry.id)}
									onPointerMove={handleModeCardParallax}
									onPointerLeave={handleModeCardLeave}
									style={{
										backgroundImage: `url(${entry.backgroundImage || MODE_BG_BY_ID[entry.id] || ''})`
									}}
								>
									<span className="mode-card-glow" aria-hidden="true" />
									<h2 className={entry.id === 'lyricist' ? 'pulse-text' : ''}>{entry.label}</h2>
									<p>{entry.description}</p>
								</button>
							))}
						</section>
					</>
				) : (
					<div className="mode-gate-row">
						<div className="mode-gate">
							<button type="button" className="btn primary" onClick={() => setShowModePicker(true)}>
								Get Started - Pick a Lab
							</button>
						</div>
					</div>
				)
			)}

			{!mode && !showOnboarding && null}

			{showCommunityOverlay && (
				<div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Community feed" onClick={() => setShowCommunityOverlay(false)}>
					<div className="community-overlay glass" onClick={(event) => event.stopPropagation()}>
						<div className="overlay-header">
							<h3>Community feed</h3>
							<button type="button" className="icon-button" aria-label="Close community feed" onClick={() => setShowCommunityOverlay(false)}>✕</button>
						</div>
						<div className="feed-scroll">
							{communityPosts.map((post) => (
								<article key={post.id} className="feed-card">
									<div className="feed-meta">
										<span className="feed-author">{post.author}</span>
										<span className="feed-timestamp">{formatRelativeTime(post.createdAt)}</span>
									</div>
									<p className="feed-content">{post.content}</p>
									{post.featuredPack && (
										<div className="feed-pack">
											<strong>{post.featuredPack.title}</strong>
											<span className="feed-pack-subtitle">
												Remixed from {post.featuredPack.remixOf?.author ?? post.author}
											</span>
											<button
												type="button"
												className="btn micro green"
												onClick={() => handleForkCommunityPost(post)}
												title="Fork this pack into your studio"
											>
												Fork
											</button>
										</div>
									)}
									<div className="feed-stats" aria-label="Engagement stats">
										<span>❤️ {post.reactions}</span>
										<span>💬 {post.comments}</span>
										<span>♻️ {post.remixCount}</span>
									</div>
								</article>
							))}
						</div>
					</div>
				</div>
			)}

			{mode && !submode && activeModeDefinition && (
				<section className="submode-panel glass">
					<button className="back-button" type="button" onClick={handleBackToModes}>← Choose another mode</button>
					<h2>{activeModeDefinition.icon} {activeModeDefinition.label}</h2>
					<p>Select how you want to play inside this studio.</p>
					<div className="submode-grid">
						{activeModeDefinition.submodes.map((option) => (
							<button
								key={option.id}
								className={`submode-card mode-${activeModeDefinition.id} submode-${option.id}`}
								type="button"
								onClick={() => handleSubmodeSelect(option.id)}
								style={
									activeModeDefinition.id === 'lyricist'
										? { backgroundImage: `url(${LYRICIST_SUBMODE_BG_BY_ID[option.id] ?? ''})` }
										: undefined
								}
							>
								<strong>{option.label}</strong>
								<span>{option.description}</span>
							</button>
						))}
					</div>
				</section>
			)}

			{mode && submode && (
				<main className={workspaceClassName}>
					{!controlsCollapsed && !focusMode && !showingDetail && (
						<div className="workspace-controls-overlay" role="dialog" aria-modal="true" aria-label="Workspace controls" onClick={toggleWorkspaceControls}>
							<div className="workspace-controls" id="workspaceControls" onClick={(event) => event.stopPropagation()}>
								<div className="controls-overlay-header">
									<h3>Workspace Controls</h3>
									<button type="button" className="btn ghost micro" onClick={toggleWorkspaceControls}>Close</button>
								</div>
								<div className="controls-columns">
									{/* Left Column: Relevance Blend */}
									<div className="controls-column left">
										<CollapsibleSection title="Relevance Blend" icon="🧭" description="Weight news, tone, and semantic distance." defaultOpen>
											<RelevanceSlider value={filters} onChange={setFilters} />
										</CollapsibleSection>
									</div>

									{/* Right Column: Genre Priority & Archive */}
									<div className="controls-column right">
										{mode === 'lyricist' && (
											<CollapsibleSection title="Genre Priority" icon="🎶" description="Tune the dataset toward a sonic lane." defaultOpen>
												<div className="option-group">
													{LYRICIST_GENRES.map((option) => (
														<button
															key={option.value}
															type="button"
															className={option.value === genre ? 'chip active' : 'chip'}
															onClick={() => setGenre(option.value)}
														>
															{option.label}
														</button>
													))}
												</div>
											</CollapsibleSection>
										)}

										<CollapsibleSection title="Archive" icon="🗄️" description="Load any pack by id." defaultOpen={false}>
											<div className="lookup-inline">
												<input
													placeholder="Enter pack id to load"
													value={lookupId}
													onChange={(event) => setLookupId(event.target.value)}
												/>
												<button className="btn tertiary" type="button" onClick={handleLoadById} disabled={!lookupId.trim() || loading === 'load'}>
													{loading === 'load' ? 'Loading…' : 'Load by ID'}
												</button>
											</div>
										</CollapsibleSection>
									</div>
								</div>
							</div>
						</div>
					)}

					<div className={workspaceMainClassName}>
						<section key={packAnimationKey} className={packStageClassName}>
							{fuelPack ? (
							<>
								{isModePack(fuelPack) && (
									<header className={`pack-header${showingDetail ? ' detail-open' : ''}`}>
										<div className="pack-header-main">
											{showingDetail && (
												<button type="button" className="btn ghost micro back-to-list" onClick={handleBackToPackList}>
													← Back to list
												</button>
											)}
											<p className="pack-id">#{getPackId(fuelPack)}</p>
											<h3>{showingDetail && selectedCard ? selectedCard.label : fuelPack.title}</h3>
											<p className="summary">{showingDetail && selectedCard ? `Pack: ${fuelPack.title}` : fuelPack.summary}</p>
										</div>
										<div className="chips">
											{headerChips.length
												? headerChips.map((chip, index) => (
													<button
														key={`${chip.type}-${index}-${chip.label}`}
														type="button"
														className="chip interactive"
														onClick={() => setChipPicker({ type: chip.type as 'powerWord' | 'instrument' | 'headline' | 'meme' | 'sample', index: chip.index })}
													>
														{chip.label}
													</button>
												))
												: (
													<>
														<span className="chip">{fuelPack.filters.timeframe}</span>
														<span className="chip">{fuelPack.filters.tone}</span>
														<span className="chip">{fuelPack.filters.semantic}</span>
													</>
												)}
										</div>
									</header>
								)}

								{!isModePack(fuelPack) && (
									<div className="legacy-pack">
										<h3>Legacy Fuel Pack</h3>
										<p className="summary">This pack was created with an earlier Inspire generator.</p>
										<div className="legacy-columns">
											<div>
												<h4>Words</h4>
												<div className="word-grid">
													{(fuelPack as FuelPack).words.map((word) => (
														<span key={word} className="word-chip">{word}</span>
													))}
												</div>
											</div>
											<div>
												<h4>Memes</h4>
												<div className="word-grid">
													{(fuelPack as FuelPack).memes.map((meme) => (
														<span key={meme} className="word-chip">{meme}</span>
													))}
												</div>
											</div>
										</div>
									</div>
								)}

								{isModePack(fuelPack) && (
									<>
										{!showingDetail && (
											<div className="pack-deck" role="list">
												{orderedPackDeck.map((card, index) => (
													<button
														key={card.id}
														type="button"
														role="listitem"
														data-card-id={card.id}
														className={`pack-card${expandedCard === card.id ? ' active' : ''}`}
														draggable
														onDragStart={handleCardDragStart(card.id)}
														onDragEnter={handleCardDragEnter(card.id)}
														onDragOver={handleCardDragOver}
														onDragEnd={handleCardDragEnd}
														onClick={() => setExpandedCard(card.id)}
														style={{ '--card-index': index } as CSSProperties}
														aria-expanded={expandedCard === card.id}
													>
														<span className="card-label">
															{card.label}
															{draggedCardId === card.id && <span className="snap-indicator" aria-hidden="true">⇕</span>}
														</span>
														<span className="card-preview">{card.preview}</span>
													</button>
												))}
											</div>
										)}
										{isModePack(fuelPack) && !focusMode && !showingDetail && (
											<section
												className={`focus-mixer glass${mixerHover ? ' hover' : ''}`}
												onDragOver={handleMixerDragOver}
												onDragLeave={handleMixerDragLeave}
												onDrop={handleMixerDrop}
											>
												<div className="focus-mixer-header">
													<div>
														<p className="label">Combined focus</p>
														<h4>Drop pack cards to mix</h4>
													</div>
													<div className="mixer-actions">
														<button type="button" className="btn tertiary micro" onClick={() => setCombinedFocusCardIds([])}>Clear</button>
														<button
															type="button"
															className="btn secondary micro"
															onClick={() => {
																setFocusModeType('combined');
																setFocusMode(true);
																if (!expandedCard && orderedPackDeck.length) setExpandedCard(orderedPackDeck[0].id);
															}}
														>
															Open focus mode
														</button>
													</div>
												</div>
												<div className={`combined-drop${mixerHover ? ' hover' : ''}`} aria-label="Combined focus drop area">
													<span className="drop-instruction">Drop pack cards here</span>
													<span className="drop-sub">{combinedFocusCardIds.length ? `${combinedFocusCardIds.length} added` : 'Drag from the pack deck to build this mix.'}</span>
												</div>
											</section>
										)}
										{selectedCard && !focusMode && renderPackDetail(false)}
									</>
								)}
							</>
						) : (
							<div className="empty-state">
								<h3>No pack yet</h3>
								<p>Use the generator to craft a pack tuned to your filters.</p>
							</div>
						)}
						</section>

						{isModePack(fuelPack) && workspaceQueue.length > 0 && !focusMode && !showingDetail && (
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
											Clips and references tuned to <strong>{fuelPack.title}</strong>.
										</p>
									</div>
									<button
										type="button"
										className="btn ghost micro queue-toggle"
										onClick={toggleQueueCollapsed}
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
													{item.author && <span className="queue-author">{item.author}</span>}
													{item.matchesPack && <span className="queue-match">Matches: {item.matchesPack}</span>}
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
														{(function renderPlayer() {
															const mainId = youtubeVideos[item.id].videoId;
															const extras = (youtubePlaylists[item.id] || []).map(v => v.videoId).filter(v => v && v !== mainId);
															// Use resilient component with runtime pruning on errors
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
						)}

					</div>
				</main>
			)}

			{focusMode && (
				<div
					className="focus-overlay"
					role="dialog"
					aria-modal="true"
					aria-label={focusModeType === 'combined' ? 'Combined focus mode' : 'Focus mode'}
					onClick={() => {
						setFocusMode(false);
						setFocusModeType('single');
					}}
				>
					<div className="focus-overlay-inner" onClick={(event) => event.stopPropagation()}>
						<div className="focus-overlay-actions">
							<button type="button" className="btn ghost micro" onClick={() => { setFocusMode(false); setFocusModeType('single'); }}>Exit focus</button>
							{focusModeType === 'combined' && (
								<button type="button" className="btn tertiary micro" onClick={() => setCombinedFocusCardIds([])}>Clear combined</button>
							)}
						</div>
						{focusModeType === 'single' && selectedCard && renderPackDetail(true)}
						{focusModeType === 'combined' && (
							<div
								className={`combined-focus glass${mixerHover ? ' hover' : ''}`}
								onDragOver={handleMixerDragOver}
								onDragLeave={handleMixerDragLeave}
								onDrop={handleMixerDrop}
							>
								<div className="combined-focus-header">
									<div>
										<p className="label">Combined focus</p>
										<h3>Drop pack cards to mix</h3>
									</div>
									<div className="mixer-actions">
										<button type="button" className="btn ghost micro" onClick={() => setCombinedFocusCardIds([])}>Clear</button>
									</div>
								</div>
								<div className={`combined-drop${mixerHover ? ' hover' : ''}`} aria-label="Combined focus drop area">
									<span className="drop-instruction">Drop pack cards here</span>
									<span className="drop-sub">{combinedFocusCardIds.length ? `${combinedFocusCardIds.length} added` : 'Drag from the pack deck to build this mix.'}</span>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{focusControlsOpen && (
				<div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Focus mode controls">
					<div className="focus-controls-panel glass">
						<div className="overlay-header">
							<h3>Focus word mode</h3>
							<button type="button" className="icon-button" aria-label="Close focus controls" onClick={() => setFocusControlsOpen(false)}>✕</button>
						</div>
						<div className="focus-controls-grid">
							<div>
								<span className="label">Animation</span>
								<div className="nav-toggle-group">
									{[['scroll', 'Scroll'], ['rain', 'Rain'], ['flash', 'Flash']].map(([value, label]) => (
										<button
											key={value}
											type="button"
											className={`nav-pill${focusStyle === value ? ' active' : ''}`}
											onClick={() => setFocusStyle(value as 'scroll' | 'rain' | 'flash')}
										>
											{label}
										</button>
									))}
								</div>
							</div>
							<div className="control-field">
								<label htmlFor="focusDensity">Visible items</label>
								<input
									id="focusDensity"
									type="range"
									min={4}
									max={24}
									value={focusDensity}
									onChange={(event) => setFocusDensity(Number(event.target.value))}
								/>
								<span className="range-value">{focusDensity}</span>
							</div>
							<div className="control-field">
								<label htmlFor="focusSpeed">Speed</label>
								<input
									id="focusSpeed"
									type="range"
									min={0.5}
									max={3}
									step={0.1}
									value={focusSpeed}
									onChange={(event) => setFocusSpeed(Number(event.target.value))}
								/>
								<span className="range-value">{focusSpeed.toFixed(1)}x</span>
							</div>
							<div className="control-preview">
								<HeadlineStream anchored compact forceActive />
							</div>
						</div>
					</div>
				</div>
			)}

			{chipPicker && (
				<div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Choose a chip option">
					<div className="chip-picker glass">
						<div className="overlay-header">
							<h3>Swap chip</h3>
							<button type="button" className="icon-button" aria-label="Close chip chooser" onClick={closeChipPicker}>✕</button>
						</div>
						<div className="chip-picker-grid">
							{chipOptions.length === 0 && <p className="hint">No alternatives found.</p>}
							{chipOptions.map((option) => (
								<button key={option} type="button" className="chip" onClick={() => handleChipChoice(option)}>
									{option}
								</button>
							))}
						</div>
					</div>
				</div>
			)}

			{showChallengeOverlay && (
				<div className="overlay-backdrop" role="dialog" aria-modal="true" aria-labelledby="challengeOverlayTitle" aria-describedby="challengeOverlayDescription">
					<div className="challenge-overlay glass">
						<div className="overlay-header">
							<h2 id="challengeOverlayTitle">Daily Challenge</h2>
							<button type="button" className="icon-button" aria-label="Close challenge details" onClick={() => setShowChallengeOverlay(false)}>
								✕
							</button>
						</div>
						<div className="challenge-overlay-body">
							<section className="challenge-summary" id="challengeOverlayDescription">
								<div>
									<strong>{dailyChallenge.title}</strong>
									<p>{dailyChallenge.description}</p>
									{dailyChallenge.reward && <p className="challenge-reward">Reward: {dailyChallenge.reward}</p>}
								</div>
								<div className="challenge-countdown">
									<span className="countdown-label">Time remaining</span>
									<span className="countdown-value">{challengeCountdown}</span>
								</div>
								<div className="challenge-status-row">
									<span>{challengeCompletedToday ? 'Completed ✅' : 'In progress'}</span>
									<span>Resets {challengeResetLabel}</span>
								</div>
							</section>
							<div className="challenge-columns">
								<section className="challenge-card">
									<h3>Constraints</h3>
									<ul className="challenge-list">
										{dailyChallenge.constraints.map((constraint) => (
											<li key={constraint}>{constraint}</li>
										))}
									</ul>
								</section>
								<section className="challenge-card">
									<h3>Recent activity</h3>
									<ul className="challenge-activity">
										{challengeActivity.length > 0 ? (
											challengeActivity.map((entry) => (
												<li key={entry.id}>
													<div className="activity-handle">{entry.handle}</div>
													<div className="activity-status">{entry.status === 'submitted' ? 'Submitted' : 'Accepted'} · {formatRelativeTime(entry.timestamp)}</div>
													{entry.activity && <div className="activity-detail">{entry.activity}</div>}
												</li>
											))
										) : (
											<li className="activity-empty">{challengeActivityError ?? 'Challenge activity is warming up.'}</li>
										)}
									</ul>
								</section>
								<section className="challenge-card">
									<h3>How to complete</h3>
									<ul className="challenge-steps">
										<li>Generate a fuel pack in your current mode.</li>
										<li>Use at least one constraint above in your submission.</li>
										<li>Submit your best take before the timer resets.</li>
									</ul>
								</section>
							</div>
						</div>
						<footer className="challenge-overlay-footer">
							<button
								type="button"
								className="btn primary"
								onClick={handleChallengeCompleteAndClose}
								disabled={challengeCompletedToday}
							>
								{challengeCompletedToday ? 'Marked Complete' : 'Mark Complete'}
							</button>
						</footer>
					</div>
				</div>
			)}

			{showSettingsOverlay && (
				<div className="overlay-backdrop" role="dialog" aria-modal="true">
					<div className="settings-overlay glass">
						<div className="overlay-header">
							<h2>Creator dashboard</h2>
							<button type="button" className="icon-button" aria-label="Close settings" onClick={() => setShowSettingsOverlay(false)}>
								✕
							</button>
						</div>
						<section className="settings-section" aria-label="Live studio controls">
							<h3>Live studio</h3>
							<div className="settings-collab-row">
								<div className="nav-status" aria-live="polite">
									<span>{collaborationStatusLabel}</span>
									{(viewerMode === 'spectating' || viewerMode === 'joining') && (
										<button type="button" className="btn micro ghost" onClick={handleLeaveViewerMode}>
											Leave
										</button>
									)}
								</div>
								<div className="nav-toggle-group" role="group" aria-label="Collaboration mode">
									<button
										type="button"
										className={`nav-pill${collaborationMode === 'live' ? ' active' : ''}`}
										onClick={() => handleCollaborationModeToggle('live')}
									>
										Go Live
									</button>
									<button
										type="button"
										className={`nav-pill${collaborationMode === 'collaborative' ? ' active' : ''}`}
										onClick={() => handleCollaborationModeToggle('collaborative')}
									>
										Collaborate
									</button>
								</div>
							</div>
						</section>
						{heroMetaContent}
					</div>
				</div>
			)}

			{showAccountModal && (
				<div className="overlay-backdrop" role="dialog" aria-modal="true">
					<div className="account-overlay glass">
						<div className="overlay-header">
							<h2>Sign in to Inspire</h2>
							<button type="button" className="icon-button" aria-label="Close sign-in" onClick={() => setShowAccountModal(false)}>
								✕
							</button>
						</div>
						<p className="overlay-copy">Claim your creator handle to sync packs across sessions.</p>
						<label className="handle-field" htmlFor="overlayUserId">
							<span className="label">Creator handle</span>
							<input
								id="overlayUserId"
								value={userId}
								maxLength={32}
								onChange={handleUserIdChange}
								onBlur={handleUserIdBlur}
								onKeyDown={handleUserIdKey}
							/>
						</label>
						<button type="button" className="btn primary" onClick={() => setShowAccountModal(false)}>
							Save handle
						</button>
					</div>
				</div>
			)}

			{showSavedOverlay && (
				<div className="overlay-backdrop" role="dialog" aria-modal="true" aria-labelledby="savedOverlayTitle">
					<div className="settings-overlay glass">
						<div className="overlay-header">
							<h2 id="savedOverlayTitle">Saved Packs</h2>
							<button type="button" className="icon-button" aria-label="Close saved" onClick={() => setShowSavedOverlay(false)}>✕</button>
						</div>
						<div className="settings-section">
							{savedLoading && <p>Loading…</p>}
							{!savedLoading && savedError && <p className="error">{savedError}</p>}
							{!savedLoading && !savedError && (
								<ul className="saved-list">
									{savedPacks.length === 0 && <li>No saved packs yet.</li>}
									{savedPacks.map((p) => (
										<li key={p.id} className="saved-item">
											<div className="saved-meta">
												<strong>{(p as any).title ?? p.id}</strong>
												<small>{isModePack(p as any) ? (p as ModePack).mode : 'legacy'}</small>
											</div>
											<div className="saved-actions">
												<button
													type="button"
													className="btn micro"
													onClick={async () => {
														try {
															const res = await fetch(`/api/packs/${encodeURIComponent(p.id)}`);
															if (!res.ok) throw new Error('Load failed');
															const data = await res.json();
															setPack(data, 'Loaded from archive');
															setShowSavedOverlay(false);
														} catch {
															setError('Unable to load that pack');
														}
													}}
												>
													Open
												</button>
											</div>
										</li>
									))}
								</ul>
							)}
						</div>
					</div>
				</div>
			)}

			{showWordExplorer && (
				<div className="overlay-backdrop" role="dialog" aria-modal="true" aria-labelledby="wordsOverlayTitle">
					<div className="settings-overlay glass">
						<div className="overlay-header">
							<h2 id="wordsOverlayTitle">Word Explorer</h2>
							<button type="button" className="icon-button" aria-label="Close word explorer" onClick={() => setShowWordExplorer(false)}>✕</button>
						</div>
						<div className="settings-section">
							<div className="word-form">
								<input placeholder="Starts with" value={wordStartsWith} onChange={(e) => setWordStartsWith(e.target.value)} />
								<input placeholder="Rhyme with" value={wordRhymeWith} onChange={(e) => setWordRhymeWith(e.target.value)} />
								<input placeholder="Syllables" value={wordSyllables} onChange={(e) => setWordSyllables(e.target.value)} />
								<input placeholder="Max results" value={wordMaxResults} onChange={(e) => setWordMaxResults(e.target.value)} />
								<input placeholder="Topic (eg: music)" value={wordTopic} onChange={(e) => setWordTopic(e.target.value)} />
								<button className="btn micro" type="button" onClick={runWordSearch} disabled={wordLoading}>Search</button>
							</div>
							{wordLoading && <p>Searching…</p>}
							{!wordLoading && wordError && <p className="error">{wordError}</p>}
							{!wordLoading && !wordError && (
								<div className="word-grid">
									{wordResults.map((w) => (
										<button
											key={w.word}
											type="button"
											className="word-chip interactive"
											title={`${w.numSyllables ?? ''} syllables`}
											onClick={() => handleAddWordToPack(w.word)}
										>
											{w.word}
										</button>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			)}


			{showOnboarding && (
				<div className="onboarding-backdrop" role="dialog" aria-modal="true">
					<div className="onboarding-card glass">
						<h2>Welcome, Creator</h2>
						<p>What are you making today?</p>
						<div className="onboarding-options">
							{modeDefinitions.map((entry) => (
								<button key={entry.id} type="button" onClick={() => handleModeSelect(entry.id)}>
									<strong>{entry.label}</strong>
									<span>{entry.description}</span>
								</button>
							))}
						</div>
						<div className="onboarding-actions">
							<button type="button" className="btn ghost" onClick={handleDismissOnboarding}>
								Browse studios
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default App;
