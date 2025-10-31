import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import './App.css';
import inspireLogo from './assets/Inspire_transparent.png';
import tildeSecLogo from './assets/TildeSec_transparent.png';

import type {
	CreativeMode,
	EditorModePack,
	FuelPack,
	InspireAnyPack,
	LyricistModePack,
	ModeDefinition,
	ModePack,
	ModePackRequest,
	ProducerModePack,
	RelevanceFilter,
	RelevanceTone
} from './types';
import { RelevanceSlider } from './components/RelevanceSlider';
import { CollapsibleSection } from './components/CollapsibleSection';

const DEFAULT_FILTERS: RelevanceFilter = {
	timeframe: 'fresh',
	tone: 'funny',
	semantic: 'tight'
};

const FALLBACK_MODE_DEFINITIONS: ModeDefinition[] = [
	{
		id: 'lyricist',
		label: 'Lyricist Studio',
		description: 'Storytelling, hooks, rhyme families, and emotions.',
		icon: '📝',
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
		icon: '🎚',
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
		icon: '🎬',
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

const PROMPT_ROTATIONS = [
	'Pick a studio. Make something wild.',
	'Which creative muscle are we training today?',
	'Blend real headlines with your imagination.',
	'Flip a sample, cut a film, or write a verse.',
	'Every mode is a different toy box.'
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
	icon: string;
	preview: string;
	detail: ReactNode;
	accent?: string;
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
	return (pack as ModePack).id ?? (pack as FuelPack).id;
}

function loadStoredUserId() {
	if (typeof window === 'undefined') return `creator-${Date.now().toString(36)}`;
	const cached = window.localStorage.getItem('inspire:userId');
	if (cached) return cached;
	const generated = `creator-${Math.random().toString(36).slice(2, 8)}`;
	window.localStorage.setItem('inspire:userId', generated);
	return generated;
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
	const [promptIndex, setPromptIndex] = useState(0);
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
		if (typeof window === 'undefined') return true;
		return window.localStorage.getItem(ONBOARDING_KEY) !== 'true';
	});
	const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
	const [showAccountModal, setShowAccountModal] = useState(false);
	const [controlsCollapsed, setControlsCollapsed] = useState(false);


	const heroPrompt = PROMPT_ROTATIONS[promptIndex];
	const activeModeDefinition = mode ? modeDefinitions.find((entry) => entry.id === mode) ?? null : null;

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
		setControlsCollapsed((prev) => !prev);
	}, []);

	const setPack = useCallback(
		(pack: InspireAnyPack, message?: string) => {
			setFuelPack(pack);
			setPackAnimationKey(Date.now());
			setExpandedCard(null);
			if (message) setStatus(message);
		},
		[setFuelPack, setPackAnimationKey, setExpandedCard, setStatus]
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
			const res = await fetch(`/dev/api/modes/${targetMode}/fuel-pack`, {
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
	}, []);

	const handleModeSelect = useCallback(
		(nextMode: CreativeMode) => {
			handleDismissOnboarding();
			setMode(nextMode);
			setSubmode(null);
			setFuelPack(null);
			setStatus(null);
			setFilters(DEFAULT_FILTERS);
			setExpandedCard(null);
			setControlsCollapsed(false);
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
		setControlsCollapsed(false);
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

	const handleLoadById = useCallback(async () => {
		const target = lookupId.trim();
		if (!target) return;
		setLoading('load');
		setError(null);
		try {
			const res = await fetch(`/dev/api/packs/${encodeURIComponent(target)}`);
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
				setStatus('Share link copied 🔗');
			} catch (err) {
				console.error(err);
				setError('Clipboard permission denied. Try selecting manually.');
			}
		},
		[userId]
	);

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
		if (isLyricistPack(fuelPack)) {
			return [
				{
					id: 'power-words',
					label: 'Power Words',
					icon: '⚡️',
					preview: fuelPack.powerWords.slice(0, 3).join(' · '),
					detail: (
						<div className="word-grid">
							{fuelPack.powerWords.map((word) => (
								<span key={word} className="word-chip">{word}</span>
							))}
						</div>
					)
				},
				{
					id: 'story-arc',
					label: 'Story Arc',
					icon: '🌀',
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
				},
				{
					id: 'headline',
					label: 'Live Headline',
					icon: '🗞️',
					preview: fuelPack.newsPrompt.headline,
					detail: (
						<div className="card-detail-copy">
							<p className="headline">{fuelPack.newsPrompt.headline}</p>
							<p>{fuelPack.newsPrompt.context}</p>
							<small>{fuelPack.newsPrompt.source}</small>
						</div>
					)
				},
				{
					id: 'flow-prompts',
					label: 'Flow Prompts',
					icon: '🎙️',
					preview: fuelPack.flowPrompts[0] ?? 'Switch cadence & bounce',
					detail: (
						<ul>
							{fuelPack.flowPrompts.map((prompt) => (
								<li key={prompt}>{prompt}</li>
							))}
						</ul>
					)
				},
				{
					id: 'challenge',
					label: 'Prompt Challenge',
					icon: '🏆',
					preview: fuelPack.topicChallenge,
					detail: (
						<div className="card-detail-copy">
							<p>{fuelPack.topicChallenge}</p>
							<p className="chord">Chord mood: {fuelPack.chordMood}</p>
						</div>
					)
				},
				{
					id: 'fragments',
					label: 'Lyric Fragments',
					icon: '✍️',
					preview: fuelPack.lyricFragments[0] ?? 'Sketch a new line',
					detail: (
						<ul>
							{fuelPack.lyricFragments.map((fragment) => (
								<li key={fragment}>{fragment}</li>
							))}
						</ul>
					)
				}
			];
		}

		if (isProducerPack(fuelPack)) {
			return [
				{
					id: 'main-sample',
					label: 'Main Sample',
					icon: '🎧',
					preview: `${fuelPack.sample.title} • ${fuelPack.sample.source}`,
					detail: (
						<div className="card-detail-copy">
							<p>{fuelPack.sample.title}</p>
							<p>{fuelPack.sample.source}</p>
							<div className="tags">
								{fuelPack.sample.tags.map((tag) => (
									<span key={tag} className="tag">{tag}</span>
								))}
							</div>
						</div>
					)
				},
				{
					id: 'constraints',
					label: 'Constraints',
					icon: '⛓️',
					preview: fuelPack.constraints[0] ?? 'Flip the arrangement',
					detail: (
						<ul>
							{fuelPack.constraints.map((constraint) => (
								<li key={constraint}>{constraint}</li>
							))}
						</ul>
					)
				},
				{
					id: 'fx-ideas',
					label: 'FX Ideas',
					icon: '🎛️',
					preview: fuelPack.fxIdeas.slice(0, 2).join(' · '),
					detail: (
						<ul className="fx-grid">
							{fuelPack.fxIdeas.map((idea) => (
								<li key={idea}>{idea}</li>
							))}
						</ul>
					)
				},
				{
					id: 'palette',
					label: 'Instrument Palette',
					icon: '🎹',
					preview: fuelPack.instrumentPalette.slice(0, 3).join(' · '),
					detail: (
						<ul>
							{fuelPack.instrumentPalette.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					)
				},
				{
					id: 'video-cue',
					label: 'Visual Cue',
					icon: '🎥',
					preview: fuelPack.videoSnippet.title,
					detail: (
						<div className="card-detail-copy">
							<p>{fuelPack.videoSnippet.title}</p>
							<p>{fuelPack.videoSnippet.description}</p>
						</div>
					)
				},
				{
					id: 'challenge',
					label: 'Build Challenge',
					icon: '🚀',
					preview: fuelPack.challenge,
					detail: <p>{fuelPack.challenge}</p>
				}
			];
		}

		const editorPack = fuelPack as EditorModePack;
		return [
			{
				id: 'moodboard',
				label: 'Moodboard Clips',
				icon: '🎬',
				preview: editorPack.moodboard.map((clip) => clip.title).slice(0, 2).join(' · '),
				detail: (
					<div className="clip-grid">
						{editorPack.moodboard.map((clip) => (
							<div key={clip.title} className="clip-card">
								<strong>{clip.title}</strong>
								<span>{clip.description}</span>
							</div>
						))}
					</div>
				)
			},
			{
				id: 'audio-prompts',
				label: 'Audio Prompts',
				icon: '🔊',
				preview: editorPack.audioPrompts.map((prompt) => prompt.name).slice(0, 3).join(' · '),
				detail: (
					<div className="word-grid">
						{editorPack.audioPrompts.map((prompt) => (
							<span key={prompt.name} className="word-chip">{prompt.name}</span>
						))}
					</div>
				)
			},
			{
				id: 'timeline',
				label: 'Timeline Beats',
				icon: '🕰️',
				preview: editorPack.timelineBeats.slice(0, 2).join(' · '),
				detail: (
					<ul>
						{editorPack.timelineBeats.map((beat) => (
							<li key={beat}>{beat}</li>
						))}
					</ul>
				)
			},
			{
				id: 'constraints',
				label: 'Visual Constraints',
				icon: '🎨',
				preview: editorPack.visualConstraints.slice(0, 2).join(' · '),
				detail: (
					<ul>
						{editorPack.visualConstraints.map((constraint) => (
							<li key={constraint}>{constraint}</li>
						))}
					</ul>
				)
			},
			{
				id: 'challenge',
				label: 'Director Challenge',
				icon: '🎯',
				preview: editorPack.challenge,
				detail: (
					<div className="card-detail-copy">
						<p>{editorPack.challenge}</p>
						<p className="title-prompt">Title prompt: {editorPack.titlePrompt}</p>
					</div>
				)
			}
		];
	}, [fuelPack]);

	const selectedCard = packDeck.find((card) => card.id === expandedCard) ?? null;

	useEffect(() => {
		const ticker = window.setInterval(() => {
			setPromptIndex((idx) => (idx + 1) % PROMPT_ROTATIONS.length);
		}, 6000);
		return () => window.clearInterval(ticker);
	}, []);

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
		async function loadModes() {
			try {
				const res = await fetch('/dev/api/modes');
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

	const formattedHandle = userId ? (userId.startsWith('@') ? userId : `@${userId}`) : 'Sign in';
	const appClassName = `app theme-${theme} ${mode ? MODE_BACKGROUNDS[mode] : 'mode-landing'}${mode ? ' has-mode' : ''}`;
	const workspaceClassName = `mode-workspace${controlsCollapsed ? ' controls-collapsed' : ''}`;
	const controlsToggleLabel = controlsCollapsed ? 'Show Controls ▸' : 'Hide Controls ◂';
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
			<div className="ambient orb-left" aria-hidden="true" />
			<div className="ambient orb-right" aria-hidden="true" />
			<div className="noise-overlay" aria-hidden="true" />

			{mode ? (
				<header className="top-nav glass">
					<div className="nav-brand">
						<button type="button" className="nav-title" onClick={handleBackToModes} aria-label="Return to studio selection">
							<img src={inspireLogo} alt="" />
							<span className="sr-only">Inspire</span>
						</button>
						<img src={tildeSecLogo} alt="TildeSec" className="nav-partner" />
					</div>
					<button type="button" className="nav-handle" onClick={() => setShowAccountModal(true)}>
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
				</header>
			) : (
				<header className="hero">
					<div className="hero-copy">
						<div className="hero-brand">
							<img src={inspireLogo} alt="Inspire" />
							<img src={tildeSecLogo} alt="TildeSec" />
						</div>
						<h1>Make Something</h1>
						<p className="hero-tagline">Choose your creative studio and spin a fresh challenge.</p>
						<p className="hero-rotator" aria-live="polite">{heroPrompt}</p>
						<label className="user-handle" htmlFor="userId">
							<span className="label">Creator handle</span>
							<input
								id="userId"
								value={userId}
								maxLength={32}
								onChange={handleUserIdChange}
								onBlur={handleUserIdBlur}
								onKeyDown={handleUserIdKey}
							/>
						</label>
					</div>
					<div className="hero-meta glass">
						{heroMetaContent}
					</div>
				</header>
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
				<section className="mode-selector">
					{modeDefinitions.map((entry) => (
						<button
							key={entry.id}
							type="button"
							className="mode-card"
							onClick={() => handleModeSelect(entry.id)}
							onPointerMove={handleModeCardParallax}
							onPointerLeave={handleModeCardLeave}
						>
							<span className="mode-card-glow" aria-hidden="true" />
							<span className="icon" aria-hidden="true">{entry.icon}</span>
							<h2 className={entry.id === 'lyricist' ? 'pulse-text' : ''}>{entry.label}</h2>
							<p>{entry.description}</p>
						</button>
					))}
				</section>
			)}

			{mode && !submode && activeModeDefinition && (
				<section className="submode-panel glass">
					<button className="back-button" type="button" onClick={handleBackToModes}>← Choose another mode</button>
					<h2>{activeModeDefinition.icon} {activeModeDefinition.label}</h2>
					<p>Select how you want to play inside this studio.</p>
					<div className="submode-grid">
						{activeModeDefinition.submodes.map((option) => (
							<button key={option.id} className="submode-card" type="button" onClick={() => handleSubmodeSelect(option.id)}>
								<strong>{option.label}</strong>
								<span>{option.description}</span>
							</button>
						))}
					</div>
				</section>
			)}

			{mode && submode && (
				<main className={workspaceClassName}>
					<div className="workspace-head">
						<button className="back-button" type="button" onClick={handleBackToModes}>← Studios</button>
						<div>
							<h2>{activeModeDefinition ? `${activeModeDefinition.icon} ${activeModeDefinition.label}` : 'Creative Studio'}</h2>
							<p>{activeModeDefinition?.submodes.find((entry) => entry.id === submode)?.description}</p>
						</div>
						<div className="actions-group">
							<button className="btn primary halo" type="button" onClick={handleGeneratePack} disabled={loading === 'generate'}>
								{loading === 'generate' ? 'Generating…' : 'Generate Fuel Pack'}
							</button>
							<button className="btn secondary" type="button" onClick={handleRemixPack} disabled={loading === 'remix' || !fuelPack}>
								{loading === 'remix' ? 'Remixing…' : 'Remix Pack'}
							</button>
							<button className="btn tertiary" type="button" onClick={() => handleSharePack(fuelPack)} disabled={!fuelPack}>
								Share
							</button>
							<button
								className="btn ghost workspace-controls-toggle"
								type="button"
								onClick={toggleWorkspaceControls}
								aria-expanded={!controlsCollapsed}
								aria-controls="workspaceControls"
							>
								{controlsToggleLabel}
							</button>
						</div>
					</div>

					{!controlsCollapsed && (
						<div className="workspace-controls" id="workspaceControls">
							<CollapsibleSection title="Relevance Blend" icon="🧭" description="Weight news, tone, and semantic distance." defaultOpen>
								<RelevanceSlider value={filters} onChange={setFilters} />
							</CollapsibleSection>

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
					)}

					<div className="workspace-main">
						<section key={packAnimationKey} className="pack-stage glass">
							{fuelPack ? (
							<>
								{isModePack(fuelPack) && (
									<header className="pack-header">
										<div>
											<p className="pack-id">#{getPackId(fuelPack)}</p>
											<h3>{fuelPack.title}</h3>
											<p className="summary">{fuelPack.summary}</p>
										</div>
										<div className="chips">
											<span className="chip">{fuelPack.filters.timeframe}</span>
											<span className="chip">{fuelPack.filters.tone}</span>
											<span className="chip">{fuelPack.filters.semantic}</span>
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
										<div className="pack-deck">
											{packDeck.map((card, index) => (
												<button
													key={card.id}
													type="button"
													className={`pack-card${expandedCard === card.id ? ' active' : ''}`}
													onClick={() => setExpandedCard((current) => (current === card.id ? null : card.id))}
													style={{ '--card-index': index } as CSSProperties}
													aria-expanded={expandedCard === card.id}
												>
													<span className="card-label">{card.icon} {card.label}</span>
													<span className="card-preview">{card.preview}</span>
												</button>
											))}
										</div>
										{selectedCard && (
											<div className="pack-card-detail glass">
												<h4>{selectedCard.icon} {selectedCard.label}</h4>
												<div className="detail-body">{selectedCard.detail}</div>
											</div>
										)}
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

					</div>
				</main>
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
						<label className="user-handle" htmlFor="overlayUserId">
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
