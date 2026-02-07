# Firebase Integration for Inspire Backend

## Overview

The Inspire backend now integrates with Google Firebase to:
1. Store authentication tokens in Firestore
2. Persist guest sessions in Firestore
3. Store user profiles and fuel packs in Firestore
4. Support VST OAuth flow with token-based authentication

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-service-account.json
FIREBASE_PROJECT_ID=inspire-8c6e8
```

### Service Account File

1. Go to Firebase Console: https://console.firebase.google.com/project/inspire-8c6e8
2. Navigate to **Project Settings → Service Accounts**
3. Click **Generate New Private Key**
4. Save the JSON file as `firebase-service-account.json` in the project root
5. Add to `.gitignore`: `firebase-service-account.json`

## How It Works

### Authentication Flow

#### 1. Guest Session Creation
```
POST /api/auth/guest
└─ Creates guest session locally
└─ Stores session in Firebase
└─ Returns accessToken + guest user info
```

**Firebase Storage:**
- Collection: `guestSessions`
- Document: `{session.id}`
- Data:
  ```json
  {
    "id": "uuid",
    "handle": "EpicWizard4872",
    "sessionToken": "jwt-token",
    "createdAt": "2026-02-02T...",
    "expiresAt": "2026-02-03T...",
    "isActive": true
  }
  ```

#### 2. User Registration (OTP Flow)
```
POST /api/auth/signup-request
│   └─ Send OTP to email
│
POST /api/auth/verify-otp
│   └─ Create user locally
│   └─ Store user in Firebase
│   └─ Generate accessToken
│   └─ Store token in Firebase
```

**Firebase Storage:**
- Collection: `users`
- Document: `{user.id}`
- Data:
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Cool Creator",
    "createdAt": "2026-02-02T...",
    "emailVerified": false,
    "lastActive": "2026-02-02T..."
  }
  ```

#### 3. Token Storage
```
Collection: tokens
Document: {token}
Data:
{
  "userId": "uuid",
  "token": "jwt-token",
  "createdAt": "2026-02-02T...",
  "expiresAt": "2026-02-02T00:15:00Z",
  "isActive": true
}
```

### Fuel Pack Persistence

When a user generates a fuel pack, it's automatically stored in Firebase:

```
Collection: users/{userId}/packs
Document: {packId}
Data:
{
  "id": "pack-uuid",
  "userId": "user-uuid",
  "mode": "lyricist",
  "submode": "rapper",
  "title": "Fresh Spark Session",
  "createdAt": "2026-02-02T...",
  "updatedAt": "2026-02-02T...",
  ... (all pack data)
}
```

### VST OAuth Flow

The VST app uses the `/api/auth/callback` endpoint to authenticate and receive a token:

```
1. VST opens browser: https://app.inspire/login?vst_uri=inspirevst://auth
2. User signs in (guest or full account)
3. Frontend redirects to: /api/auth/callback?vst_uri=inspirevst://auth
4. Backend creates session & token
5. Backend redirects: inspirevst://auth?token=<jwt-token>
6. VST receives token in redirect URI
7. VST uses token for all subsequent API calls
```

## API Changes

### Storing Custom User Data

When creating user objects, any data is automatically persisted to Firebase:

```typescript
// This data is now stored in Firebase
const user: UserProfile = {
  id: uuid(),
  email: 'user@example.com',
  displayName: 'Cool Creator',
  passwordHash: 'bcrypt-hash...',
  createdAt: Date.now(),
  avatarUrl: 'https://...'
};

await storeUserProfile(user);
```

### Storing Packs

```typescript
import { storePack } from './firebase/store';

// Stores to: users/{userId}/packs/{packId}
await storePack(userId, packId, packData);
```

### Retrieving Data

```typescript
import { 
  getGuestSessionFromDb, 
  getUserProfileFromDb, 
  getUserPacksFromDb 
} from './firebase/store';

// Get guest session
const session = await getGuestSessionFromDb(sessionToken);

// Get user profile
const user = await getUserProfileFromDb(userId);

// Get all packs for user
const packs = await getUserPacksFromDb(userId);
```

## Backend Code Changes

### Firebase Module Structure

```
backend/src/firebase/
├── admin.ts       # Firebase Admin SDK initialization
└── store.ts       # Firestore CRUD operations
```

### Auth Routes Updated

- `POST /api/auth/verify-otp` – Now stores user in Firebase
- `POST /api/auth/guest` – Now stores session in Firebase
- Both endpoints store auth tokens in Firebase

### Backward Compatibility

- All Firebase operations have fallback handling
- If Firebase initialization fails, app uses local JSON file storage
- Both systems can coexist (redundant storage for redundancy)

## Monitoring & Debugging

### Check Token Storage
```
Firebase Console → Firestore → tokens collection
Filter by userId or token value
```

### Check Guest Sessions
```
Firebase Console → Firestore → guestSessions collection
Verify session has valid expiresAt timestamp
```

### Check User Profiles
```
Firebase Console → Firestore → users collection
Verify user data and lastActive timestamp
```

### Local Fallback Files
If Firebase fails, check:
- `backend/src/data/users.json` – User profiles
- `backend/src/data/guestSessions.json` – Guest sessions
- `backend/src/data/pendingUsers.json` – OTP verification data

## Troubleshooting

### Firebase Not Initialized
```
ERROR: Firebase Admin SDK initialization failed
```

**Solution:**
1. Ensure `GOOGLE_APPLICATION_CREDENTIALS` env var is set correctly
2. Check `firebase-service-account.json` exists and is valid
3. Check Firebase project ID matches `FIREBASE_PROJECT_ID`

### Tokens Not Persisting
```
Check console for: "Failed to store auth token"
```

**Solution:**
1. Verify Firestore has `tokens` collection created
2. Check Firestore security rules allow writes
3. Ensure service account has `Cloud Datastore User` permission

### Guest Sessions Expiring Too Fast
Check `guestSessions.expiresAt` in Firebase:
```javascript
// Should be 24 hours in the future
const expiresAt = new Date(session.expiresAt);
const hoursUntilExpire = (expiresAt - Date.now()) / (1000 * 60 * 60);
```

## Next Steps

1. ✅ Firebase auth tokens created in `tokens` collection
2. ✅ Guest sessions stored in `guestSessions` collection  
3. ⏳ Fuel packs auto-persist to `users/{userId}/packs`
4. ⏳ VST receives token via OAuth callback redirect
5. ⏳ Frontend uses token for all VST-based API calls

## Related Files

- [backend/src/firebase/admin.ts](../src/firebase/admin.ts) – Initialization
- [backend/src/firebase/store.ts](../src/firebase/store.ts) – CRUD operations
- [backend/src/auth/routes.ts](../src/auth/routes.ts) – Updated auth endpoints
- [backend/src/index.ts](../src/index.ts) – Firebase initialization on startup
- [frontend/src/App.tsx](../../frontend/src/App.tsx) – VST OAuth redirect handling
