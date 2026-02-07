/**
 * Firebase Firestore operations for authentication and data persistence
 * Handles auth tokens, guest sessions, and user data
 */

import * as admin from 'firebase-admin';
import { getFirebaseDb, isFirebaseInitialized } from './admin';
import { UserProfile, GuestSession } from '../auth/types';

/**
 * Create and store auth token in Firestore
 */
export async function storeAuthToken(userId: string, token: string, expiresAt: number): Promise<boolean> {
  if (!isFirebaseInitialized()) {
    console.warn('Firebase not initialized, skipping token storage');
    return false;
  }

  try {
    const db = getFirebaseDb();
    if (!db) return false;

    await db.collection('tokens').doc(token).set({
      userId,
      token,
      createdAt: new Date(),
      expiresAt: new Date(expiresAt),
      isActive: true
    });

    return true;
  } catch (err) {
    console.error('Failed to store auth token:', err);
    return false;
  }
}

/**
 * Create and store guest session in Firestore
 */
export async function storeGuestSession(session: GuestSession): Promise<boolean> {
  if (!isFirebaseInitialized()) {
    console.warn('Firebase not initialized, skipping guest session storage');
    return false;
  }

  try {
    const db = getFirebaseDb();
    if (!db) return false;

    await db.collection('guestSessions').doc(session.id).set({
      id: session.id,
      handle: session.handle,
      sessionToken: session.sessionToken,
      createdAt: new Date(session.createdAt),
      expiresAt: new Date(session.expiresAt),
      isActive: true
    });

    return true;
  } catch (err) {
    console.error('Failed to store guest session:', err);
    return false;
  }
}

/**
 * Store user profile in Firestore
 */
export async function storeUserProfile(user: UserProfile): Promise<boolean> {
  if (!isFirebaseInitialized()) {
    console.warn('Firebase not initialized, skipping user profile storage');
    return false;
  }

  try {
    const db = getFirebaseDb();
    if (!db) return false;

    await db.collection('users').doc(user.id).set({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl || null,
      createdAt: new Date(),
      lastActive: new Date(),
      emailVerified: false
    });

    return true;
  } catch (err) {
    console.error('Failed to store user profile:', err);
    return false;
  }
}

/**
 * Store pending OTP challenge in Firestore
 */
export async function storePendingOtp(payload: {
  id: string;
  email: string;
  type: 'signup' | 'login';
  otpExpiry: number;
  createdAt: number;
  expiresAt: number;
  userId?: string;
  displayName?: string;
}): Promise<boolean> {
  if (!isFirebaseInitialized()) {
    console.warn('Firebase not initialized, skipping pending OTP storage');
    return false;
  }

  try {
    const db = getFirebaseDb();
    if (!db) return false;

    await db.collection('pendingOtps').doc(payload.id).set({
      id: payload.id,
      email: payload.email,
      type: payload.type,
      userId: payload.userId || null,
      displayName: payload.displayName || null,
      createdAt: new Date(payload.createdAt),
      otpExpiry: new Date(payload.otpExpiry),
      expiresAt: new Date(payload.expiresAt)
    });

    return true;
  } catch (err) {
    console.error('Failed to store pending OTP:', err);
    return false;
  }
}

/**
 * Remove pending OTP challenge from Firestore
 */
export async function deletePendingOtp(id: string): Promise<boolean> {
  if (!isFirebaseInitialized()) {
    return false;
  }

  try {
    const db = getFirebaseDb();
    if (!db) return false;

    await db.collection('pendingOtps').doc(id).delete();
    return true;
  } catch (err) {
    console.error('Failed to delete pending OTP:', err);
    return false;
  }
}

/**
 * Store a fuel pack or creative work in Firestore
 */
