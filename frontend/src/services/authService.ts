/**
 * Authentication API Service
 */

const API_BASE = '/api';

export interface AuthUser {
  id: string;
  email?: string;
  displayName?: string;
  isGuest?: boolean;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface SignupRequestResponse {
  message: string;
  email: string;
  expiresIn: number;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Request signup and send OTP code
 */
export async function requestSignup(
  email: string, 
  password: string, 
  displayName?: string
): Promise<SignupRequestResponse> {
  const response = await fetch(`${API_BASE}/auth/signup-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, displayName })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new AuthError(data.error || 'Signup request failed');
  }

  return data;
}

/**
 * Verify OTP code and complete registration
 */
export async function verifyOtp(email: string, otpCode: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, otpCode })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new AuthError(data.error || 'OTP verification failed');
  }

  return data.user;
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new AuthError(data.error || 'Login failed');
  }

  return data.user;
}

/**
 * Create guest session
 */
export async function createGuestSession(): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  });

  const data = await response.json();

  if (!response.ok) {
    throw new AuthError(data.error || 'Guest session creation failed');
  }

  return data.user;
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  });

  if (!response.ok) {
    console.warn('Logout request failed');
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch (err) {
    console.warn('Failed to get current user', err);
    return null;
  }
}
