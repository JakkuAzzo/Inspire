import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { UserProfile, PendingUser, GuestSession } from './types';

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const PENDING_USERS_FILE = path.join(__dirname, '..', 'data', 'pendingUsers.json');
const GUEST_SESSIONS_FILE = path.join(__dirname, '..', 'data', 'guestSessions.json');

function readUsers(): UserProfile[] {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as UserProfile[];
  } catch (err) {
    // ignore and fall through to default
  }
  return [];
}

function writeUsers(users: UserProfile[]) {
  try {
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Unable to persist users', err);
  }
}

function readPendingUsers(): PendingUser[] {
  try {
    const raw = fs.readFileSync(PENDING_USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as PendingUser[];
  } catch (err) {
    // ignore and fall through to default
  }
  return [];
}

function writePendingUsers(users: PendingUser[]) {
  try {
    fs.mkdirSync(path.dirname(PENDING_USERS_FILE), { recursive: true });
    fs.writeFileSync(PENDING_USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Unable to persist pending users', err);
  }
}

function readGuestSessions(): GuestSession[] {
  try {
    const raw = fs.readFileSync(GUEST_SESSIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as GuestSession[];
  } catch (err) {
    // ignore and fall through to default
  }
  return [];
}

function writeGuestSessions(sessions: GuestSession[]) {
  try {
    fs.mkdirSync(path.dirname(GUEST_SESSIONS_FILE), { recursive: true });
    fs.writeFileSync(GUEST_SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8');
  } catch (err) {
    console.error('Unable to persist guest sessions', err);
  }
}

let cachedUsers = readUsers();
let cachedPendingUsers = readPendingUsers();
let cachedGuestSessions = readGuestSessions();

export function findUserByEmail(email: string): UserProfile | undefined {
  return cachedUsers.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string): UserProfile | undefined {
  return cachedUsers.find((user) => user.id === id);
}

export async function createUser(email: string, password: string, displayName?: string): Promise<UserProfile> {
  const normalizedEmail = email.toLowerCase();
  const existing = findUserByEmail(normalizedEmail);
  if (existing) throw new Error('User already exists');
  const passwordHash = await bcrypt.hash(password, 10);
  const user: UserProfile = {
    id: uuid(),
    email: normalizedEmail,
    passwordHash,
    displayName: displayName?.trim() || normalizedEmail.split('@')[0],
    avatarUrl: null,
    createdAt: Date.now()
  };
  cachedUsers = [...cachedUsers, user];
  writeUsers(cachedUsers);
  return user;
}

export async function verifyUser(email: string, password: string): Promise<UserProfile | null> {
  const user = findUserByEmail(email);
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

export function listUsers(): UserProfile[] {
  return [...cachedUsers];
}

// ============= Pending Users (OTP verification) =============

export function findPendingUserByEmail(email: string): PendingUser | undefined {
  return cachedPendingUsers.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function findPendingUserById(id: string): PendingUser | undefined {
  return cachedPendingUsers.find((user) => user.id === id);
}

export async function createPendingUser(
  email: string,
  password: string,
  otpCode: string,
  displayName?: string
): Promise<PendingUser> {
  const normalizedEmail = email.toLowerCase();
  
  // Remove any existing pending user with same email
  cachedPendingUsers = cachedPendingUsers.filter(u => u.email !== normalizedEmail);
  
  const passwordHash = await bcrypt.hash(password, 10);
  const otpCodeHash = await bcrypt.hash(otpCode, 10);
  const now = Date.now();
  const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
  const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes
  
  const pendingUser: PendingUser = {
    id: uuid(),
    email: normalizedEmail,
    passwordHash,
    displayName: displayName?.trim() || normalizedEmail.split('@')[0],
    otpCodeHash,
    otpExpiry: now + OTP_EXPIRY,
    createdAt: now,
    expiresAt: now + FOURTEEN_DAYS
  };
  
  cachedPendingUsers = [...cachedPendingUsers, pendingUser];
  writePendingUsers(cachedPendingUsers);
  return pendingUser;
}

export async function verifyOtpAndPromoteUser(email: string, otpCode: string): Promise<UserProfile | null> {
  const pendingUser = findPendingUserByEmail(email);
  if (!pendingUser) return null;
  
  // Check OTP expiry
  if (Date.now() > pendingUser.otpExpiry) {
    return null;
  }
  
  // Verify OTP
  const valid = await bcrypt.compare(otpCode, pendingUser.otpCodeHash);
  if (!valid) return null;
  
  // Promote to verified user
  const user: UserProfile = {
    id: uuid(),
    email: pendingUser.email,
    passwordHash: pendingUser.passwordHash,
    displayName: pendingUser.displayName || pendingUser.email.split('@')[0],
    avatarUrl: undefined,
    createdAt: Date.now(),
    verifiedAt: Date.now()
  };
  
  cachedUsers = [...cachedUsers, user];
  writeUsers(cachedUsers);
  
  // Remove from pending users
  cachedPendingUsers = cachedPendingUsers.filter(u => u.id !== pendingUser.id);
  writePendingUsers(cachedPendingUsers);
  
  return user;
}

export function cleanupExpiredPendingUsers(): number {
  const now = Date.now();
  const before = cachedPendingUsers.length;
  cachedPendingUsers = cachedPendingUsers.filter(u => u.expiresAt > now);
  writePendingUsers(cachedPendingUsers);
  return before - cachedPendingUsers.length;
}

// ============= Guest Sessions =============

const ADJECTIVES = ['Cool', 'Creative', 'Awesome', 'Epic', 'Super', 'Mega', 'Ultra', 'Wild', 'Fresh', 'Smooth'];
const NOUNS = ['Artist', 'Creator', 'Maker', 'Wizard', 'Genius', 'Master', 'Pro', 'Legend', 'Star', 'Hero'];

function generateRandomHandle(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 10000);
  return `${adj}${noun}${num}`;
}

export function createGuestSession(): GuestSession {
  const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours (until browser closes or session ends)
  
  let handle = generateRandomHandle();
  // Ensure unique handle
  while (cachedGuestSessions.find(s => s.handle === handle)) {
    handle = generateRandomHandle();
  }
  
  const session: GuestSession = {
    id: uuid(),
    handle,
    sessionToken: uuid(),
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION
  };
  
  cachedGuestSessions = [...cachedGuestSessions, session];
  writeGuestSessions(cachedGuestSessions);
  return session;
}

export function findGuestSessionByToken(token: string): GuestSession | undefined {
  return cachedGuestSessions.find(s => s.sessionToken === token && s.expiresAt > Date.now());
}

export function cleanupExpiredGuestSessions(): number {
  const now = Date.now();
  const before = cachedGuestSessions.length;
  cachedGuestSessions = cachedGuestSessions.filter(s => s.expiresAt > now);
  writeGuestSessions(cachedGuestSessions);
  return before - cachedGuestSessions.length;
}
