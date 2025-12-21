import jwt from 'jsonwebtoken';
import { AuthSession, UserProfile } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'inspire-dev-secret';
const ACCESS_TOKEN_TTL = Number(process.env.ACCESS_TOKEN_TTL ?? 15 * 60); // seconds
const REFRESH_TOKEN_TTL = Number(process.env.REFRESH_TOKEN_TTL ?? 7 * 24 * 60 * 60); // seconds

export interface DecodedToken {
  sub: string;
  tokenId: string;
  exp: number;
}

export function createAccessToken(user: UserProfile, tokenId: string) {
  return jwt.sign({ sub: user.id, tokenId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as DecodedToken;
  } catch (err) {
    return null;
  }
}

export function createSession(user: UserProfile): AuthSession {
  const tokenId = `${user.id}-${Date.now().toString(36)}`;
  const expiresAt = Date.now() + REFRESH_TOKEN_TTL * 1000;
  return { userId: user.id, tokenId, expiresAt };
}

export function isSessionValid(session: AuthSession): boolean {
  return session.expiresAt > Date.now();
}

export function getAccessTtlSeconds() {
  return ACCESS_TOKEN_TTL;
}

export function getRefreshTtlSeconds() {
  return REFRESH_TOKEN_TTL;
}
