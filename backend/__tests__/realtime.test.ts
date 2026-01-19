import request from 'supertest';
import { app, io, server } from '../src/index';

describe('realtime + feed endpoints', () => {
  afterAll((done) => {
    io.close();
    if (server.listening) {
      server.close(done);
    } else {
      done();
    }
  });

  it('creates a feed post and lists it', async () => {
    const create = await request(app).post('/api/feed').send({ author: 'tester', content: 'hello world' }).expect(201);
    expect(create.body.post).toMatchObject({ author: 'tester', content: 'hello world' });

    const list = await request(app).get('/api/feed').expect(200);
    expect(Array.isArray(list.body.items)).toBe(true);
    expect(list.body.items[0].content).toBe('hello world');
  });

  it('rejects blocked content', async () => {
    await request(app)
      .post('/api/feed')
      .send({ author: 'bad', content: 'this is spam content' })
      .expect(400);
  });

  it('lists rooms and updates presence', async () => {
    const initial = await request(app).get('/api/rooms').expect(200);
    expect(Array.isArray(initial.body.rooms)).toBe(true);
    const first = initial.body.rooms[0];

    const joined = await request(app).post(`/api/rooms/${first.id}/join`).send({ user: 'tester' }).expect(200);
    expect(joined.body.room.participants).toBeGreaterThanOrEqual(first.participants);
  });
});
