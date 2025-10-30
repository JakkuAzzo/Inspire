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
  ModeDefinition
} from './types';
import {
  generateModePack,
  listModeDefinitions,
  listMockMemes,
  listMockNews,
  listMockSamples,
  listMockWords
} from './modePackGenerator';
import fs from 'fs';
import path from 'path';
import { createId } from './utils/id';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple in-memory stores for MVP
const packs = new Map<string, FuelPack | ModePack>();
const assets = new Map<string, any>();
const magicTokens = new Map<string, { email: string; expiresAt: number }>();

const modeDefinitions: ModeDefinition[] = listModeDefinitions();
const modeIds = new Set(modeDefinitions.map((definition) => definition.id));

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

// We'll mount developer API and console under `/dev` so the root can serve the app.
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

// Mount dev router under /dev
app.use('/dev', devRouter);

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

devRouter.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Inspire API is running' });
});

devRouter.get('/api/modes', (_req: Request, res: Response) => {
  res.json({ modes: modeDefinitions });
});

devRouter.post('/api/modes/:mode/fuel-pack', (req: Request, res: Response) => {
  const mode = req.params.mode as CreativeMode;
  if (!modeIds.has(mode)) {
    return res.status(400).json({ error: 'Unsupported mode' });
  }

  const body = req.body as ModePackRequest | undefined;
  if (!body || !body.submode) {
    return res.status(400).json({ error: 'submode is required' });
  }

  const definition = modeDefinitions.find((entry) => entry.id === mode);
  const submodeValid = definition?.submodes.some((sub) => sub.id === body.submode) ?? false;
  if (!submodeValid) {
    return res.status(400).json({ error: `Unsupported submode for ${mode}` });
  }

  try {
    const pack = generateModePack(mode, body);
    packs.set(pack.id, pack);
    res.status(201).json({ pack });
  } catch (error) {
    console.error('Error generating mode pack:', error);
    res.status(500).json({ error: 'Failed to generate pack for mode' });
  }
});

devRouter.get('/api/mock/words', (req: Request, res: Response) => {
  const filters = parseRelevanceFilters(req.query);
  res.json({ items: listMockWords(filters) });
});

devRouter.get('/api/mock/memes', (req: Request, res: Response) => {
  const filters = parseRelevanceFilters(req.query);
  res.json({ items: listMockMemes(filters) });
});

devRouter.get('/api/mock/samples', (req: Request, res: Response) => {
  const filters = parseRelevanceFilters(req.query);
  res.json({ items: listMockSamples(filters) });
});

devRouter.get('/api/mock/news', (req: Request, res: Response) => {
  const filters = parseRelevanceFilters(req.query);
  res.json({ items: listMockNews(filters) });
});

// GET simple generator
devRouter.get('/api/fuel-pack', (req: Request, res: Response) => {
  try {
    const fuelPack = generateFuelPack();
    packs.set(fuelPack.id, fuelPack);
    res.json(fuelPack);
  } catch (error) {
    console.error('Error generating fuel pack:', error);
    res.status(500).json({ error: 'Failed to generate fuel pack' });
  }
});

// POST create parametric pack and persist in-memory
devRouter.post('/api/fuel-pack', (req: Request, res: Response) => {
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

// GET pack by id
devRouter.get('/api/packs/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  let pack = packs.get(id);
  if (!pack) {
    const savedState = readSavedState();
    pack = savedState.snapshots[id];
    if (pack) {
      packs.set(id, pack);
    }
  }
  if (!pack) return res.status(404).json({ error: 'Pack not found' });
  res.json(pack);
});

// Assets: request upload URL (stubbed)
devRouter.post('/api/assets/upload-url', (req: Request, res: Response) => {
  const { filename, contentType } = req.body || {};
  if (!filename || !contentType) return res.status(400).json({ error: 'filename and contentType required' });

  const assetId = createId('asset');
  const uploadUrl = `https://example.local/upload/${assetId}/${encodeURIComponent(filename)}`;
  assets.set(assetId, { id: assetId, filename, contentType, status: 'uploaded', sourceUrl: null });

  res.json({ uploadUrl, assetId });
});

// Assets: ingest complete (stub fingerprint/duration)
devRouter.post('/api/assets/ingest', (req: Request, res: Response) => {
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

// Auth: magic link stub (returns a token for development)
devRouter.post('/api/auth/magic-link', (req: Request, res: Response) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  const token = createId('token');
  const expiresIn = 300; // 5 minutes
  magicTokens.set(token, { email, expiresAt: Date.now() + expiresIn * 1000 });

  // In production we'd send an email. For dev, return token.
  res.json({ token, expiresIn });
});

// Billing: create checkout session (stub)
devRouter.post('/api/billing/checkout', (req: Request, res: Response) => {
  const { userId, amountCents, currency } = req.body || {};
  if (!userId || !amountCents || !currency) return res.status(400).json({ error: 'userId, amountCents and currency required' });

  const sessionId = `sess_${Math.random().toString(36).substring(2, 10)}`;
  res.json({ sessionId, status: 'created' });
});

// Uploader insights (mocked)
devRouter.get('/api/uploader/insights', (req: Request, res: Response) => {
  const uploaderId = (req.query.uploaderId as string) || 'unknown';
  res.json({ uploaderId, impressions: Math.floor(Math.random() * 1000), downloads: Math.floor(Math.random() * 200), ctr: Math.random() });
});

// Notify subscribe (opt-in)
devRouter.post('/api/notify/subscribe', (req: Request, res: Response) => {
  const { uploadId, notifyEmail } = req.body || {};
  if (!uploadId || !notifyEmail) return res.status(400).json({ error: 'uploadId and notifyEmail required' });

  // For MVP simply acknowledge subscription
  res.json({ subscribed: true, uploadId, notifyEmail });
});

// Save a pack to a user's saved list (persisted to disk)
devRouter.post('/api/packs/:id/save', (req: Request, res: Response) => {
  const packId = req.params.id;
  const { userId } = req.body || {};
  if (!packId) return res.status(400).json({ error: 'pack id required' });
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const state = readSavedState();
  const pack = packs.get(packId) || state.snapshots[packId];
  if (!pack) {
    return res.status(404).json({ error: 'Pack not found. Spin or craft a pack before saving.' });
  }

  const existing = state.users[userId] ? state.users[userId].filter((id) => id !== packId) : [];
  existing.unshift(packId);
  state.users[userId] = existing.slice(0, 100);
  state.snapshots[packId] = pack;
  packs.set(packId, pack);
  writeSavedState(state);

  res.json({ saved: true, userId, packId, snapshot: pack });
});

// Get saved packs for a user
devRouter.get('/api/packs/saved', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || '';
  if (!userId) return res.status(400).json({ error: 'userId query param required' });
  const state = readSavedState();
  const ids = state.users[userId] || [];
  const packsList = ids
    .map((id) => state.snapshots[id])
    .filter((entry): entry is FuelPack | ModePack => Boolean(entry));

  res.json({ userId, saved: ids, packs: packsList });
});

// Start server only when this file is run directly. This lets tests import the app
// without starting a real network listener.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Inspire API running on http://localhost:${PORT}`);
  });
}

export default app;
