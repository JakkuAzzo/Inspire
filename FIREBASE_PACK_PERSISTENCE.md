# Firebase Pack Persistence Integration Guide

This document explains how to integrate Firebase Firestore storage for fuel packs, remixes, and other user-created content across all API routes.

## Current State

✅ **Completed:**
- Firebase Admin SDK initialization (`backend/src/firebase/admin.ts`)
- Firestore CRUD operations module (`backend/src/firebase/store.ts`)
- Auth token persistence (tokens stored in `tokens` collection)
- Guest session persistence (stored in `guestSessions` collection)
- User profile persistence (stored in `users` collection)

⏳ **In Progress:**
- Pack creation routes need to call `storePack()` for full persistence

## Pack Storage Structure

### Firestore Collection Schema

```
users/{userId}/packs/{packId}
├── id: string (pack ID)
├── mode: "lyricist" | "producer" | "editor" | "daw"
├── submode: string (e.g., "rapper", "sampler")
├── title: string
├── description?: string
├── tags: string[]
├── content: {
│   ├── words?: Word[]
│   ├── samples?: SampleReference[]
│   ├── visuals?: InspirationClip[]
│   ├── prompts?: string[]
│   └── ... (mode-specific fields)
├── createdAt: timestamp
├── updatedAt: timestamp
└── metadata: {
    ├── isPublic: boolean
    ├── isRemix: boolean
    ├── parentPackId?: string
    └── collaborators: string[]
}
```

### Example Firestore Document

```json
{
  "id": "pack_a1b2c3",
  "mode": "lyricist",
  "submode": "rapper",
  "title": "Fresh Vibes - Midnight Flow",
  "description": "Exploring late-night inspiration with bold wordplay",
  "tags": ["hip-hop", "fresh", "introspective"],
  "content": {
    "words": [
      { "value": "neon confession", "timeframe": "fresh", "tone": "deep" },
      { "value": "midnight hustle", "timeframe": "timeless", "tone": "deep" }
    ],
    "mood": {
      "primary": "introspective",
      "secondary": "ambitious",
      "energy": 7
    }
  },
  "createdAt": "2025-01-15T10:45:00Z",
  "updatedAt": "2025-01-15T10:45:00Z",
  "metadata": {
    "isPublic": false,
    "isRemix": false,
    "parentPackId": null,
    "collaborators": []
  }
}
```

## Routes to Update

### 1. Pack Creation Routes

**File**: `backend/src/index.ts`

#### Route 1: POST `/modes/:mode/fuel-pack` (Line ~569)

**Current Code**:
```typescript
router.post('/modes/:mode/fuel-pack', async (req: Request, res: Response) => {
  // ... validation and generation code ...
  packs.set(pack.id, pack);
  return res.status(201).json({ id: pack.id, pack });
});
```

**Update To**:
```typescript
import { storePack } from './firebase/store';
import { AuthenticatedRequest, requireAuth } from './auth/middleware';

router.post('/modes/:mode/fuel-pack', 
  requireAuth, // Add auth requirement
  async (req: AuthenticatedRequest, res: Response) => {
    // ... validation and generation code ...
    
    // Store locally
    packs.set(pack.id, pack);
    
    // Store in Firebase (async, non-blocking)
    if (req.userId) {
      storePack(req.userId, pack.id, pack)
        .then(() => console.log(`✓ Pack ${pack.id} stored in Firebase`))
        .catch(err => console.error('Firebase storage failed:', err));
    }
    
    return res.status(201).json({ id: pack.id, pack });
  }
);
```

#### Route 2: POST `/modes/daw/fuel-pack` (Line ~620)

Same pattern as above - add `requireAuth` middleware and call `storePack()`.

#### Route 3: POST `/fuel-pack` (Line ~877)

Same pattern as above.

### 2. Pack Update Routes

**File**: `backend/src/index.ts`

#### Route: PUT `/packs/:id` or similar update routes

