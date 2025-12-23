import request from 'supertest';
import { app } from '../dist/index';

describe('Inspire API basic routes', () => {
  test('GET /dev/api/health returns ok', async () => {
    const res = await request(app).get('/dev/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  test('POST /dev/api/fuel-pack creates a pack with requested counts and creative metadata', async () => {
    const res = await request(app)
      .post('/dev/api/fuel-pack')
      .send({ words: 5, memes: 2 })
      .set('Accept', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('pack');
    expect(res.body.pack.words).toBeDefined();
    expect(res.body.pack.memes).toBeDefined();
    expect(Array.isArray(res.body.pack.words)).toBe(true);
    expect(res.body.pack.words).toHaveLength(5);
    expect(res.body.pack.memes).toHaveLength(2);
    expect(typeof res.body.pack.mood).toBe('string');
    expect(typeof res.body.pack.prompt).toBe('string');
    expect(Array.isArray(res.body.pack.colorPalette)).toBe(true);
    expect(res.body.pack.colorPalette.length).toBeGreaterThanOrEqual(3);
    expect(typeof res.body.pack.tempo).toBe('string');
    expect(typeof res.body.pack.wildcard).toBe('string');
    expect(res.body.pack.inspiration).toBeDefined();
    expect(typeof res.body.pack.inspiration.quote).toBe('string');
    expect(typeof res.body.pack.inspiration.author).toBe('string');
    expect(typeof res.body.pack.vibe).toBe('string');
  });

  test('GET /dev/api/fuel-pack returns default six words and full meme set', async () => {
    const res = await request(app).get('/dev/api/fuel-pack');
    expect(res.status).toBe(200);
    expect(res.body.words).toHaveLength(6);
    expect(res.body.memes).toHaveLength(3);
    expect(res.body).toHaveProperty('mood');
    expect(res.body).toHaveProperty('prompt');
  });
});
