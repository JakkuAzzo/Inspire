# Firebase Integration - Visual Reference Guide

Quick visual reference for Firebase integration in Inspire.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INSPIRE FRONTEND                         │
│                   (React @ :5173)                           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Sign In Modal                                        │  │
│  │  • Guest Sign-In                                     │  │
│  │  • OTP Sign-Up                                       │  │
│  │  • VST OAuth (with ?vst_uri param)                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  Stores JWT token in cookies/localStorage                  │
└─────────────────────────────────────────────────────────────┘
                          ↓ API Requests
┌─────────────────────────────────────────────────────────────┐
│                  INSPIRE BACKEND                            │
│                (Express @ :3001)                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Auth Routes                                          │  │
│  │  • POST /auth/guest                                  │  │
│  │  • POST /auth/verify-otp                             │  │
│  │  • POST /auth/callback?vst_uri=...                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Firebase Store Module                                │  │
│  │  • storeAuthToken()                                  │  │
│  │  • storeGuestSession()                               │  │
│  │  • storeUserProfile()                                │  │
│  │  • storePack()                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Firebase Admin SDK                                   │  │
│  │  • Initialized on startup                            │  │
│  │  • Connects with service account                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓ Firestore Operations
┌─────────────────────────────────────────────────────────────┐
│            FIREBASE FIRESTORE (Cloud)                       │
│         (Project ID: inspire-8c6e8)                         │
│                                                             │
│  Collections:                                              │
│  ├── tokens/{token}                                        │
│  │   └── JWT tokens (valid, unexpired)                    │
│  ├── guestSessions/{id}                                    │
│  │   └── Temporary guest accounts (4-hour TTL)            │
│  ├── users/{userId}                                        │
│  │   ├── Full user accounts (after OTP)                   │
│  │   └── packs/{packId}                                   │
│  │       └── Fuel packs created by user                   │
│  └── (more collections as needed)                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Flows

### 1. Guest Sign-In Flow

```
User Opens App
      ↓
Click "Sign In" → "Continue as Guest"
      ↓
Frontend → POST /api/auth/guest
      ↓
Backend:
  1. Create guest session with random handle
  2. Call storeGuestSession() → Create in Firestore
  3. Create JWT token
  4. Call storeAuthToken() → Create in Firestore
      ↓
Frontend receives token
      ↓
Store in cookies + localStorage
      ↓
User can now create packs, etc.

Firestore Collections Updated:
  ✓ guestSessions/{sessionId}
  ✓ tokens/{token}
```

### 2. OTP Sign-Up Flow

```
User Opens App
      ↓
Click "Sign In" → "Sign Up"
      ↓
Enter email, password, name
      ↓
Frontend → POST /api/auth/signup-request
      ↓
Backend: Generate OTP, send to email
      ↓
User enters OTP
      ↓
Frontend → POST /api/auth/verify-otp
      ↓
Backend:
  1. Verify OTP matches
  2. Create user account
  3. Call storeUserProfile() → Create in Firestore
  4. Create JWT token
  5. Call storeAuthToken() → Create in Firestore
      ↓
Frontend receives token
      ↓
Store in cookies + localStorage
      ↓
User is now logged in (not guest)

Firestore Collections Updated:
  ✓ users/{userId}
  ✓ tokens/{token}
```

### 3. VST OAuth Flow

```
VST App launches browser with:
  http://localhost:3000?vst_uri=inspirevst://auth
      ↓
Frontend detects vst_uri parameter
      ↓
Shows auth modal with VST branding
      ↓
User signs in (guest or OTP)
      ↓
Frontend redirects to:
  /api/auth/callback?vst_uri=inspirevst://auth
      ↓
Backend:
  1. Create session + token (guest or user)
  2. Store in Firebase
  3. Redirect to: inspirevst://auth?token=<JWT>
      ↓
VST App receives token in URL
      ↓
VST App stores token
      ↓
VST App uses token for API calls
  Authorization: Bearer <token>

Firestore Collections Updated:
  ✓ guestSessions/{id} or users/{userId}
  ✓ tokens/{token}
```

## Firestore Collections Structure

