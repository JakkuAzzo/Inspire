/**
 * Inspire Backend - Main Entry Point
 *
 * This is the main entry point for the Inspire backend services.
 * It exports all service factories and utilities for external API integration.
 */

import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cookieParser from 'cookie-parser';
import { generateFuelPack, GenerateOptions } from './fuelPackGenerator';
import {
  FuelPack,
  ModePack,
  CreativeMode,
  ModePackRequest,
  RelevanceFilter,
  RelevanceTimeframe,
  RelevanceTone,
  RelevanceSemantic,
  ModeDefinition,
  LyricistModePack,
  ProducerModePack,
  EditorModePack,
  DAWModePack,
  MemeSound,
  NewsPrompt,
  SampleReference,
  InspirationClip,
  RemixMeta,
  CommentThread,
  CollaborativeSessionParticipant,
  DAWTrackState,
  DAWClip,
  DAWNote,
  DAWFileAsset,
  DAWSyncPushRequest,
  CollabFileAssetInput,
  CollabPushEventRecord,
  CollabVisualizationResponse,
  InspirePluginRole,
  MasterRoomState
} from './types';
import {
  generateModePack,
  buildDAWPack,
  listModeDefinitions,
  listMockMemes,
  listMockNews,
  listMockSamples,
  listMockWords,
  listMockMemeSounds
} from './modePackGenerator';
import { createAllServices } from './services';
import { searchYoutubeKeyless, buildYoutubeQuery } from './services/youtubeSearchService';
import { getPool } from './db/connection';
import { getDawSyncStore } from './db/dawSyncStore';
import { PackRepository } from './repositories/packRepository';
import fs from 'fs';
import path from 'path';
import { createId } from './utils/id';
import { listChallengeActivity } from './data/challengeActivity';
import { ChallengeService } from './services/challengeService';
import { validateEnvironment } from './config/env';
import { buildAuthRouter } from './auth/routes';
import { requireAuth, AuthenticatedRequest } from './auth/middleware';
import { startCleanupJob } from './auth/cleanup';
import { verifyToken } from './auth/jwt';
import { findUserById } from './auth/store';
import { generateStoryArcScaffold } from './services/storyArcService';
import { initFirebaseAdmin } from './firebase/admin';
import { setupWebSocketServer, VSTSyncManager } from './websocket';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Phase 2: WebSocket server for real-time VST instance sync
const vstSyncManager = setupWebSocketServer(server);

const PORT = process.env.PORT || 3001;
const LISTEN_PORT = Number(PORT) || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));  // Parse form-encoded data
app.use(cookieParser());

// VST compatibility: extract JSON from form-encoded 'data' field
app.use((req: Request, _res: Response, next: NextFunction) => {
  // If request has form data with 'data' field and Content-Type is application/json,
  // extract and parse the 'data' field as the JSON body
  if (
    typeof req.body === 'object' &&
    req.body.data &&
    typeof req.body.data === 'string' &&
    req.get('Content-Type')?.includes('application/json')
  ) {
    try {
      req.body = JSON.parse(req.body.data);
    } catch (e) {
      console.error('[VST] Failed to parse data field as JSON:', e);
      // Keep original body if parsing fails
    }
  }
  console.log(`[request] ${req.method} ${req.url}`);
  next();
});

// Initialize Firebase
initFirebaseAdmin();

// Simple in-memory stores for MVP
const packs = new Map<string, FuelPack | ModePack>();
const assets = new Map<string, any>();
const magicTokens = new Map<string, { email: string; expiresAt: number }>();
const shareTokens = new Map<string, { packId: string; createdAt: number; userId?: string }>();
const services = createAllServices();
const dawSyncStore = getDawSyncStore({ dbPath: process.env.LOCAL_SYNC_DB_PATH });
let packRepoPromise: Promise<PackRepository> | null = null;
const envValidation = validateEnvironment();

const modeDefinitions: ModeDefinition[] = listModeDefinitions();
const modeIds = new Set(modeDefinitions.map((definition) => definition.id));
const FALLBACK_FILTERS: RelevanceFilter = { timeframe: 'fresh', tone: 'funny', semantic: 'tight' };

function coerceArrayFromUnknown<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeIncomingTrackState(rawState: unknown, roomCode: string, trackId: string): DAWTrackState {
  const source = (rawState && typeof rawState === 'object')
    ? (rawState as Record<string, unknown>)
    : {};

  const clips = coerceArrayFromUnknown<DAWClip>(source.clips ?? source.clipsJson);
  const notes = coerceArrayFromUnknown<DAWNote>(source.notes ?? source.notesJson);
  const files = coerceArrayFromUnknown<DAWFileAsset>(source.files);

  const bpm = typeof source.bpm === 'number' ? source.bpm : 120;
  const tempo = typeof source.tempo === 'number' ? source.tempo : bpm;
  const trackType = source.trackType === 'midi' || source.trackType === 'audio' || source.trackType === 'hybrid'
    ? source.trackType
    : notes.length > 0
      ? 'midi'
      : clips.length > 0
        ? 'audio'
        : 'hybrid';

  const normalized: DAWTrackState = {
    roomCode,
    trackId,
    trackIndex: typeof source.trackIndex === 'number' ? source.trackIndex : undefined,
    trackName: typeof source.trackName === 'string' ? source.trackName : undefined,
    trackType,
    bpm,
    tempo,
    timeSignature: typeof source.timeSignature === 'string' && source.timeSignature.trim()
      ? source.timeSignature
      : '4/4',
    currentBeat: typeof source.currentBeat === 'number' ? source.currentBeat : undefined,
    clips,
    notes,
    files,
    updatedAt: Date.now(),
    updatedBy: typeof source.updatedBy === 'string' ? source.updatedBy : undefined,
    pluginInstanceId: typeof source.pluginInstanceId === 'string' ? source.pluginInstanceId : undefined,
    dawTrackIndex: typeof source.dawTrackIndex === 'number' ? source.dawTrackIndex : undefined,
    dawTrackName: typeof source.dawTrackName === 'string' ? source.dawTrackName : undefined,
    pluginRole: source.pluginRole === 'master' || source.pluginRole === 'relay' || source.pluginRole === 'create' || source.pluginRole === 'legacy'
      ? source.pluginRole
      : undefined,
    masterInstanceId: typeof source.masterInstanceId === 'string' ? source.masterInstanceId : undefined
  };

  return normalized;
}

function parseRelevanceFilters(query: any): Partial<RelevanceFilter> {
  const filters: Partial<RelevanceFilter> = {};
  const timeframe = query.timeframe as RelevanceTimeframe;
  const tone = query.tone as RelevanceTone;
  const semantic = query.semantic as RelevanceSemantic;
  if (timeframe && ['fresh', 'recent', 'timeless'].includes(timeframe)) filters.timeframe = timeframe;
  if (tone && ['funny', 'deep', 'dark'].includes(tone)) filters.tone = tone;
  if (semantic && ['tight', 'balanced', 'wild'].includes(semantic)) filters.semantic = semantic;
  return filters;
}

function coalesceFilters(filters?: Partial<RelevanceFilter>): RelevanceFilter {
  return {
    timeframe: filters?.timeframe ?? FALLBACK_FILTERS.timeframe,
    tone: filters?.tone ?? FALLBACK_FILTERS.tone,
    semantic: filters?.semantic ?? FALLBACK_FILTERS.semantic
  };
}

function buildHeadlineQueryFromPack(pack: FuelPack | ModePack): string {
  const parts: string[] = [];
  if ('mode' in pack) {
    parts.push(pack.mode);
    if ('submode' in pack && pack.submode) parts.push(pack.submode);
  }
  const filters = (pack as any).filters as RelevanceFilter | undefined;
  if (filters) {
    parts.push(filters.tone, filters.semantic, filters.timeframe);
  }
  if ((pack as any).genre) parts.push((pack as any).genre);
  if ((pack as any).powerWords) parts.push(...((pack as any).powerWords as string[]));
  if ((pack as any).topicChallenge) parts.push((pack as any).topicChallenge as string);
  if ((pack as any).sample?.title) parts.push((pack as any).sample.title as string);
  if ((pack as any).instrumentPalette) parts.push(...((pack as any).instrumentPalette as string[]));
  if ((pack as any).visualConstraints) parts.push(...((pack as any).visualConstraints as string[]));
  if ((pack as any).newsPrompt?.headline) parts.push((pack as any).newsPrompt.headline as string);
  return parts.filter(Boolean).join(' ');
}

function buildFallbackLyricistPack(body: ModePackRequest, filters: RelevanceFilter): LyricistModePack {
  const words = listMockWords(filters);
  const headlines = listMockNews(filters);
  const news: NewsPrompt = headlines[0] ?? {
    headline: 'Write about the moment right now.',
    context: 'Keep it personal and punchy.',
    timeframe: filters.timeframe,
    source: 'Inspire'
  };
  const memeSounds = listMockMemeSounds(filters);
  const memeSound: MemeSound = memeSounds[0] ?? { name: 'Fallback meme sound', description: `Lean into the moment.`, tone: filters.tone };
  return {
    id: createId('lyricist'),
    timestamp: Date.now(),
    mode: 'lyricist',
    submode: body.submode,
    title: `${(body.genre ?? 'r&b').toUpperCase()} spark session (fallback)`,
    headline: 'Flip this headline into bars.',
    summary: 'Mock pack generated while services warm up.',
    filters,
    genre: body.genre ?? 'r&b',
    powerWords: words.slice(0, 4),
    rhymeFamilies: ['-ight', '-ow', '-ame'],
    flowPrompts: ['Keep it tight for 8 bars.', 'Land an internal rhyme each line.'],
    memeSound,
    topicChallenge: 'Turn the headline into a hook.',
    newsPrompt: news,
    storyArc: { start: 'charged', middle: 'surging', end: 'victorious' },
    chordMood: 'Minor 7th velvet',
    lyricFragments: ['"City lights blink Morse in the puddles"', '"Laughing in emojis, trauma in draft folders"'],
    wordLab: words.slice(0, 6).map((word, index) => ({ word, score: 95 - index * 3, numSyllables: Math.max(1, word.split(/[-\s]/).length) }))
  };
}

function createRemixSnapshot(pack: ModePack, author?: string): ModePack {
  const generation = (pack.remixOf?.generation ?? 0) + 1;
  const remixEntry: RemixMeta = {
    author: author ?? pack.author ?? 'guest',
    packId: pack.id,
    generation
  };
  return {
    ...pack,
    id: createId('remix'),
    timestamp: Date.now(),
    remixOf: remixEntry,
    remixLineage: [...(pack.remixLineage ?? []), remixEntry]
  };
}

function buildFallbackProducerPack(body: ModePackRequest, filters: RelevanceFilter): ProducerModePack {
  const samples = listMockSamples(filters);
  const primary: SampleReference = samples[0] ?? {
    title: 'Fallback sample',
    source: 'Inspire',
    url: 'https://example.com/sample',
    tags: ['mock'],
    timeframe: filters.timeframe
  };
  const secondary: SampleReference = samples[1] ?? primary;
  const clip: InspirationClip = {
    title: 'Fallback clip',
    description: 'Use this as a pacing cue.',
    timeframe: filters.timeframe,
    tone: filters.tone
  };
  return {
    id: createId('producer'),
    timestamp: Date.now(),
    mode: 'producer',
    submode: body.submode,
    title: `${body.submode} lab session (fallback)`,
    headline: 'Flip textures into something unrecognizable.',
    summary: 'Mock pack generated while services warm up.',
    filters,
    bpm: 96,
    key: 'Am',
    sample: primary,
    secondarySample: secondary,
    constraints: ['Limit yourself to 3 layers.', 'No reverb until the hook.'],
    fxIdeas: ['Bitcrush the drums lightly.', 'Automate a tape stop into the pre-hook.'],
    instrumentPalette: ['Analog pad', 'Granular vox chop', 'Live percussion loop'],
    videoSnippet: clip,
    referenceInstrumentals: [clip],
    challenge: 'Create tension by muting the drums for eight bars.'
  };
}

function buildFallbackEditorPack(body: ModePackRequest, filters: RelevanceFilter): EditorModePack {
  const moodboard: InspirationClip[] = listMockMemes(filters).slice(0, 3).map((meme, index) => ({
    title: meme.name ?? `Meme ${index + 1}`,
    description: 'Use this beat for timing.',
    url: meme.url,
    timeframe: filters.timeframe,
    tone: filters.tone
  }));
  return {
    id: createId('editor'),
    timestamp: Date.now(),
    mode: 'editor',
    submode: body.submode,
    title: `${body.submode} edit card (fallback)`,
    headline: 'Cut to the beat of culture.',
    summary: 'Mock pack generated while services warm up.',
    filters,
    format: '16:9 classic',
    durationSeconds: 15,
    moodboard,
    audioPrompts: [{ name: 'Fallback sting', description: 'Land on the beat.', tone: filters.tone }],
    visualConstraints: ['Hit three cuts in the first four seconds.', 'End on a close-up.'],
    timelineBeats: ['Open with motion', 'Mid pivot', 'Punchline close'],
    challenge: 'Land a punchline before the audience scrolls away.',
    titlePrompt: 'Legendary Remix'
  };
}

function buildFallbackModePack(mode: CreativeMode, body: ModePackRequest, filters: RelevanceFilter): ModePack {
  switch (mode) {
    case 'lyricist':
      return buildFallbackLyricistPack(body, filters);
    case 'producer':
      return buildFallbackProducerPack(body, filters);
    case 'editor':
      return buildFallbackEditorPack(body, filters);
    default:
      throw new Error(`Unsupported fallback mode: ${mode}`);
  }
}

interface SavedState {
  users: Record<string, string[]>;
  snapshots: Record<string, FuelPack | ModePack>;
}

interface CommunityFeedPost {
  id: string;
  author: string;
  content: string;
  contentType: 'text' | 'link' | 'audio' | 'video' | 'beat';
  remixOf?: { author?: string; sourceId?: string };
  createdAt: string;
  reactions: number;
  comments: number;
  remixCount: number;
}

interface LiveRoomState {
  id: string;
  title: string;
  owner: string;
  mode: CreativeMode;
  status: 'live' | 'open';
  participants: number;
  viewers: number;
}

