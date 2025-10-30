import {
  CreativeMode,
  EditorModePack,
  InspirationClip,
  LyricistModePack,
  MemeSound,
  ModeDefinition,
  ModePack,
  ModePackRequest,
  ProducerModePack,
  RelevanceFilter,
  RelevanceSemantic,
  RelevanceTimeframe,
  RelevanceTone,
  SampleReference,
  NewsPrompt
} from './types';
import { createId } from './utils/id';

const MODE_DEFINITIONS: ModeDefinition[] = [
  {
    id: 'lyricist',
    label: 'Lyricist Studio',
    description: 'Storytelling, wordplay, hooks, and emotional arcs.',
    icon: '📝',
    accent: '#ec4899',
    submodes: [
      { id: 'rapper', label: 'Rapper', description: 'Punchlines, flow, rhyme families, topical flips.' },
      { id: 'singer', label: 'Singer', description: 'Emotion-led storytelling, melodic phrasing, hooks.' }
    ]
  },
  {
    id: 'producer',
    label: 'Producer Lab',
    description: 'Samples, sound design, constraints, and sonic experiments.',
    icon: '🎚',
    accent: '#22d3ee',
    submodes: [
      { id: 'musician', label: 'Musician', description: 'Chord moods, key signatures, live instrumentation prompts.' },
      { id: 'sampler', label: 'Sampler', description: 'Flip obscure clips, layer textures, reimagine sounds.' },
      { id: 'sound-designer', label: 'Sound Designer', description: 'Build from raw noise, manipulation, and FX-only rules.' }
    ]
  },
  {
    id: 'editor',
    label: 'Editor Suite',
    description: 'Visual storytelling, pacing, meme energy, and timelines.',
    icon: '🎬',
    accent: '#a855f7',
    submodes: [
      { id: 'image-editor', label: 'Image', description: 'Graphic & meme templates with palette nudges.' },
      { id: 'video-editor', label: 'Video', description: 'Cuts, pacing, trending clip structures and cues.' },
      { id: 'audio-editor', label: 'Audio', description: 'Mixing prompts, spatial experiments, and remix briefs.' }
    ]
  }
];

const DEFAULT_FILTERS: RelevanceFilter = {
  timeframe: 'fresh',
  tone: 'funny',
  semantic: 'tight'
};

interface TaggedWord {
  value: string;
  timeframe: RelevanceTimeframe;
  tone: RelevanceTone;
  semantics: RelevanceSemantic[];
  genres: string[];
}

const LYRICIST_POWER_WORDS: TaggedWord[] = [
  { value: 'neon confession', timeframe: 'fresh', tone: 'deep', semantics: ['balanced', 'wild'], genres: ['r&b', 'pop'] },
  { value: 'bytecode lullaby', timeframe: 'fresh', tone: 'funny', semantics: ['wild'], genres: ['hyperpop', 'lo-fi'] },
  { value: 'midnight alley rumble', timeframe: 'recent', tone: 'dark', semantics: ['balanced'], genres: ['drill', 'trap'] },
  { value: 'opal skyline', timeframe: 'timeless', tone: 'deep', semantics: ['tight', 'balanced'], genres: ['r&b', 'soul'] },
  { value: 'glitch gospel', timeframe: 'recent', tone: 'deep', semantics: ['wild'], genres: ['afrobeats', 'house'] },
  { value: 'paper plane flex', timeframe: 'fresh', tone: 'funny', semantics: ['tight'], genres: ['rap', 'drill'] },
  { value: 'chrome heart echo', timeframe: 'recent', tone: 'dark', semantics: ['tight', 'balanced'], genres: ['trap', 'drill'] },
  { value: 'cinder kiss', timeframe: 'timeless', tone: 'deep', semantics: ['balanced'], genres: ['folk', 'pop'] },
  { value: 'afterglow cadence', timeframe: 'timeless', tone: 'deep', semantics: ['tight', 'balanced'], genres: ['pop', 'r&b'] },
  { value: 'emoji smoke signal', timeframe: 'fresh', tone: 'funny', semantics: ['wild'], genres: ['rap', 'hyperpop'] }
];

const RHYME_FAMILIES: Record<string, string[]> = {
  rapper: ['-ight (light, fight, byte)', '-one (tone, drone, clone)', '-ash (flash, dash, cache)', '-ing (bling, swing, ping)'],
  singer: ['-eeling (feeling, healing, stealing)', '-ire (fire, choir, desire)', '-ain (rain, remain, again)', '-ow (glow, slow, echo)']
};