export async function storePack(userId: string, packId: string, packData: any): Promise<boolean> {
  if (!isFirebaseInitialized()) {
    console.warn('Firebase not initialized, skipping pack storage');
    return false;
  }

  try {
    const db = getFirebaseDb();
    if (!db) return false;

    await db.collection('users').doc(userId).collection('packs').doc(packId).set({
      ...packData,
      id: packId,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return true;
  } catch (err) {
    console.error('Failed to store pack:', err);
    return false;
  }
}

/**
 * Get guest session from Firestore
 */
export async function getGuestSessionFromDb(sessionToken: string): Promise<GuestSession | null> {
  if (!isFirebaseInitialized()) {
    return null;
  }

  try {
    const db = getFirebaseDb();
    if (!db) return null;

    const snap = await db.collection('guestSessions')
      .where('sessionToken', '==', sessionToken)
      .limit(1)
      .get();

    if (snap.empty) return null;

    const doc = snap.docs[0];
    const data = doc.data();

    // Check if session is still valid
    const expiresAt = data.expiresAt?.toMillis?.() || new Date(data.expiresAt).getTime();
    if (expiresAt <= Date.now()) {
      return null;
    }

    return {
      id: data.id,
      handle: data.handle,
      sessionToken: data.sessionToken,
      createdAt: data.createdAt?.toMillis?.() || new Date(data.createdAt).getTime(),
      expiresAt: expiresAt
    } as GuestSession;
  } catch (err) {
    console.error('Failed to get guest session:', err);
    return null;
  }
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfileFromDb(userId: string): Promise<UserProfile | null> {
  if (!isFirebaseInitialized()) {
    return null;
  }

  try {
    const db = getFirebaseDb();
    if (!db) return null;

    const snap = await db.collection('users').doc(userId).get();

    if (!snap.exists) return null;

    const data = snap.data();
    if (!data) return null;
    
    return {
      id: data.id,
      email: data.email,
      displayName: data.displayName,
      passwordHash: '', // Don't return password hash
      createdAt: data.createdAt?.toMillis?.() || new Date(data.createdAt).getTime(),
      avatarUrl: data.avatarUrl || undefined
    } as UserProfile;
  } catch (err) {
    console.error('Failed to get user profile:', err);
    return null;
  }
}

/**
 * Update user's last active timestamp
 */
export async function updateUserLastActive(userId: string): Promise<boolean> {
  if (!isFirebaseInitialized()) {
    return false;
  }

  try {
    const db = getFirebaseDb();
    if (!db) return false;

    await db.collection('users').doc(userId).update({
      lastActive: new Date()
    });

    return true;
  } catch (err) {
    console.error('Failed to update user last active:', err);
    return false;
  }
}

/**
 * Get user's saved packs from Firestore
 */
export async function getUserPacksFromDb(userId: string): Promise<any[]> {
  if (!isFirebaseInitialized()) {
    return [];
  }

  try {
    const db = getFirebaseDb();
    if (!db) return [];

    const snap = await db.collection('users').doc(userId).collection('packs').get();

    return snap.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
      ...doc.data(),
      id: doc.id
    }));
  } catch (err) {
    console.error('Failed to get user packs:', err);
    return [];
  }
}

/**
 * Save a pack to user's collection in Firestore
 */
export async function savePackToDb(userId: string, pack: any): Promise<boolean> {
  if (!isFirebaseInitialized()) {
    console.warn('Firebase not initialized, skipping pack storage');
    return false;
  }

  try {
    const db = getFirebaseDb();
    if (!db) return false;

    // Store pack in user's packs subcollection
    await db.collection('users').doc(userId).collection('packs').doc(pack.id).set({
      ...pack,
      savedAt: new Date(),
      userId
    });

    // Also store in global packs collection for sharing/discovery
    await db.collection('packs').doc(pack.id).set({
      ...pack,
      ownerId: userId,
      createdAt: pack.timestamp ? new Date(pack.timestamp) : new Date(),
      savedAt: new Date()
    });

    return true;
  } catch (err) {
    console.error('Failed to save pack:', err);
    return false;
  }
}
