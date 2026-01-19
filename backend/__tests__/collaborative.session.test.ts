/// <reference types="jest" />
import { describe, test, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/index';
import { CollaborativeSession, CollaborativeSessionRequest } from '../src/types';

describe('Collaborative Session API', () => {
  let createdSessionId: string;

  describe('POST /api/sessions/collaborate', () => {
    test('creates a new collaborative session with valid request', async () => {
      const sessionRequest: CollaborativeSessionRequest = {
        title: 'Test Collab Session',
        mode: 'lyricist',
        submode: 'rapper'
      };

      const res = await request(app)
        .post('/api/sessions/collaborate')
        .send(sessionRequest)
        .set('Accept', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.id).toBeTruthy();
      
      const session: CollaborativeSession = res.body;
      expect(session.title).toBe('Test Collab Session');
      expect(session.mode).toBe('lyricist');
      expect(session.submode).toBe('rapper');
      // hostId is assigned by the backend; ensure it exists
      expect(session.hostId).toBeDefined();
      expect(session.status).toBe('waiting');
      expect(Array.isArray(session.participants)).toBe(true);
      expect(session.participants).toHaveLength(0);
      expect(Array.isArray(session.viewers)).toBe(true);
      expect(session.viewers).toHaveLength(0);
      expect(session.daw).toBeDefined();
      expect(session.daw.bpm).toBe(120);
      expect(Array.isArray(session.daw.notes)).toBe(true);
      expect(session.daw.isPlaying).toBe(false);
      expect(Array.isArray(session.comments)).toBe(true);

      createdSessionId = session.id;
    });

    test('creates session with different mode types', async () => {
      const modes: Array<{ mode: 'lyricist' | 'producer' | 'editor'; submode: string }> = [
        { mode: 'producer', submode: 'sampler' },
        { mode: 'editor', submode: 'video-editor' }
      ];

      for (const { mode, submode } of modes) {
        const res = await request(app)
          .post('/api/sessions/collaborate')
          .send({
            title: `${mode} session`,
            mode,
            submode
          });

        expect(res.status).toBe(201);
        expect(res.body.mode).toBe(mode);
        expect(res.body.submode).toBe(submode);
      }
    });

    test('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/sessions/collaborate')
        .send({ title: 'Missing fields' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/sessions/:sessionId', () => {
    test('retrieves existing session by ID', async () => {
      const res = await request(app)
        .get(`/api/sessions/${createdSessionId}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdSessionId);
      expect(res.body.title).toBe('Test Collab Session');
    });

    test('returns 404 for non-existent session', async () => {
      const res = await request(app)
        .get('/api/sessions/non-existent-id');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/sessions/:sessionId', () => {
    test('updates session status', async () => {
      const res = await request(app)
        .put(`/api/sessions/${createdSessionId}`)
        .send({ status: 'active' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('active');
    });

    test('updates DAW state', async () => {
      const res = await request(app)
        .put(`/api/sessions/${createdSessionId}`)
        .send({
          daw: {
            bpm: 140,
            isPlaying: true,
            currentBeat: 4
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.daw.bpm).toBe(140);
      expect(res.body.daw.isPlaying).toBe(true);
    });

    test('returns 404 for non-existent session', async () => {
      const res = await request(app)
        .put('/api/sessions/non-existent')
        .send({ status: 'active' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/sessions', () => {
    test('lists all active sessions', async () => {
      const res = await request(app)
        .get('/api/sessions')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      
      const session = res.body.find((s: CollaborativeSession) => s.id === createdSessionId);
      expect(session).toBeDefined();
    });

    test('filters sessions by status', async () => {
      const res = await request(app)
        .get('/api/sessions?status=active')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      if (res.body.length > 0) {
        res.body.forEach((session: CollaborativeSession) => {
          expect(session.status).toBe('active');
        });
      }
    });
  });

  describe('POST /api/sessions/:sessionId/votes', () => {
    let commentId: string;

    beforeAll(async () => {
      // Add a comment first
      const session = await request(app).get(`/api/sessions/${createdSessionId}`);
      commentId = `comment-${Date.now()}`;
      
      await request(app)
        .put(`/api/sessions/${createdSessionId}`)
        .send({
          comments: [
            {
              id: commentId,
              userId: 'test-user',
              userName: 'Test User',
              content: 'Great session!',
              timestamp: Date.now(),
              votes: 0
            }
          ]
        });
    });

    test('registers a vote on a comment', async () => {
      const res = await request(app)
        .post(`/api/sessions/${createdSessionId}/votes`)
        .send({
          commentId,
          userId: 'voter-1',
          voteType: 'upvote'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('returns 400 for missing vote data', async () => {
      const res = await request(app)
        .post(`/api/sessions/${createdSessionId}/votes`)
        .send({});

      expect(res.status).toBe(400);
    });

    test('returns 404 for non-existent session', async () => {
      const res = await request(app)
        .post('/api/sessions/non-existent/votes')
        .send({
          commentId,
          userId: 'voter-1',
          voteType: 'upvote'
        });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/sessions/:sessionId/comments', () => {
    test('retrieves session comments', async () => {
      const res = await request(app)
        .get(`/api/sessions/${createdSessionId}/comments`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('returns 404 for non-existent session', async () => {
      const res = await request(app)
        .get('/api/sessions/non-existent/comments');

      expect(res.status).toBe(404);
    });
  });

  describe('Session state management', () => {
    test('maintains session state across updates', async () => {
      // Create new session
      const createRes = await request(app)
        .post('/api/sessions/collaborate')
        .send({
          title: 'State Test Session',
          mode: 'producer',
          submode: 'musician',
          hostId: 'host-123'
        });

      const sessionId = createRes.body.id;

      // Update status
      await request(app)
        .put(`/api/sessions/${sessionId}`)
        .send({ status: 'active' });

      // Update DAW
      await request(app)
        .put(`/api/sessions/${sessionId}`)
        .send({
          daw: {
            bpm: 150,
            notes: [
              { id: 'note-1', pitch: 60, start: 0, duration: 1, velocity: 80 }
            ]
          }
        });

      // Retrieve and verify all updates persisted
      const getRes = await request(app).get(`/api/sessions/${sessionId}`);
      
      expect(getRes.body.status).toBe('active');
      expect(getRes.body.daw.bpm).toBe(150);
      expect(getRes.body.daw.notes).toHaveLength(1);
      expect(getRes.body.daw.notes[0].pitch).toBe(60);
    });
  });

  describe('Audio sync state', () => {
    test('initializes with default audio sync state', async () => {
      const res = await request(app)
        .post('/api/sessions/collaborate')
        .send({
          title: 'Audio Sync Test',
          mode: 'lyricist',
          submode: 'singer',
          hostId: 'host-audio'
        });

      expect(res.body.audioSyncState).toBeDefined();
      expect(res.body.audioSyncState.serverTimestamp).toBeDefined();
      expect(res.body.audioSyncState.playbackPosition).toBe(0);
      expect(res.body.audioSyncState.isPlaying).toBe(false);
      expect(res.body.audioSyncState.tempo).toBe(120);
      expect(res.body.audioSyncState.clientLatency).toBe(0);
    });

    test('updates audio sync state', async () => {
      const createRes = await request(app)
        .post('/api/sessions/collaborate')
        .send({
          title: 'Sync Update Test',
          mode: 'producer',
          submode: 'sampler',
          hostId: 'host-sync'
        });

      const sessionId = createRes.body.id;

      const updateRes = await request(app)
        .put(`/api/sessions/${sessionId}`)
        .send({
          audioSyncState: {
            serverTimestamp: Date.now(),
            playbackPosition: 16,
            isPlaying: true,
            tempo: 128,
            clientLatency: 45
          }
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.audioSyncState.playbackPosition).toBe(16);
      expect(updateRes.body.audioSyncState.isPlaying).toBe(true);
      expect(updateRes.body.audioSyncState.tempo).toBe(128);
      expect(updateRes.body.audioSyncState.clientLatency).toBe(45);
    });
  });
});