const FLOW_PROMPTS: Record<RelevanceSemantic, string[]> = {
  tight: ['Hit four internal rhymes per bar.', 'Keep syllable count locked at eight.', 'Stack multisyllabic echoes every third word.'],
  balanced: ['Switch cadence halfway through each bar.', 'Alternate melodies with spoken adlibs.', 'Let every second line breathe with a pause.'],
  wild: ['Freestyle the second half with only onomatopoeia.', 'Flip the beat mid-verse with a sudden whisper.', 'Glide from double-time to half-time within two bars.']
};

const CHORD_MOODS: Record<string, string[]> = {
  rapper: ['Phrygian dominant textures', 'Minor 9th sparkle', 'Sparse 808 drone', 'Suspended chords with vinyl crackle'],
  singer: ['Lydian shimmer', 'Minor 7th velvet', 'Soulful IV-V walk-up', 'Dreamy add9 piano bed']
};

const LYRIC_FRAGMENTS: Record<string, string[]> = {
  rapper: ['"City lights blink Morse in the puddles"', '"Wi-Fi ghosts keep receipts on the low"', '"Laughing in emojis, trauma in draft folders"'],
  singer: ['"I hum in grayscale, chasing a sunrise"', '"Moonlight records our promises in waves"', '"Breathing in reverb, holding the skyline"']
};

const MEME_SOUNDS: MemeSound[] = [
  { name: 'Bruh SFX', description: 'The iconic pause-worthy reaction.', tone: 'funny', sampleUrl: 'https://example.com/bruh.mp3' },
  { name: 'Sad Violin', description: 'Lean into bittersweet nostalgia.', tone: 'deep', sampleUrl: 'https://example.com/sad-violin.mp3' },
  { name: 'Thud Reverb', description: 'Dramatic punchline drop.', tone: 'dark', sampleUrl: 'https://example.com/thud.mp3' },
  { name: 'Anime Wow', description: 'Hype the punchline with sparkle.', tone: 'funny', sampleUrl: 'https://example.com/anime-wow.mp3' },
  { name: 'Lo-fi Crackle Loop', description: 'Instant cozy texture for hooks.', tone: 'deep', sampleUrl: 'https://example.com/lofi.mp3' }
];

const NEWS_PROMPTS: NewsPrompt[] = [
  {
    headline: 'Breakthrough battery tech promises 5-minute charging',
    context: 'Frame it as liberation, anxiety, or hype culture.',
    timeframe: 'fresh',
    source: 'TechCurrent'
  },
  {
    headline: 'Community gardens reclaim abandoned malls',
    context: 'Contrast decay with renewal and collective hope.',
    timeframe: 'recent',
    source: 'CityBeat'
  },
  {
    headline: 'Scientists revive 90s satellite to broadcast art',
    context: 'Blend retro nostalgia with future mythos.',
    timeframe: 'recent',
    source: 'Orbital Weekly'
  },
  {
    headline: 'Local vinyl shop survives 30 years of formats',
    context: 'Meditate on timeless hustle and analog romance.',
    timeframe: 'timeless',
    source: 'Analog Monthly'
  }
];

const TOPIC_CHALLENGE_TEMPLATES = {
  funny: ['Write 8 bars roasting a headline this {timeframe}.', 'Turn the news into a punchline and a plot twist.'],
  deep: ['Create a hook that comforts a city facing this headline.', 'Write verses that turn data into diary entries.'],
  dark: ['Flip the headline into a dystopian cautionary tale.', 'Spit a verse as the villain behind the news.']
};

const GENRE_LABELS = ['r&b', 'drill', 'pop', 'afrobeats', 'lo-fi', 'electronic'];

const SAMPLE_POOL: SampleReference[] = [
  {
    title: 'Dusty Rhodes Loop',
    source: 'Looperman #55210',
    url: 'https://looperman.example/dusty-rhodes',
    tags: ['soul', 'warmth', 'vinyl'],
    timeframe: 'timeless'
  },
  {
    title: 'Neon Alley Ambience',
    source: 'Freesound 344221',
    url: 'https://freesound.example/neon-alley',
    tags: ['city', 'field-recording'],
    timeframe: 'recent'
  },
  {
    title: 'Analog Tape Stab',
    source: 'YouTube CC',
    url: 'https://youtube.example/analog-stab',
    tags: ['vintage', 'stab'],
    timeframe: 'timeless'
  },
  {
    title: 'Future Bounce Vocal Chop',
    source: 'Looperman #60231',
    url: 'https://looperman.example/future-bounce',
    tags: ['bright', 'vocal'],
    timeframe: 'fresh'
  },
  {
    title: 'Newsroom Perc Loop',
    source: 'Freesound 198877',
    url: 'https://freesound.example/newsroom',
    tags: ['percussion', 'glitch'],
    timeframe: 'fresh'
  }
];

