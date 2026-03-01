# Firebase Setup & Verification Guide

This guide helps you set up Firebase integration for Inspire and verify that auth tokens, guest accounts, and user data are being persisted to the cloud.

## Quick Start

### 1. Get Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/project/inspire-8c6e8)
2. Click **Project Settings** (⚙️ icon in top-left)
3. Navigate to **Service Accounts** tab
4. Click **Generate New Private Key**
5. Save the JSON file as `firebase-service-account.json` in the project root:
   ```
   /Users/nathanbrown-bennett/TildeSec/Inspire/Inspire/firebase-service-account.json
   ```

### 2. Set Environment Variables

Create/update `backend/.env`:

```env
# Firebase Configuration
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
FIREBASE_PROJECT_ID=inspire-8c6e8

# Backend Configuration
PORT=3001
NODE_ENV=development
```

### 3. Start Development Server

```bash
npm run dev
```

Check logs for:
```
✓ Firebase Admin SDK initialized
```

## What Gets Stored in Firebase

### When User Signs Up (OTP Flow)

**Collection: `users/{userId}`**
```json
{
  "id": "user_abc123",
  "email": "user@example.com",
  "displayName": "John Doe",
  "createdAt": "2025-01-15T10:30:00Z"
}
```

**Collection: `tokens/{token}`**
```json
{
  "userId": "user_abc123",
  "token": "eyJhbGc...",
  "createdAt": "2025-01-15T10:30:05Z",
  "expiresAt": "2025-01-22T10:30:05Z",
  "isActive": true
}
```

### When Guest Signs In

**Collection: `guestSessions/{sessionId}`**
```json
{
  "id": "guest_xyz789",
  "handle": "SilentPhoenix42",
  "sessionToken": "sess_random123",
  "createdAt": "2025-01-15T10:35:00Z",
  "expiresAt": "2025-01-15T14:35:00Z",
  "isActive": true
}
```

**Collection: `tokens/{token}`**
```json
{
  "userId": "guest_xyz789",
  "token": "eyJhbGc...",
  "createdAt": "2025-01-15T10:35:05Z",
  "expiresAt": "2025-01-15T14:35:05Z",
  "isActive": true
}
```

### When User Creates Content (Fuel Packs, etc.)

**Collection: `users/{userId}/packs/{packId}`**
```json
{
  "id": "pack_123",
  "mode": "lyricist",
  "submode": "rapper",
  "title": "Fresh Vibes",
  "createdAt": "2025-01-15T10:40:00Z",
  "tags": ["hip-hop", "fresh"],
  "content": { ... }
}
```

## Verification Steps

### Step 1: Verify Firebase Admin SDK Initialization

When you start the dev server, check the console:

```bash
npm run dev
```

Look for:
```
✓ Firebase Admin SDK initialized
```

If you see:
```
Firebase Admin SDK initialization failed, using local storage fallback
```

Then:
1. Check that `firebase-service-account.json` exists in project root
2. Verify `GOOGLE_APPLICATION_CREDENTIALS` environment variable is set
3. Ensure the service account has Firestore read/write permissions

### Step 2: Test Guest Sign-In

