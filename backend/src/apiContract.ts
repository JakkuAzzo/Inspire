/**
 * Minimal API contract for Inspire - MVP
 * This file describes the essential endpoints and simple TypeScript types
 * used for the initial MVP backend implementation.
 */

export const ApiContract = {
  info: {
    title: 'Inspire API (minimal contract)',
    version: '0.1.0'
  },
  paths: {
    '/api/health': {
      get: {
        description: 'Health check',
        response: { status: 'ok', message: 'Inspire API is running' }
      }
    },
    '/api/fuel-pack': {
      get: {
        description: 'Generate a simple fuel pack (words, memes, emotional arc, sample challenge)',
        response: 'FuelPack'
      },
      post: {
        description: 'Create a parametric Fuel Pack (role, counts, options) and return a persisted pack id',
        body: {
          role: 'rapper|singer|producer',
          words: 'number',
          memes: 'number',
          timeLimitSeconds: 'number (optional)'
        },
        response: { id: 'string', pack: 'FuelPack' }
      }
    },
    '/api/assets/upload-url': {
      post: {
        description: 'Request a signed upload URL for an asset (stubbed for MVP)',
        body: { filename: 'string', contentType: 'string' },
        response: { uploadUrl: 'string', assetId: 'string' }
      }
    },
    '/api/assets/ingest': {
      post: {
        description: 'Complete ingest and return metadata (duration, fingerprint stub)',
        body: { assetId: 'string', sourceUrl: 'string' },
        response: { assetId: 'string', durationSeconds: 'number', fingerprint: 'string' }
      }
    },
    '/api/auth/magic-link': {
      post: {
        description: 'Request a magic link email token (stubbed) - returns a temporary token for tests',
        body: { email: 'string' },
        response: { token: 'string', expiresIn: 300 }
      }
    },
    '/api/billing/checkout': {
      post: {
        description: 'Create a checkout session for placements/subscriptions (stubbed)',
        body: { userId: 'string', amountCents: 'number', currency: 'string' },
        response: { sessionId: 'string', status: 'created' }
      }
    },
    '/api/uploader/insights': {
      get: {
        description: 'Return simple uploader metrics for an asset or user (mocked)',
        params: { uploaderId: 'string' },
        response: { impressions: 'number', downloads: 'number', ctr: 'number' }
      }
    },
    '/api/notify/subscribe': {
      post: {
        description: 'Subscribe uploader to download notifications (opt-in)',
        body: { uploadId: 'string', notifyEmail: 'string' },
        response: { subscribed: true }
      }
    }
  }
} as const;

export type Role = 'rapper' | 'singer' | 'producer';

export interface CreatePackRequest {
  role?: Role;
  words?: number;
  memes?: number;
  timeLimitSeconds?: number;
}

export interface SignedUploadRequest {
  filename: string;
  contentType: string;
}

export default ApiContract;
