import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { UserProfile } from './types';

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

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

let cachedUsers = readUsers();

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
