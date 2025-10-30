import { FuelPack, EmotionalArc, SampleChallenge } from './types';

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

export function generateFuelPack(): FuelPack {
  return {
    id: `fuel-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    timestamp: Date.now(),
    words: getRandomItems(WORDS, 6),
    memes: getRandomItems(MEMES, 3),
    emotionalArc: generateEmotionalArc(),
    sampleChallenge: generateSampleChallenge()
  };
}
