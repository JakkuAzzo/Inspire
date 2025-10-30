export interface FuelPack {
  id: string;
  timestamp: number;
  words: string[];
  memes: string[];
  emotionalArc: EmotionalArc;
  sampleChallenge: SampleChallenge;
  mood: string;
  prompt: string;
  colorPalette: string[];
  tempo: string;
  wildcard: string;
  inspiration: Inspiration;
  vibe: string;
}

export interface EmotionalArc {
  start: string;
  middle: string;
  end: string;
}

export interface SampleChallenge {
  type: string;
  description: string;
  constraint: string;
}

export interface Inspiration {
  quote: string;
  author: string;
}

export type CreativeMode = 'lyricist' | 'producer' | 'editor';

export type RelevanceTimeframe = 'fresh' | 'recent' | 'timeless';
export type RelevanceTone = 'funny' | 'deep' | 'dark';
export type RelevanceSemantic = 'tight' | 'balanced' | 'wild';

export interface RelevanceFilter {
  timeframe: RelevanceTimeframe;
  tone: RelevanceTone;
  semantic: RelevanceSemantic;
}

export interface ModeDefinition {
  id: CreativeMode;
  label: string;
  description: string;
  icon: string;
  accent: string;
  submodes: ModeSubmode[];
}

export interface ModeSubmode {
  id: string;
  label: string;
  description: string;
}

export interface ModePackBase {
  id: string;
  timestamp: number;
  mode: CreativeMode;
  submode: string;
  title: string;
  headline: string;
  summary: string;
  filters: RelevanceFilter;
}

export interface ModePackRequest {
  submode: string;
  filters: RelevanceFilter;
  genre?: string;
}

export interface MemeSound {
  name: string;
  description: string;
  tone: RelevanceTone;
  sampleUrl?: string;
}

export interface NewsPrompt {
  headline: string;
  context: string;
  timeframe: RelevanceTimeframe;
  source: string;
}

export interface SampleReference {
  title: string;
  source: string;
  url: string;
  tags: string[];
  timeframe: RelevanceTimeframe;
}

export interface InspirationClip {
  title: string;
  description: string;
  url?: string;
  timeframe: RelevanceTimeframe;
  tone: RelevanceTone;
}

export interface LyricistModePack extends ModePackBase {
  mode: 'lyricist';
  genre: string;
  powerWords: string[];
  rhymeFamilies: string[];
  flowPrompts: string[];
  memeSound: MemeSound;
  topicChallenge: string;
  newsPrompt: NewsPrompt;
  storyArc: EmotionalArc;
  chordMood: string;
  lyricFragments: string[];
}

export interface ProducerModePack extends ModePackBase {
  mode: 'producer';
  bpm: number;
  key: string;
  sample: SampleReference;
  secondarySample: SampleReference;
  constraints: string[];
  fxIdeas: string[];
  instrumentPalette: string[];
  videoSnippet: InspirationClip;
  challenge: string;
}

export interface EditorModePack extends ModePackBase {
  mode: 'editor';
  format: string;
  durationSeconds: number;
  moodboard: InspirationClip[];
  audioPrompts: MemeSound[];
  visualConstraints: string[];
  timelineBeats: string[];
  challenge: string;
  titlePrompt: string;
}

export type ModePack = LyricistModePack | ProducerModePack | EditorModePack;
