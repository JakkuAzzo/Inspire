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
  MemeSound,
  NewsPrompt,
  SampleReference,
  InspirationClip
} from './types';
import {
  generateModePack,
  listModeDefinitions,
  listMockMemes,
  listMockNews,
  listMockSamples,
  listMockWords
} from './modePackGenerator';
import { createAllServices } from './services';
import { searchYoutubeKeyless, buildYoutubeQuery } from './services/youtubeSearchService';
import { getPool } from './db/connection';
import { PackRepository } from './repositories/packRepository';
import fs from 'fs';
import path from 'path';
import { createId } from './utils/id';
import { listChallengeActivity } from './data/challengeActivity';
import { validateEnvironment } from './config/env';
import { buildAuthRouter } from './auth/routes';
import { requireAuth, AuthenticatedRequest } from './auth/middleware';

const app = express();
const PORT = process.env.PORT || 3001;
const LISTEN_PORT = Number(PORT) || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[request] ${req.method} ${req.url}`);
  next();
});

// Simple in-memory stores for MVP
const packs = new Map<string, FuelPack | ModePack>();
const assets = new Map<string, any>();
const magicTokens = new Map<string, { email: string; expiresAt: number }>();
const services = createAllServices();
let packRepoPromise: Promise<PackRepository> | null = null;
const envValidation = validateEnvironment();

const modeDefinitions: ModeDefinition[] = listModeDefinitions();
const modeIds = new Set(modeDefinitions.map((definition) => definition.id));
const FALLBACK_FILTERS: RelevanceFilter = { timeframe: 'fresh', tone: 'funny', semantic: 'tight' };

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
  const toneLabel = filters.tone === 'dark' ? 'grit' : filters.tone === 'deep' ? 'depth' : 'punchlines';
  const memeSound: MemeSound = { name: 'Fallback meme sound', description: `Lean into ${toneLabel}.`, tone: filters.tone };
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
// Allow overriding the data directory (useful for CI or different run contexts)
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(__dirname, '..', 'data');
const SAVED_PACKS_FILE = process.env.SAVED_PACKS_FILE || path.join(DATA_DIR, 'savedPacks.json');
const FRONTEND_DIST = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
const FRONTEND_INDEX = path.join(FRONTEND_DIST, 'index.html');
const hasFrontendBuild = fs.existsSync(FRONTEND_INDEX);
const EMPTY_SAVED_STATE: SavedState = { users: {}, snapshots: {} };

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(SAVED_PACKS_FILE)) fs.writeFileSync(SAVED_PACKS_FILE, JSON.stringify(EMPTY_SAVED_STATE, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to ensure data dir:', err);
  }
}

ensureDataDir();
console.log('[Inspire] Data directory:', DATA_DIR);
console.log('[Inspire] Saved packs file:', SAVED_PACKS_FILE);
if (hasFrontendBuild) {
  console.log('[Inspire] Serving frontend build from:', FRONTEND_DIST);
} else {
  console.log('[Inspire] Frontend build not detected. Run `npm run build` inside frontend/ to generate the UI.');
}

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

    const filters = coalesceFilters(body.filters);
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

  // Daily challenge activity (mocked)
  router.get('/challenges/activity', (req: Request, res: Response) => {
    const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const parsedLimit = limitParam ? Number.parseInt(String(limitParam), 10) : NaN;
    const activity = listChallengeActivity(Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10);
    res.json({ activity });
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
  router.get('/packs/saved', async (req: Request, res: Response) => {
    const userId = (req.query.userId as string) || '';
  router.get('/packs/saved', requireAuth, (req: AuthenticatedRequest, res: Response) => {
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

  router.post('/packs/:id/save', async (req: Request, res: Response) => {
  router.post('/packs/:id/save', requireAuth, (req: AuthenticatedRequest, res: Response) => {
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

    await repo.savePackForUser(userId, pack);
    res.json({ saved: true, userId, packId, snapshot: pack });
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
      const q = String(req.query.q || req.query.query || '').trim();
      const limitRaw = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
      const limit = Math.min(8, Math.max(1, Number.parseInt(String(limitRaw || '5'), 10) || 5));
      if (!q) return res.status(400).json({ error: 'q is required' });
      const items = await services.newsService.searchHeadlines(q, limit);
      res.json({ items });
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
      let pack = packs.get(id);
      if (!pack) {
        const savedState = readSavedState();
        pack = savedState.snapshots[id];
        if (pack) packs.set(id, pack);
      }
      if (!pack) return res.status(404).json({ error: 'Pack not found' });

      const query = buildHeadlineQueryFromPack(pack);
      const items = query ? await services.newsService.searchHeadlines(query, limit) : [];
      res.json({ packId: id, query, items });
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

if (hasFrontendBuild) {
  app.use(express.static(FRONTEND_DIST));
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
          <p>The frontend build has not been generated yet.</p>
          <p>Run <code>npm install && npm run build</code> inside <code>frontend/</code>, then restart the server.</p>
          <p>Developer console: <a href="/dev" style="color:#60a5fa">/dev</a></p>
        </body>
      </html>
    `);
  });
}


// Start server only when this file is run directly. This lets tests import the app
// without starting a real network listener.
if (require.main === module) {
  // Bind to all interfaces so localhost resolves to both IPv4 and IPv6 addresses
  app.listen(LISTEN_PORT, '0.0.0.0', () => {
    console.log(`🚀 Inspire API running on http://localhost:${LISTEN_PORT}`);
  });
}

export default app;
