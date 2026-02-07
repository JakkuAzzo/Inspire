import request from 'supertest';
import { app } from '../../src/index';
import { getLastMockOtp } from '../../src/auth/otp';

describe('Auth integration', () => {
  it('signs up and logs in via OTP, returns cookies', async () => {
    const email = `test+${Date.now()}@example.com`;
    const password = 'hunter2';

    const signupRes = await request(app)
      .post('/api/auth/signup-request')
      .send({ email, password, displayName: 'Testy' });
    expect(signupRes.status).toBe(200);

    const signupOtp = getLastMockOtp(email);
    expect(signupOtp).toBeTruthy();

    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email, otpCode: signupOtp });
    expect(verifyRes.status).toBe(201);

    const loginRequest = await request(app)
      .post('/api/auth/login-request')
      .send({ email, password });
    expect(loginRequest.status).toBe(200);

    const loginOtp = getLastMockOtp(email);
    expect(loginOtp).toBeTruthy();

    const loginRes = await request(app)
      .post('/api/auth/login-verify')
      .send({ email, otpCode: loginOtp });
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