const SECONDARY_SAMPLE_POOL: SampleReference[] = [
  {
    title: 'Vinyl Dust Texture',
    source: 'Freesound 10233',
    url: 'https://freesound.example/vinyl-dust',
    tags: ['texture'],
    timeframe: 'timeless'
  },
  {
    title: '90s R&B One-Shot',
    source: 'Looperman 44509',
    url: 'https://looperman.example/90s-rnb',
    tags: ['r&b', 'vocals'],
    timeframe: 'recent'
  },
  {
    title: 'Sci-fi Foley Hit',
    source: 'YouTube CC',
    url: 'https://youtube.example/scifi-hit',
    tags: ['fx', 'sci-fi'],
    timeframe: 'fresh'
  }
];

const PRODUCER_CONSTRAINTS: Record<string, string[]> = {
  musician: ['Use only live recorded chords.', 'Automate every filter sweep by hand.', 'Stack no more than four layers.'],
  sampler: ['Chop the clip into 12 micro-slices.', 'Reverse every other hit.', 'Pitch the sample to a minor 3rd.'],
  'sound-designer': ['No reverb allowed.', 'Only distortion and delay as FX.', 'Resample every sound twice.']
};

const PRODUCER_FX_IDEAS: Record<RelevanceTone, string[]> = {
  funny: ['Drop in cartoon risers before each drop.', 'Sidechain the beat to a laugh track.', 'Automate a tape-stop punchline.'],
  deep: ['Layer evolving granular pads under the hook.', 'Automate micro pitch drift for nostalgia.', 'Sidechain to vocal breaths for intimacy.'],
  dark: ['Sculpt a sub drop with bitcrush edges.', 'Gate the reverb to feel claustrophobic.', 'Use ring modulation for menace.']
};

const VIDEO_SNIPPETS: InspirationClip[] = [
  { title: 'Tokyo Crosswalk Rush', description: 'Crowd energy, neon signage blur.', url: 'https://pexels.example/tokyo', timeframe: 'recent', tone: 'funny' },
  { title: 'Abandoned Warehouse Pan', description: 'Echoes, reverb-friendly re-sampling.', url: 'https://pexels.example/warehouse', timeframe: 'recent', tone: 'dark' },
  { title: 'Sunset Skateboard Loop', description: 'Warm motion, perfect for halftime drops.', url: 'https://pexels.example/skate', timeframe: 'fresh', tone: 'deep' }
];

const PRODUCER_KEYS = ['G minor', 'D minor', 'A♭ major', 'E♭ dorian', 'C lydian'];
const BPM_RANGES: Record<string, [number, number]> = {
  musician: [88, 110],
  sampler: [70, 98],
  'sound-designer': [50, 140]
};

const EDITOR_CLIPS: InspirationClip[] = [
  { title: 'Breaking News Lower Third', description: 'Bold kinetic text animation.', timeframe: 'fresh', tone: 'funny' },
  { title: 'Lo-fi Study Loop', description: 'Calming desk scene with particles.', timeframe: 'timeless', tone: 'deep' },
  { title: 'Storm Timelapse', description: 'Build tension with dramatic clouds.', timeframe: 'recent', tone: 'dark' },
  { title: 'Pixel Art City Scroll', description: 'Retro vibe for meme mashups.', timeframe: 'timeless', tone: 'funny' },
  { title: 'Drone Shot Forest Mist', description: 'Cinematic establishing shot.', timeframe: 'recent', tone: 'deep' }
];

const EDITOR_AUDIO_PROMPTS: MemeSound[] = [
  { name: 'Tape Rewind', description: 'Use as a transition sting.', tone: 'funny' },
  { name: 'Ambient Hum', description: 'Lay a subtle bed under narration.', tone: 'deep' },
  { name: 'Dystopian Pulse', description: 'Add tension between cuts.', tone: 'dark' }
];

const VISUAL_CONSTRAINTS: Record<string, string[]> = {
  'image-editor': ['Use only three colors.', 'Include one hand-drawn element.', 'Make the focal point off-center.'],
  'video-editor': ['Keep every shot under 2.5 seconds.', 'Include at least one match cut.', 'Use a snap zoom as a punchline.'],
  'audio-editor': ['Pan one element fully left or right.', 'Mute the beat for a strategic breath.', 'Filter sweep into each section change.']
};

