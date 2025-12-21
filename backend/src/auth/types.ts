export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  passwordHash: string;
  createdAt: number;
}

export interface AuthSession {
  userId: string;
  tokenId: string;
  expiresAt: number;
}