**Add Firebase Sync**:
```typescript
router.put('/packs/:packId', 
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const { packId } = req.params;
    const updatedPack = req.body;
    
    // Update locally
    packs.set(packId, updatedPack);
    
    // Update in Firebase
    if (req.userId) {
      await storePack(req.userId, packId, updatedPack);
    }
    
    return res.json({ success: true, pack: updatedPack });
  }
);
```

### 3. Remix Creation Routes

**File**: `backend/src/index.ts` (Line ~965)

**Current Code**:
```typescript
const remix = {
  id: createId(),
  // ... remix data ...
};
packs.set(remix.id, remix);
```

**Update To**:
```typescript
const remix = {
  id: createId(),
  // ... remix data ...
};

// Store locally
packs.set(remix.id, remix);

// Store in Firebase with remix metadata
if (req.userId) {
  const remixWithMeta = {
    ...remix,
    metadata: {
      isRemix: true,
      parentPackId: parentId,
      collaborators: [req.userId]
    }
  };
  
  await storePack(req.userId, remix.id, remixWithMeta);
}
```

## Implementation Steps

### Step 1: Add Auth Requirement to Pack Routes

Open `backend/src/index.ts` and find the pack creation routes. Add the `requireAuth` middleware:

```typescript
import { requireAuth, AuthenticatedRequest } from './auth/middleware';

router.post('/fuel-pack', 
  requireAuth,  // Add this
  async (req: AuthenticatedRequest, res: Response) => {
    // existing code...
  }
);
```

### Step 2: Import Firebase Store

Add at the top of `backend/src/index.ts`:

```typescript
import { storePack } from './firebase/store';
```

### Step 3: Add Firebase Calls to Each Pack Route

After each `packs.set()` call, add:

```typescript
// Store in Firebase (async, non-blocking)
if (req.userId) {
  storePack(req.userId, pack.id, pack)
    .then(() => console.log(`✓ Pack ${pack.id} stored in Firebase`))
    .catch(err => console.error('Firebase storage failed, using local:', err));
}
```

### Step 4: Test Each Route

Use curl or Postman to test:

```bash
# 1. Create guest session
curl -X POST http://localhost:3001/api/auth/guest

# Save the token from response
TOKEN="<token-from-response>"

# 2. Create a fuel pack (as authenticated user)
curl -X POST http://localhost:3001/api/fuel-pack \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "lyricist",
    "submode": "rapper",
    "filters": {"timeframe": "fresh", "tone": "funny", "semantic": "tight"}
  }'

# 3. Check Firebase Console for pack in users/{userId}/packs/
```

## Handling Authenticated Requests

### Updated Middleware

Ensure `AuthenticatedRequest` type includes `userId`:

**File**: `backend/src/auth/middleware.ts`

```typescript
export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.accessToken || 
                req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const decoded = verifyAccessToken(token);
    req.userId = decoded.userId || decoded.id;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

## Error Handling Strategy

Pack creation should succeed even if Firebase storage fails:

```typescript
// Pattern: Local first, Firebase async
packs.set(pack.id, pack);

// Firebase storage is non-blocking
storePack(req.userId, pack.id, pack)
  .then(() => {
    console.log(`✓ Pack stored in Firebase`);
    // Optionally: notify user via WebSocket
  })
  .catch(err => {
    console.warn('Firebase storage failed, user data cached locally:', err);
    // Pack still available locally; will sync when Firebase is available
  });

// Return success immediately
return res.status(201).json({ id: pack.id, pack });
```

## Firestore Rules for Production

Update Firestore security rules to restrict access:

**File**: Firebase Console → Firestore → Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      
      match /packs/{packId} {
        allow read, write: if request.auth.uid == userId;
      }
    }
    
    // Tokens collection (backend-only)
    match /tokens/{document=**} {
      allow read, write: if false; // Clients shouldn't access directly
    }
    
    // Guest sessions (temporary)
    match /guestSessions/{sessionId} {
      allow read: if resource.data.isActive == true;
      allow write: if false; // Backend-only
    }
  }
}
```

## Verification Checklist

After implementing Firebase pack persistence:

