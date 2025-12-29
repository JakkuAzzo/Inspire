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
});
