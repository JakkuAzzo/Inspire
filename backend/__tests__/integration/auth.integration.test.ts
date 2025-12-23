import request from 'supertest';
import { app } from '../../src/index';

describe('Auth integration', () => {
  it('registers and logs in a user, returns cookies', async () => {
    const email = `test+${Date.now()}@example.com`;
    const password = 'hunter2';

    const registerRes = await request(app).post('/api/auth/register').send({ email, password, displayName: 'Testy' });
    expect(registerRes.status).toBe(201);
    expect(registerRes.headers['set-cookie']).toBeDefined();

    const loginRes = await request(app).post('/api/auth/login').send({ email, password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('user');
    expect(loginRes.headers['set-cookie']).toBeDefined();

    const cookies = loginRes.headers['set-cookie'];
    const me = await request(app).get('/api/auth/me').set('Cookie', cookies);
    expect(me.status).toBe(200);
    expect(me.body).toHaveProperty('user');
    expect(me.body.user.email).toBe(email.toLowerCase());
  }, 20000);
});
