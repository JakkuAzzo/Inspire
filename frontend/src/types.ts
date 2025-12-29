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

export interface StoryArcNode {
  id: string;
  label: string;
  text: string;
}

export interface StoryArcScaffold {
  theme: string;
  protagonistPOV: string;
  incitingMoment: string;
  risingTension: string;
  turningPoint: string;
  chorusThesis: string;
  bridgeTwist: string;
  resolution: string;
  motifs: string[];
  punchyLines: string[];
  nodes: StoryArcNode[];
  model: string;
  rawText?: string;
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
  backgroundImage?: string;
  accent: string;
  submodes: ModeSubmode[];
}

export interface ModeSubmode {
  id: string;
  label: string;
  description: string;
}

export interface RemixMeta {
  author: string;
  packId: string;
  generation: number;
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
  author?: string;
  remixOf?: RemixMeta;
  remixLineage?: RemixMeta[];
}

export interface ModePackRequest {
  submode: string;
  filters?: RelevanceFilter;
  tone?: RelevanceTone;
  timeframe?: RelevanceTimeframe;
  semantic?: RelevanceSemantic;
  relevance?: Partial<RelevanceFilter>;
  mood?: string;
  genre?: string;
  wordOptions?: WordGeneratorOptions;
}

export interface MemeTemplate {
	id: string;
	name: string;
	url: string;
	width: number;
	height: number;
	box_count?: number;
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
  url?: string;
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
  wordLab: WordIdea[];
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
  referenceInstrumentals: InspirationClip[];
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

export type InspireAnyPack = FuelPack | ModePack;

export interface CommunityPost {
  id: string;
  author: string;
  avatar?: string;
  contentType: 'text' | 'link' | 'audio' | 'video' | 'beat';
  content: string;
  packId?: string;
  remixOf?: RemixMeta;
  createdAt: string;
  reactions: number;
  comments: number;
  remixCount: number;
  featuredPack?: ModePack;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  constraints: string[];
  reward?: string;
  expiresAt: string;
  streakCount?: number;
}

export interface ChallengeActivity {
  id: string;
  handle: string;
  status: 'accepted' | 'submitted';
  timestamp: string;
  activity: string;
  type?: string;
}

export interface ChallengeAchievement {
  id: string;
  title: string;
  description: string;
  unlockedAt?: string;
}

export interface ChallengeCompletion {
  challengeId: string;
  completedAt: string;
}

export interface ChallengeStats {
  userId: string;
  streak: number;
  totalCompletions: number;
  lastCompletedAt: string | null;
  achievements: ChallengeAchievement[];
  completions: ChallengeCompletion[];
  completedToday?: boolean;
}

export type WorkspaceQueueItemType = 'youtube' | 'stream' | 'instrumental' | 'reference';

export interface WorkspaceQueueItem {
  id: string;
  type: WorkspaceQueueItemType;
  title: string;
  url: string;
  description?: string;
  duration?: string;
  author?: string;
  thumbnail?: string;
  matchesPack?: string;
  searchQuery?: string;
}

export interface WordGeneratorOptions {
  startsWith?: string;
  rhymeWith?: string;
  syllables?: number;
  maxResults?: number;
  topic?: string;
  tone?: RelevanceTone;
  semantic?: RelevanceSemantic;
  mood?: string;
  timeframe?: RelevanceTimeframe;
  tags?: string[];
}

export interface WordIdea {
  word: string;
  score?: number;
  numSyllables?: number;
}
