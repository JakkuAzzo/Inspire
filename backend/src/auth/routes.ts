import express, { Response } from 'express';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createAccessToken, createSession, getAccessTtlSeconds, getRefreshTtlSeconds, isSessionValid } from './jwt';
import { AuthenticatedRequest, requireAuth } from './middleware';
import { 
  createUser, 
  findUserById, 
  verifyUser, 
  createPendingUser, 
  verifyOtpAndPromoteUser,
  createGuestSession,
  findGuestSessionByToken
} from './store';
import { AuthSession } from './types';
import { generateOTP, sendOTPEmail, sendOTPEmailMock } from './otp';

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

  // ============= NEW: OTP-based Signup Flow =============
  
  /**
   * POST /auth/signup-request
   * Step 1: Request signup with email/password, receive OTP via email
   */
  router.post('/signup-request', async (req, res) => {
    const { email, password, displayName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    try {
      // Generate OTP
      const otpCode = generateOTP();
      
      // Create pending user (stores hashed password and OTP)
      const pendingUser = await createPendingUser(email, password, otpCode, displayName);
      
      // Send OTP via email (use mock in development)
      const useMock = process.env.NODE_ENV === 'development' || !process.env.FORMSUBMIT_ENDPOINT;
      const emailResult = useMock 
        ? await sendOTPEmailMock(email, otpCode)
        : await sendOTPEmail(email, otpCode);
      
      if (!emailResult.success) {
        return res.status(500).json({ error: 'Failed to send verification email' });
      }
      
      return res.status(200).json({ 
        message: 'Verification code sent to email',
        email: pendingUser.email,
        expiresIn: 600 // 10 minutes in seconds
      });
      
    } catch (err: any) {
      console.error('[signup-request] Error:', err);
      return res.status(500).json({ error: 'Unable to process signup request' });
    }
  });
  
  /**
   * POST /auth/verify-otp
   * Step 2: Verify OTP code and complete registration
   */
  router.post('/verify-otp', async (req, res) => {
    const { email, otpCode } = req.body || {};
    if (!email || !otpCode) {
      return res.status(400).json({ error: 'email and OTP code required' });
    }
    
    try {
      const user = await verifyOtpAndPromoteUser(email, otpCode);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid or expired OTP code' });
      }
      
      // Create session and log in
      const session = createSession(user);
      refreshSessions.set(session.tokenId, session);
      const accessToken = createAccessToken(user, session.tokenId);
      attachSessionCookies(res, accessToken, session);
      
      return res.status(201).json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          displayName: user.displayName,
          isGuest: false
        } 
      });
      
    } catch (err: any) {
      console.error('[verify-otp] Error:', err);
      return res.status(500).json({ error: 'Unable to verify OTP' });
    }
  });
  
  /**
   * POST /auth/guest
   * Create a guest session with random handle (session-only, no persistence)
   */
  router.post('/guest', async (req, res) => {
    try {
      const guestSession = createGuestSession();
      
      // Create a temporary session for guest
      const session: AuthSession = {
        userId: guestSession.id,
        tokenId: guestSession.sessionToken,
        expiresAt: guestSession.expiresAt,
        isGuest: true
      };
      
      refreshSessions.set(session.tokenId, session);
      
      // Create a simple access token for guest
      const accessToken = createAccessToken(
        { 
          id: guestSession.id, 
          email: '', 
          displayName: guestSession.handle,
          passwordHash: '',
          createdAt: guestSession.createdAt,
          isGuest: true
        }, 
        session.tokenId
      );
      
      attachSessionCookies(res, accessToken, session);
      
      return res.status(201).json({
        user: {
          id: guestSession.id,
          displayName: guestSession.handle,
          isGuest: true
        }
      });
      
    } catch (err: any) {
      console.error('[guest] Error:', err);
      return res.status(500).json({ error: 'Unable to create guest session' });
    }
  });

  // ============= Existing Routes =============

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
    if (user) {
      return res.json({ user: { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl } });
    }

    const guest = req.guestSession;
    if (guest) {
      return res.json({ user: { id: guest.id, displayName: guest.handle, isGuest: true } });
    }

    return res.status(404).json({ error: 'User missing' });
  });

  return router;
}