interface ReportFlag {
  id: string;
  targetType: 'post' | 'room';
  targetId: string;
  reason: string;
  reporter?: string;
  createdAt: string;
}
// Allow overriding the data directory (useful for CI or different run contexts)
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(__dirname, '..', 'data');
const COLLAB_ASSET_DIR = path.join(DATA_DIR, 'collab-assets');
const SAVED_PACKS_FILE = process.env.SAVED_PACKS_FILE || path.join(DATA_DIR, 'savedPacks.json');
const FEED_FILE = process.env.FEED_FILE || path.join(DATA_DIR, 'communityFeed.json');
const REPORT_FILE = process.env.REPORT_FILE || path.join(DATA_DIR, 'reportedContent.json');
const CHALLENGE_STATE_FILE = process.env.CHALLENGE_STATE_FILE || path.join(DATA_DIR, 'challengeState.json');
const FRONTEND_DIST = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
const FRONTEND_INDEX = path.join(FRONTEND_DIST, 'index.html');
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVE_FRONTEND = process.env.SERVE_FRONTEND !== 'false' && NODE_ENV !== 'development';
const hasFrontendBuild = fs.existsSync(FRONTEND_INDEX) && SERVE_FRONTEND;
const EMPTY_SAVED_STATE: SavedState = { users: {}, snapshots: {} };
const liveRooms = new Map<string, LiveRoomState>();
const rateLimitEvents = new Map<string, number[]>();
const BLOCKED_PHRASES = ['spam', 'scam', 'violence', 'slur'];

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(COLLAB_ASSET_DIR)) fs.mkdirSync(COLLAB_ASSET_DIR, { recursive: true });
    if (!fs.existsSync(SAVED_PACKS_FILE)) fs.writeFileSync(SAVED_PACKS_FILE, JSON.stringify(EMPTY_SAVED_STATE, null, 2), 'utf8');
    if (!fs.existsSync(FEED_FILE)) fs.writeFileSync(FEED_FILE, JSON.stringify([], null, 2), 'utf8');
    if (!fs.existsSync(REPORT_FILE)) fs.writeFileSync(REPORT_FILE, JSON.stringify([], null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to ensure data dir:', err);
  }
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function decodeInlineBase64(input: string): Buffer {
  const content = input.includes('base64,') ? input.slice(input.indexOf('base64,') + 7) : input;
  return Buffer.from(content, 'base64');
}

function materializeAssetFromInlineData(
  roomCode: string,
  trackId: string,
  eventId: string,
  asset: CollabFileAssetInput
): CollabFileAssetInput {
  if (!asset.inlineBase64) return asset;

  const safeRoom = sanitizePathSegment(roomCode);
  const safeTrack = sanitizePathSegment(trackId);
  const safeName = sanitizePathSegment(asset.fileName || `${asset.fileType}-asset`);
  const roomDir = path.join(COLLAB_ASSET_DIR, safeRoom, safeTrack);
  fs.mkdirSync(roomDir, { recursive: true });

  const outputPath = path.join(roomDir, `${eventId}_${safeName}`);
  const data = decodeInlineBase64(asset.inlineBase64);
  fs.writeFileSync(outputPath, data);

  return {
    ...asset,
    filePath: outputPath,
    sizeBytes: asset.sizeBytes ?? data.byteLength,
    inlineBase64: undefined
  };
}

ensureDataDir();
console.log('[Inspire] Data directory:', DATA_DIR);
console.log('[Inspire] Saved packs file:', SAVED_PACKS_FILE);
console.log('[Inspire] Challenge state file:', CHALLENGE_STATE_FILE);
if (hasFrontendBuild) {
  console.log('[Inspire] Serving frontend build from:', FRONTEND_DIST);
} else {
  console.log('[Inspire] Frontend build not detected. Run `npm run build` inside frontend/ to generate the UI.');
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error('Failed to read json file', filePath, err);
    return fallback;
  }
}

function writeJsonFile(filePath: string, payload: unknown) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write json file', filePath, err);
  }
}

function readFeedPosts(): CommunityFeedPost[] {
  return readJsonFile<CommunityFeedPost[]>(FEED_FILE, []);
}

function writeFeedPosts(posts: CommunityFeedPost[]) {
  writeJsonFile(FEED_FILE, posts.slice(0, 200));
}

function recordReport(report: ReportFlag) {
  const existing = readJsonFile<ReportFlag[]>(REPORT_FILE, []);
  existing.unshift(report);
  writeJsonFile(REPORT_FILE, existing.slice(0, 500));
}

const DEFAULT_ROOMS: LiveRoomState[] = [
  { id: 'room-lyric-lab', title: 'Hooksmiths', owner: 'Aria', mode: 'lyricist', status: 'live', participants: 3, viewers: 18 },
  { id: 'room-producer', title: 'Sample Flip Night', owner: 'Koji', mode: 'producer', status: 'open', participants: 2, viewers: 11 },
  { id: 'room-editor', title: 'Cut Clinic', owner: 'Ryn', mode: 'editor', status: 'live', participants: 4, viewers: 9 }
];

function seedLiveRooms() {
  DEFAULT_ROOMS.forEach((room) => liveRooms.set(room.id, room));
}

seedLiveRooms();

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_EVENTS = 25;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entries = rateLimitEvents.get(key) ?? [];
  const recent = entries.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  rateLimitEvents.set(key, recent);
  return recent.length > RATE_LIMIT_MAX_EVENTS;
}

function containsBlockedContent(content: string): boolean {
  const lower = content.toLowerCase();
  return BLOCKED_PHRASES.some((phrase) => lower.includes(phrase));
}

function getRoomsSnapshot(): LiveRoomState[] {
  return Array.from(liveRooms.values());
}

function incrementRoomCounts(roomId: string, participantsDelta: number, viewersDelta = 0): LiveRoomState {
  const existing = liveRooms.get(roomId) ?? {
    id: roomId,
    title: `Room ${roomId}`,
    owner: 'guest',
    mode: 'lyricist' as CreativeMode,
    status: 'open' as const,
    participants: 0,
    viewers: 0
  };
  const next: LiveRoomState = {
    ...existing,
    participants: Math.max(0, existing.participants + participantsDelta),
    viewers: Math.max(0, existing.viewers + viewersDelta)
  };
  liveRooms.set(roomId, next);
  return next;
}
const challengeService = new ChallengeService(CHALLENGE_STATE_FILE);
async function getPackRepo() {
  if (!packRepoPromise) {
    packRepoPromise = (async () => {
      const pool = await getPool();
      return new PackRepository(pool);
    })();
  }
  return packRepoPromise;
}

function readSavedState(): SavedState {
  try {
    const raw = fs.readFileSync(SAVED_PACKS_FILE, 'utf8');
    if (!raw) return { ...EMPTY_SAVED_STATE };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'users' in parsed && 'snapshots' in parsed) {
      const users = typeof parsed.users === 'object' && parsed.users ? parsed.users as Record<string, string[]> : {};
  const snapshots = typeof parsed.snapshots === 'object' && parsed.snapshots ? parsed.snapshots as Record<string, FuelPack | ModePack> : {};
      return { users, snapshots };
    }
    if (parsed && typeof parsed === 'object') {
      // Legacy format: userId -> packId[]
      return { users: parsed as Record<string, string[]>, snapshots: {} };
    }
  } catch (err) {
    console.error('Failed to read saved packs:', err);
  }
  return { ...EMPTY_SAVED_STATE };
}