- [ ] Auth routes call `storePack()` for all user creations
- [ ] Pack routes require authentication (`requireAuth` middleware)
- [ ] All `packs.set()` calls have corresponding Firebase storage
- [ ] Error handling allows app to continue if Firebase is unavailable
- [ ] Firestore shows user pack documents in console
- [ ] Packs can be retrieved from Firebase via `getUserPacksFromDb()`
- [ ] Tests verify packs appear in `users/{userId}/packs/` collection
- [ ] VST app can retrieve stored packs after authentication

## Testing Pack Persistence

### Unit Test Example

**File**: `backend/__tests__/firebase-packs.test.ts`

```typescript
import { storePack, getUserPacksFromDb } from '../src/firebase/store';
import { createId } from '../src/utils/id';

describe('Firebase Pack Storage', () => {
  test('storePack creates document in Firestore', async () => {
    const userId = createId();
    const packId = createId();
    const pack = {
      id: packId,
      mode: 'lyricist',
      submode: 'rapper',
      title: 'Test Pack',
      // ... full pack data
    };
    
    const success = await storePack(userId, packId, pack);
    expect(success).toBe(true);
    
    // Verify can retrieve
    const packs = await getUserPacksFromDb(userId);
    expect(packs).toContainEqual(expect.objectContaining({ id: packId }));
  });
  
  test('getUserPacksFromDb retrieves all user packs', async () => {
    const userId = createId();
    
    // Store multiple packs
    for (let i = 0; i < 3; i++) {
      await storePack(userId, createId(), {
        id: createId(),
        mode: 'lyricist',
        // ... pack data
      });
    }
    
    const packs = await getUserPacksFromDb(userId);
    expect(packs.length).toBe(3);
  });
});
```

### Manual Test Workflow

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Sign in as guest**:
   ```bash
   curl -X POST http://localhost:3001/api/auth/guest
   ```

3. **Create a pack**:
   ```bash
   curl -X POST http://localhost:3001/api/modes/lyricist/fuel-pack \
     -H "Cookie: accessToken=<token>" \
     -H "Content-Type: application/json" \
     -d '{"submode":"rapper","filters":{"timeframe":"fresh","tone":"funny","semantic":"tight"}}'
   ```

4. **Verify in Firebase**:
   - Open [Firebase Console](https://console.firebase.google.com/project/inspire-8c6e8/firestore/data)
   - Navigate to `users` → `{userId}` → `packs`
   - Confirm pack document appears with correct data

## Troubleshooting

### Issue: Packs created but not in Firebase

**Solution**:
1. Verify `requireAuth` middleware is applied
2. Check that `req.userId` is set in request handler
3. Look for Firebase errors in backend logs
4. Verify service account has Firestore write permissions

### Issue: "userId is undefined"

**Solution**:
1. Ensure `requireAuth` middleware is called before route handler
2. Verify token is being sent in request (Authorization header or cookie)
3. Check token is not expired
4. Verify JWT secret matches between token creation and verification

### Issue: Firebase returns "Permission denied"

**Solution**:
1. Check Firestore security rules (should allow service account)
2. Verify service account has `Cloud Datastore User` role
3. Ensure `FIREBASE_PROJECT_ID` matches console project

## Summary

After completing this integration:

✅ All user packs stored in Firebase
✅ Guest and authenticated users both supported
✅ Data persists across server restarts
✅ VST app can retrieve user's historical packs
✅ Collaborative features can access shared packs
✅ Analytics can track user creation patterns

## Next Steps

1. **Implement guest pack persistence** (currently only stores tokens/sessions)
2. **Add collaborative pack sharing** (shared collections)
3. **Implement pack versioning** (track pack revisions)
4. **Add user preferences storage** (theme, filters, etc.)
5. **Set up Firestore backups** (automated daily backups)

---

**Related Files**:
- [FIREBASE_SETUP_GUIDE.md](./FIREBASE_SETUP_GUIDE.md)
- [FIREBASE_INTEGRATION.md](./FIREBASE_INTEGRATION.md)
- `backend/src/firebase/store.ts`
- `backend/src/index.ts`

**Last Updated**: January 2025
**Status**: Ready for Implementation