const TIMELINE_BEATS: Record<RelevanceSemantic, string[]> = {
  tight: ['Intro 0-2s: Hook teaser.', '2-6s: Rapid montage.', '6-10s: Hold on hero moment.'],
  balanced: ['Intro 0-3s: Establish mood.', '3-8s: Build narrative layers.', '8-12s: Deliver punchline + CTA.'],
  wild: ['Intro: Drop into chaos immediately.', 'Keep jump cuts under 1s.', 'End with unexpected silence.']
};

const EDITOR_FORMATS: Record<string, string> = {
  'image-editor': '1080x1350 portrait',
  'video-editor': 'TikTok 9:16 · 12s target',
  'audio-editor': 'Podcast clip · 45s limit'
};

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function filterByTimeframe<T extends { timeframe: RelevanceTimeframe }>(items: T[], timeframe: RelevanceTimeframe): T[] {
  const filtered = items.filter((item) => item.timeframe === timeframe);
  return filtered.length ? filtered : items;
}

function filterByTone<T extends { tone: RelevanceTone }>(items: T[], tone: RelevanceTone): T[] {
  const filtered = items.filter((item) => item.tone === tone);
  return filtered.length ? filtered : items;
}

function pickPowerWords(genre: string | undefined, filters: RelevanceFilter): string[] {
  const pool = LYRICIST_POWER_WORDS.filter((word) => {
    const matchesGenre = genre ? word.genres.includes(genre) : true;
    const matchesTone = word.tone === filters.tone || filters.tone === 'funny';
    return matchesGenre && matchesTone;
  });
  const candidates = pool.length ? pool : LYRICIST_POWER_WORDS;
  const shuffled = [...candidates].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 4).map((entry) => entry.value);
}

function pickMemeSound(filters: RelevanceFilter): MemeSound {
  const matchesTone = filterByTone(MEME_SOUNDS, filters.tone);
  return randomItem(matchesTone);
}

function pickNewsPrompt(filters: RelevanceFilter): NewsPrompt {
  const matchesTime = filterByTimeframe(NEWS_PROMPTS, filters.timeframe);
  return randomItem(matchesTime);
}

function buildTopicChallenge(tone: RelevanceTone, timeframe: RelevanceTimeframe): string {
  const templates = TOPIC_CHALLENGE_TEMPLATES[tone];
  const word = timeframe === 'fresh' ? 'week' : timeframe === 'recent' ? 'season' : 'decade';
  const template = randomItem(templates);
  return template.replace('{timeframe}', word);
}

function buildLyricistPack(request: ModePackRequest, filters: RelevanceFilter): LyricistModePack {
  const genre = (request.genre || 'r&b').toLowerCase();
  const storyArcStart = randomItem(['anxious', 'charged', 'hushed', 'hopeful']);
  const storyArcMiddle = randomItem(['surging', 'spiraling', 'floating', 'locked-in']);
  const storyArcEnd = randomItem(['victorious', 'resolved', 'haunted', 'weightless']);

  const pack: LyricistModePack = {
    id: createId('lyricist'),
    timestamp: Date.now(),
    mode: 'lyricist',
    submode: request.submode,
    title: `${genre.toUpperCase()} spark session`,
    headline: request.submode === 'rapper' ? 'Flip a headline into punchlines.' : 'Sing the feeling behind the headline.',
    summary: 'Curated power words, flows, chords, and a live headline to riff on.',
    filters,
    genre,
    powerWords: pickPowerWords(genre, filters),
    rhymeFamilies: RHYME_FAMILIES[request.submode] || RHYME_FAMILIES.rapper,
    flowPrompts: FLOW_PROMPTS[filters.semantic],
    memeSound: pickMemeSound(filters),
    topicChallenge: buildTopicChallenge(filters.tone, filters.timeframe),
    newsPrompt: pickNewsPrompt(filters),
    storyArc: { start: storyArcStart, middle: storyArcMiddle, end: storyArcEnd },
    chordMood: randomItem(CHORD_MOODS[request.submode] || CHORD_MOODS.singer),
    lyricFragments: LYRIC_FRAGMENTS[request.submode] || LYRIC_FRAGMENTS.singer
  };

  return pack;
}

function randomBpm(range: [number, number]): number {
  const [min, max] = range;
  return Math.round(Math.random() * (max - min) + min);
}

