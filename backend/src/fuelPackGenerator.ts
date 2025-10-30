import { FuelPack, EmotionalArc, SampleChallenge, Inspiration } from './types';

// Creative word pools for inspiration
const WORDS = [
  'eclipse', 'velvet', 'neon', 'gravity', 'phoenix', 'chaos', 'silk', 'thunder',
  'shadow', 'crystal', 'fire', 'ocean', 'midnight', 'electric', 'golden', 'diamond',
  'cosmic', 'savage', 'smooth', 'heavy', 'light', 'dark', 'wild', 'tame',
  'rise', 'fall', 'break', 'build', 'lost', 'found', 'whisper', 'scream',
  'dream', 'nightmare', 'reality', 'fantasy', 'truth', 'lies', 'pain', 'joy',
  'love', 'hate', 'peace', 'war', 'hope', 'fear', 'faith', 'doubt'
];

// Meme concepts and cultural references
const MEMES = [
  'Distracted Boyfriend energy',
  'This is fine (burning room)',
  'Drake approving/disapproving',
  'Expanding brain levels',
  'Two buttons dilemma',
  'Is this a pigeon?',
  'Big brain time',
  'Stonks vibes',
  'Confused math lady',
  'Galaxy brain moment',
  'Uno reverse card',
  'Task failed successfully',
  'Surprised Pikachu face',
  'Change my mind setup',
  'Awkward look monkey puppet'
];

// Emotional states for arc creation
const EMOTIONS = [
  'hopeful', 'melancholic', 'euphoric', 'anxious', 'confident', 'vulnerable',
  'angry', 'peaceful', 'nostalgic', 'excited', 'contemplative', 'rebellious',
  'triumphant', 'defeated', 'introspective', 'energetic', 'calm', 'chaotic'
];

const MOODS = [
  'electric',
  'daydreamy',
  'stormy focus',
  'sunset mellow',
  'neon night drive',
  'retro future',
  'cosmic calm',
  'glitchy hype',
  'late-night coffee',
  'foggy skyline'
];

const PROMPT_PHRASES = [
  'Write about the moment the crowd goes quiet before the drop.',
  'Tell the story of the last voicemail you never sent.',
  'Describe a neon skyline using only five colors.',
  'Imagine a heist scene scored by string quartets.',
  'Create a hook that feels like a sunrise through concrete.',
  'Rap about a memory that only exists online.',
  'Write a chorus that flips a breakup into a victory lap.',
  'Paint the feeling of missing the last train home.',
  'Compose a beat that sounds like midnight rain on chrome.',
  'Sing from the perspective of an echo in a tunnel.'
];

const COLOR_PALETTES: string[][] = [
  ['#5B21B6', '#7C3AED', '#60A5FA'],
  ['#F59E0B', '#EF4444', '#F97316'],
  ['#22D3EE', '#6366F1', '#3B82F6'],
  ['#F472B6', '#C084FC', '#38BDF8'],
  ['#84CC16', '#FDE68A', '#F97316'],
  ['#0EA5E9', '#312E81', '#1D4ED8'],
  ['#FB7185', '#F472B6', '#9D174D']
];

const TEMPOS = [
  '72 BPM · smoky boom-bap',
  '84 BPM · melancholy trap',
  '95 BPM · soulful swing',
  '110 BPM · shimmering house',
  '128 BPM · festival energy',
  '140 BPM · drill momentum'
];

const WILDCARDS = [
  'Loop the sound of a subway brake as percussion.',
  'Sample the oldest voice memo on your phone.',
  'Use only reversed sounds for your intro.',
  'Include a line in another language you barely know.',
  'Steal a rhyme scheme from a nursery rhyme.',
  'Start with the chorus—write verses last.'
];

const VIBES = [
  'For poets chasing blurry city lights.',
  'For late-night producers with headphones too loud.',
  'For writers who keep notebooks under the pillow.',
  'For vocalists who freestyle in the shower.',
  'For beatmakers who sample VHS tapes.'
];

const INSPIRATIONS: Inspiration[] = [
  {
    quote: 'Creativity is the residue of time wasted.',
    author: 'Albert Einstein'
  },
  {
    quote: 'You can’t use up creativity. The more you use, the more you have.',
    author: 'Maya Angelou'
  },
  {
    quote: 'The true sign of intelligence is not knowledge but imagination.',
    author: 'Albert Einstein'
  },
  {
    quote: 'Everything you can imagine is real.',
    author: 'Pablo Picasso'
  },
  {
    quote: 'Art is chaos taking shape.',
    author: 'Pablo Picasso'
  }
];

// Sample challenge types
const CHALLENGE_TYPES = [
  {
    type: 'Time Constraint',
    descriptions: [
      'Make a beat in under 5 minutes',
      'Write 16 bars in 10 minutes',
      'Record vocals in one take'
    ],
    constraints: [
      'No second-guessing allowed',
      'First idea is the final idea',
      'No editing after time is up'
    ]
  },
  {
    type: 'Style Fusion',
    descriptions: [
      'Combine trap with jazz',
      'Mix drill with R&B',
      'Blend lo-fi with drill'
    ],
    constraints: [
      'Must have elements of both styles',
      'Keep it under 3 minutes',
      'Make it danceable'
    ]
  },
  {
    type: 'Sample Flip',
    descriptions: [
      'Sample a classical piece',
      'Use a dialogue from a movie',
      'Sample a nature sound'
    ],
    constraints: [
      'Make it unrecognizable',
      'Use at least 3 variations',
      'No obvious loops'
    ]
  },
  {
    type: 'Vocal Challenge',
    descriptions: [
      'Record without any autotune',
      'Double every line with a different delivery',
      'Use three different vocal textures'
    ],
    constraints: [
      'Raw emotion only',
      'No punch-ins allowed',
      'Keep natural imperfections'
    ]
  },
  {
    type: 'Limited Tools',
    descriptions: [
      'Use only stock plugins',
      'Make a beat with 3 sounds max',
      'One instrument only'
    ],
    constraints: [
      'No external samples allowed',
      'Creativity over complexity',
      'Make it slap anyway'
    ]
  }
];

function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateEmotionalArc(): EmotionalArc {
  const emotions = getRandomItems(EMOTIONS, 3);
  return {
    start: emotions[0],
    middle: emotions[1],
    end: emotions[2]
  };
}

function generateSampleChallenge(): SampleChallenge {
  const challengeType = getRandomItem(CHALLENGE_TYPES);
  return {
    type: challengeType.type,
    description: getRandomItem(challengeType.descriptions),
    constraint: getRandomItem(challengeType.constraints)
  };
}

export interface GenerateOptions {
  words?: number;
  memes?: number;
}

export function generateFuelPack(options?: GenerateOptions): FuelPack {
  const wordsCount = options?.words ?? 6;
  const memesCount = options?.memes ?? 3;
  const inspiration = getRandomItem(INSPIRATIONS);

  return {
    id: `fuel-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    timestamp: Date.now(),
    words: getRandomItems(WORDS, Math.max(0, Math.min(wordsCount, WORDS.length))),
    memes: getRandomItems(MEMES, Math.max(0, Math.min(memesCount, MEMES.length))),
    emotionalArc: generateEmotionalArc(),
    sampleChallenge: generateSampleChallenge(),
    mood: getRandomItem(MOODS),
    prompt: getRandomItem(PROMPT_PHRASES),
    colorPalette: getRandomItem(COLOR_PALETTES),
    tempo: getRandomItem(TEMPOS),
    wildcard: getRandomItem(WILDCARDS),
    inspiration,
    vibe: getRandomItem(VIBES)
  };
}
