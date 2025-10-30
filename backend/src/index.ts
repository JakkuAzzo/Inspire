/**
 * Inspire Backend - Main Entry Point
 * 
 * This is the main entry point for the Inspire backend services.
 * It exports all service factories and utilities for external API integration.
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Export all services and types
export * from './services';

// Export example usage
export { main as runExample } from './example';

// Log initialization
if (process.env.LOG_API_REQUESTS === 'true') {
  console.log('[Inspire Backend] Initialized with environment configuration');
  console.log('[Inspire Backend] Mock fallback:', process.env.USE_MOCK_FALLBACK === 'true' ? 'Enabled' : 'Disabled');
}
import express, { Request, Response } from 'express';
import cors from 'cors';
import { generateFuelPack, GenerateOptions } from './fuelPackGenerator';
import { FuelPack } from './types';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 3001;

// Simple in-memory stores for MVP
const packs = new Map<string, FuelPack>();
const assets = new Map<string, any>();
const magicTokens = new Map<string, { email: string; expiresAt: number }>();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Inspire API is running' });
});

// GET simple generator
app.get('/api/fuel-pack', (req: Request, res: Response) => {
  try {
    const fuelPack = generateFuelPack();
    res.json(fuelPack);
  } catch (error) {
    console.error('Error generating fuel pack:', error);
    res.status(500).json({ error: 'Failed to generate fuel pack' });
  }
});

// POST create parametric pack and persist in-memory
app.post('/api/fuel-pack', (req: Request, res: Response) => {
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
app.get('/api/packs/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const pack = packs.get(id);
  if (!pack) return res.status(404).json({ error: 'Pack not found' });
  res.json(pack);
});

// Assets: request upload URL (stubbed)
app.post('/api/assets/upload-url', (req: Request, res: Response) => {
  const { filename, contentType } = req.body || {};
  if (!filename || !contentType) return res.status(400).json({ error: 'filename and contentType required' });

  const assetId = uuidv4();
  const uploadUrl = `https://example.local/upload/${assetId}/${encodeURIComponent(filename)}`;
  assets.set(assetId, { id: assetId, filename, contentType, status: 'uploaded', sourceUrl: null });

  res.json({ uploadUrl, assetId });
});

// Assets: ingest complete (stub fingerprint/duration)
app.post('/api/assets/ingest', (req: Request, res: Response) => {
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
app.post('/api/auth/magic-link', (req: Request, res: Response) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  const token = uuidv4();
  const expiresIn = 300; // 5 minutes
  magicTokens.set(token, { email, expiresAt: Date.now() + expiresIn * 1000 });

  // In production we'd send an email. For dev, return token.
  res.json({ token, expiresIn });
});

// Billing: create checkout session (stub)
app.post('/api/billing/checkout', (req: Request, res: Response) => {
  const { userId, amountCents, currency } = req.body || {};
  if (!userId || !amountCents || !currency) return res.status(400).json({ error: 'userId, amountCents and currency required' });

  const sessionId = `sess_${Math.random().toString(36).substring(2, 10)}`;
  res.json({ sessionId, status: 'created' });
});

// Uploader insights (mocked)
app.get('/api/uploader/insights', (req: Request, res: Response) => {
  const uploaderId = (req.query.uploaderId as string) || 'unknown';
  res.json({ uploaderId, impressions: Math.floor(Math.random() * 1000), downloads: Math.floor(Math.random() * 200), ctr: Math.random() });
});

// Notify subscribe (opt-in)
app.post('/api/notify/subscribe', (req: Request, res: Response) => {
  const { uploadId, notifyEmail } = req.body || {};
  if (!uploadId || !notifyEmail) return res.status(400).json({ error: 'uploadId and notifyEmail required' });

  // For MVP simply acknowledge subscription
  res.json({ subscribed: true, uploadId, notifyEmail });
});

app.listen(PORT, () => {
  console.log(`🚀 Inspire API running on http://localhost:${PORT}`);
});
