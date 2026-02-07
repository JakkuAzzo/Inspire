/**
 * Firebase Admin SDK initialization
 * Connects backend to Firestore for user data, sessions, and content persistence
 */

import * as admin from 'firebase-admin';
import path from 'path';

let initialized = false;

export function initFirebaseAdmin() {
  if (initialized) return;

  try {
    // Check for service account file - use absolute path from project root
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? path.join(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : path.join(__dirname, '..', '..', 'firebase-service-account.json');
    
    // Initialize with service account credentials
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || 'inspire-8c6e8'
    });

    initialized = true;
    console.log('✓ Firebase Admin SDK initialized');
  } catch (err) {
    console.warn('Firebase Admin SDK initialization failed, using local storage fallback:', err instanceof Error ? err.message : err);
    initialized = false;
  }
}

export function getFirebaseDb() {
  if (!initialized) {
    initFirebaseAdmin();
  }
  
  if (!initialized) {
    return null;
  }

  return admin.firestore();
}

export function getFirebaseAuth() {
  if (!initialized) {
    initFirebaseAdmin();
  }
  
  if (!initialized) {
    return null;
  }

  return admin.auth();
}

export function isFirebaseInitialized(): boolean {
  return initialized;
}
