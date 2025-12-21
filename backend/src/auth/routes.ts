import express, { Response } from 'express';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createAccessToken, createSession, getAccessTtlSeconds, getRefreshTtlSeconds, isSessionValid } from './jwt';
import { AuthenticatedRequest, requireAuth } from './middleware';
import { createUser, findUserById, verifyUser } from './store';
import { AuthSession } from './types';

const refreshSessions = new Map<string, AuthSession>();

const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

function attachSessionCookies(res: Response, accessToken: string, session: AuthSession) {
  const common = { httpOnly: true, sameSite: 'lax' as const, secure: false, path: '/' };
  res.cookie('accessToken', accessToken, { ...common, maxAge: getAccessTtlSeconds() * 1000 });
  res.cookie('refreshToken', session.tokenId, { ...common, maxAge: getRefreshTtlSeconds() * 1000 });
}

function clearSessionCookies(res: Response) {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
}

export function buildAuthRouter() {
  const router = express.Router();
  router.use(cookieParser());
  router.use(express.json());
  router.use(authLimiter);

  router.post('/register', async (req, res) => {
    const { email, password, displayName } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    if (password.length < 6) return res.status(400).json({ error: 'Password too short' });
    try {
      const user = await createUser(email, password, displayName);
      const session = createSession(user);
      refreshSessions.set(session.tokenId, session);
      const accessToken = createAccessToken(user, session.tokenId);
      attachSessionCookies(res, accessToken, session);
      return res.status(201).json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
    } catch (err: any) {
      if (String(err?.message).includes('exists')) return res.status(409).json({ error: 'User already exists' });
      return res.status(500).json({ error: 'Unable to register' });
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    const user = await verifyUser(email, password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const session = createSession(user);
    refreshSessions.set(session.tokenId, session);
    const accessToken = createAccessToken(user, session.tokenId);
    attachSessionCookies(res, accessToken, session);
    res.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
  });

  router.post('/refresh', (req: AuthenticatedRequest, res) => {
    const refreshToken = (req as any).cookies?.refreshToken as string | undefined;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token missing' });
    const session = refreshSessions.get(refreshToken);
    if (!session || !isSessionValid(session)) {
      refreshSessions.delete(refreshToken);
      return res.status(401).json({ error: 'Refresh expired' });
    }
    const user = findUserById(session.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    const accessToken = createAccessToken(user, session.tokenId);
    attachSessionCookies(res, accessToken, session);
    res.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
  });

  router.post('/logout', (req, res) => {
    const refreshToken = (req as any).cookies?.refreshToken as string | undefined;
    if (refreshToken) refreshSessions.delete(refreshToken);
    clearSessionCookies(res);
    res.json({ ok: true });
  });

  router.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.userId ? findUserById(req.userId) : null;
    if (!user) return res.status(404).json({ error: 'User missing' });
    res.json({ user: { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl } });
  });

  return router;
}