function writeSavedState(state: SavedState) {
  try {
    fs.writeFileSync(SAVED_PACKS_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write saved packs:', err);
  }
}

// Build the main application API router. This is mounted under `/api` (always)
// and also under `/dev/api` for backward compatibility with early UI builds.
function buildApiRouter() {
  const router = express.Router();

  router.use('/auth', buildAuthRouter());

  router.get('/health', (_req: Request, res: Response) => {
    const serviceHealth = Object.values(services).map((svc: any) =>
      typeof svc.getHealth === 'function'
        ? svc.getHealth()
        : { name: svc.constructor?.name ?? 'unknown', status: 'ok' }
    );

    const ready = envValidation.isProductionReady || process.env.NODE_ENV !== 'production';
    res.json({
      status: ready ? 'ok' : 'degraded',
      message: ready ? 'Inspire API is running' : 'Missing production keys',
      environment: envValidation,
      services: serviceHealth
    });
  });

  router.get('/feed', (_req: Request, res: Response) => {
    res.json({ items: readFeedPosts() });
  });

  router.post('/feed', (req: Request, res: Response) => {
    const rateKey = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    if (isRateLimited(rateKey)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Take a breather and try again.' });
    }

    const { author, content, remixOf, contentType } = req.body || {};
    if (!author || !content) return res.status(400).json({ error: 'author and content are required' });
    if (containsBlockedContent(String(content))) {
      return res.status(400).json({ error: 'Content failed moderation filters' });
    }

    const post: CommunityFeedPost = {
      id: createId('post'),
      author,
      content: String(content).slice(0, 1200),
      contentType: contentType ?? 'text',
      remixOf,
      createdAt: new Date().toISOString(),
      reactions: 0,
      comments: 0,
      remixCount: remixOf ? 1 : 0
    };

    const existing = readFeedPosts();
    existing.unshift(post);
    writeFeedPosts(existing);
    io.emit('feed:new', post);
    res.status(201).json({ post });
  });

  router.get('/rooms', (_req: Request, res: Response) => {
    res.json({ rooms: getRoomsSnapshot() });
  });

  router.post('/rooms/:roomId/join', (req: Request, res: Response) => {
    const roomId = req.params.roomId;
    const { user } = req.body || {};
    const room = incrementRoomCounts(roomId, 1, 0);
    io.emit('rooms:update', getRoomsSnapshot());
    io.to(roomId).emit('room:presence', { roomId, user, action: 'joined' });
    res.json({ room });
  });

  router.post('/rooms/:roomId/spectate', (req: Request, res: Response) => {
    const roomId = req.params.roomId;
    const { user } = req.body || {};
    const room = incrementRoomCounts(roomId, 0, 1);
    io.emit('rooms:update', getRoomsSnapshot());
    io.to(roomId).emit('room:presence', { roomId, user, action: 'spectating' });
    res.json({ room });
  });

  router.post('/rooms/:roomId/emit', (req: Request, res: Response) => {
    const roomId = req.params.roomId;
    const { event, payload } = req.body || {};
    if (!event) return res.status(400).json({ error: 'event name required' });
    io.to(roomId).emit(event, payload ?? {});
    res.json({ roomId, event, payload: payload ?? {} });
  });

  router.post('/moderation/report', (req: Request, res: Response) => {
    const { targetType, targetId, reason, reporter } = req.body || {};
    if (!targetType || !targetId || !reason) return res.status(400).json({ error: 'targetType, targetId, reason required' });
    const report: ReportFlag = {
      id: createId('report'),
      targetType,
      targetId,
      reason,
      reporter,
      createdAt: new Date().toISOString()
    };
    recordReport(report);
    res.status(201).json({ report });
  });

  router.get('/modes', (_req: Request, res: Response) => {
    res.json({ modes: modeDefinitions });
  });

  router.post('/modes/:mode/fuel-pack', async (req: Request, res: Response) => {
    const mode = req.params.mode as CreativeMode;
    if (!modeIds.has(mode)) {
      return res.status(400).json({ error: 'Unsupported mode' });
    }

    const body = req.body as ModePackRequest | undefined;
    if (!body || !body.submode) {
      return res.status(400).json({ error: 'submode is required' });
    }

    const filters = coalesceFilters({
      ...body.filters,
      ...body.relevance,
      timeframe: body.timeframe ?? body.filters?.timeframe ?? body.relevance?.timeframe,
      tone: body.tone ?? body.filters?.tone ?? body.relevance?.tone,
      semantic: body.semantic ?? body.filters?.semantic ?? body.relevance?.semantic
    });
    const started = Date.now();
    console.log(`[fuel-pack] ${mode}/${body.submode} req filters=${JSON.stringify(filters)}`);

    const definition = modeDefinitions.find((entry) => entry.id === mode);
    const submodeValid = definition?.submodes.some((sub) => sub.id === body.submode) ?? false;
    if (!submodeValid) {
      return res.status(400).json({ error: `Unsupported submode for ${mode}` });
    }

    try {
      const useMockFallback = process.env.USE_MOCK_FALLBACK !== 'false';
      const timeoutMs = Number(process.env.FUEL_PACK_TIMEOUT_MS ?? 5000);
      const pack = await Promise.race([
        generateModePack(mode, { ...body, filters }, useMockFallback ? {} : services),
        new Promise<ModePack>((_, reject) => setTimeout(() => reject(new Error('generateModePack timed out')), timeoutMs))
      ]);
      packs.set(pack.id, pack);
      res.status(201).json({ pack });
      console.log(`[fuel-pack] ok ${mode}/${body.submode} in ${Date.now() - started}ms id=${pack.id}`);
    } catch (error) {
      console.error('[fuel-pack] error', error);
      try {
        const fallbackPack = buildFallbackModePack(mode, { ...body, filters }, filters);
        res.status(201).json({ pack: fallbackPack });
        console.log(`[fuel-pack] fallback ${mode}/${body.submode} in ${Date.now() - started}ms id=${fallbackPack.id}`);
      } catch (fallbackError) {
        console.error('[fuel-pack] fallback error', fallbackError);
        res.status(500).json({ error: 'Failed to generate pack for mode' });
      }
    }
  });

  // DAW pack generation - generates a producer-mode pack with DAW-specific content (samples, drums, tempo, key)
  router.post('/modes/daw/fuel-pack', async (req: Request, res: Response) => {
    const body = req.body as ModePackRequest | undefined;
    if (!body || !body.submode) {
      return res.status(400).json({ error: 'submode is required' });
    }

    const filters = coalesceFilters({
      ...body.filters,
      ...body.relevance,
      timeframe: body.timeframe ?? body.filters?.timeframe ?? body.relevance?.timeframe,
      tone: body.tone ?? body.filters?.tone ?? body.relevance?.tone,
      semantic: body.semantic ?? body.filters?.semantic ?? body.relevance?.semantic
    });
    const started = Date.now();
    console.log(`[fuel-pack] daw/${body.submode} req filters=${JSON.stringify(filters)}`);

    // Validate DAW submode
    const validSubmodes = ['lofi', 'trap', 'house', 'experimental'];
    if (!validSubmodes.includes(body.submode)) {
      return res.status(400).json({ error: `Unsupported DAW submode: ${body.submode}` });
    }

    try {
      const useMockFallback = process.env.USE_MOCK_FALLBACK !== 'false';
      const timeoutMs = Number(process.env.FUEL_PACK_TIMEOUT_MS ?? 5000);
      const pack = await Promise.race([
        buildDAWPack({ ...body, filters }, filters, useMockFallback ? {} : services, body.mood),
        new Promise<ModePack>((_, reject) => setTimeout(() => reject(new Error('buildDAWPack timed out')), timeoutMs))
      ]);
      packs.set(pack.id, pack);
      res.status(201).json({ pack });
      console.log(`[fuel-pack] ok daw/${body.submode} in ${Date.now() - started}ms id=${pack.id}`);
    } catch (error) {
      console.error('[fuel-pack] daw error', error);
      res.status(500).json({ error: 'Failed to generate DAW pack' });
    }
  });

  // Mock lists (useful for UI previews)
  router.get('/mock/words', (req: Request, res: Response) => {
    const filters = parseRelevanceFilters(req.query);
    res.json({ items: listMockWords(filters) });
  });
  router.get('/mock/memes', (req: Request, res: Response) => {
    const filters = parseRelevanceFilters(req.query);
    res.json({ items: listMockMemes(filters) });
  });
  router.get('/mock/samples', (req: Request, res: Response) => {
    const filters = parseRelevanceFilters(req.query);
    res.json({ items: listMockSamples(filters) });
  });
  router.get('/mock/news', (req: Request, res: Response) => {
    const filters = parseRelevanceFilters(req.query);
    res.json({ items: listMockNews(filters) });
  });

  // Audio proxy endpoint for streaming/caching soundboardguys and similar URLs
  router.get('/proxy-audio', async (req: Request, res: Response) => {
    const urlParam = req.query.url as string | undefined;
    if (!urlParam) {
      return res.status(400).json({ error: 'url query parameter required' });
    }

    try {
      // Validate URL
      const targetUrl = new URL(urlParam);
      const allowedHosts = ['soundboardguys.com', 'cdn.soundboardguys.com'];
      const isAllowed = allowedHosts.some((host) => targetUrl.hostname.endsWith(host));

      if (!isAllowed) {
        return res.status(403).json({ error: 'Unsupported audio source' });
      }

      // For soundboardguys pages (not direct MP3), use Playwright to extract the MP3 URL
      if (targetUrl.hostname.includes('soundboardguys.com') && !targetUrl.pathname.includes('.mp3')) {
        try {
          // Use the PlaywrightAPI if available, otherwise fetch the page and look for audio tag
          const audioResponse = await fetch(urlParam);
          if (!audioResponse.ok) {
            return res.status(404).json({ error: 'Unable to reach audio source' });
          }

          const htmlText = await audioResponse.text();
          // Look for MP3 URL in HTML (in audio tags or download links)
          const mp3Regex = /href=["']([^"']*\.mp3[^"']*)["']|src=["']([^"']*\.mp3[^"']*)["']/gi;
          const match = mp3Regex.exec(htmlText);

          if (!match) {
            return res.status(404).json({ error: 'No MP3 URL found on the page' });
          }

          const mp3Url = match[1] || match[2];
          if (!mp3Url) {
            return res.status(404).json({ error: 'Unable to extract MP3 URL' });
          }

          // Fetch the actual MP3 file
          const mp3Response = await fetch(mp3Url);
          if (!mp3Response.ok) {
            return res.status(404).json({ error: 'Unable to download MP3 file' });
          }

          // Stream the MP3 with proper headers
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Cache-Control', 'public, max-age=604800'); // Cache for 1 week
          res.setHeader('Access-Control-Allow-Origin', '*');

          // Stream the response body to client
          const buffer = await mp3Response.arrayBuffer();
          res.send(Buffer.from(buffer));
        } catch (err) {
          console.error('[proxy-audio] Error extracting MP3 from soundboardguys page:', err);
          return res.status(500).json({ error: 'Failed to extract audio URL from page' });
        }
      } else {
        // Direct MP3 URL or other audio source
        const audioResponse = await fetch(urlParam);
        if (!audioResponse.ok) {
          return res.status(404).json({ error: 'Unable to reach audio source' });
        }

        res.setHeader('Content-Type', audioResponse.headers.get('Content-Type') || 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=604800');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const buffer = await audioResponse.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    } catch (err) {
      console.error('[proxy-audio] Error:', err);
      res.status(500).json({ error: 'Failed to proxy audio' });
    }
  });

  // Audio sample search (Freesound + Jamendo)
  router.get('/audio/search', async (req: Request, res: Response) => {
    const query = (req.query.query as string) || '';
    const source = (req.query.source as string) || 'both';
    const limitParam = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const limit = Math.min(limitParam, 50); // Cap at 50

    if (!query.trim()) {
      return res.status(400).json({ error: 'query parameter required' });
    }

    try {
      const results: any = { sounds: [], tracks: [] };

      // Search Freesound
      if (source === 'freesound' || source === 'both') {
        try {
          const freesoundResults = await services.audioService?.searchSounds(query, limit);
          if (freesoundResults && freesoundResults.length > 0) {
            results.sounds = freesoundResults.map((sound: any) => ({
              id: sound.id,
              name: sound.name,
              duration: sound.duration || 0,
              previews: sound.previews || {},
              tags: sound.tags || [],
              username: sound.username || 'Unknown'
            }));
          }
        } catch (err) {
          console.warn('[audio/search] Freesound error:', err);
        }
      }

      // Search Jamendo
      if (source === 'jamendo' || source === 'both') {
        try {
          const jamendoResults = await services.audioService?.searchTracks?.(query, limit);
          if (jamendoResults && jamendoResults.length > 0) {
            results.tracks = jamendoResults.map((track: any) => ({
              id: track.id,
              name: track.name,
              duration: track.duration || 0,
              audio: track.audio || '',
              albumname: track.albumname || '',
              artist_name: track.artist_name || 'Unknown',
              audiodownload_allowed: track.audiodownload_allowed || false
            }));
          }
        } catch (err) {
          console.warn('[audio/search] Jamendo error:', err);
        }
      }

      // Return results
      if (results.sounds.length === 0 && results.tracks.length === 0) {
        return res.status(404).json({ error: 'No audio samples found' });
      }

      res.json(results);
    } catch (err) {
      console.error('[audio/search] Error:', err);
      res.status(500).json({ error: 'Failed to search audio samples' });
    }
  });

  // Daily challenge activity (mocked)
  router.get('/challenges/activity', (req: Request, res: Response) => {
    const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const parsedLimit = limitParam ? Number.parseInt(String(limitParam), 10) : NaN;
    const activity = listChallengeActivity(Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10);
    res.json({ activity });
  });

  router.get('/challenges/current', (req: Request, res: Response) => {
    const userId = (req.query.userId as string) || '';
    const challenge = challengeService.getCurrentChallenge();
    if (userId) {
      const stats = challengeService.getStats(userId);
      const completedToday = stats.completions.some((entry) => {
        const timestamp = new Date(entry.completedAt).getTime();
        const expiry = new Date(challenge.expiresAt).getTime();
        const start = expiry - 86_400_000;
        return entry.challengeId === challenge.id && timestamp >= start && timestamp < expiry;
      });
      res.json({ challenge: { ...challenge, streakCount: stats.streak }, stats: { ...stats, completedToday } });
      return;
    }
    res.json({ challenge });
  });

  router.post('/challenges/complete', (req: Request, res: Response) => {
    const { userId, challengeId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (!challengeId) return res.status(400).json({ error: 'challengeId is required' });
    try {
      const stats = challengeService.submitCompletion(userId, challengeId);
      const challenge = challengeService.getCurrentChallenge();
      res.json({ ...stats, challenge: { ...challenge, streakCount: stats.streak } });
    } catch (err) {
      console.error('[challenges/complete] error', err);
      res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to record completion' });
    }
  });

  router.get('/challenges/stats', (req: Request, res: Response) => {
    const userId = (req.query.userId as string) || '';
    if (!userId) return res.status(400).json({ error: 'userId query param required' });
    const stats = challengeService.getStats(userId);
    const achievements = challengeService.listAchievements();
    res.json({ stats, achievements });
  });

  // Legacy simple generator routes
  router.get('/fuel-pack', (_req: Request, res: Response) => {
    try {
      const fuelPack = generateFuelPack();
      packs.set(fuelPack.id, fuelPack);
      res.json(fuelPack);
    } catch (error) {
      console.error('Error generating fuel pack:', error);
      res.status(500).json({ error: 'Failed to generate fuel pack' });
    }
  });
  router.post('/fuel-pack', (req: Request, res: Response) => {
    try {
      const body = req.body as GenerateOptions;
      const pack = generateFuelPack(body);
      packs.set(pack.id, pack);
      res.status(201).json({ id: pack.id, pack });
    } catch (error) {
      console.error('Error creating fuel pack:', error);
      res.status(500).json({ error: 'Failed to create fuel pack' });
    }
  });

  // Packs persistence
  router.get('/packs/saved', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId || (req.query.userId as string) || '';
    if (!userId) return res.status(400).json({ error: 'userId query param required' });
    const repo = await getPackRepo();
    const list = await repo.listSavedPacks(userId);
    res.json({ userId, saved: list.map((p: FuelPack | ModePack) => p.id), packs: list });
  });

  router.get('/packs/:id', async (req: Request, res: Response) => {
    const id = req.params.id;
    let pack: FuelPack | ModePack | undefined = packs.get(id);
    if (!pack) {
      const repo = await getPackRepo();
      const repoPack = await repo.getPack(id);
      if (repoPack) {
        pack = repoPack;
        packs.set(id, repoPack);
      }
    }
    if (!pack) return res.status(404).json({ error: 'Pack not found' });
    res.json(pack);
  });

  router.post('/packs/:id/save', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const packId = req.params.id;
    const userId = req.userId || (req.body || {}).userId;
    if (!packId) return res.status(400).json({ error: 'pack id required' });
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const repo = await getPackRepo();
    let pack: FuelPack | ModePack | undefined = packs.get(packId);
    if (!pack) {
      const repoPack = await repo.getPack(packId);
      if (repoPack) {
        pack = repoPack;
        packs.set(packId, repoPack);
      }
    }
    if (!pack) {
      return res.status(404).json({ error: 'Pack not found. Spin or craft a pack before saving.' });
    }

    // Save to PostgreSQL
    await repo.savePackForUser(userId, pack);
    
    // Also save to Firebase for cloud sync
    const { savePackToDb } = await import('./firebase/store');
    await savePackToDb(userId, pack);
    
    res.json({ saved: true, userId, packId, snapshot: pack });
  });

  router.post('/packs/:id/remix', (req: Request, res: Response) => {
    const packId = req.params.id;
    const { userId, snapshot } = req.body || {};
    if (!packId) return res.status(400).json({ error: 'pack id required' });

    const state = readSavedState();
    const source = packs.get(packId) || state.snapshots[packId];
    if (!source || !(source as any).mode) {
      return res.status(404).json({ error: 'Original pack not found' });
    }

    const remixEntry: RemixMeta = {
      author: userId || (source as any).author || 'guest',
      packId,
      generation: ((source as any).remixOf?.generation ?? 0) + 1
    };

    const remix: ModePack = snapshot
      ? {
          ...(snapshot as ModePack),
          id: createId('remix'),
          timestamp: Date.now(),
          remixOf: (snapshot as ModePack).remixOf ?? remixEntry,
          remixLineage: (snapshot as ModePack).remixLineage ?? [
            ...(((source as ModePack).remixLineage as RemixMeta[]) ?? []),
            remixEntry
          ]
        }
      : createRemixSnapshot(source as ModePack, userId);
    packs.set(remix.id, remix);
    state.snapshots[remix.id] = remix;
    writeSavedState(state);

    res.status(201).json({ remix });
  });

  router.post('/packs/:id/share', (req: Request, res: Response) => {
    const packId = req.params.id;
    const { userId } = req.body || {};
    if (!packId) return res.status(400).json({ error: 'pack id required' });

    const state = readSavedState();
    const pack = packs.get(packId) || state.snapshots[packId];
    if (!pack) return res.status(404).json({ error: 'Pack not found' });

    const token = createId('share');
    shareTokens.set(token, { packId, createdAt: Date.now(), userId });
    const shareUrl = `${req.protocol}://${req.get('host')}/share/${token}`;

    res.status(201).json({ token, shareUrl, packId });
  });

  router.get('/share/:token', (req: Request, res: Response) => {
    const token = req.params.token;
    const entry = shareTokens.get(token);
    if (!entry) return res.status(404).json({ error: 'Share token not found' });

    const state = readSavedState();
    const pack = packs.get(entry.packId) || state.snapshots[entry.packId];
    if (!pack) return res.status(404).json({ error: 'Shared pack missing' });

    res.json({ token, packId: entry.packId, pack });
  });

  router.post('/packs/:id/share', async (req: Request, res: Response) => {
    const packId = req.params.id;
    const { userId, visibility, expiresAt } = req.body || {};
    if (!packId || !userId) return res.status(400).json({ error: 'pack id and userId required' });
    const repo = await getPackRepo();
    const pack = packs.get(packId) || (await repo.getPack(packId));
    if (!pack) return res.status(404).json({ error: 'Pack not found' });

    await repo.savePackSnapshot(userId, pack);
    const parsedExpiry = expiresAt ? new Date(expiresAt) : null;
    const token = await repo.createShareToken(userId, packId, visibility ?? 'unlisted', parsedExpiry ?? null);
    res.json({ ...token, shareUrl: `/api/packs/share/${token.token}` });
  });

  router.get('/packs/share/:token', async (req: Request, res: Response) => {
    const token = req.params.token;
    const repo = await getPackRepo();
    const entry = await repo.resolveShareToken(token);
    if (!entry) return res.status(404).json({ error: 'Share link expired or missing' });
    res.json({ token, visibility: entry.visibility, pack: entry.pack });
  });

  // Assets stubs
  router.post('/assets/upload-url', (req: Request, res: Response) => {
    const { filename, contentType } = req.body || {};
    if (!filename || !contentType) return res.status(400).json({ error: 'filename and contentType required' });
    const assetId = createId('asset');
    const uploadUrl = `https://example.local/upload/${assetId}/${encodeURIComponent(filename)}`;
    assets.set(assetId, { id: assetId, filename, contentType, status: 'uploaded', sourceUrl: null });
    res.json({ uploadUrl, assetId });
  });
  router.post('/assets/ingest', (req: Request, res: Response) => {
    const { assetId, sourceUrl } = req.body || {};
    if (!assetId || !sourceUrl) return res.status(400).json({ error: 'assetId and sourceUrl required' });
    const asset = assets.get(assetId) || { id: assetId };
    const durationSeconds = Math.floor(Math.random() * 30) + 1;
    const fingerprint = `fp-${Math.random().toString(36).substring(2, 10)}`;
    asset.sourceUrl = sourceUrl;
    asset.durationSeconds = durationSeconds;
    asset.fingerprint = fingerprint;
    asset.status = 'ingested';
    assets.set(assetId, asset);
    res.json({ assetId, durationSeconds, fingerprint });
  });

  // Auth + billing stubs
  router.post('/auth/magic-link', (req: Request, res: Response) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email required' });
    const token = createId('token');
    const expiresIn = 300;
    magicTokens.set(token, { email, expiresAt: Date.now() + expiresIn * 1000 });
    res.json({ token, expiresIn });
  });
  router.post('/billing/checkout', (req: Request, res: Response) => {
    const { userId, amountCents, currency } = req.body || {};
    if (!userId || !amountCents || !currency) return res.status(400).json({ error: 'userId, amountCents and currency required' });
    const sessionId = `sess_${Math.random().toString(36).substring(2, 10)}`;
    res.json({ sessionId, status: 'created' });
  });
  router.post('/notify/subscribe', (req: Request, res: Response) => {
    const { uploadId, notifyEmail } = req.body || {};
    if (!uploadId || !notifyEmail) return res.status(400).json({ error: 'uploadId and notifyEmail required' });
    res.json({ subscribed: true, uploadId, notifyEmail });
  });

  // New: instrumentals search (Piped backend)
  router.get('/instrumentals/search', async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q || '').trim();
      const limitRaw = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
      const limit = Math.min(10, Math.max(1, Number.parseInt(String(limitRaw || '3'), 10) || 3));
      if (!q) return res.status(400).json({ error: 'q is required' });
      const items = await services.youtubeService.searchInstrumentals(q, limit);
      res.json({ items });
    } catch (err) {
      console.error('instrumentals/search failed', err);
      res.status(500).json({ items: [] });
    }
  });

  // News headlines search (uses SauravKanchan/NewsAPI static feeds)
  router.get('/news/search', async (req: Request, res: Response) => {
    try {
      const topic = String(req.query.topic ?? '').trim();
      const keywords = String(req.query.keywords ?? '').trim();
      const from = String(req.query.from ?? '').trim();
      const to = String(req.query.to ?? '').trim();
      const random = String(req.query.random ?? '').toLowerCase() === 'true';
      const q = String(req.query.q || req.query.query || topic || '').trim();
      const limitRaw = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
      const limit = Math.min(8, Math.max(1, Number.parseInt(String(limitRaw || '5'), 10) || 5));
      if (!q && !keywords && !random) return res.status(400).json({ error: 'q or keywords are required' });
      const items = await services.newsService.searchHeadlines({
        query: q,
        keywords,
        from: from || undefined,
        to: to || undefined,
        random,
        limit,
        seed: req.query.seed as string | undefined
      });
      res.json({ items, query: q, keywords, from, to, random });
    } catch (err) {
      console.error('news/search failed', err);
      res.status(500).json({ items: [] });
    }
  });

  // YouTube search without API key
  router.get('/youtube/search', async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q || '').trim();
      const limitRaw = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
      const limit = Math.min(20, Math.max(1, Number.parseInt(String(limitRaw || '5'), 10) || 5));
      if (!q) return res.status(400).json({ error: 'q is required' });
      const items = await searchYoutubeKeyless(q, limit);
      res.json({ items });
    } catch (err) {
      console.error('youtube/search failed', err);
      res.status(500).json({ items: [] });
    }
  });

  // Headlines linked to a generated pack
  router.get('/packs/:id/headlines', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const limitRaw = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
      const limit = Math.min(8, Math.max(1, Number.parseInt(String(limitRaw || '5'), 10) || 5));
      const topic = String(req.query.topic ?? '').trim();
      const keywords = String(req.query.keywords ?? '').trim();
      const from = String(req.query.from ?? '').trim();
      const to = String(req.query.to ?? '').trim();
      const random = String(req.query.random ?? '').toLowerCase() === 'true';
      const timeframeParam = req.query.timeframe as RelevanceTimeframe | undefined;
      let pack = packs.get(id);
      if (!pack) {
        const savedState = readSavedState();
        pack = savedState.snapshots[id];
        if (pack) packs.set(id, pack);
      }
      if (!pack) return res.status(404).json({ error: 'Pack not found' });

      const query = topic || buildHeadlineQueryFromPack(pack);
      const items = await services.newsService.searchHeadlines({
        query,
        keywords,
        from: from || undefined,
        to: to || undefined,
        limit,
        random,
        timeframe: timeframeParam ?? (pack as any).filters?.timeframe,
        seed: req.query.seed as string | undefined
      });
      res.json({ packId: id, query, items, random, keywords, from, to });
    } catch (err) {
      console.error('packs/:id/headlines failed', err);
      res.status(500).json({ packId: req.params.id, items: [] });
    }
  });

  // New: words search
  router.get('/words/search', async (req: Request, res: Response) => {
    try {
      const options: any = {
        startsWith: req.query.startsWith,
        rhymeWith: req.query.rhymeWith,
        syllables: req.query.syllables ? Number.parseInt(String(req.query.syllables), 10) : undefined,
        maxResults: req.query.maxResults ? Number.parseInt(String(req.query.maxResults), 10) : undefined,
        topic: req.query.topic
      };
      const items = await services.wordService.searchWords(options);
      res.json({ items });
    } catch (err) {
      console.error('words/search failed', err);
      res.status(500).json({ items: [] });
    }
  });

  // Rhymes search (rhyme families)
  router.get('/words/rhymes', async (req: Request, res: Response) => {
    try {
      const wordRaw = Array.isArray(req.query.word) ? req.query.word[0] : req.query.word;
      const word = String(wordRaw || '').trim();
      const maxRaw = Array.isArray(req.query.maxResults) ? req.query.maxResults[0] : req.query.maxResults;
      const maxResults = Math.min(20, Math.max(1, Number.parseInt(String(maxRaw || '12'), 10) || 12));
      if (!word) return res.status(400).json({ error: 'word is required' });
      const items = await services.wordService.getRhymes(word, maxResults);
      res.json({ items });
    } catch (err) {
      console.error('words/rhymes failed', err);
      res.status(500).json({ items: [] });
    }
  });

  // Random words for inspiration or rhyme seed
  router.get('/words/random', async (req: Request, res: Response) => {
    try {
      const countRaw = Array.isArray(req.query.count) ? req.query.count[0] : req.query.count;
      const count = Math.min(5, Math.max(1, Number.parseInt(String(countRaw || '1'), 10) || 1));
      const items = await services.wordService.getRandomWords(count);
      res.json({ items });
    } catch (err) {
      console.error('words/random failed', err);
      res.status(500).json({ items: [] });
    }
  });

  // Story Arc generator (Transformers-powered, with fallback)
  router.post('/story-arc/generate', async (req: Request, res: Response) => {
    try {
      const { summary, theme, genre, bpm, nodeCount, seed } = req.body || {};
      const scaffold = await generateStoryArcScaffold({
        summary: String(summary ?? ''),
        theme: theme ? String(theme) : undefined,
        genre: genre ? String(genre) : undefined,
        bpm: typeof bpm === 'number' ? bpm : bpm ? Number(bpm) : undefined,
        nodeCount: typeof nodeCount === 'number' ? nodeCount : nodeCount ? Number(nodeCount) : undefined,
        seed: typeof seed === 'number' ? seed : seed ? String(seed) : undefined
      });
      res.status(201).json({ scaffold });
    } catch (err) {
      console.error('story-arc/generate failed', err);
      res.status(500).json({ error: 'Unable to generate story arc right now' });
    }
  });

  // New: meme templates and caption
  router.get('/memes/templates', async (_req: Request, res: Response) => {
    try {
      // Use Picsum-based keyless templates by default
      const count = 12;
      const nowSeed = Date.now().toString(36);
      const items = Array.from({ length: count }).map((_, idx) => {
        const seed = `meme-${idx + 1}-${nowSeed}`;
        const width = 800;
        const height = 600;
        return {
          id: `picsum-${seed}`,
          name: `Template #${idx + 1}`,
          url: `https://picsum.photos/seed/${seed}/${width}/${height}`,
          width,
          height
        };
      });
      res.json({ items });
    } catch (err) {
      console.error('memes/templates failed', err);
      res.status(500).json({ items: [] });
    }
  });

  // New: keyless inspiration image endpoint (Picsum fallback inside service)
  router.get('/images/random', async (req: Request, res: Response) => {
    try {
      const q = (req.query.query as string) || 'inspire';
      const img = await services.memeService.getRandomImage(q);
      if (!img) return res.status(200).json({ image: null });
      res.json({ image: img });
    } catch (err) {
      console.error('images/random failed', err);
      res.status(200).json({ image: null });
    }
  });
  router.post('/memes/caption', async (req: Request, res: Response) => {
    try {
      const { templateId, captions, font, maxFontSize } = req.body || {};
      if (!templateId || !Array.isArray(captions)) {
        return res.status(400).json({ error: 'templateId and captions[] required' });
      }
      const result = await services.memeService.captionMeme({ templateId, captions, font, maxFontSize });
      res.json(result);
    } catch (err) {
      console.error('memes/caption failed', err);
      res.status(500).json({ error: 'Caption failed' });
    }
  });

  // Uploader insights (mocked)
  router.get('/uploader/insights', (req: Request, res: Response) => {
    const uploaderId = (req.query.uploaderId as string) || 'unknown';
    res.json({ uploaderId, impressions: Math.floor(Math.random() * 1000), downloads: Math.floor(Math.random() * 200), ctr: Math.random() });
  });

  // ============ DAW TRACK SYNC ROUTES (SQLite local store) ============

  router.post('/daw-sync/push', (req: Request, res: Response) => {
    try {
      const body = req.body as DAWSyncPushRequest | undefined;
      if (!body?.roomCode || !body.trackId || !body.state) {
        return res.status(400).json({ error: 'roomCode, trackId, and state are required' });
      }

      const token = extractBearerToken(req);
      const session = token ? vstSessions.get(token) : undefined;
      const requestedRole = normalizePluginRole(body.pluginRole ?? body.state.pluginRole ?? session?.pluginRole);
      const requestedMasterInstanceId = String(
        body.masterInstanceId ?? body.state.masterInstanceId ?? session?.masterInstanceId ?? ''
      ).trim();

      if (requestedRole === 'relay' || requestedRole === 'create') {
        const activeMaster = getActiveMasterPresence(body.roomCode);
        if (!activeMaster) {
          return res.status(409).json({
            ok: false,
            error: 'master_required',
            message: 'Inspire Master must be online before relay/create sync operations.'
          });
        }

        if (requestedMasterInstanceId && requestedMasterInstanceId !== activeMaster.masterInstanceId) {
          return res.status(409).json({
            ok: false,
            error: 'master_mismatch',
            message: 'Relay/Create is attached to a different master instance.'
          });
        }

        body.state.masterInstanceId = activeMaster.masterInstanceId;
      }

      const baseVersion = typeof body.baseVersion === 'number' ? body.baseVersion : null;
      const updatedBy = body.updatedBy ?? 'unknown';
      const incomingState = normalizeIncomingTrackState(body.state, body.roomCode, body.trackId);
      incomingState.pluginRole = requestedRole;
      incomingState.masterInstanceId = body.state.masterInstanceId;

      const result = dawSyncStore.upsertTrackState({
        roomCode: body.roomCode,
        trackId: body.trackId,
        baseVersion,
        updatedBy,
        state: incomingState
      });

      // Phase 2: Record push in WebSocket sync manager for real-time broadcast
      if (result.next && result.next.state.pluginInstanceId) {
        vstSyncManager.recordPush(
          body.roomCode,
          result.next.state.pluginInstanceId,
          result.next.version
        );
      }

      if (result.status === 'conflict' && result.current) {
        return res.status(409).json({
          ok: false,
          conflict: true,
          current: {
            version: result.current.version,
            updatedAt: result.current.updatedAt,
            updatedBy: result.current.updatedBy,
            state: result.current.state
          }
        });
      }

      let eventId: string | undefined;
      if (result.next) {
        const rawAssets = Array.isArray(body.assets) ? body.assets : [];
        const details = body.pushDetails;
        eventId = dawSyncStore.recordPushEvent({
          roomCode: body.roomCode,
          trackId: body.trackId,
          version: result.next.version,
          updatedBy,
          pluginInstanceId: result.next.state.pluginInstanceId,
          dawTrackIndex: result.next.state.dawTrackIndex,
          dawTrackName: result.next.state.dawTrackName,
          details,
          payload: {
            clipCount: result.next.state.clips.length,
            noteCount: result.next.state.notes.length
          }
        });

        const preparedAssets = rawAssets.map((asset) =>
          materializeAssetFromInlineData(body.roomCode, body.trackId, eventId!, asset)
        );

        dawSyncStore.recordPushAssets(body.roomCode, body.trackId, eventId, preparedAssets);
      }

      return res.status(201).json({
        ok: true,
        version: result.next?.version,
        state: result.next?.state,
        eventId
      });
    } catch (err) {
      console.error('[daw-sync] push failed', err);
      return res.status(500).json({ error: 'Failed to push track state' });
    }
  });

  router.get('/daw-sync/pull', (req: Request, res: Response) => {
    try {
      const roomCode = String(req.query.roomCode || '');
      const trackId = String(req.query.trackId || '');
      const sinceRaw = req.query.sinceVersion;
      const sinceVersion = Number.isFinite(Number(sinceRaw)) ? Number(sinceRaw) : null;
      const token = extractBearerToken(req);
      const session = token ? vstSessions.get(token) : undefined;
      const requestedRole = normalizePluginRole(req.query.pluginRole ?? session?.pluginRole);
      const requestedMasterInstanceId = String(req.query.masterInstanceId ?? session?.masterInstanceId ?? '').trim();

      if (!roomCode || !trackId) {
        return res.status(400).json({ error: 'roomCode and trackId are required' });
      }

      if (requestedRole === 'relay' || requestedRole === 'create') {
        const activeMaster = getActiveMasterPresence(roomCode);
        if (!activeMaster) {
          return res.status(409).json({
            ok: false,
            error: 'master_required',
            message: 'Inspire Master must be online before relay/create sync operations.'
          });
        }

        if (requestedMasterInstanceId && requestedMasterInstanceId !== activeMaster.masterInstanceId) {
          return res.status(409).json({
            ok: false,
            error: 'master_mismatch',
            message: 'Relay/Create is attached to a different master instance.'
          });
        }
      }

      const current = dawSyncStore.getTrackState(roomCode, trackId);
      const changes = sinceVersion !== null ? dawSyncStore.listChangesSince(roomCode, trackId, sinceVersion) : [];

      return res.json({
        roomCode,
        trackId,
        version: current?.version ?? 0,
        state: current?.state ?? null,
        changes
      });
    } catch (err) {
      console.error('[daw-sync] pull failed', err);
      return res.status(500).json({ error: 'Failed to pull track state' });
    }
  });

  router.get('/daw-sync/room/:roomCode', (req: Request, res: Response) => {
    try {
      const { roomCode } = req.params;
      const tracks = dawSyncStore.listTrackStates(roomCode);
      res.json({ roomCode, tracks });
    } catch (err) {
      console.error('[daw-sync] room list failed', err);
      res.status(500).json({ error: 'Failed to list room tracks' });
    }
  });

  // ============ PHASE 1: VST INSTANCE BROADCASTING ============

  // List all VST instances in a room
  router.get('/rooms/:roomCode/instances', (req: Request, res: Response) => {
    try {
      const { roomCode } = req.params;
      const tracks = dawSyncStore.listTrackStates(roomCode);
      const connectedInstances = vstSyncManager.getConnectedInstances(roomCode);
      
      // Collect unique plugin instances from track states
      const instancesMap = new Map<string, {
        pluginInstanceId: string;
        username?: string;
        pluginRole?: InspirePluginRole;
        masterInstanceId?: string;
        presenceLabel?: string;
        dawTrackIndex?: number;
        dawTrackName?: string;
        lastPushAt: number;
        lastPushBy?: string;
        version: number;
        trackId: string;
      }>();

      for (const track of tracks) {
        const instanceId = track.state.pluginInstanceId;
        if (instanceId) {
          // Keep the most recent update for each instance
          const existing = instancesMap.get(instanceId);
          if (!existing || track.updatedAt > existing.lastPushAt) {
            instancesMap.set(instanceId, {
              pluginInstanceId: instanceId,
              username: track.updatedBy,
              pluginRole: normalizePluginRole(track.state.pluginRole),
              masterInstanceId: track.state.masterInstanceId,
              presenceLabel: `[${normalizePluginRole(track.state.pluginRole).toUpperCase()}] ${track.updatedBy || 'Unknown'}`,
              dawTrackIndex: track.state.dawTrackIndex,
              dawTrackName: track.state.dawTrackName,
              lastPushAt: track.updatedAt,
              lastPushBy: track.updatedBy,
              version: track.version,
              trackId: track.trackId
            });
          }
        }
      }

      for (const connected of connectedInstances) {
        const existing = instancesMap.get(connected.pluginInstanceId);
        if (!existing) {
          instancesMap.set(connected.pluginInstanceId, {
            pluginInstanceId: connected.pluginInstanceId,
            username: connected.username,
            pluginRole: connected.pluginRole,
            masterInstanceId: connected.masterInstanceId,
            presenceLabel: connected.presenceLabel,
            lastPushAt: connected.connectedAt,
            lastPushBy: connected.username,
            version: 0,
            trackId: ''
          });
        } else {
          existing.username = existing.username || connected.username;
          existing.pluginRole = existing.pluginRole || connected.pluginRole;
          existing.masterInstanceId = existing.masterInstanceId || connected.masterInstanceId;
          existing.presenceLabel = existing.presenceLabel || connected.presenceLabel;
        }
      }

      const instances = Array.from(instancesMap.values());
      res.json({
        roomCode,
        instances,
        count: instances.length
      });
    } catch (err) {
      console.error('[instances] list failed', err);
      res.status(500).json({ error: 'Failed to list instances' });
    }
  });

  // Check sync status for a specific VST instance
  router.get('/rooms/:roomCode/sync-status', (req: Request, res: Response) => {
    try {
      const { roomCode } = req.params;
      const pluginInstanceId = String(req.query.pluginInstanceId || '');

      if (!pluginInstanceId) {
        return res.status(400).json({ error: 'pluginInstanceId is required' });
      }

      const tracks = dawSyncStore.listTrackStates(roomCode);
      
      // Find this instance's track
      const myTrack = tracks.find(t => t.state.pluginInstanceId === pluginInstanceId);
      
      // Find latest version across all tracks
      const allVersions = tracks
        .map(t => ({
          version: t.version,
          instanceId: t.state.pluginInstanceId || 'unknown',
          updatedAt: t.updatedAt
        }))
        .sort((a, b) => b.version - a.version);

      const latestVersion = allVersions[0]?.version || 0;
      const myVersion = myTrack?.version || 0;

      let status: 'up-to-date' | 'behind' | 'ahead';
      if (myVersion < latestVersion) {
        status = 'behind';
      } else if (myVersion > latestVersion) {
        status = 'ahead';
      } else {
        status = 'up-to-date';
      }

      res.json({
        pluginInstanceId,
        myVersion,
        latestVersion,
        status,
        behindBy: Math.max(0, latestVersion - myVersion),
        recentPushes: allVersions.slice(0, 10)
      });
    } catch (err) {
      console.error('[sync-status] check failed', err);
      res.status(500).json({ error: 'Failed to check sync status' });
    }
  });

  // ============ PHASE 2: RECENT PUSHES FOR SMART POLLING ============

  // Get recent pushes in a room (for smart polling without fetching all instances)
  router.get('/rooms/:roomCode/recent-pushes', (req: Request, res: Response) => {
    try {
      const { roomCode } = req.params;
      const sinceRaw = req.query.since;
      const since = typeof sinceRaw === 'string' ? Number(sinceRaw) : undefined;

      // Get recent pushes from WebSocket sync manager
      const pushes = vstSyncManager.getRecentPushes(roomCode, since);

      res.json({
        roomCode,
        pushes,
        count: pushes.length,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('[recent-pushes] fetch failed', err);
      res.status(500).json({ error: 'Failed to get recent pushes' });
    }
  });

  // ============ VST ROOM MANAGEMENT (LOCAL) ============

  // In-memory store for VST rooms (for local development, no Firebase dependency)
  type VstSessionRecord = {
    roomId?: string;
    roomCode?: string;
    createdAt: number;
    expiresAt: number;
    isGuest?: boolean;
    guestId?: string;
    username?: string;
    pluginRole?: InspirePluginRole;
    pluginInstanceId?: string;
    masterInstanceId?: string;
  };

  type MasterPresenceRecord = {
    roomCode: string;
    roomId?: string;
    masterInstanceId: string;
    sessionToken?: string;
    lastHeartbeat: number;
  };

  type VstAuthBridgeRecord = {
    bridgeId: string;
    accessToken: string;
    displayName?: string;
    isGuest?: boolean;
    createdAt: number;
    expiresAt: number;
  };

  const MASTER_HEARTBEAT_TTL_MS = 30_000;
  const VST_AUTH_BRIDGE_TTL_MS = 10 * 60 * 1000;

  const vstRooms = new Map<string, any>();
  const vstSessions = new Map<string, VstSessionRecord>();
  const roomMasterPresence = new Map<string, MasterPresenceRecord>();
  const vstAuthBridges = new Map<string, VstAuthBridgeRecord>();

  const normalizePluginRole = (value: unknown): InspirePluginRole => {
    const role = String(value ?? '').toLowerCase();
    if (role === 'master' || role === 'relay' || role === 'create') return role;
    return 'legacy';
  };

  const extractBearerToken = (req: Request): string | undefined => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;
    return authHeader.slice(7);
  };

  const getActiveMasterPresence = (roomCode: string): MasterPresenceRecord | null => {
    const key = String(roomCode || '').toUpperCase();
    if (!key) return null;
    const presence = roomMasterPresence.get(key);
    if (!presence) return null;
    if (Date.now() - presence.lastHeartbeat > MASTER_HEARTBEAT_TTL_MS) {
      roomMasterPresence.delete(key);
      return null;
    }
    return presence;
  };

  const cleanupExpiredAuthBridges = () => {
    const now = Date.now();
    for (const [bridgeId, bridge] of vstAuthBridges.entries()) {
      if (bridge.expiresAt <= now) {
        vstAuthBridges.delete(bridgeId);
      }
    }
  };

  const resolveVstSessionFromBearer = (token: string): VstSessionRecord | null => {
    const existing = vstSessions.get(token);
    if (existing) {
      if (typeof existing.expiresAt === 'number' && Date.now() > existing.expiresAt) {
        vstSessions.delete(token);
      } else {
        return existing;
      }
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return null;
    }

    const user = findUserById(decoded.sub);
    if (!user) {
      return null;
    }

    const now = Date.now();
    const expiresAt = Math.max(now + 5 * 60 * 1000, decoded.exp * 1000);
    const materialized: VstSessionRecord = {
      createdAt: now,
      expiresAt,
      isGuest: false,
      username: user.displayName || user.email,
      pluginRole: 'legacy'
    };

    vstSessions.set(token, materialized);
    return materialized;
  };

  /**
   * POST /api/vst/create-room
   * Create a room for VST collaboration (local alternative to Firebase)
   */
  router.post('/vst/create-room', (req: Request, res: Response) => {
    try {
      const { password, name, isGuest, pluginRole, pluginInstanceId } = req.body || {};
      const requestedRole = normalizePluginRole(pluginRole);

      if (requestedRole === 'relay' || requestedRole === 'create') {
        return res.status(403).json({
          error: 'room_control_master_only',
          message: 'Only Inspire Master can create rooms. Relay/Create must attach to an active Master.'
        });
      }
      
      const roomId = createId('room');
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const now = Date.now();
      const ttlMs = isGuest ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000; // 15 min for guest, 24h for auth
      const expiresAt = now + ttlMs;

      const room = {
        roomId,
        name: name || (isGuest ? 'Guest VST Room' : 'VST Collab Room'),
        code,
        createdAt: now,
        expiresAt,
        isGuest: isGuest ?? false,
        isActive: true,
        password: password || null,
        participants: 0
      };

      vstRooms.set(roomId, room);

      console.log(`[VST] Room created: ${roomId} (code: ${code}, guest: ${isGuest})`);

      res.status(201).json({
        roomId: room.roomId,
        code: room.code,
        expiresAt: room.expiresAt,
        ttlMinutes: Math.floor(ttlMs / 60000),
        isGuest: room.isGuest,
        pluginRole: requestedRole,
        pluginInstanceId: typeof pluginInstanceId === 'string' ? pluginInstanceId : undefined
      });
    } catch (err) {
      console.error('[VST] Failed to create room:', err);
      res.status(500).json({ error: 'Failed to create room' });
    }
  });

  /**
   * POST /api/vst/join-room
   * Join a VST room with room ID and code
   */
  router.post('/vst/join-room', (req: Request, res: Response) => {
    try {
      const { roomId, code, pluginRole, pluginInstanceId, masterInstanceId } = req.body || {};
      const requestedRole = normalizePluginRole(pluginRole);

      if (requestedRole === 'relay' || requestedRole === 'create') {
        return res.status(403).json({
          error: 'room_control_master_only',
          message: 'Relay/Create should attach via /api/vst/relay/attach or /api/vst/create/attach after Master joins.'
        });
      }

      if (!roomId || !code) {
        return res.status(400).json({ error: 'roomId and code are required' });
      }

      const providedRoom = String(roomId).trim();
      const providedCode = String(code).trim();
      const providedCodeUpper = providedCode.toUpperCase();

      let room = vstRooms.get(providedRoom);

      if (!room) {
        for (const candidate of vstRooms.values()) {
          if (String(candidate.code || '').toUpperCase() === providedRoom.toUpperCase()) {
            room = candidate;
            break;
          }
        }
      }
      
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      if (!room.isActive) {
        return res.status(403).json({ error: 'Room is inactive' });
      }

      if (room.expiresAt && Date.now() > room.expiresAt) {
        vstRooms.delete(roomId);
        return res.status(410).json({ error: 'Room has expired' });
      }

      const roomCodeMatches = String(room.code || '').toUpperCase() === providedCodeUpper;
      const passwordMatches = typeof room.password === 'string' && room.password.length > 0 && room.password === providedCode;

      if (!roomCodeMatches && !passwordMatches) {
        return res.status(401).json({ error: 'Invalid room code/password' });
      }

      // Generate session token
      const token = createId('session');
      const sessionExpiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

      vstSessions.set(token, {
        roomId,
        roomCode: room.code,
        createdAt: Date.now(),
        expiresAt: sessionExpiresAt,
        pluginRole: requestedRole,
        pluginInstanceId: typeof pluginInstanceId === 'string' ? pluginInstanceId : undefined,
        masterInstanceId: typeof masterInstanceId === 'string' ? masterInstanceId : undefined
      });

      if (requestedRole === 'master' && typeof pluginInstanceId === 'string' && pluginInstanceId.trim()) {
        roomMasterPresence.set(String(room.code).toUpperCase(), {
          roomCode: room.code,
          roomId: room.roomId,
          masterInstanceId: pluginInstanceId,
          sessionToken: token,
          lastHeartbeat: Date.now()
        });
      }

      room.participants++;

      console.log(`[VST] User joined room: ${roomId} (token: ${token.substring(0, 12)}...)`);

      res.json({
        token,
        expiresAt: sessionExpiresAt,
        roomId: room.roomId,
        roomCode: room.code,
        roomName: room.name,
        joinedWith: roomCodeMatches ? 'room-code' : 'password',
        pluginRole: requestedRole
      });
    } catch (err) {
      console.error('[VST] Failed to join room:', err);
      res.status(500).json({ error: 'Failed to join room' });
    }
  });

  /**
   * POST /api/vst/guest-continue
   * Create a guest session for VST (no signup required)
   */
  router.post('/vst/guest-continue', (req: Request, res: Response) => {
    try {
      const requestedRole = normalizePluginRole(req.body?.pluginRole);
      const guestId = createId('guest');
      const token = createId('guest-token');
      
      vstSessions.set(token, {
        guestId,
        createdAt: Date.now(),
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
        isGuest: true,
        pluginRole: requestedRole
      });

      console.log(`[VST] Guest session created: ${guestId}`);

      res.json({
        token,
        guestId,
        expiresAt: Date.now() + 15 * 60 * 1000,
        username: `Guest_${guestId.substring(0, 6)}`,
        pluginRole: requestedRole
      });
    } catch (err) {
      console.error('[VST] Failed to create guest session:', err);
      res.status(500).json({ error: 'Failed to create guest session' });
    }
  });

  /**
   * POST /api/vst/auth-bridge/complete
   * Browser-side completion step: store authenticated token for VST polling.
   */
  router.post('/vst/auth-bridge/complete', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      cleanupExpiredAuthBridges();

      const bridgeId = String(req.body?.bridgeId ?? '').trim();
      const accessToken = String(req.body?.accessToken ?? '').trim();
      const displayName = String(req.body?.displayName ?? '').trim();
      const isGuest = Boolean(req.body?.isGuest);

      if (!bridgeId || bridgeId.length < 8) {
        return res.status(400).json({ error: 'bridgeId is required' });
      }
      if (!accessToken) {
        return res.status(400).json({ error: 'accessToken is required' });
      }

      const now = Date.now();
      vstAuthBridges.set(bridgeId, {
        bridgeId,
        accessToken,
        displayName: displayName || undefined,
        isGuest,
        createdAt: now,
        expiresAt: now + VST_AUTH_BRIDGE_TTL_MS
      });

      return res.json({ ok: true, bridgeId, expiresAt: now + VST_AUTH_BRIDGE_TTL_MS });
    } catch (err) {
      console.error('[VST] Auth bridge completion failed:', err);
      return res.status(500).json({ error: 'Failed to complete VST auth bridge' });
    }
  });

  const consumeVstAuthBridge = (req: Request, res: Response) => {
    try {
      cleanupExpiredAuthBridges();

      const bridgeId = String(req.query.bridgeId ?? req.body?.bridgeId ?? '').trim();
      if (!bridgeId) {
        return res.status(400).json({ error: 'bridgeId is required' });
      }

      const bridge = vstAuthBridges.get(bridgeId);
      if (!bridge) {
        return res.json({ status: 'pending' });
      }

      vstAuthBridges.delete(bridgeId);

      return res.json({
        status: 'complete',
        accessToken: bridge.accessToken,
        displayName: bridge.displayName,
        isGuest: Boolean(bridge.isGuest)
      });
    } catch (err) {
      console.error('[VST] Auth bridge consume failed:', err);
      return res.status(500).json({ error: 'Failed to consume VST auth bridge' });
    }
  };

  /**
   * /api/vst/auth-bridge/consume
   * VST-side polling step: consume token once and mark bridge as completed.
   * Supports GET (query) and POST (JSON body) for plugin compatibility.
   */
  router.get('/vst/auth-bridge/consume', consumeVstAuthBridge);
  router.post('/vst/auth-bridge/consume', consumeVstAuthBridge);

  router.post('/vst/master/heartbeat', (req: Request, res: Response) => {
    try {
      const token = extractBearerToken(req);
      if (!token) {
        return res.status(401).json({ error: 'Missing bearer token' });
      }

      const session = resolveVstSessionFromBearer(token);
      if (!session) {
        return res.status(401).json({ error: 'Invalid session token' });
      }

      const roomCode = String(req.body?.roomCode ?? session.roomCode ?? '').toUpperCase();
      const pluginInstanceId = String(req.body?.pluginInstanceId ?? session.pluginInstanceId ?? '').trim();
      if (!roomCode || !pluginInstanceId) {
        return res.status(400).json({ error: 'roomCode and pluginInstanceId are required' });
      }

      session.pluginRole = 'master';
      session.roomCode = roomCode;
      session.pluginInstanceId = pluginInstanceId;
      session.masterInstanceId = pluginInstanceId;

      roomMasterPresence.set(roomCode, {
        roomCode,
        roomId: session.roomId,
        masterInstanceId: pluginInstanceId,
        sessionToken: token,
        lastHeartbeat: Date.now()
      });

      return res.json({
        ok: true,
        roomCode,
        masterInstanceId: pluginInstanceId,
        active: true,
        ttlMs: MASTER_HEARTBEAT_TTL_MS
      });
    } catch (err) {
      console.error('[VST] Master heartbeat failed:', err);
      return res.status(500).json({ error: 'Failed to process master heartbeat' });
    }
  });

  router.get('/master/room/:roomCode/state', (req: Request, res: Response) => {
    try {
      const roomCode = String(req.params.roomCode || '').toUpperCase();
      const master = getActiveMasterPresence(roomCode);

      let relayCount = 0;
      let createCount = 0;
      for (const session of vstSessions.values()) {
        if (String(session.roomCode || '').toUpperCase() !== roomCode) continue;
        if (session.pluginRole === 'relay') relayCount += 1;
        if (session.pluginRole === 'create') createCount += 1;
      }

      const payload: MasterRoomState = {
        roomCode,
        active: !!master,
        masterInstanceId: master?.masterInstanceId,
        lastHeartbeat: master?.lastHeartbeat,
        relayCount,
        createCount
      };

      return res.json(payload);
    } catch (err) {
      console.error('[VST] Master room state failed:', err);
      return res.status(500).json({ error: 'Failed to load master room state' });
    }
  });

  const handlePluginAttach = (role: 'relay' | 'create') => (req: Request, res: Response) => {
    try {
      const token = extractBearerToken(req);
      if (!token) {
        return res.status(401).json({ error: 'Missing bearer token' });
      }

      const session = resolveVstSessionFromBearer(token);
      if (!session) {
        return res.status(401).json({ error: 'Invalid session token' });
      }

      if (typeof session.expiresAt === 'number' && Date.now() > session.expiresAt) {
        vstSessions.delete(token);
        return res.status(401).json({ error: 'Session expired' });
      }

      const roomCode = String(req.body?.roomCode ?? '').toUpperCase();
      const pluginInstanceId = String(req.body?.pluginInstanceId ?? '').trim();
      if (!roomCode || !pluginInstanceId) {
        return res.status(400).json({ error: 'roomCode and pluginInstanceId are required' });
      }

      const master = getActiveMasterPresence(roomCode);
      if (!master) {
        return res.status(409).json({
          error: 'master_required',
          message: 'Inspire Master must be online before Relay/Create can attach.'
        });
      }

      session.roomCode = roomCode;
      session.pluginRole = role;
      session.pluginInstanceId = pluginInstanceId;
      session.masterInstanceId = master.masterInstanceId;

      return res.json({
        ok: true,
        roomCode,
        pluginRole: role,
        pluginInstanceId,
        masterInstanceId: master.masterInstanceId,
        masterLastHeartbeat: master.lastHeartbeat
      });
    } catch (err) {
      console.error(`[VST] ${role} attach failed:`, err);
      return res.status(500).json({ error: `Failed to attach ${role} plugin` });
    }
  };

  router.post('/vst/relay/attach', handlePluginAttach('relay'));
  router.post('/vst/create/attach', handlePluginAttach('create'));

  // ============ COLLABORATIVE SESSION ROUTES ============

  // In-memory store for collaborative sessions (production would use DB)
  const collaborativeSessions = new Map<string, any>();

  // Initialize mock sessions for spectating
  const mockSessions = [
    {
      id: 'session-producer-01',
      title: 'Texture Flip Collab',
      description: 'Live texture flip session with kitchen percussion and DX7 chords.',
      mode: 'producer',
      submode: 'musician',
      hostId: 'user-midnightloops',
      hostUsername: '@midnightloops',
      createdAt: Date.now() - 5 * 60 * 1000,
      expiresAt: undefined,
      isGuestSession: false,
      status: 'active',
      maxParticipants: 4,
      maxStreams: 4,
      participants: [
        { id: 'user-1', username: '@midnightloops', role: 'host', joinedAt: Date.now() - 5 * 60 * 1000 }
      ],
      viewers: [],
      daw: {
        id: 'daw-session-producer-01',
        bpm: 110,
        timeSignature: '4/4',
        key: 'D',
        scale: 'minor',
        notes: [],
        tempo: 110,
        currentBeat: 0,
        isPlaying: true,
        lastUpdatedBy: 'host',
        lastUpdatedAt: Date.now()
      },
      audioSyncState: {
        serverTimestamp: Date.now(),
        playbackPosition: 32000,
        isPlaying: true,
        tempo: 110,
        clientLatency: 50
      },
      comments: [],
      isPersisted: false,
      recordingUrl: undefined,
      liveDestinations: {
        tiktok: false,
        instagram: true
      }
    }
  ];

  // Populate mock sessions
  mockSessions.forEach(session => {
    collaborativeSessions.set(session.id, session);
    dawSyncStore.recordRoomMembership({
      roomCode: session.id,
      userId: session.hostId,
      username: session.hostUsername,
      role: 'host',
      joinedAt: session.createdAt
    });
    for (const participant of session.participants ?? []) {
      const participantRow = participant as any;
      const participantId = String(participantRow.userId ?? participantRow.id ?? '');
      const participantRole = participantRow.role === 'host' || participantRow.role === 'viewer' || participantRow.role === 'collaborator'
        ? participantRow.role
        : 'collaborator';
      if (!participantId) continue;
      dawSyncStore.recordRoomMembership({
        roomCode: session.id,
        userId: participantId,
        username: participantRow.username ?? 'Unknown',
        role: participantRole,
        joinedAt: participantRow.joinedAt
      });
    }
    for (const viewer of session.viewers ?? []) {
      const viewerRow = viewer as any;
      const viewerId = String(viewerRow.userId ?? viewerRow.id ?? '');
      if (!viewerId) continue;
      dawSyncStore.recordRoomMembership({
        roomCode: session.id,
        userId: viewerId,
        username: viewerRow.username ?? 'Unknown',
        role: 'viewer',
        joinedAt: viewerRow.joinedAt
      });
    }
  });

  const userCanAccessRoom = (roomCode: string, userId?: string): boolean => {
    if (!userId) return false;

    const session = collaborativeSessions.get(roomCode);
    if (session) {
      if (session.hostId === userId) return true;

      const inParticipants = (session.participants ?? []).some((participant: any) => {
        const participantId = String(participant.userId ?? participant.id ?? '');
        return participantId === userId;
      });
      if (inParticipants) return true;

      const inViewers = (session.viewers ?? []).some((viewer: any) => {
        const viewerId = String(viewer.userId ?? viewer.id ?? '');
        return viewerId === userId;
      });
      if (inViewers) return true;
    }

    if (dawSyncStore.roomHasMembershipUser(roomCode, userId)) return true;
    if (dawSyncStore.roomHasUserActivity(roomCode, userId)) return true;
    return false;
  };

  const resolveRoomAccess = (req: Request, roomCode: string): { allowed: boolean; userId?: string; via?: 'jwt' | 'vst' } => {
    const authHeader = req.headers.authorization;
    const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const cookieToken = (req as any).cookies?.accessToken as string | undefined;
    const token = bearer || cookieToken;

    if (!token) return { allowed: false };

    const decoded = verifyToken(token);
    if (decoded) {
      const user = findUserById(decoded.sub);
      if (user && userCanAccessRoom(roomCode, user.id)) {
        return { allowed: true, userId: user.id, via: 'jwt' };
      }
    }

    const vstSession = vstSessions.get(token);
    if (vstSession) {
      if (typeof vstSession.expiresAt === 'number' && Date.now() > vstSession.expiresAt) {
        vstSessions.delete(token);
        return { allowed: false };
      }

      const roomUpper = String(roomCode).toUpperCase();
      const sessionRoomCode = String(vstSession.roomCode ?? '').toUpperCase();
      const sessionRoomId = String(vstSession.roomId ?? '');

      if (sessionRoomCode === roomUpper || sessionRoomId === roomCode) {
        return {
          allowed: true,
          userId: String(vstSession.guestId ?? `vst-session-${token.slice(0, 12)}`),
          via: 'vst'
        };
      }
    }

    return { allowed: false };
  };

  /**
   * POST /api/sessions/collaborate
   * Create a new collaborative session
   * NOTE: Only authenticated users can create full sessions.
   * Guests can create sessions but with a 1-hour expiry.
   */
  router.post('/sessions/collaborate', (req: Request, res: Response) => {
    try {
      const {
        title,
        description,
        mode,
        submode,
        maxParticipants = 4,
        maxStreams = 4,
        isGuest = false,
        hostId,
        hostUsername,
        roomPassword
      } = req.body || {};

      if (!title || !mode || !submode) {
        return res.status(400).json({ error: 'title, mode, and submode required' });
      }

      if (isGuest) {
        console.log('[Collab] Guest creating temporary collaboration session (1 hour expiry)');
      }

      const sessionId = createId('collab-session');
      const now = Date.now();
      const expiresAt = isGuest ? now + 60 * 60 * 1000 : undefined; // 1 hour for guests, unlimited for authenticated
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const resolvedRoomPassword = String(roomPassword ?? '').trim() || Math.random().toString().slice(2, 8);

      const session: any = {
        id: sessionId,
        roomCode,
        roomPassword: resolvedRoomPassword,
        title,
        description: description || '',
        mode,
        submode,
        hostId: hostId || 'user-' + Date.now(), // In production, get from auth
        hostUsername: hostUsername || 'Creator',
        createdAt: now,
        expiresAt,
        isGuestSession: isGuest,
        status: 'waiting',
        maxParticipants,
        maxStreams,
        participants: [],
        viewers: [],
        daw: {
          id: `daw-${sessionId}`,
          bpm: 120,
          timeSignature: '4/4',
          key: 'C',
          scale: 'major',
          notes: [],
          tempo: 120,
          currentBeat: 0,
          isPlaying: false,
          lastUpdatedBy: 'host',
          lastUpdatedAt: now
        },
        audioSyncState: {
          serverTimestamp: now,
          playbackPosition: 0,
          isPlaying: false,
          tempo: 120,
          clientLatency: 0
        },
        comments: [],
        isPersisted: false,
        recordingUrl: undefined
      };

      collaborativeSessions.set(sessionId, session);
      dawSyncStore.recordRoomMembership({
        roomCode: sessionId,
        userId: session.hostId,
        username: session.hostUsername,
        role: 'host',
        joinedAt: now
      });
      res.status(201).json(session);
    } catch (err) {
      console.error('[Collab] Failed to create session:', err);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  /**
   * POST /api/sessions/join-room
   * Join a collaborative session via room code (or session id) and password.
   */
  router.post('/sessions/join-room', (req: Request, res: Response) => {
    try {
      const room = String(req.body?.room ?? '').trim();
      const password = String(req.body?.password ?? '').trim();

      if (!room || !password) {
        return res.status(400).json({ error: 'room and password are required' });
      }

      const roomUpper = room.toUpperCase();
      const session = Array.from(collaborativeSessions.values()).find((candidate: any) => {
        if (!candidate) return false;
        const sessionId = String(candidate.id ?? '').toUpperCase();
        const sessionRoomCode = String(candidate.roomCode ?? '').toUpperCase();
        return sessionId === roomUpper || sessionRoomCode === roomUpper;
      }) as any;

      if (!session) {
        return res.status(404).json({ error: 'Room not found' });
      }

      if (session.status === 'ended') {
        return res.status(410).json({ error: 'Room has ended' });
      }

      if (session.isGuestSession && session.expiresAt && Date.now() > session.expiresAt) {
        collaborativeSessions.delete(session.id);
        return res.status(410).json({ error: 'Room has expired' });
      }

      const expectedPassword = String(session.roomPassword ?? '').trim();
      if (!expectedPassword || password !== expectedPassword) {
        return res.status(401).json({ error: 'Invalid room/password' });
      }

      return res.json({
        ok: true,
        session,
        joinedWith: String(session.roomCode ?? session.id)
      });
    } catch (err) {
      console.error('[Collab] Failed to join by room/password:', err);
      return res.status(500).json({ error: 'Failed to join room' });
    }
  });

  /**
   * GET /api/sessions/:sessionId
   * Retrieve a collaborative session
   */
  router.get('/sessions/:sessionId', (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = collaborativeSessions.get(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check if guest session has expired
      if (session.isGuestSession && session.expiresAt && Date.now() > session.expiresAt) {
        collaborativeSessions.delete(sessionId);
        return res.status(410).json({ error: 'Guest session has expired' });
      }

      // Calculate remaining time for guest sessions
      const remainingMs = session.expiresAt ? Math.max(0, session.expiresAt - Date.now()) : null;
      
      const responsePayload: any = {
        ...session
      };

      if (remainingMs !== null) {
        responsePayload.remainingMs = remainingMs;
        responsePayload.remainingMinutes = Math.ceil(remainingMs / 60000);
      }

      res.json(responsePayload);
    } catch (err) {
      console.error('[Collab] Failed to retrieve session:', err);
      res.status(500).json({ error: 'Failed to retrieve session' });
    }
  });

  /**
   * PUT /api/sessions/:sessionId
   * Update a collaborative session (DAW state, comments, live destinations, etc)
   */
  router.put('/sessions/:sessionId', (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = collaborativeSessions.get(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { daw, comments, audioSyncState, status, liveDestinations } = req.body || {};

      if (daw) session.daw = { ...session.daw, ...daw };
      if (comments) session.comments = comments;
      if (audioSyncState) session.audioSyncState = { ...session.audioSyncState, ...audioSyncState };
      if (status) session.status = status;
      if (liveDestinations) session.liveDestinations = liveDestinations;

      collaborativeSessions.set(sessionId, session);
      res.json(session);
    } catch (err) {
      console.error('[Collab] Failed to update session:', err);
      res.status(500).json({ error: 'Failed to update session' });
    }
  });

  /**
   * GET /api/sessions/:sessionId/comments
   * Get all comments in a session
   */
  router.get('/sessions/:sessionId/comments', (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = collaborativeSessions.get(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json(session.comments || []);
    } catch (err) {
      console.error('[Collab] Failed to retrieve comments:', err);
      res.status(500).json({ error: 'Failed to retrieve comments' });
    }
  });

  /**
   * POST /api/sessions/:sessionId/votes
   * Record a vote on a comment or session
   */
  router.post('/sessions/:sessionId/votes', (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { targetId, targetType, voteType, userId, commentId } = req.body || {};

      const session = collaborativeSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const resolvedTargetId = commentId || targetId;
      const resolvedTargetType = targetType || (commentId ? 'comment' : 'session');

      if (!resolvedTargetId || !voteType) {
        return res.status(400).json({ error: 'voteType and target id are required' });
      }

      res.json({
        success: true,
        voteId: createId('vote'),
        sessionId,
        targetId: resolvedTargetId,
        targetType: resolvedTargetType,
        voteType,
        userId,
        createdAt: Date.now()
      });
    } catch (err) {
      console.error('[Collab] Failed to record vote:', err);
      res.status(500).json({ error: 'Failed to record vote' });
    }
  });

  /**
   * POST /api/sessions/:sessionId/reactions
   * Add a reaction (emoji) to a session
   */
  router.post('/sessions/:sessionId/reactions', (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { userId, emoji, username } = req.body || {};

      if (!emoji || !userId) {
        return res.status(400).json({ error: 'emoji and userId are required' });
      }

      const session = collaborativeSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json({
        success: true,
        reactionId: createId('reaction'),
        sessionId,
        userId,
        username,
        emoji,
        createdAt: Date.now()
      });
    } catch (err) {
      console.error('[Collab] Failed to record reaction:', err);
      res.status(500).json({ error: 'Failed to record reaction' });
    }
  });

  /**
   * POST /api/sessions/:sessionId/request-join
   * Request to join a session as a collaborator
   */
  router.post('/sessions/:sessionId/request-join', (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { userId, username, role } = req.body || {};

      if (!userId || !username) {
        return res.status(400).json({ error: 'userId and username are required' });
      }

      const session = collaborativeSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check if user is already a participant or viewer
      const isAlreadyParticipant = session.participants.some((p: CollaborativeSessionParticipant) => p.userId === userId);
      const isAlreadyViewer = session.viewers.some((v: CollaborativeSessionParticipant) => v.userId === userId);

      if (isAlreadyParticipant) {
        return res.status(409).json({ error: 'User is already a collaborator' });
      }

      res.json({
        success: true,
        requestId: createId('request'),
        sessionId,
        userId,
        username,
        requestedRole: role || 'collaborator',
        status: 'pending',
        createdAt: Date.now()
      });

      dawSyncStore.recordRoomMembership({
        roomCode: sessionId,
        userId,
        username,
        role: role || 'collaborator',
        joinedAt: Date.now()
      });
    } catch (err) {
      console.error('[Collab] Failed to create join request:', err);
      res.status(500).json({ error: 'Failed to request join' });
    }
  });

  /**
   * POST /api/sessions/:sessionId/message
   * Send a message in session comments
   */
  router.post('/sessions/:sessionId/message', (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { userId, username, content } = req.body || {};

      if (!userId || !username || !content) {
        return res.status(400).json({ error: 'userId, username, and content are required' });
      }

      const session = collaborativeSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const comment: CommentThread = {
        id: createId('comment'),
        userId,
        username,
        content,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isEdited: false,
        voteCount: 0
      };

      session.comments.push(comment);
      collaborativeSessions.set(sessionId, session);

      res.status(201).json(comment);
    } catch (err) {
      console.error('[Collab] Failed to create message:', err);
      res.status(500).json({ error: 'Failed to create message' });
    }
  });

  /**
   * GET /api/sessions
   * List all active collaborative sessions
   */
  router.get('/sessions', (req: Request, res: Response) => {
    try {
      const statusFilter = (req.query.status as string) || null;
      let sessions = Array.from(collaborativeSessions.values()).filter((s) => s.status !== 'ended');

      if (statusFilter) {
        sessions = sessions.filter((session) => session.status === statusFilter);
      }

      res.json(sessions);
    } catch (err) {
      console.error('[Collab] Failed to list sessions:', err);
      res.status(500).json({ error: 'Failed to list sessions' });
    }
  });

  /**
   * GET /api/sessions/my-rooms
   * List collaboration rooms created by the authenticated user, grouped by active/inactive.
   */
  router.get('/sessions/my-rooms', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const now = Date.now();
      const mine = Array.from(collaborativeSessions.values())
        .filter((session: any) => String(session.hostId || '') === String(userId))
        .map((session: any) => {
          const expired = Boolean(session.expiresAt && now > Number(session.expiresAt));
          const ended = String(session.status || '') === 'ended';
          const isActive = !expired && !ended;
          return {
            id: session.id,
            roomCode: session.roomCode,
            roomPassword: session.roomPassword,
            title: session.title,
            mode: session.mode,
            submode: session.submode,
            hostUsername: session.hostUsername,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            status: session.status,
            isGuestSession: Boolean(session.isGuestSession),
            participants: Array.isArray(session.participants) ? session.participants.length : 0,
            viewers: Array.isArray(session.viewers) ? session.viewers.length : 0,
            active: isActive
          };
        })
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

      const active = mine.filter((session) => session.active);
      const inactive = mine.filter((session) => !session.active);

      return res.json({ active, inactive, total: mine.length });
    } catch (err) {
      console.error('[Collab] Failed to load my rooms:', err);
      return res.status(500).json({ error: 'Failed to load your rooms' });
    }
  });

  router.get('/collab/:roomCode/visualization', (req: Request, res: Response) => {
    try {
      const { roomCode } = req.params;
      const since = req.query.since ? Number(req.query.since) : undefined;
      const limit = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 300;
      const session = collaborativeSessions.get(roomCode);

      const access = resolveRoomAccess(req, roomCode);
      const allowPublicSpectate = !access.allowed && !!session && session.status !== 'ended';
      if (!access.allowed && !allowPublicSpectate) {
        return res.status(401).json({ error: 'Authentication required for room visualization' });
      }

      if (access.via === 'jwt' && !userCanAccessRoom(roomCode, access.userId)) {
        return res.status(403).json({ error: 'Room access denied' });
      }

      const memberships = dawSyncStore.listRoomMemberships(roomCode);
      const pushEvents = dawSyncStore.listPushEventsByRoom(roomCode, { since, limit });
      const activeInstances = vstSyncManager.getConnectedInstances(roomCode).length;
      const includeAssetDownloadUrls = access.allowed;

      const timeline: CollabPushEventRecord[] = pushEvents.map((event) => ({
        ...event,
        assets: event.assets.map((asset) => ({
          ...asset,
          downloadUrl: includeAssetDownloadUrls ? `/api/collab/assets/${asset.id}` : undefined
        }))
      }));

      if (!timeline.length) {
        const roomTracks = dawSyncStore.listTrackStates(roomCode);
        for (const track of roomTracks) {
          const changes = dawSyncStore.listChangesSince(roomCode, track.trackId, 0);
          for (const change of changes.slice(0, 100)) {
            timeline.push({
              id: `backfill-${change.id}`,
              roomCode,
              trackId: change.trackId,
              version: change.version,
              eventTime: change.updatedAt,
              updatedBy: change.updatedBy,
              pluginInstanceId: change.state.pluginInstanceId,
              dawTrackIndex: change.state.dawTrackIndex,
              dawTrackName: change.state.dawTrackName,
              pushedByUserId: change.updatedBy,
              pushedByUsername: change.updatedBy,
              editType: change.state.trackType === 'midi' ? 'midi' : 'audio',
              trackBeat: change.state.currentBeat,
              durationSeconds: undefined,
              fileTypes: (change.state.files ?? []).map((file) => file.fileType),
              source: 'backfill',
              payload: {
                clipCount: change.state.clips.length,
                noteCount: change.state.notes.length,
                backfilled: true
              },
              assets: (change.state.files ?? []).map((file) => ({
                id: `${change.id}-${file.id}`,
                eventId: `backfill-${change.id}`,
                roomCode,
                trackId: change.trackId,
                fileName: file.fileName,
                fileType: file.fileType,
                filePath: file.filePath,
                sizeBytes: file.sizeBytes,
                durationSeconds: file.durationBeats,
                createdAt: file.updatedAt ?? change.updatedAt,
                downloadUrl: undefined
              }))
            });
          }
        }
      }

      timeline.sort((a, b) => b.eventTime - a.eventTime);

      const trackTree = new Map<string, {
        trackId: string;
        trackName: string;
        trackIndex: number;
        instances: Map<string, CollabPushEventRecord[]>;
      }>();

      for (const event of timeline) {
        const trackNode = trackTree.get(event.trackId) ?? {
          trackId: event.trackId,
          trackName: event.dawTrackName ?? event.trackId,
          trackIndex: event.dawTrackIndex ?? 0,
          instances: new Map<string, CollabPushEventRecord[]>()
        };
        const instanceKey = event.pluginInstanceId ?? 'unknown-instance';
        const list = trackNode.instances.get(instanceKey) ?? [];
        list.push(event);
        trackNode.instances.set(instanceKey, list);
        trackTree.set(event.trackId, trackNode);
      }

      const tree = Array.from(trackTree.values())
        .sort((a, b) => a.trackIndex - b.trackIndex)
        .map((trackNode) => ({
          trackId: trackNode.trackId,
          trackName: trackNode.trackName,
          trackIndex: trackNode.trackIndex,
          instances: Array.from(trackNode.instances.entries()).map(([pluginInstanceId, pushes]) => ({
            pluginInstanceId,
            pushes: pushes.sort((a, b) => {
              const beatA = typeof a.trackBeat === 'number' ? a.trackBeat : Number.MAX_SAFE_INTEGER;
              const beatB = typeof b.trackBeat === 'number' ? b.trackBeat : Number.MAX_SAFE_INTEGER;
              if (beatA !== beatB) return beatA - beatB;
              return a.eventTime - b.eventTime;
            })
          }))
        }));

      const payload: CollabVisualizationResponse = {
        roomCode,
        generatedAt: Date.now(),
        summary: {
          roomTitle: session?.title,
          totalPushes: timeline.length,
          totalAssets: timeline.reduce((acc, event) => acc + event.assets.length, 0),
          totalParticipants: memberships.length,
          activeInstances,
          tracksTouched: tree.length
        },
        members: memberships,
        timeline,
        tree
      };

      return res.json(payload);
    } catch (err) {
      console.error('[collab] visualization failed', err);
      return res.status(500).json({ error: 'Failed to build collaboration visualization' });
    }
  });

  router.post(
    '/collab/:roomCode/assets/upload-chunk',
    express.raw({ type: '*/*', limit: '200mb' }),
    (req: Request, res: Response) => {
      try {
        const { roomCode } = req.params;
        const access = resolveRoomAccess(req, roomCode);
        if (!access.allowed) {
          return res.status(401).json({ error: 'Authentication required for room upload' });
        }

        const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
        if (!bodyBuffer.length) {
          return res.status(400).json({ error: 'Chunk body is required' });
        }

        const uploadId = String(req.headers['x-upload-id'] || createId('collab-upload'));
        const fileName = String(req.headers['x-file-name'] || 'upload.bin');
        const chunkIndex = Number(req.headers['x-chunk-index'] || 0);
        const totalChunks = Number(req.headers['x-total-chunks'] || 1);

        if (!Number.isFinite(chunkIndex) || chunkIndex < 0) {
          return res.status(400).json({ error: 'x-chunk-index must be a non-negative number' });
        }

        const uploadRoot = path.join(COLLAB_ASSET_DIR, 'uploads', sanitizePathSegment(roomCode), sanitizePathSegment(uploadId));
        fs.mkdirSync(uploadRoot, { recursive: true });

        const metadataPath = path.join(uploadRoot, 'metadata.json');
        const metadata = {
          roomCode,
          uploadId,
          fileName,
          fileType: String(req.headers['x-file-type'] || 'application/octet-stream'),
          trackId: String(req.headers['x-track-id'] || ''),
          eventId: String(req.headers['x-event-id'] || ''),
          durationSeconds: req.headers['x-duration-seconds'] ? Number(req.headers['x-duration-seconds']) : undefined,
          checksum: String(req.headers['x-checksum'] || ''),
          totalChunks,
          updatedAt: Date.now()
        };
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

        const chunkPath = path.join(uploadRoot, `chunk_${chunkIndex}.part`);
        fs.writeFileSync(chunkPath, bodyBuffer);

        return res.status(201).json({
          ok: true,
          uploadId,
          roomCode,
          chunkIndex,
          totalChunks,
          receivedBytes: bodyBuffer.length
        });
      } catch (err) {
        console.error('[collab] upload chunk failed', err);
        return res.status(500).json({ error: 'Failed to upload chunk' });
      }
    }
  );

  router.post('/collab/:roomCode/assets/complete-upload', (req: Request, res: Response) => {
    try {
      const { roomCode } = req.params;
      const access = resolveRoomAccess(req, roomCode);
      if (!access.allowed) {
        return res.status(401).json({ error: 'Authentication required for room upload' });
      }

      const {
        uploadId,
        eventId,
        trackId,
        fileName,
        fileType,
        durationSeconds,
        checksum,
        metadata,
        totalChunks
      } = req.body || {};

      if (!uploadId || !eventId || !trackId || !fileName || !fileType) {
        return res.status(400).json({ error: 'uploadId, eventId, trackId, fileName, and fileType are required' });
      }

      const uploadRoot = path.join(COLLAB_ASSET_DIR, 'uploads', sanitizePathSegment(roomCode), sanitizePathSegment(String(uploadId)));
      if (!fs.existsSync(uploadRoot)) {
        return res.status(404).json({ error: 'Upload session not found' });
      }

      const chunkFiles = fs
        .readdirSync(uploadRoot)
        .filter((name) => name.startsWith('chunk_') && name.endsWith('.part'))
        .sort((a, b) => {
          const ia = Number(a.replace('chunk_', '').replace('.part', ''));
          const ib = Number(b.replace('chunk_', '').replace('.part', ''));
          return ia - ib;
        });

      if (!chunkFiles.length) {
        return res.status(400).json({ error: 'No uploaded chunks found for this uploadId' });
      }

      if (Number.isFinite(Number(totalChunks)) && chunkFiles.length < Number(totalChunks)) {
        return res.status(400).json({ error: `Upload incomplete: received ${chunkFiles.length}/${Number(totalChunks)} chunks` });
      }

      const targetDir = path.join(COLLAB_ASSET_DIR, sanitizePathSegment(roomCode), sanitizePathSegment(String(trackId)));
      fs.mkdirSync(targetDir, { recursive: true });

      const outputName = `${sanitizePathSegment(String(eventId))}_${sanitizePathSegment(String(fileName))}`;
      const outputPath = path.join(targetDir, outputName);

      const parts = chunkFiles.map((chunkFile) => {
        const chunkPath = path.join(uploadRoot, chunkFile);
        return fs.readFileSync(chunkPath);
      });
      fs.writeFileSync(outputPath, Buffer.concat(parts));

      const fileStat = fs.statSync(outputPath);
      const assetRows = dawSyncStore.recordPushAssets(roomCode, String(trackId), String(eventId), [
        {
          fileName: String(fileName),
          fileType: String(fileType),
          filePath: outputPath,
          sizeBytes: fileStat.size,
          durationSeconds: typeof durationSeconds === 'number' ? durationSeconds : undefined,
          checksum: typeof checksum === 'string' ? checksum : undefined,
          metadata: metadata && typeof metadata === 'object' ? metadata : undefined
        }
      ]);

      fs.rmSync(uploadRoot, { recursive: true, force: true });

      return res.status(201).json({
        ok: true,
        roomCode,
        eventId,
        uploadedChunks: chunkFiles.length,
        asset: assetRows[0]
      });
    } catch (err) {
      console.error('[collab] complete upload failed', err);
      return res.status(500).json({ error: 'Failed to complete upload' });
    }
  });

  router.post('/collab/:roomCode/backfill', (req: Request, res: Response) => {
    try {
      const { roomCode } = req.params;
      const access = resolveRoomAccess(req, roomCode);
      if (!access.allowed) {
        return res.status(401).json({ error: 'Authentication required for room backfill' });
      }

      if (access.via === 'jwt' && !userCanAccessRoom(roomCode, access.userId)) {
        return res.status(403).json({ error: 'Room access denied' });
      }

      const trackIds = dawSyncStore.listTrackIdsForRoom(roomCode);
      let scanned = 0;
      let inserted = 0;
      let deduped = 0;

      for (const trackId of trackIds) {
        const changes = dawSyncStore.listAllChangesForRoom(roomCode, trackId);
        for (const change of changes) {
          scanned += 1;
          const sourceRef = change.id;

          if (dawSyncStore.hasPushEventSourceRef(roomCode, sourceRef)) {
            deduped += 1;
            continue;
          }

          const state = change.state;
          const eventId = dawSyncStore.recordPushEvent({
            roomCode,
            trackId,
            version: change.version,
            updatedBy: change.updatedBy,
            pluginInstanceId: state.pluginInstanceId,
            dawTrackIndex: state.dawTrackIndex,
            dawTrackName: state.dawTrackName,
            sourceRef,
            details: {
              source: 'backfill',
              editType: state.trackType === 'midi' ? 'midi' : state.trackType === 'audio' ? 'audio' : 'hybrid',
              trackBeat: state.currentBeat,
              fileTypes: (state.files ?? []).map((file) => file.fileType),
              pushedByUserId: change.updatedBy,
              pushedByUsername: change.updatedBy,
              notes: 'Legacy backfilled DAW track change'
            },
            payload: {
              clipCount: state.clips.length,
              noteCount: state.notes.length,
              backfilledAt: Date.now()
            }
          });

          const fileAssets = (state.files ?? []).map((file) => ({
            fileName: file.fileName,
            fileType: file.fileType,
            filePath: file.filePath,
            checksum: file.checksum,
            sizeBytes: file.sizeBytes,
            durationSeconds: file.durationBeats,
            metadata: {
              source: file.source,
              updatedAt: file.updatedAt
            }
          }));
          if (fileAssets.length) {
            dawSyncStore.recordPushAssets(roomCode, trackId, eventId, fileAssets);
          }

          inserted += 1;
        }
      }

      return res.json({
        ok: true,
        roomCode,
        scanned,
        inserted,
        deduped,
        totalPushEvents: dawSyncStore.countPushEvents(roomCode)
      });
    } catch (err) {
      console.error('[collab] backfill failed', err);
      return res.status(500).json({ error: 'Failed to backfill collaboration history' });
    }
  });

  router.get('/collab/assets/:assetId', (req: Request, res: Response) => {
    try {
      const { assetId } = req.params;
      const asset = dawSyncStore.getPushAssetById(assetId);

      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      const access = resolveRoomAccess(req, asset.roomCode);
      if (!access.allowed) {
        return res.status(401).json({ error: 'Authentication required for room asset access' });
      }

      if (access.via === 'jwt' && !userCanAccessRoom(asset.roomCode, access.userId)) {
        return res.status(403).json({ error: 'Room access denied' });
      }

      if (!asset.filePath || !fs.existsSync(asset.filePath)) {
        return res.status(404).json({ error: 'Asset file is unavailable' });
      }

      res.setHeader('Content-Type', asset.fileType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${asset.fileName}"`);
      return res.sendFile(path.resolve(asset.filePath));
    } catch (err) {
      console.error('[collab] asset download failed', err);
      return res.status(500).json({ error: 'Failed to stream asset' });
    }
  });

  return router;
}