1. Open [http://localhost:3000](http://localhost:3000)
2. Click **Sign In**
3. Select **Continue as Guest**
4. Verify guest handle appears (e.g., "SilentPhoenix42")

**Expected Firebase Changes:**
- A new document appears in `guestSessions` collection
- A new token document appears in `tokens` collection

### Step 3: Verify Guest Session in Firebase

Open [Firebase Console → Firestore](https://console.firebase.google.com/project/inspire-8c6e8/firestore/data):

1. Click `guestSessions` collection
2. You should see a document with:
   - **id**: Guest session ID
   - **handle**: Random two-word handle
   - **sessionToken**: Session token
   - **createdAt**: Current timestamp
   - **isActive**: true

### Step 4: Verify Auth Token in Firebase

1. In Firebase Console, click `tokens` collection
2. You should see a document with:
   - **userId**: Guest session ID (or user ID for full accounts)
   - **token**: JWT token
   - **createdAt**: Current timestamp
   - **expiresAt**: Token expiration time (1 hour from now)
   - **isActive**: true

### Step 5: Test OTP Sign-Up Flow

1. Open [http://localhost:3000](http://localhost:3000)
2. Click **Sign In** → **Sign Up**
3. Enter email, password, display name
4. Click **Send Verification Code**
5. Check dev server logs for OTP code (printed in development mode)
6. Enter OTP and verify

**Expected Firebase Changes:**
- A new document appears in `users` collection with email, displayName, createdAt
- A new token document appears in `tokens` collection for this user

### Step 6: Test VST OAuth Flow

1. Open VST with query parameter: `?vst_uri=inspirevst://auth`
2. Sign in (guest or full account)
3. You should be redirected to: `inspirevst://auth?token=<JWT_TOKEN>`

**Expected Flow:**
1. Frontend detects `vst_uri` parameter
2. Shows auth modal
3. After signing in, redirects to `/api/auth/callback?vst_uri=inspirevst://auth`
4. Backend creates token and redirects to VST app with token in query params

## Monitoring Firebase in Real-Time

### Option 1: Firebase Console (Web UI)

1. Go to [https://console.firebase.google.com/project/inspire-8c6e8/firestore/data](https://console.firebase.google.com/project/inspire-8c6e8/firestore/data)
2. Watch collections update in real-time as you:
   - Sign in as guest
   - Create packs
   - Sign out

### Option 2: Firebase CLI

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Switch to Inspire project
firebase use inspire-8c6e8

# View real-time Firestore logs
firebase firestore:inspect
```

### Option 3: Emulator (Local Testing)

For offline/testing without cloud:

```bash
firebase emulators:start --project inspire-8c6e8
```

Then update `backend/.env`:
```env
FIREBASE_EMULATOR_HOST=localhost:8080
```

## Troubleshooting

### Issue: "Firebase Admin SDK initialization failed"

**Cause**: Service account credentials not found or invalid

**Solution**:
1. Verify `firebase-service-account.json` exists in project root
2. Check file is valid JSON: `cat firebase-service-account.json | jq .`
3. Verify `GOOGLE_APPLICATION_CREDENTIALS` env var is set:
   ```bash
   echo $GOOGLE_APPLICATION_CREDENTIALS
   # Should output: ./firebase-service-account.json
   ```
4. Check `.env` file has correct path

### Issue: "Permission denied" error in Firestore

**Cause**: Service account doesn't have proper permissions

**Solution**:
1. In Firebase Console, go to **Firestore → Rules**
2. Replace rules with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
3. Click **Publish**

⚠️ **Note**: These are open rules for development. Restrict in production!

### Issue: Tokens not appearing in Firebase

**Cause**: Firebase storage failed silently, app using local fallback

**Solution**:
1. Check backend logs for Firebase errors: `npm run dev 2>&1 | grep -i firebase`
2. Verify service account has `Cloud Datastore User` role
3. Verify `FIREBASE_PROJECT_ID` matches console project ID (inspire-8c6e8)

### Issue: Guest session expires too quickly

**Cause**: Token TTL (time-to-live) too short

**Solution**:
Update in `backend/src/auth/store.ts`:
```typescript
// Increase guest session TTL from 4 hours to 24 hours
const GUEST_SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
```

## Backend Code Reference

### Firebase Store Functions

**File**: `backend/src/firebase/store.ts`

**Available Functions**:

```typescript
// Store auth token (called after login/signup)
storeAuthToken(userId: string, token: string, expiresAt: number): Promise<boolean>

// Store guest session (called when guest signs in)
storeGuestSession(session: GuestSession): Promise<boolean>

// Store user profile (called after OTP verification)
storeUserProfile(user: UserProfile): Promise<boolean>

// Store fuel pack (called after pack creation)
storePack(userId: string, packId: string, packData: FuelPack | ModePack): Promise<boolean>

// Retrieve guest session from DB
getGuestSessionFromDb(sessionToken: string): Promise<GuestSession | null>

// Retrieve user profile from DB
getUserProfileFromDb(userId: string): Promise<UserProfile | null>

// Get all packs for user
getUserPacksFromDb(userId: string): Promise<FuelPack[]>

// Update last active timestamp
updateUserLastActive(userId: string): Promise<boolean>
```

### Firebase Admin Module

**File**: `backend/src/firebase/admin.ts`

**Setup**:
```typescript
import { initFirebaseAdmin, getFirebaseDb, getFirebaseAuth } from './firebase/admin';

// Initialize (called automatically on startup)
initFirebaseAdmin();

// Get Firestore reference
const db = getFirebaseDb();

// Get Auth reference
const auth = getFirebaseAuth();
```

## Next Steps

1. ✅ **Verify Firebase credentials are in place** (service account JSON)
2. ✅ **Test guest sign-in** (check Firebase guestSessions collection)
3. ✅ **Test OTP sign-up** (check Firebase users collection)
4. ✅ **Test VST OAuth** (verify token redirect works)
5. 📋 **Integrate pack persistence** (update pack creation routes to call `storePack()`)
6. 📋 **Add data validation** (Firestore security rules for production)
7. 📋 **Monitor performance** (watch Firestore read/write usage)

## Environment Variables Checklist

Required for Firebase integration:

- [ ] `GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json`
- [ ] `FIREBASE_PROJECT_ID=inspire-8c6e8`
- [ ] `PORT=3001` (backend)
- [ ] `NODE_ENV=development` (or production)

## Security Note

⚠️ **Important**: 

- Never commit `firebase-service-account.json` to version control
- It's already added to `.gitignore`
- In production, use environment variables or secure secret management
- Current Firestore rules are wide-open for development
- Implement authentication-based rules before going to production

## Support

For issues or questions:

1. Check [Firebase Documentation](https://firebase.google.com/docs/firestore)
2. Review [Inspire Copilot Instructions](./.github/copilot-instructions.md)
3. Check backend logs: `npm run dev 2>&1 | tail -100`
4. Verify Firebase Console shows data being written in real-time

---

**Last Updated**: January 2025
**Firebase Project**: inspire-8c6e8
**Status**: ✅ Ready for Integration Testing
