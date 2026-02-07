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
  createPendingLogin,
  verifyLoginOtp,
  findPendingUserByEmail,
  findPendingLoginByEmail,
  createGuestSession,
  findGuestSessionByToken
} from './store';
import { AuthSession } from './types';
import { generateOTP, sendOTPEmail, sendOTPEmailMock } from './otp';
import { storeAuthToken, storeGuestSession, storeUserProfile, storePendingOtp, deletePendingOtp } from '../firebase/store';

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

      await storePendingOtp({
        id: pendingUser.id,
        email: pendingUser.email,
        type: 'signup',
        otpExpiry: pendingUser.otpExpiry,
        createdAt: pendingUser.createdAt,
        expiresAt: pendingUser.expiresAt,
        displayName: pendingUser.displayName
      });
      
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
      const pendingUser = findPendingUserByEmail(email);
      const user = await verifyOtpAndPromoteUser(email, otpCode);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid or expired OTP code' });
      }

      if (pendingUser) {
        await deletePendingOtp(pendingUser.id);
      }
      
      // Store user profile in Firebase
      await storeUserProfile(user);
      
      // Create session and log in
      const session = createSession(user);
      refreshSessions.set(session.tokenId, session);
      const accessToken = createAccessToken(user, session.tokenId);
      
      // Store token in Firebase
      await storeAuthToken(user.id, accessToken, session.expiresAt);
      
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
   * POST /auth/login-request
   * Step 1: Validate credentials and send OTP for login
   */
  router.post('/login-request', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    try {
      const user = await verifyUser(email, password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const otpCode = generateOTP();
      const pendingLogin = await createPendingLogin(user, otpCode);

      await storePendingOtp({
        id: pendingLogin.id,
        email: pendingLogin.email,
        type: 'login',
        otpExpiry: pendingLogin.otpExpiry,
        createdAt: pendingLogin.createdAt,
        expiresAt: pendingLogin.expiresAt,
        userId: pendingLogin.userId
      });

      const useMock = process.env.NODE_ENV === 'development' || !process.env.FORMSUBMIT_ENDPOINT;
      const emailResult = useMock
        ? await sendOTPEmailMock(email, otpCode)
        : await sendOTPEmail(email, otpCode);

      if (!emailResult.success) {
        return res.status(500).json({ error: 'Failed to send verification email' });
      }

      return res.status(200).json({
        message: 'Verification code sent to email',
        email: user.email,
        expiresIn: 600
      });
    } catch (err: any) {
      console.error('[login-request] Error:', err);
      return res.status(500).json({ error: 'Unable to process login request' });
    }
  });

  /**
   * POST /auth/login-verify
   * Step 2: Verify OTP code and complete login
   */
  router.post('/login-verify', async (req, res) => {
    const { email, otpCode } = req.body || {};
    if (!email || !otpCode) {
      return res.status(400).json({ error: 'email and OTP code required' });
    }

    try {
      const pendingLogin = findPendingLoginByEmail(email);
      const user = await verifyLoginOtp(email, otpCode);

      if (!user) {
        return res.status(401).json({ error: 'Invalid or expired OTP code' });
      }

      if (pendingLogin) {
        await deletePendingOtp(pendingLogin.id);
      }

      const session = createSession(user);
      refreshSessions.set(session.tokenId, session);
      const accessToken = createAccessToken(user, session.tokenId);

      await storeAuthToken(user.id, accessToken, session.expiresAt);

      attachSessionCookies(res, accessToken, session);

      return res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isGuest: false
        }
      });
    } catch (err: any) {
      console.error('[login-verify] Error:', err);
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
      
      // Store guest session in Firebase
      await storeGuestSession(guestSession);
      
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
      
      // Store token in Firebase
      await storeAuthToken(guestSession.id, accessToken, guestSession.expiresAt);
      
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

  /**
   * GET /auth/callback
   * OAuth callback for VST and other apps.
   * Returns token and optionally redirects to VST URI.
   * Supports both authenticated users and guest sessions.
   */
  router.get('/callback', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      // Try to find regular user
      const user = req.userId ? findUserById(req.userId) : null;
      
      // If not a regular user, check for guest session
      const guest = req.guestSession;
      
      if (!user && !guest) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Create session for regular user or guest
      let session: AuthSession;
      let accessToken: string;
      
      if (user) {
        session = createSession(user);
        refreshSessions.set(session.tokenId, session);
        accessToken = createAccessToken(user, session.tokenId);
      } else if (guest) {
        // Reuse existing guest session
        session = {
          userId: guest.id,
          tokenId: guest.sessionToken,
          expiresAt: guest.expiresAt,
          isGuest: true
        };
        accessToken = createAccessToken(
          { 
            id: guest.id, 
            email: '', 
            displayName: guest.handle,
            passwordHash: '',
            createdAt: guest.createdAt,
            isGuest: true
          }, 
          session.tokenId
        );
      } else {
        return res.status(401).json({ error: 'Invalid session' });
      }
      
      // Check for VST redirect URI
      const vstUri = (req.query.vst_uri as string) || (req.query.redirect_uri as string);
      if (vstUri) {
        // Redirect to VST app with token (e.g., inspirevst://auth?token=xyz)
        const redirectUrl = vstUri.includes('?') 
          ? `${vstUri}&token=${accessToken}`
          : `${vstUri}?token=${accessToken}`;
        return res.redirect(redirectUrl);
      }
      
      // Return token as JSON (for web-based flows)
      const userData = user
        ? { id: user.id, email: user.email, displayName: user.displayName }
        : { id: guest!.id, displayName: guest!.handle, isGuest: true };
      
      res.json({ 
        accessToken,
        user: userData
      });
    } catch (err: any) {
      console.error('[callback] Error:', err);
      res.status(500).json({ error: 'Unable to complete authentication' });
    }
  });

  return router;
}
