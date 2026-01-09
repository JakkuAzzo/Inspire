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
  author?: string;
  remixOf?: RemixMeta;
  remixLineage?: RemixMeta[];
}

export interface RemixMeta {
  author: string;
  packId: string;
  generation: number;
}

export interface ModePackRequest {
  submode: string;
  filters?: RelevanceFilter;
  /** Optional top-level tone override for service providers */
  tone?: RelevanceTone;
  /** Optional timeframe override for service providers */
  timeframe?: RelevanceTimeframe;
  /** Optional semantic distance override for service providers */
  semantic?: RelevanceSemantic;
  /** Visual or emotional mood palette to bias content */
  mood?: string;
  /** Additional relevance tuning parameters */
  relevance?: Partial<RelevanceFilter>;
  genre?: string;
  wordOptions?: WordGeneratorOptions;
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

export interface DrumStep {
  step: number;
  drum: 'kick' | 'snare' | 'hihat' | 'clap' | 'tom' | 'crash' | 'ride' | 'perc';
  velocity: number;
  enabled: boolean;
}

export interface AudioSample {
  id: string;
  name: string;
  duration: number;
  url: string;
  source: 'freesound' | 'jamendo' | 'local';
  tags?: string[];
  tempo?: number;
}

export interface DAWModePack extends ModePackBase {
  mode: 'producer'; // DAW is a pack card within Producer Lab
  samples: AudioSample[];
  drumPattern?: DrumStep[];
  key: string;
  tempo: number;
  chordProgression?: string[];
  moodTags: string[];
  genre?: string;
  challenge?: string;
}

export type ModePack = LyricistModePack | ProducerModePack | EditorModePack | DAWModePack;

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

export interface ChallengeActivity {
  id: string;
  handle: string;
  status: 'accepted' | 'submitted';
  timestamp: string;
  activity: string;
  type?: string;
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

export interface StoryArcGenerateRequest {
  summary: string;
  theme?: string;
  genre?: string;
  bpm?: number;
  nodeCount?: number;
}

// ============ COLLABORATIVE SESSION TYPES ============

export interface VideoStreamMetadata {
  streamId: string;
  userId: string;
  username: string;
  isActive: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  joinedAt: number;
  streamType: 'main' | 'secondary' | 'viewer';
}

export interface DAWNote {
  id: string;
  pitch: number; // 0-127 MIDI note number
  startTime: number; // in beats
  duration: number; // in beats
  velocity: number; // 0-127
  track: number; // which track/instrument
}

export interface DAWSession {
  id: string;
  bpm: number;
  timeSignature: string; // e.g., "4/4"
  key: string;
  scale: string;
  notes: DAWNote[];
  tempo: number;
  currentBeat: number; // playhead position
  isPlaying: boolean;
  lastUpdatedBy: string;
  lastUpdatedAt: number;
}

export interface AudioSyncState {
  serverTimestamp: number; // server's master clock (ms since epoch)
  playbackPosition: number; // playhead in beats
  isPlaying: boolean;
  tempo: number;
  clientLatency: number; // estimated network latency in ms
}

export interface CommentThread {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isEdited: boolean;
  replies?: CommentThread[];
  voteCount: number;
}

export interface VoteRecord {
  id: string;
  userId: string;
  targetType: 'comment' | 'session';
  targetId: string;
  voteType: 'upvote' | 'downvote';
  createdAt: number;
}

export interface CollaborativeSessionParticipant {
  userId: string;
  username: string;
  role: 'host' | 'collaborator' | 'viewer';
  joinedAt: number;
  isActive: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export interface CollaborativeSession {
  id: string;
  title: string;
  description: string;
  mode: CreativeMode;
  submode: string;
  hostId: string;
  hostUsername: string;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  status: 'waiting' | 'active' | 'ended';
  maxParticipants: number;
  maxStreams: number; // typically 4
  participants: CollaborativeSessionParticipant[];
  viewers: CollaborativeSessionParticipant[];
  daw: DAWSession;
  audioSyncState: AudioSyncState;
  comments: CommentThread[];
  isPersisted: boolean; // whether to save to database
  recordingUrl?: string; // link to recording if available
}

export interface CollaborativeSessionRequest {
  title: string;
  description?: string;
  mode: CreativeMode;
  submode: string;
  maxParticipants?: number;
  maxStreams?: number;
  isGuest?: boolean; // If true, session expires after 1 hour
}

export interface StreamEventPayload {
  sessionId: string;
  streamId: string;
  userId: string;
  username: string;
  data?: any;
}
