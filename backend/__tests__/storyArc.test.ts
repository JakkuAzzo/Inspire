import request from 'supertest';
import { app } from '../src/index';

describe('Story Arc API', () => {
  test('POST /dev/api/story-arc/generate returns scaffold and requested node count', async () => {
    const res = await request(app)
      .post('/dev/api/story-arc/generate')
      .send({ summary: 'A restless kid leaves home to chase a sound they cannot forget.', nodeCount: 5 })
      .set('Accept', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('scaffold');
    expect(res.body.scaffold).toHaveProperty('nodes');
    expect(Array.isArray(res.body.scaffold.nodes)).toBe(true);
    expect(res.body.scaffold.nodes).toHaveLength(5);
    expect(res.body.scaffold).toHaveProperty('theme');
    expect(res.body.scaffold).toHaveProperty('chorusThesis');
  });

  test('Generated node texts are non-empty and distinct across labels', async () => {
    const res = await request(app)
      .post('/dev/api/story-arc/generate')
      .send({ summary: 'A kid leaves home to chase a sound that keeps calling.', nodeCount: 7 })
      .set('Accept', 'application/json');

    expect(res.status).toBe(201);
    const nodes = res.body.scaffold.nodes;
    expect(Array.isArray(nodes)).toBe(true);
    // All node texts should be present and non-empty
    nodes.forEach((n: any) => {
      expect(typeof n.text).toBe('string');
      expect(n.text.trim().length).toBeGreaterThan(0);
    });
    // Distinctness: at least 5 unique texts among 7 nodes
    const unique = new Set(nodes.map((n: any) => n.text.trim().toLowerCase()));
    expect(unique.size).toBeGreaterThanOrEqual(5);
  });

  test('Seed yields reproducible node texts and different seeds vary selection', async () => {
    const baseReq = { summary: 'Chasing a signal through the city until it answers.', nodeCount: 6 };

    const resA1 = await request(app)
      .post('/dev/api/story-arc/generate')
      .send({ ...baseReq, seed: 'alpha' })
      .set('Accept', 'application/json');
    const resA2 = await request(app)
      .post('/dev/api/story-arc/generate')
      .send({ ...baseReq, seed: 'alpha' })
      .set('Accept', 'application/json');
    const resB = await request(app)
      .post('/dev/api/story-arc/generate')
      .send({ ...baseReq, seed: 'beta' })
      .set('Accept', 'application/json');

    expect(resA1.status).toBe(201);
    expect(resA2.status).toBe(201);
    expect(resB.status).toBe(201);

    const a1 = resA1.body.scaffold.nodes.map((n: any) => n.text);
    const a2 = resA2.body.scaffold.nodes.map((n: any) => n.text);
    const b = resB.body.scaffold.nodes.map((n: any) => n.text);

    // Same seed should reproduce identical sequence
    expect(a1).toEqual(a2);
    // Different seed should produce a different selection in at least one position
    const diffCount = a1.filter((t: string, i: number) => t !== b[i]).length;
    expect(diffCount).toBeGreaterThanOrEqual(1);
  });
});
