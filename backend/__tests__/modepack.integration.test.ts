import request from 'supertest';
import { app } from '../dist/index';

describe('Mode pack integration', () => {
  test('POST /api/modes/lyricist/fuel-pack returns a mode pack with expected fields', async () => {
    const payload = { submode: 'rapper', filters: { timeframe: 'fresh', tone: 'funny', semantic: 'tight' }, genre: 'r&b' };
    const res = await request(app).post('/api/modes/lyricist/fuel-pack').send(payload).set('Accept', 'application/json');
    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty('pack');
    const pack = res.body.pack;
    expect(pack).toHaveProperty('id');
    expect(pack).toHaveProperty('mode', 'lyricist');
    expect(pack).toHaveProperty('submode', 'rapper');
    expect(pack).toHaveProperty('filters');
    expect(pack.filters).toHaveProperty('timeframe');
    expect(pack.filters).toHaveProperty('tone');
    expect(pack.filters).toHaveProperty('semantic');
    expect(pack).toHaveProperty('timestamp');
  });

  test('payload filters and mood influence pack outputs', async () => {
    const payload = {
      submode: 'sampler',
      filters: { timeframe: 'timeless', tone: 'dark', semantic: 'wild' },
      genre: 'electronic',
      mood: 'nocturnal'
    };

    const res = await request(app).post('/api/modes/producer/fuel-pack').send(payload).set('Accept', 'application/json');
    expect([200, 201]).toContain(res.status);
    const pack = res.body.pack;

    expect(pack.filters.tone).toBe('dark');
    expect(pack.sample.timeframe).toBe('timeless');
    expect(pack.sample.tags).toEqual(expect.arrayContaining(['dark', 'wild', 'timeless', 'nocturnal']));
    expect(pack.secondarySample.tags).toEqual(expect.arrayContaining(['dark', 'wild', 'timeless', 'nocturnal']));
    expect(Array.isArray(pack.referenceInstrumentals)).toBe(true);
    if (Array.isArray(pack.referenceInstrumentals)) {
      expect(pack.referenceInstrumentals.every((clip: any) => clip.tone === 'dark')).toBe(true);
    }
  });
});
