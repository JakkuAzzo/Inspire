import {
  CreativeMode,
  DAWModePack,
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
  NewsPrompt,
  WordGeneratorOptions,
  WordIdea
} from './types';
import { createId } from './utils/id';
import { WordService } from './services/wordService';
import { AudioService, Sound, Track } from './services/audioService';
import { TrendService } from './services/trendService';
import { YouTubeService, InstrumentalVideo } from './services/youtubeService';
import { Meme } from './services/memeService';
import { mockMemes } from './mocks/memeMocks';

export interface ModePackServices {
  wordService?: WordService;
  audioService?: AudioService;
  trendService?: TrendService;
  youtubeService?: YouTubeService;
}

const MODE_DEFINITIONS: ModeDefinition[] = [
  {
    id: 'lyricist',
    label: 'Writer Lab',
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

function appendDistinctTags(base: string[], extra: Array<string | undefined>): string[] {
  const normalizedExtras = extra
    .filter((value): value is string => Boolean(value))
    .map((value) => value!.toLowerCase().trim())
    .filter(Boolean);
  return Array.from(new Set([...base, ...normalizedExtras]));
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

type WordResolutionResult = { powerWords: string[]; wordLab: WordIdea[] };

function fallbackWordIdeas(genre: string, filters: RelevanceFilter): WordResolutionResult {
  const fallbackPool = LYRICIST_POWER_WORDS.filter((word) => genre ? word.genres.includes(genre) : true);
  const shuffled = [...(fallbackPool.length ? fallbackPool : LYRICIST_POWER_WORDS)].sort(() => 0.5 - Math.random());
  const labEntries = shuffled.slice(0, 8);
  const powerWords = labEntries.slice(0, 4).map((entry) => entry.value);
  const wordLab: WordIdea[] = labEntries.map((entry, index) => ({
    word: entry.value,
    score: 95 - index * 5,
    numSyllables: Math.max(1, entry.value.split(/[-\s]/).length)
  }));
  return { powerWords, wordLab };
}

async function resolveWordIdeas(
  genre: string,
  filters: RelevanceFilter,
  request: ModePackRequest,
  services: ModePackServices,
  mood?: string
): Promise<WordResolutionResult> {
  if (!services.wordService) {
    return fallbackWordIdeas(genre, filters);
  }

  const defaults: WordGeneratorOptions = {
    topic: genre,
    rhymeWith: request.submode === 'rapper' ? 'flow' : 'soul',
    maxResults: 18,
    tone: filters.tone,
    semantic: filters.semantic,
    mood,
    timeframe: filters.timeframe,
    tags: appendDistinctTags(request.wordOptions?.tags || [], [genre, mood, filters.tone])
  };

  const mergedOptions: WordGeneratorOptions = {
    ...defaults,
    ...request.wordOptions,
    tags: appendDistinctTags(defaults.tags ?? [], request.wordOptions?.tags ?? [])
  };

  try {
    const results = await services.wordService.searchWords(mergedOptions);
    if (!results.length) {
      return fallbackWordIdeas(genre, filters);
    }

    const ideas: WordIdea[] = results.slice(0, 12).map((entry) => ({
      word: entry.word,
      score: entry.score,
      numSyllables: entry.numSyllables
    }));

    const topWords = ideas.slice(0, 4).map((idea) => idea.word);
    const fallbackWords = fallbackWordIdeas(genre, filters);

    return {
      powerWords: topWords.length >= 4 ? topWords : [...topWords, ...fallbackWords.powerWords].slice(0, 4),
      wordLab: ideas
    };
  } catch (error) {
    console.warn('[ModePack] Word service failed, using fallback ideas', error);
    return fallbackWordIdeas(genre, filters);
  }
}

async function resolveNewsPrompt(
  filters: RelevanceFilter,
  services: ModePackServices,
  mood?: string,
  genre?: string
): Promise<NewsPrompt> {
  if (!services.trendService) {
    return pickNewsPrompt(filters);
  }
  try {
    const keywords = [
      genre,
      filters.tone,
      filters.semantic === 'wild' ? 'remix' : 'story',
      mood,
      filters.timeframe === 'fresh' ? 'breaking' : 'culture'
    ].filter(Boolean);
    const query = keywords.length ? keywords.join(' ') : 'music creativity culture';
    const stories = await services.trendService.searchNews(query, filters.timeframe === 'fresh' ? 'publishedAt' : 'popularity', 6);
    const article = stories.find((story) => story.title);
    if (!article) return pickNewsPrompt(filters);
    return {
      headline: article.title,
      context: article.description || 'Blend this headline into your next piece.',
      timeframe: filters.timeframe,
      source: article.source?.name || 'NewsAPI',
      url: article.url
    };
  } catch (error) {
    console.warn('[ModePack] News service failed, using fallback headline', error);
    return pickNewsPrompt(filters);
  }
}

function sampleQueryFrom(request: ModePackRequest, filters: RelevanceFilter, mood?: string): string {
  const moodKeyword = mood ? `${mood} ` : '';
  if (request.submode === 'musician') {
    return `${moodKeyword}${filters.tone === 'deep' ? 'soulful chords loop' : 'melodic loop'}`.trim();
  }
  if (request.submode === 'sound-designer') {
    return `${moodKeyword}texture foley fx`.trim();
  }
  const semanticKeyword = filters.semantic === 'wild' ? 'experimental ' : '';
  return `${moodKeyword}${semanticKeyword}sample pack drums`.trim();
}

function tagSampleReference(sample: SampleReference, filters: RelevanceFilter, mood?: string): SampleReference {
  return {
    ...sample,
    tags: appendDistinctTags(sample.tags || [], [filters.tone, filters.semantic, filters.timeframe, mood])
  };
}

function toSampleReferenceFromSound(sound: Sound, filters: RelevanceFilter, mood?: string): SampleReference {
  return tagSampleReference(
    {
      title: sound.name,
      source: `Freesound ${sound.id}`,
      url:
        sound.previews?.['preview-hq-mp3'] || sound.previews?.['preview-lq-mp3'] || `https://freesound.org/s/${sound.id}/`,
      tags: sound.tags || [],
      timeframe: filters.timeframe
    },
    filters,
    mood
  );
}

function toSampleReferenceFromTrack(track: Track, filters: RelevanceFilter, mood?: string): SampleReference {
  return tagSampleReference(
    {
      title: track.name,
      source: `Jamendo · ${track.artist_name}`,
      url: track.audio || track.audiodownload || `https://www.jamendo.com/track/${track.id}`,
      tags: track.tags || [],
      timeframe: filters.timeframe
    },
    filters,
    mood
  );
}

async function resolvePrimarySample(
  request: ModePackRequest,
  filters: RelevanceFilter,
  services: ModePackServices,
  mood?: string
): Promise<SampleReference> {
  if (!services.audioService) {
    return tagSampleReference(randomItem(filterByTimeframe(SAMPLE_POOL, filters.timeframe)), filters, mood);
  }
  try {
    const query = sampleQueryFrom(request, filters, mood);
    const sounds = await services.audioService.searchSounds(query, 8);
    const chosen = sounds.find(Boolean);
    if (chosen) {
      return toSampleReferenceFromSound(chosen, filters, mood);
    }
  } catch (error) {
    console.warn('[ModePack] Primary sample lookup failed, using fallback', error);
  }
  return tagSampleReference(randomItem(filterByTimeframe(SAMPLE_POOL, filters.timeframe)), filters, mood);
}

async function resolveSecondarySample(
  request: ModePackRequest,
  filters: RelevanceFilter,
  services: ModePackServices,
  mood?: string
): Promise<SampleReference> {
  if (!services.audioService) {
    return tagSampleReference(randomItem(filterByTimeframe(SECONDARY_SAMPLE_POOL, filters.timeframe)), filters, mood);
  }
  try {
    const query = request.submode === 'sampler' ? `obscure vinyl sample ${mood ?? ''}`.trim() : `${filters.tone} instrumental ${mood ?? ''}`.trim();
    const tracks = await services.audioService.searchTracks(query, 6);
    const track = tracks.find(Boolean);
    if (track) {
      return toSampleReferenceFromTrack(track, filters, mood);
    }
  } catch (error) {
    console.warn('[ModePack] Secondary sample lookup failed, using fallback', error);
  }
  return tagSampleReference(randomItem(filterByTimeframe(SECONDARY_SAMPLE_POOL, filters.timeframe)), filters, mood);
}

function fallbackInstrumentals(filters: RelevanceFilter): InspirationClip[] {
  return filterByTone(VIDEO_SNIPPETS, filters.tone).slice(0, 3);
}

function instrumentalToClip(video: InstrumentalVideo, filters: RelevanceFilter): InspirationClip {
  return {
    title: video.title,
    description: video.uploader,
    url: video.url,
    timeframe: filters.timeframe,
    tone: filters.tone
  };
}

async function resolveInstrumentals(
  request: ModePackRequest,
  filters: RelevanceFilter,
  services: ModePackServices,
  mood?: string
): Promise<InspirationClip[]> {
  if (!services.youtubeService) {
    return fallbackInstrumentals(filters);
  }
  try {
    const query = `${request.submode.replace('-', ' ')} instrumental ${filters.tone} ${mood ?? ''}`.trim();
    const instrumentals = await services.youtubeService.searchInstrumentals(query, 4);
    if (!instrumentals.length) {
      return fallbackInstrumentals(filters);
    }
    return instrumentals.map((video) => instrumentalToClip(video, filters));
  } catch (error) {
    console.warn('[ModePack] Instrumental lookup failed, using fallback', error);
    return fallbackInstrumentals(filters);
  }
}

async function buildLyricistPack(
  request: ModePackRequest,
  filters: RelevanceFilter,
  services: ModePackServices,
  mood?: string
): Promise<LyricistModePack> {
  const genre = (request.genre || 'r&b').toLowerCase();
  const storyArcStart = randomItem(['anxious', 'charged', 'hushed', 'hopeful']);
  const storyArcMiddle = randomItem(['surging', 'spiraling', 'floating', 'locked-in']);
  const storyArcEnd = randomItem(['victorious', 'resolved', 'haunted', 'weightless']);
  const { powerWords, wordLab } = await resolveWordIdeas(genre, filters, request, services, mood);
  const newsPrompt = await resolveNewsPrompt(filters, services, mood, genre);

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
    powerWords,
    rhymeFamilies: RHYME_FAMILIES[request.submode] || RHYME_FAMILIES.rapper,
    flowPrompts: FLOW_PROMPTS[filters.semantic],
    memeSound: pickMemeSound(filters),
    topicChallenge: buildTopicChallenge(filters.tone, filters.timeframe),
    newsPrompt,
    storyArc: { start: storyArcStart, middle: storyArcMiddle, end: storyArcEnd },
    chordMood: randomItem(CHORD_MOODS[request.submode] || CHORD_MOODS.singer),
    lyricFragments: LYRIC_FRAGMENTS[request.submode] || LYRIC_FRAGMENTS.singer,
    wordLab
  };

  return pack;
}

function randomBpm(range: [number, number]): number {
  const [min, max] = range;
  return Math.round(Math.random() * (max - min) + min);
}

async function buildProducerPack(
  request: ModePackRequest,
  filters: RelevanceFilter,
  services: ModePackServices,
  mood?: string
): Promise<ProducerModePack> {
  const range = BPM_RANGES[request.submode] || [80, 130];
  const bpm = randomBpm(range);
  const sample = await resolvePrimarySample(request, filters, services, mood);
  const secondary = await resolveSecondarySample(request, filters, services, mood);
  const fxIdeas = PRODUCER_FX_IDEAS[filters.tone];
  const constraints = PRODUCER_CONSTRAINTS[request.submode] || PRODUCER_CONSTRAINTS.musician;
  const video = randomItem(filterByTone(VIDEO_SNIPPETS, filters.tone));
  const referenceInstrumentals = await resolveInstrumentals(request, filters, services, mood);

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
    referenceInstrumentals,
    challenge: filters.semantic === 'wild' ? 'Create tension by muting the drums for eight bars.' : 'Cook a drop that surprises the crowd by bar four.'
  };
}

async function buildEditorPack(
  request: ModePackRequest,
  filters: RelevanceFilter,
  _services: ModePackServices,
  mood?: string
): Promise<EditorModePack> {
  const clips = [...filterByTone(filterByTimeframe(EDITOR_CLIPS, filters.timeframe), filters.tone)]
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);
  const audioPrompts = filterByTone(EDITOR_AUDIO_PROMPTS, filters.tone);
  const constraints = VISUAL_CONSTRAINTS[request.submode] || VISUAL_CONSTRAINTS['video-editor'];
  const timeline = TIMELINE_BEATS[filters.semantic];
  const format = EDITOR_FORMATS[request.submode] || '16:9 classic';
  const titleMood = mood ? mood.charAt(0).toUpperCase() + mood.slice(1) : undefined;
  const titlePrefix = titleMood ? `${titleMood} · ` : '';

  return {
    id: createId('editor'),
    timestamp: Date.now(),
    mode: 'editor',
    submode: request.submode,
    title: `${titlePrefix}${request.submode.replace('-', ' ')} challenge card`,
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

async function buildDAWPack(
  request: ModePackRequest,
  filters: RelevanceFilter,
  services: ModePackServices,
  mood?: string
): Promise<DAWModePack> {
  const submode = request.submode || 'lofi';
  
  // Define tempo ranges by submode
  const tempoRanges: Record<string, [number, number]> = {
    'lofi': [70, 90],
    'trap': [140, 160],
    'house': [120, 128],
    'experimental': [60, 180]
  };
  
  const [minTempo, maxTempo] = tempoRanges[submode] || [80, 120];
  const tempo = Math.floor(Math.random() * (maxTempo - minTempo + 1)) + minTempo;
  
  // Define key signatures based on tone
  const keys = filters.tone === 'dark' 
    ? ['Dm', 'Am', 'Gm', 'Em', 'Cm']
    : filters.tone === 'deep'
    ? ['Cmaj', 'Gmaj', 'Dmaj', 'Amaj', 'Fmaj']
    : ['Cmaj', 'Gmaj', 'Fmaj', 'Dmaj', 'Am'];
  const key = keys[Math.floor(Math.random() * keys.length)];
  
  // Define chord progressions by mood
  const chordProgressions: Record<string, string[][]> = {
    'dark': [['Dm', 'Bb', 'F', 'C'], ['Am', 'F', 'C', 'G'], ['Em', 'C', 'G', 'D']],
    'deep': [['Cmaj', 'Am', 'Fmaj', 'G'], ['Gmaj', 'Em', 'Cmaj', 'D'], ['Dmaj', 'Bm', 'Gmaj', 'A']],
    'funny': [['Cmaj', 'F', 'G', 'Am'], ['Gmaj', 'C', 'D', 'Em'], ['Fmaj', 'Bb', 'C', 'Dm']]
  };
  const progressions = chordProgressions[filters.tone] || chordProgressions['deep'];
  const chordProgression = progressions[Math.floor(Math.random() * progressions.length)];
  
  // Generate drum patterns by submode
  const drumPatterns: Record<string, any[]> = {
    'lofi': [
      { step: 0, drum: 'kick', velocity: 90, enabled: true },
      { step: 4, drum: 'snare', velocity: 85, enabled: true },
      { step: 8, drum: 'kick', velocity: 90, enabled: true },
      { step: 12, drum: 'snare', velocity: 85, enabled: true },
      { step: 2, drum: 'hihat', velocity: 60, enabled: true },
      { step: 6, drum: 'hihat', velocity: 60, enabled: true },
      { step: 10, drum: 'hihat', velocity: 60, enabled: true },
      { step: 14, drum: 'hihat', velocity: 60, enabled: true }
    ],
    'trap': [
      { step: 0, drum: 'kick', velocity: 127, enabled: true },
      { step: 6, drum: 'kick', velocity: 100, enabled: true },
      { step: 4, drum: 'snare', velocity: 120, enabled: true },
      { step: 12, drum: 'snare', velocity: 120, enabled: true },
      { step: 2, drum: 'hihat', velocity: 80, enabled: true },
      { step: 3, drum: 'hihat', velocity: 70, enabled: true },
      { step: 6, drum: 'hihat', velocity: 80, enabled: true },
      { step: 10, drum: 'hihat', velocity: 80, enabled: true },
      { step: 14, drum: 'hihat', velocity: 80, enabled: true }
    ],
    'house': [
      { step: 0, drum: 'kick', velocity: 110, enabled: true },
      { step: 4, drum: 'kick', velocity: 110, enabled: true },
      { step: 8, drum: 'kick', velocity: 110, enabled: true },
      { step: 12, drum: 'kick', velocity: 110, enabled: true },
      { step: 4, drum: 'clap', velocity: 100, enabled: true },
      { step: 12, drum: 'clap', velocity: 100, enabled: true },
      { step: 0, drum: 'hihat', velocity: 70, enabled: true },
      { step: 2, drum: 'hihat', velocity: 70, enabled: true },
      { step: 4, drum: 'hihat', velocity: 70, enabled: true },
      { step: 6, drum: 'hihat', velocity: 70, enabled: true },
      { step: 8, drum: 'hihat', velocity: 70, enabled: true },
      { step: 10, drum: 'hihat', velocity: 70, enabled: true },
      { step: 12, drum: 'hihat', velocity: 70, enabled: true },
      { step: 14, drum: 'hihat', velocity: 70, enabled: true }
    ],
    'experimental': [
      { step: 0, drum: 'kick', velocity: 100, enabled: true },
      { step: 5, drum: 'snare', velocity: 90, enabled: true },
      { step: 9, drum: 'kick', velocity: 100, enabled: true },
      { step: 13, drum: 'clap', velocity: 85, enabled: true },
      { step: 3, drum: 'perc', velocity: 75, enabled: true },
      { step: 7, drum: 'tom', velocity: 80, enabled: true },
      { step: 11, drum: 'crash', velocity: 95, enabled: true }
    ]
  };
  const drumPattern = drumPatterns[submode] || drumPatterns['lofi'];
  
  // Fetch samples from audio service
  const samples: any[] = [];
  
  try {
    // Search for different types of samples
    const searches = [
      { query: 'kick drum', limit: 3, type: 'kick' },
      { query: 'snare', limit: 2, type: 'snare' },
      { query: 'hi-hat', limit: 2, type: 'hihat' },
      { query: submode === 'lofi' ? 'jazz piano' : submode === 'trap' ? '808 bass' : 'synth pad', limit: 3, type: 'melodic' },
      { query: submode === 'house' ? 'vocal chop' : 'ambient texture', limit: 2, type: 'texture' }
    ];
    
    for (const search of searches) {
      if (services.audioService) {
        try {
          const sounds = await services.audioService.searchSounds(search.query, search.limit);
          sounds.forEach((sound: any) => {
            samples.push({
              id: sound.id,
              name: sound.name,
              duration: sound.duration || 1,
              url: sound.previews?.['preview-hq-mp3'] || sound.previews?.['preview-lq-mp3'] || '',
              source: 'freesound' as const,
              tags: sound.tags || [search.type],
              tempo: tempo
            });
          });
        } catch (err) {
          console.warn(`DAW pack: Failed to fetch ${search.query}, continuing with other samples`, err);
        }
      }
    }
  } catch (err) {
    console.warn('DAW pack: Audio service unavailable, using mock samples', err);
  }
  
  // If no samples fetched, provide mock samples
  if (samples.length === 0) {
    samples.push(
      { id: 'mock-kick-1', name: 'Kick Drum 1', duration: 0.5, url: '', source: 'local' as const, tags: ['kick'], tempo },
      { id: 'mock-snare-1', name: 'Snare 1', duration: 0.3, url: '', source: 'local' as const, tags: ['snare'], tempo },
      { id: 'mock-hihat-1', name: 'Hi-Hat 1', duration: 0.2, url: '', source: 'local' as const, tags: ['hihat'], tempo },
      { id: 'mock-pad-1', name: 'Synth Pad', duration: 4.0, url: '', source: 'local' as const, tags: ['pad'], tempo },
      { id: 'mock-bass-1', name: 'Bass Loop', duration: 2.0, url: '', source: 'local' as const, tags: ['bass'], tempo }
    );
  }
  
  // Define mood tags based on filters
  const moodTags = [
    filters.tone,
    filters.timeframe,
    submode,
    mood || 'creative'
  ];
  
  // Generate challenge based on semantic filter
  const challenges: Record<RelevanceSemantic, string> = {
    'tight': `Create a ${submode} track using only the provided samples. Stay within ${tempo} BPM and keep the ${key} key signature.`,
    'balanced': `Mix the drum pattern with at least 3 melodic samples. Experiment with panning and effects.`,
    'wild': `Chop the longest sample into 4+ pieces and rearrange them. Flip the tempo mid-track if you dare.`
  };
  const challenge = challenges[filters.semantic];
  
  return {
    id: createId('daw'),
    timestamp: Date.now(),
    mode: 'producer' as const, // DAW is producer-focused
    submode,
    title: `${submode.charAt(0).toUpperCase() + submode.slice(1)} DAW Session`,
    headline: `${tempo} BPM · ${key} · ${samples.length} samples loaded`,
    summary: `A curated pack of samples, drum patterns, and chord progressions for ${submode} production.`,
    filters,
    samples,
    drumPattern,
    key,
    tempo,
    chordProgression,
    moodTags,
    genre: submode,
    challenge
  };
}

export async function generateModePack(
  mode: CreativeMode,
  request: ModePackRequest,
  services: ModePackServices = {}
): Promise<ModePack> {
  const filters = validateFilters({
    ...request.filters,
    ...request.relevance,
    timeframe: request.timeframe ?? request.filters?.timeframe ?? request.relevance?.timeframe,
    tone: request.tone ?? request.filters?.tone ?? request.relevance?.tone,
    semantic: request.semantic ?? request.filters?.semantic ?? request.relevance?.semantic
  });
  const mood = request.mood?.trim().toLowerCase();

  switch (mode) {
    case 'lyricist':
      return await buildLyricistPack(request, filters, services, mood);
    case 'producer':
      return await buildProducerPack(request, filters, services, mood);
    case 'editor':
      return await buildEditorPack(request, filters, services, mood);
    default:
      throw new Error(`Unsupported mode: ${mode}`);
  }
}

export function listMockWords(filters?: Partial<RelevanceFilter>): string[] {
  const applied = validateFilters(filters);
  return LYRICIST_POWER_WORDS.filter((word) => word.timeframe === applied.timeframe).map((word) => word.value);
}

export function listMockMemes(filters?: Partial<RelevanceFilter>): Meme[] {
  const applied = validateFilters(filters);
  const pool = [...mockMemes];
  const seeded = Math.abs((applied.timeframe + applied.tone + applied.semantic).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  const sorted = pool
    .map((item, index) => ({ item, score: Math.sin(seeded + index) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
  return sorted.slice(0, Math.min(6, sorted.length));
}

export function listMockSamples(filters?: Partial<RelevanceFilter>): SampleReference[] {
  const applied = validateFilters(filters);
  return filterByTimeframe(SAMPLE_POOL, applied.timeframe);
}

export function listMockNews(filters?: Partial<RelevanceFilter>): NewsPrompt[] {
  const applied = validateFilters(filters);
  return filterByTimeframe(NEWS_PROMPTS, applied.timeframe);
}

export function listMockMemeSounds(filters?: Partial<RelevanceFilter>): MemeSound[] {
  const applied = validateFilters(filters);
  return filterByTone(MEME_SOUNDS, applied.tone);
}

// Export buildDAWPack for direct use in routes
export { buildDAWPack };
