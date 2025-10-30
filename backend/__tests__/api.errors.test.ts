import request from 'supertest';
import app from '../src/index';

describe('Inspire API error cases and saved packs', () => {
  test('POST /dev/api/assets/upload-url missing fields returns 400', async () => {
    const res = await request(app).post('/dev/api/assets/upload-url').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /dev/api/assets/ingest missing fields returns 400', async () => {
    const res = await request(app).post('/dev/api/assets/ingest').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('Save a created pack and retrieve saved packs for user', async () => {
    // create a pack
  const create = await request(app).post('/dev/api/fuel-pack').send({ words: 4, memes: 1 });
    expect(create.status).toBe(201);
    const packId = create.body.id;
    expect(packId).toBeTruthy();

    // save it for user
    const userId = 'testuser-' + Date.now();
  const save = await request(app).post(`/dev/api/packs/${encodeURIComponent(packId)}/save`).send({ userId });
    expect(save.status).toBe(200);
    expect(save.body).toHaveProperty('saved', true);
    expect(save.body).toHaveProperty('snapshot');
    expect(save.body.snapshot).toHaveProperty('id', packId);
    expect(Array.isArray(save.body.snapshot.words)).toBe(true);

    // retrieve saved packs
  const list = await request(app).get('/dev/api/packs/saved').query({ userId });
    expect(list.status).toBe(200);
    expect(list.body).toHaveProperty('saved');
    expect(Array.isArray(list.body.saved)).toBe(true);
    expect(list.body.saved).toContain(packId);
    expect(Array.isArray(list.body.packs)).toBe(true);
    const savedPack = list.body.packs.find((entry: any) => entry.id === packId);
    expect(savedPack).toBeDefined();
    expect(savedPack.words).toHaveLength(4);
  });
});
