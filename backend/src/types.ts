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
  seed?: string | number;
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

export interface DAWClip {
  id: string;
  trackId: string;
  type: 'midi' | 'audio';
  startBeat: number;
  durationBeats: number;
  fileName?: string;
  fileType?: string;
  previewUrl?: string;
  addedBy?: string;
  createdAt?: number;
}

export interface DAWTrack {
  id: string;
  name: string;
  color?: string;
  type: 'midi' | 'audio' | 'hybrid';
  volume: number; // 0-1
  isMuted: boolean;
  isSolo: boolean;
  isArmed: boolean;
  clips: DAWClip[];
}

export interface DAWSession {
  id: string;
  bpm: number;
  timeSignature: string; // e.g., "4/4"
  key: string;
  scale: string;
  notes: DAWNote[];
  tracks?: DAWTrack[];
  isRecording?: boolean;
  masterVolume?: number;
  tempo: number;
  currentBeat: number; // playhead position
  isPlaying: boolean;
  lastUpdatedBy: string;
  lastUpdatedAt: number;
}

export interface DAWFileAsset {
  id: string;
  fileName: string;
  fileType: string;
  filePath?: string;
  checksum?: string;
  sizeBytes?: number;
  durationBeats?: number;
  source?: string;
  updatedAt?: number;
}

export type InspirePluginRole = 'master' | 'relay' | 'create' | 'legacy';

export type CollabEditType = 'audio' | 'midi' | 'automation' | 'fx' | 'hybrid' | 'other';

export interface CollabMidiSummary {
  noteCount?: number;
  averageVelocity?: number;
  pitchRange?: { min: number; max: number };
}

export interface CollabPushDetails {
  editType?: CollabEditType;
  trackBeat?: number;
  durationSeconds?: number;
  fileTypes?: string[];
  fxUsed?: string[];
  automationLanes?: string[];
  midiSummary?: CollabMidiSummary;
  notes?: string;
  pushedByUserId?: string;
  pushedByUsername?: string;
  source?: 'vst' | 'web' | 'backfill';
}

export interface CollabFileAssetInput {
  fileName: string;
  fileType: string;
  sizeBytes?: number;
  durationSeconds?: number;
  checksum?: string;
  filePath?: string;
  inlineBase64?: string;
  metadata?: Record<string, unknown>;
}

export interface DAWTrackState {
  roomCode: string;
  trackId: string;
  trackIndex?: number;
  trackName?: string;
  trackType?: 'midi' | 'audio' | 'hybrid';
  bpm: number;
  tempo: number;
  timeSignature: string;
  currentBeat?: number;
  clips: DAWClip[];
  notes: DAWNote[];
  files?: DAWFileAsset[];
  updatedAt: number;
  updatedBy?: string;
  // Phase 1: VST Instance Broadcasting
  pluginInstanceId?: string;    // VST instance unique ID
  dawTrackIndex?: number;        // DAW track number (1, 2, 3...)
  dawTrackName?: string;         // Host-provided track name
  pluginRole?: InspirePluginRole;
  masterInstanceId?: string;
}

export interface DAWTrackChange {
  id: string;
  roomCode: string;
  trackId: string;
  version: number;
  updatedAt: number;
  updatedBy?: string;
  state: DAWTrackState;
}

export interface DAWSyncPushRequest {
  roomCode: string;
  trackId: string;
  baseVersion?: number;
  state: DAWTrackState;
  updatedBy?: string;
  pluginRole?: InspirePluginRole;
  masterInstanceId?: string;
  pushDetails?: CollabPushDetails;
  assets?: CollabFileAssetInput[];
}

export interface DAWSyncPushResponse {
  ok: boolean;
  version?: number;
  state?: DAWTrackState;
  eventId?: string;
  conflict?: boolean;
  current?: {
    version: number;
    updatedAt: number;
    updatedBy?: string;
    state: DAWTrackState;
  };
}

export interface DAWSyncPullResponse {
  roomCode: string;
  trackId: string;
  version: number;
  state: DAWTrackState | null;
  changes: DAWTrackChange[];
}

export interface AudioSyncState {
  serverTimestamp: number; // server's master clock (ms since epoch)
  playbackPosition: number; // playhead in beats
  isPlaying: boolean;
  tempo: number;
  clientLatency: number; // estimated network latency in ms
}

// Phase 2: WebSocket-based real-time sync message types
export interface VSTSyncMessage {
  type: 'join' | 'track-pushed' | 'instance-left' | 'sync-request' | 'sync-response' | 'instance-joined';
  pluginInstanceId: string;
  roomCode: string;
  username?: string;
  version?: number;
  timestamp?: number;
  pluginRole?: InspirePluginRole;
  masterInstanceId?: string;
  [key: string]: any;
}

export interface MasterRoomState {
  roomCode: string;
  active: boolean;
  masterInstanceId?: string;
  lastHeartbeat?: number;
  relayCount: number;
  createCount: number;
}

export interface VSTInstancePush {
  pluginInstanceId: string;
  version: number;
  timestamp: number;
  trackIndex?: number;
  trackName?: string;
}

export interface RecentPushesResponse {
  roomCode: string;
  pushes: VSTInstancePush[];
  count: number;
  timestamp: number;
}

export interface CollabPushAssetRecord {
  id: string;
  eventId: string;
  roomCode: string;
  trackId: string;
  fileName: string;
  fileType: string;
  filePath?: string;
  downloadUrl?: string;
  sizeBytes?: number;
  durationSeconds?: number;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface CollabPushEventRecord {
  id: string;
  roomCode: string;
  trackId: string;
  version: number;
  eventTime: number;
  updatedBy?: string;
  pluginInstanceId?: string;
  dawTrackIndex?: number;
  dawTrackName?: string;
  pushedByUserId?: string;
  pushedByUsername?: string;
  editType: CollabEditType;
  trackBeat?: number;
  durationSeconds?: number;
  fileTypes: string[];
  fxUsed?: string[];
  automationLanes?: string[];
  midiSummary?: CollabMidiSummary;
  notes?: string;
  source: 'vst' | 'web' | 'backfill';
  payload?: Record<string, unknown>;
  assets: CollabPushAssetRecord[];
}

export interface CollabRoomMemberRecord {
  id: string;
  roomCode: string;
  userId: string;
  username: string;
  role: 'host' | 'collaborator' | 'viewer';
  joinedAt: number;
}

export interface CollabVisualizationTrackNode {
  trackId: string;
  trackName: string;
  trackIndex: number;
  instances: Array<{
    pluginInstanceId: string;
    pushes: CollabPushEventRecord[];
  }>;
}

export interface CollabVisualizationResponse {
  roomCode: string;
  generatedAt: number;
  summary: {
    roomTitle?: string;
    totalPushes: number;
    totalAssets: number;
    totalParticipants: number;
    activeInstances: number;
    tracksTouched: number;
  };
  members: CollabRoomMemberRecord[];
  timeline: CollabPushEventRecord[];
  tree: CollabVisualizationTrackNode[];
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
  roomCode?: string;
  roomPassword?: string;
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
  liveDestinations?: { tiktok: boolean; instagram: boolean }; // multi-destination live export
}

export interface CollaborativeSessionRequest {
  title: string;
  description?: string;
  mode: CreativeMode;
  submode: string;
  maxParticipants?: number;
  maxStreams?: number;
  isGuest?: boolean; // If true, session expires after 1 hour
  hostId?: string;
  hostUsername?: string;
  roomPassword?: string;
}

export interface StreamEventPayload {
  sessionId: string;
  streamId: string;
  userId: string;
  username: string;
  data?: any;
}
