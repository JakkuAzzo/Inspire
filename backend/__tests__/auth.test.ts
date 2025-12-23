import request from 'supertest';
import { app } from '../dist/index';

describe('auth flows', () => {
  const email = `user${Date.now()}@example.com`;
  const password = 'testpass123';
  let cookies: string[] = [];

  it('registers a new user', async () => {
    const res = await request(app).post('/api/auth/register').send({ email, password, displayName: 'Tester' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email.toLowerCase());
    const header = res.get('set-cookie');
    cookies = Array.isArray(header) ? header : header ? [header] : [];
    expect(cookies.length).toBeGreaterThan(0);
  });

  it('logs in an existing user', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email.toLowerCase());
    const header = res.get('set-cookie');
    cookies = Array.isArray(header) ? header : header ? [header] : cookies;
  });

  it('returns profile with cookie', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email.toLowerCase());
  });

  it('refreshes session', async () => {
    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.get('set-cookie'))).toBe(true);
  });

  it('blocks protected pack access without auth', async () => {
    const res = await request(app).get('/api/packs/saved');
    expect(res.status).toBe(401);
  });
});
