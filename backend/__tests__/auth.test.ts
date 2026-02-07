import request from 'supertest';
import { app } from '../src/index';
import { getLastMockOtp } from '../src/auth/otp';

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

  it('signs up and logs in with OTP', async () => {
    const otpEmail = `otp${Date.now()}@example.com`;
    const otpPassword = 'testpass123';

    const signupRes = await request(app)
      .post('/api/auth/signup-request')
      .send({ email: otpEmail, password: otpPassword, displayName: 'OtpTester' });
    expect(signupRes.status).toBe(200);

    const signupOtp = getLastMockOtp(otpEmail);
    expect(signupOtp).toBeTruthy();

    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: otpEmail, otpCode: signupOtp });
    expect(verifyRes.status).toBe(201);
    expect(verifyRes.body.user.email).toBe(otpEmail.toLowerCase());

    const loginRequest = await request(app)
      .post('/api/auth/login-request')
      .send({ email: otpEmail, password: otpPassword });
    expect(loginRequest.status).toBe(200);

    const loginOtp = getLastMockOtp(otpEmail);
    expect(loginOtp).toBeTruthy();

    const loginVerify = await request(app)
      .post('/api/auth/login-verify')
      .send({ email: otpEmail, otpCode: loginOtp });
    expect(loginVerify.status).toBe(200);
    expect(loginVerify.headers['set-cookie']).toBeDefined();
  });
});