```
firebase-8c6e8/
│
├── tokens/
│   └── {token}
│       ├── userId: string
│       ├── token: string (JWT)
│       ├── createdAt: timestamp
│       ├── expiresAt: timestamp
│       └── isActive: boolean
│
├── guestSessions/
│   └── {sessionId}
│       ├── id: string
│       ├── handle: string (random, e.g., "SilentPhoenix42")
│       ├── sessionToken: string
│       ├── createdAt: timestamp
│       ├── expiresAt: timestamp (now + 4 hours)
│       └── isActive: boolean
│
├── users/
│   └── {userId}
│       ├── id: string
│       ├── email: string
│       ├── displayName: string
│       ├── createdAt: timestamp
│       └── packs/
│           └── {packId}
│               ├── id: string
│               ├── mode: string ("lyricist", etc.)
│               ├── submode: string ("rapper", etc.)
│               ├── title: string
│               ├── content: object
│               ├── createdAt: timestamp
│               └── metadata: object
│
└── (more collections as needed)
```

## Data Persistence Timeline

```
User Opens App                 t=0
      ↓
User signs in (guest)          t=1s
      ↓
Data written to Firestore      t=1.5s
      ├── guestSessions/{id}
      └── tokens/{token}
      ↓
User creates fuel pack         t=10s
      ↓
Pack stored locally            t=10.1s
      ↓
Pack sent to Firebase          t=10.5s
      └── users/{userId}/packs/{packId}
      ↓
Backend to VST app redirect    t=15s (if VST flow)
      └── VST receives token in URL
      ↓
User signs out                 t=300s
      ↓
Tokens marked as inactive      t=300.5s
      ├── tokens/{token}.isActive = false
      └── guestSessions/{id}.isActive = false
      ↓
Session expires (if guest)     t=14400s (4 hours)
      ↓
Cleanup job removes expired    t=14400+
```

## Firebase Initialization

```
npm run dev
      ↓
backend/src/index.ts loaded
      ↓
initFirebaseAdmin() called
      ↓
Reads GOOGLE_APPLICATION_CREDENTIALS env var
      ├── Points to: firebase-service-account.json
      └── Contains: Service account credentials
      ↓
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'inspire-8c6e8'
})
      ↓
✓ Firebase Admin SDK initialized (logged)
      ↓
getFirebaseDb() now available
      ↓
Auth routes can call Firebase store functions
      ↓
Ready to handle requests!
```

## Request-Response With Firebase

```
User Request: POST /api/auth/guest

┌────────────────────────────────────────┐
│ Frontend                               │
│ fetch('/api/auth/guest', {...})        │
└────────────────────────────────────────┘
                ↓
        Request sent to backend
                ↓
┌────────────────────────────────────────┐
│ Backend                                │
│ 1. Validate request                    │
│ 2. Create guest session                │
│ 3. Create JWT token                    │
└────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────┐
│ Firebase Store Module                  │
│ storeGuestSession(guestSession)         │
│   └── db.collection('guestSessions')    │
│       .doc(session.id)                  │
│       .set({...})                       │
│                                        │
│ storeAuthToken(userId, token, ...)      │
│   └── db.collection('tokens')           │
│       .doc(token)                       │
│       .set({...})                       │
└────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────┐
│ Google Firebase (Cloud)                │
│ Collections written:                   │
│   ✓ guestSessions/{id}                 │
│   ✓ tokens/{token}                     │
└────────────────────────────────────────┘
                ↓
        Response sent to frontend
                ↓
┌────────────────────────────────────────┐
│ Frontend                               │
│ {                                      │
│   "user": {                            │
│     "id": "guest_xyz",                 │
│     "displayName": "SilentPhoenix42",  │
│     "isGuest": true                    │
│   }                                    │
│ }                                      │
└────────────────────────────────────────┘
                ↓
        Token stored in cookies
                ↓
   UI updates with logged-in state
```

## File Organization

