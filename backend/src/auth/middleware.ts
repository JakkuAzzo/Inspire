import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './jwt';
import { findUserById, findGuestSessionByToken } from './store';
import { GuestSession } from './types';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  guestSession?: GuestSession;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cookieToken = (req as any).cookies?.accessToken as string | undefined;
  const token = bearer || cookieToken;

  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Invalid token' });
  const user = findUserById(decoded.sub);
  if (user) {
    req.userId = user.id;
    return next();
  }

  // Allow guest sessions authenticated via JWT tokenId
  const guest = findGuestSessionByToken(decoded.tokenId);
  if (guest) {
    req.userId = guest.id;
    req.guestSession = guest;
    return next();
  }

  return res.status(401).json({ error: 'User not found' });
}