// Developer console under `/dev` (HTML only). API is handled by buildApiRouter.
const devRouter = express.Router();

devRouter.get('/', (_req: Request, res: Response) => {
  res.type('html');
  res.send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Inspire API - Dev Console</title>
        <style>
          :root { --bg:#0b1020; --panel:#0f1720; --muted:#94a3b8; --accent:#60a5fa }
          body { margin:0; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; background:linear-gradient(180deg,#071024,#07142a); color:#e6eef8; padding:24px }
          .wrap { max-width:980px; margin:0 auto }
          header { display:flex; align-items:center; gap:16px }
          h1 { margin:0; font-size:20px }
          .controls { display:flex; gap:12px; flex-wrap:wrap; margin-top:16px }
          .card { background:var(--panel); padding:12px; border-radius:10px; box-shadow:0 6px 18px rgba(2,6,23,0.6) }
          button { background:var(--accent); color:#022; border:0; padding:8px 12px; border-radius:8px; cursor:pointer }
          input, select { padding:8px; border-radius:8px; border:1px solid #20324a; background:#081024; color:#dbeafe }
          .output { margin-top:18px; white-space:pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace }
          .pack { display:flex; gap:12px; margin-top:12px }
          .col { flex:1 }
          ul { margin:6px 0 0 18px }
        </style>
      </head>
      <body>
        <div class="wrap">
          <header>
            <h1>Inspire API — Dev Console</h1>
            <div style="margin-left:auto; color:var(--muted)">Backend: <code>${process.env.NODE_ENV||'dev'}</code></div>
          </header>

          <div class="controls">
            <div class="card">
              <strong>Generate Fuel Pack</strong>
              <div style="margin-top:8px; display:flex; gap:8px; align-items:center">
                <label>Words <input id="wordsCount" type="number" value="6" style="width:80px"/></label>
                <label>Memes <input id="memesCount" type="number" value="3" style="width:80px"/></label>
                <button id="genBtn">Generate</button>
              </div>
            </div>

            <div class="card">
              <strong>Assets</strong>
              <div style="margin-top:8px; display:flex; gap:8px; align-items:center">
                <input id="assetFilename" placeholder="clip.wav" />
                <input id="assetContentType" placeholder="audio/wav" />
                <button id="uploadUrlBtn">Request Upload URL</button>
              </div>
            </div>

            <div class="card">
              <strong>Auth / Insights</strong>
              <div style="margin-top:8px; display:flex; gap:8px; align-items:center">
                <input id="magicEmail" placeholder="dev@example.com" />
                <button id="magicBtn">Magic Token</button>
                <input id="uploaderId" placeholder="uploader id" />
                <button id="insightsBtn">Insights</button>
              </div>
            </div>
          </div>

          <div class="card output" id="output">Responses will appear here...</div>

          <div id="lastPack" class="pack"></div>
          <div style="margin-top:12px" class="card">
            <strong>Saved Packs</strong>
            <div style="margin-top:8px; display:flex; gap:8px; align-items:center">
              <input id="savedUserId" placeholder="user id (to view)" />
              <button id="viewSavedBtn">View Saved</button>
            </div>
            <div id="savedList" style="margin-top:8px; color:var(--muted)"></div>
          </div>
        </div>

        <script>
          const out = document.getElementById('output');
          const last = document.getElementById('lastPack');

          function show(v){ out.textContent = typeof v === 'string' ? v : JSON.stringify(v, null, 2) }

          async function api(path, opts){
            try{
              const res = await fetch(path, opts);
              const ct = res.headers.get('content-type') || '';
              if(ct.includes('application/json')){
                const json = await res.json(); show({ status: res.status, body: json }); return json;
              }
              const txt = await res.text(); show({ status: res.status, body: txt }); return txt;
            } catch(e){ show('Error: '+e); throw e }
          }

          document.getElementById('genBtn').addEventListener('click', async ()=>{
            const words = Number(document.getElementById('wordsCount').value || 6);
            const memes = Number(document.getElementById('memesCount').value || 3);
            const body = await api('/dev/api/fuel-pack', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ words, memes }) });
            // body: { id, pack }
            renderPack(body.pack || body, body.id);
          });

          document.getElementById('uploadUrlBtn').addEventListener('click', async ()=>{
            const filename = document.getElementById('assetFilename').value || 'clip.wav';
            const contentType = document.getElementById('assetContentType').value || 'audio/wav';
            const res = await api('/dev/api/assets/upload-url', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ filename, contentType }) });
            show(res);
          });

          document.getElementById('magicBtn').addEventListener('click', async ()=>{
            const email = document.getElementById('magicEmail').value || 'dev@example.com';
            const res = await api('/dev/api/auth/magic-link', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
            show(res);
          });

          document.getElementById('insightsBtn').addEventListener('click', async ()=>{
            const id = document.getElementById('uploaderId').value || 'me';
            const res = await api('/dev/api/uploader/insights?uploaderId='+encodeURIComponent(id));
            show(res);
          });

          document.getElementById('viewSavedBtn').addEventListener('click', async ()=>{
            const userId = document.getElementById('savedUserId').value;
            if(!userId) return alert('Enter a userId to view');
            const res = await api('/dev/api/packs/saved?userId=' + encodeURIComponent(userId));
            const listEl = document.getElementById('savedList');
            if(res && res.saved){
              listEl.textContent = JSON.stringify(res.saved, null, 2);
            } else {
              listEl.textContent = 'No saved packs';
            }
          });

          function renderPack(pack, id){
            if(!pack) return;
            last.innerHTML = '';
            const left = document.createElement('div'); left.className='col card';
            const right = document.createElement('div'); right.className='col card';
            left.innerHTML = '<strong>Words</strong>' + (pack.words ? '<ul>'+pack.words.map(w=>'<li>'+w+'</li>').join('')+'</ul>' : '');
            right.innerHTML = '<strong>Memes</strong>' + (pack.memes ? '<ul>'+pack.memes.map(m=>'<li>'+m.title+'</li>').join('')+'</ul>' : '');
            last.appendChild(left); last.appendChild(right);

            // Save button
            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save Pack';
            saveBtn.style.marginLeft = '8px';
            saveBtn.addEventListener('click', async ()=>{
              const userId = prompt('Enter userId to save this pack for:', 'devuser');
              if(!userId) return;
              const resp = await api('/dev/api/packs/' + encodeURIComponent(id) + '/save', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId }) });
              show(resp);
            });
            last.appendChild(saveBtn);
          }
        </script>
      </body>
    </html>
  `);
});

io.on('connection', (socket) => {
  socket.emit('rooms:update', getRoomsSnapshot());
  socket.emit('feed:init', readFeedPosts().slice(0, 50));

  socket.on('rooms:join', ({ roomId, user }: { roomId: string; user?: string }) => {
    socket.join(roomId);
    const room = incrementRoomCounts(roomId, 1, 0);
    io.emit('rooms:update', getRoomsSnapshot());
    io.to(roomId).emit('room:presence', { roomId, user, action: 'joined' });
    socket.emit('rooms:joined', room);
  });

  socket.on('rooms:spectate', ({ roomId, user }: { roomId: string; user?: string }) => {
    socket.join(roomId);
    const room = incrementRoomCounts(roomId, 0, 1);
    io.emit('rooms:update', getRoomsSnapshot());
    io.to(roomId).emit('room:presence', { roomId, user, action: 'spectating' });
  });

  // ============ COLLABORATIVE SESSION HANDLERS ============

  // Join collaborative session
  socket.on('collab:join', ({ sessionId, userId, username, role }: {
    sessionId: string;
    userId: string;
    username: string;
    role: 'host' | 'collaborator' | 'viewer';
  }) => {
    const roomKey = `collab:${sessionId}`;
    socket.join(roomKey);
    
    // Broadcast participant joined to all in session
    io.to(roomKey).emit('collab:participant-joined', {
      sessionId,
      userId,
      username,
      role,
      joinedAt: Date.now(),
      isActive: true
    });

    console.log(`[Collab] ${username} (${role}) joined session ${sessionId}`);
  });

  // Leave collaborative session
  socket.on('collab:leave', ({ sessionId, userId }: { sessionId: string; userId: string }) => {
    const roomKey = `collab:${sessionId}`;
    socket.leave(roomKey);
    
    io.to(roomKey).emit('collab:participant-left', {
      sessionId,
      userId,
      leftAt: Date.now()
    });

    console.log(`[Collab] User ${userId} left session ${sessionId}`);
  });

  // Video stream events
  socket.on('collab:stream:init', ({ sessionId, streamId, userId, username }: {
    sessionId: string;
    streamId: string;
    userId: string;
    username: string;
  }) => {
    const roomKey = `collab:${sessionId}`;
    io.to(roomKey).emit('collab:stream:ready', {
      sessionId,
      streamId,
      userId,
      username
    });
  });

  socket.on('collab:stream:update', ({ sessionId, streamId, data }: {
    sessionId: string;
    streamId: string;
    data: any;
  }) => {
    const roomKey = `collab:${sessionId}`;
    socket.to(roomKey).emit('collab:stream:updated', {
      sessionId,
      streamId,
      data,
      updatedAt: Date.now()
    });
  });

  socket.on('collab:stream:control', ({ sessionId, streamId, userId, control, enabled }: {
    sessionId: string;
    streamId: string;
    userId: string;
    control: 'audio' | 'video';
    enabled: boolean;
  }) => {
    const roomKey = `collab:${sessionId}`;
    io.to(roomKey).emit('collab:stream:control-changed', {
      sessionId,
      streamId,
      userId,
      control,
      enabled,
      changedAt: Date.now()
    });
  });

  // DAW sync events
  socket.on('collab:daw:sync', ({ sessionId, dawState }: {
    sessionId: string;
    dawState: any;
  }) => {
    const roomKey = `collab:${sessionId}`;
    // Broadcast to all but sender (they already have the state)
    socket.to(roomKey).emit('collab:daw:synced', {
      sessionId,
      dawState,
      syncedAt: Date.now(),
      serverTimestamp: Date.now()
    });
  });

  socket.on('collab:daw:note-add', ({ sessionId, note }: {
    sessionId: string;
    note: any;
  }) => {
    const roomKey = `collab:${sessionId}`;
    io.to(roomKey).emit('collab:daw:note-added', {
      sessionId,
      note,
      addedAt: Date.now()
    });
  });

  socket.on('collab:daw:note-remove', ({ sessionId, noteId }: {
    sessionId: string;
    noteId: string;
  }) => {
    const roomKey = `collab:${sessionId}`;
    io.to(roomKey).emit('collab:daw:note-removed', {
      sessionId,
      noteId,
      removedAt: Date.now()
    });
  });

  socket.on('collab:daw:playback', ({ sessionId, isPlaying, position, tempo }: {
    sessionId: string;
    isPlaying: boolean;
    position: number;
    tempo: number;
  }) => {
    const roomKey = `collab:${sessionId}`;
    io.to(roomKey).emit('collab:daw:playback-changed', {
      sessionId,
      isPlaying,
      position,
      tempo,
      changedAt: Date.now(),
      serverTimestamp: Date.now()
    });
  });

  socket.on('collab:daw:tempo', ({ sessionId, tempo }: {
    sessionId: string;
    tempo: number;
  }) => {
    const roomKey = `collab:${sessionId}`;
    io.to(roomKey).emit('collab:daw:tempo-changed', {
      sessionId,
      tempo,
      changedAt: Date.now()
    });
  });

  // Audio sync events (for playback position sync)
  socket.on('collab:audio:sync-request', ({ sessionId }: { sessionId: string }) => {
    socket.emit('collab:audio:sync-response', {
      sessionId,
      serverTimestamp: Date.now(),
      clientLatencyMs: 0 // Client calculates this
    });
  });

  // Comment events
  socket.on('collab:comment:add', ({ sessionId, comment }: {
    sessionId: string;
    comment: any;
  }) => {
    const roomKey = `collab:${sessionId}`;
    io.to(roomKey).emit('collab:comment:added', {
      sessionId,
      comment,
      addedAt: Date.now()
    });
  });

  socket.on('collab:comment:delete', ({ sessionId, commentId }: {
    sessionId: string;
    commentId: string;
  }) => {
    const roomKey = `collab:${sessionId}`;
    io.to(roomKey).emit('collab:comment:deleted', {
      sessionId,
      commentId,
      deletedAt: Date.now()
    });
  });

  // Vote events
  socket.on('collab:vote', ({ sessionId, targetId, targetType, voteType, userId }: {
    sessionId: string;
    targetId: string;
    targetType: 'comment' | 'session';
    voteType: 'upvote' | 'downvote';
    userId: string;
  }) => {
    const roomKey = `collab:${sessionId}`;
    io.to(roomKey).emit('collab:vote:registered', {
      sessionId,
      targetId,
      targetType,
      voteType,
      userId,
      votedAt: Date.now()
    });
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

if (hasFrontendBuild) {
  app.use(express.static(FRONTEND_DIST));
  console.log('[Inspire] Serving frontend build from:', FRONTEND_DIST);
} else if (NODE_ENV === 'development') {
  console.log('[Inspire] Frontend static serving disabled in development mode (using Vite on 8080)');
}

// Build main API router and mount under /api and /dev/api (back-compat)
const apiRouter = buildApiRouter();
app.use('/api', apiRouter);
app.use('/dev/api', apiRouter);

// Gate the dev console (HTML) behind an env flag
const DEV_CONSOLE_ENABLED = process.env.ENABLE_DEV_CONSOLE === 'true';
if (DEV_CONSOLE_ENABLED) {
  app.use('/dev', devRouter);
}

if (hasFrontendBuild) {
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/dev')) return next();
    res.sendFile(FRONTEND_INDEX);
  });
} else {
  app.get('/', (_req: Request, res: Response) => {
    res.type('html');
    res.send(`
      <!doctype html>
      <html>
        <head><meta charset="utf-8" /><title>Inspire — Backend</title></head>
        <body style="font-family:system-ui;background:#050b16;color:#e6eef8;padding:32px">
          <h1>Inspire API</h1>
          <p>${NODE_ENV === 'development' ? 'Frontend is served from Vite on port 8080' : 'The frontend build has not been generated yet.'}</p>
          ${NODE_ENV !== 'development' ? '<p>Run <code>npm install && npm run build</code> inside <code>frontend/</code>, then restart the server.</p>' : ''}
          <p>Developer console: <a href="/dev" style="color:#60a5fa">/dev</a></p>
        </body>
      </html>
    `);
  });
}


// Start server only when this file is run directly. This lets tests import the app
// without starting a real network listener.
if (require.main === module) {
  // Start cleanup job for expired pending users and guest sessions
  startCleanupJob();
  
  // Bind to all interfaces so localhost resolves to both IPv4 and IPv6 addresses
  server.listen(LISTEN_PORT, '0.0.0.0', () => {
    console.log(`🚀 Inspire API running on http://localhost:${LISTEN_PORT}`);
  });
}

export { app, server, io };
export default app;
