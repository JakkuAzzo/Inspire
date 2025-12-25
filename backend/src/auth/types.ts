export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  passwordHash: string;
  createdAt: number;
  isGuest?: boolean;
  verifiedAt?: number;
}

export interface PendingUser {
  id: string;
  email: string;
  displayName?: string;
  passwordHash: string;
  otpCodeHash: string;
  otpExpiry: number;
  createdAt: number;
  expiresAt: number;
}

export interface GuestSession {
  id: string;
  handle: string;
  sessionToken: string;
  createdAt: number;
  expiresAt: number;
}

export interface AuthSession {
  userId: string;
  tokenId: string;
  expiresAt: number;
  isGuest?: boolean;
}