function buildProducerPack(request: ModePackRequest, filters: RelevanceFilter): ProducerModePack {
  const range = BPM_RANGES[request.submode] || [80, 130];
  const bpm = randomBpm(range);
  const sample = randomItem(filterByTimeframe(SAMPLE_POOL, filters.timeframe));
  const secondary = randomItem(filterByTimeframe(SECONDARY_SAMPLE_POOL, filters.timeframe));
  const fxIdeas = PRODUCER_FX_IDEAS[filters.tone];
  const constraints = PRODUCER_CONSTRAINTS[request.submode] || PRODUCER_CONSTRAINTS.musician;
  const video = randomItem(filterByTone(VIDEO_SNIPPETS, filters.tone));

  return {
    id: createId('producer'),
    timestamp: Date.now(),
    mode: 'producer',
    submode: request.submode,
    title: `${request.submode.replace('-', ' ')} lab session`,
    headline: 'Flip textures into something unrecognizable.',
    summary: 'Samples, FX prompts, and guardrails tuned to your vibe.',
    filters,
    bpm,
    key: randomItem(PRODUCER_KEYS),
    sample,
    secondarySample: secondary,
    constraints,
    fxIdeas,
    instrumentPalette: ['Analog synth pad', 'Granular vox chop', 'Live percussion loop'],
    videoSnippet: video,
    challenge: filters.semantic === 'wild' ? 'Create tension by muting the drums for eight bars.' : 'Cook a drop that surprises the crowd by bar four.'
  };
}

function buildEditorPack(request: ModePackRequest, filters: RelevanceFilter): EditorModePack {
  const clips = [...filterByTimeframe(EDITOR_CLIPS, filters.timeframe)].sort(() => 0.5 - Math.random()).slice(0, 3);
  const audioPrompts = filterByTone(EDITOR_AUDIO_PROMPTS, filters.tone);
  const constraints = VISUAL_CONSTRAINTS[request.submode] || VISUAL_CONSTRAINTS['video-editor'];
  const timeline = TIMELINE_BEATS[filters.semantic];
  const format = EDITOR_FORMATS[request.submode] || '16:9 classic';

  return {
    id: createId('editor'),
    timestamp: Date.now(),
    mode: 'editor',
    submode: request.submode,
    title: `${request.submode.replace('-', ' ')} challenge card`,
    headline: 'Cut to the beat of culture.',
    summary: 'Moodboard clips, sonic cues, and timeline beats assembled.',
    filters,
    format,
    durationSeconds: request.submode === 'video-editor' ? 12 : 30,
    moodboard: clips,
    audioPrompts: audioPrompts,
    visualConstraints: constraints,
    timelineBeats: timeline,
    challenge: filters.tone === 'dark' ? 'Make chaos feel cinematic.' : filters.tone === 'deep' ? 'Deliver goosebumps in under 12 seconds.' : 'Land a punchline before the audience scrolls away.',
    titlePrompt: filters.timeframe === 'fresh' ? 'Hope in Chaos' : filters.timeframe === 'recent' ? 'Echoes of Yesterday' : 'Legendary Remix'
  };
}

export function listModeDefinitions(): ModeDefinition[] {
  return MODE_DEFINITIONS;
}

function validateFilters(filters?: Partial<RelevanceFilter>): RelevanceFilter {
  return {
    timeframe: filters?.timeframe ?? DEFAULT_FILTERS.timeframe,
    tone: filters?.tone ?? DEFAULT_FILTERS.tone,
    semantic: filters?.semantic ?? DEFAULT_FILTERS.semantic
  };
}

export function generateModePack(mode: CreativeMode, request: ModePackRequest): ModePack {
  const filters = validateFilters(request.filters);

  switch (mode) {
    case 'lyricist':
      return buildLyricistPack(request, filters);
    case 'producer':
      return buildProducerPack(request, filters);
    case 'editor':
      return buildEditorPack(request, filters);
    default:
      throw new Error(`Unsupported mode: ${mode}`);
  }
}

export function listMockWords(filters?: Partial<RelevanceFilter>): string[] {
  const applied = validateFilters(filters);
  return LYRICIST_POWER_WORDS.filter((word) => word.timeframe === applied.timeframe).map((word) => word.value);
}

export function listMockMemes(filters?: Partial<RelevanceFilter>): MemeSound[] {
  const applied = validateFilters(filters);
  return filterByTone(MEME_SOUNDS, applied.tone);
}

export function listMockSamples(filters?: Partial<RelevanceFilter>): SampleReference[] {
  const applied = validateFilters(filters);
  return filterByTimeframe(SAMPLE_POOL, applied.timeframe);
}

export function listMockNews(filters?: Partial<RelevanceFilter>): NewsPrompt[] {
  const applied = validateFilters(filters);
  return filterByTimeframe(NEWS_PROMPTS, applied.timeframe);
}