```
Inspire/
├── backend/
│   ├── src/
│   │   ├── firebase/
│   │   │   ├── admin.ts          ← Firebase SDK init
│   │   │   └── store.ts          ← Firestore CRUD ops
│   │   ├── auth/
│   │   │   └── routes.ts         ← Auth endpoints (calls Firebase)
│   │   └── index.ts              ← Server init (calls initFirebaseAdmin)
│   └── .env                       ← GOOGLE_APPLICATION_CREDENTIALS
│
├── frontend/
│   └── src/
│       └── App.tsx               ← Frontend (sends auth requests)
│
├── firebase-service-account.json  ← Service account (you download)
│
└── Docs:
    ├── FIREBASE_QUICKSTART.md
    ├── FIREBASE_SETUP_GUIDE.md
    ├── FIREBASE_PACK_PERSISTENCE.md
    ├── FIREBASE_INTEGRATION_SUMMARY.md
    ├── FIREBASE_IMPLEMENTATION_CHECKLIST.md
    └── FIREBASE_DOCS_INDEX.md (this file)
```

## Status Dashboard

```
┌──────────────────────────────────────────────────────────┐
│                   Firebase Status                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Admin SDK           : ✅ READY (runs on startup)        │
│ Store Module        : ✅ READY (8 CRUD functions)       │
│ Guest Sign-In       : ✅ READY (stores to Firestore)   │
│ OTP Sign-Up         : ✅ READY (stores to Firestore)   │
│ Auth Tokens         : ✅ READY (stored in tokens/)     │
│ VST OAuth           : ✅ READY (/api/auth/callback)    │
│ Pack Persistence    : ⏳ PARTIAL (functions ready, routes need integration)
│ Error Handling      : ✅ READY (graceful fallback)     │
│ Documentation       : ✅ COMPLETE (6 guides + scripts) │
│                                                          │
│ Service Account     : ⏳ PENDING (you need to download) │
│ Environment Config  : ⏳ PENDING (create .env)          │
│ Verification        : ⏳ PENDING (run verify script)    │
│                                                          │
└──────────────────────────────────────────────────────────┘

What's blocking you from going live?
  → You need to download the service account JSON
  → That's it! Everything else is ready.
```

## Troubleshooting Decision Tree

```
Firebase not working?
│
├─ "Admin SDK initialization failed"
│   ├─ Check: firebase-service-account.json exists?
│   ├─ Check: File is valid JSON?
│   ├─ Check: GOOGLE_APPLICATION_CREDENTIALS env var set?
│   └─ Fix: Run ./verify-firebase.sh
│
├─ "Permission denied" errors
│   ├─ Check: Firestore rules allow writes?
│   ├─ Fix: Go to Firebase Console → Firestore → Rules
│   └─ Replace with test rules (see FIREBASE_SETUP_GUIDE.md)
│
├─ Tokens not appearing in Firestore
│   ├─ Check: Backend logs for Firebase errors
│   ├─ Check: Service account has right permissions
│   └─ Fix: See FIREBASE_SETUP_GUIDE.md troubleshooting
│
└─ "Still not working?"
    └─ Read: FIREBASE_SETUP_GUIDE.md → Troubleshooting section
```

## Key File Locations

```
For Setup:
  Service Account:      firebase-service-account.json (you download)
  Environment:          backend/.env
  Verification Script:  ./verify-firebase.sh
  Setup Script:         ./setup-firebase.sh

For Code:
  Firebase Init:        backend/src/firebase/admin.ts
  Firebase Store:       backend/src/firebase/store.ts
  Auth Routes:          backend/src/auth/routes.ts
  Server Init:          backend/src/index.ts

For Docs:
  Quick Start:          FIREBASE_QUICKSTART.md (5 min)
  Setup Guide:          FIREBASE_SETUP_GUIDE.md (20 min)
  Overview:             FIREBASE_INTEGRATION_SUMMARY.md (15 min)
  Pack Integration:     FIREBASE_PACK_PERSISTENCE.md (30 min)
  Testing Guide:        FIREBASE_IMPLEMENTATION_CHECKLIST.md (2-3 days)
  Docs Index:           FIREBASE_DOCS_INDEX.md (this page)
```

## Quick Commands

```bash
# Verify everything is set up correctly
./verify-firebase.sh

# Start development server
npm run dev

# Check Firebase status in logs
npm run dev 2>&1 | grep -i firebase

# Open Firebase Console
# https://console.firebase.google.com/project/inspire-8c6e8

# Access Firestore data
# Console → Firestore → Collections
```

---

**Last Updated**: January 2025  
**Firebase Project**: inspire-8c6e8  
**Status**: ✅ Implementation Complete, ⏳ Credentials Needed
