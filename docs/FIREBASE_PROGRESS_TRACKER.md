# Firebase Setup Progress Tracker

Use this document to track your Firebase setup progress. Check off items as you complete them.

## Pre-Setup Checklist

- [ ] Read [FIREBASE_START_HERE.md](./FIREBASE_START_HERE.md) (2 min)
- [ ] Read [FIREBASE_QUICKSTART.md](./FIREBASE_QUICKSTART.md) (5 min)
- [ ] Have Firebase Console open: https://console.firebase.google.com/project/inspire-8c6e8
- [ ] Have terminal open in project root
- [ ] Have text editor ready for creating .env file

## Setup Phase (5 Minutes)

### Get Credentials
- [ ] Open [Firebase Console Service Accounts](https://console.firebase.google.com/project/inspire-8c6e8/settings/serviceaccounts)
- [ ] Click "Generate New Private Key"
- [ ] Save JSON file
- [ ] Move/rename to: `firebase-service-account.json` in project root
- [ ] Verify file: `ls -la firebase-service-account.json`
- [ ] Verify valid JSON: `cat firebase-service-account.json | jq .`

### Create Environment File
- [ ] Create `backend/.env` file
- [ ] Add: `GOOGLE_APPLICATION_CREDENTIALS=../firebase-service-account.json`
- [ ] Add: `FIREBASE_PROJECT_ID=inspire-8c6e8`
- [ ] Add: `PORT=3001`
- [ ] Add: `NODE_ENV=development`
- [ ] Verify file: `cat backend/.env`

### Verify Setup
- [ ] Run: `./verify-firebase.sh`
- [ ] All checks should show ✓
- [ ] Service account file: ✓
- [ ] .env file: ✓
- [ ] Firebase modules: ✓
- [ ] Service account JSON: ✓
- [ ] .gitignore updated: ✓

### Start Dev Server
- [ ] Run: `npm run dev`
- [ ] Wait for: `✓ Firebase Admin SDK initialized`
- [ ] Frontend available: http://localhost:3000
- [ ] Backend available: http://localhost:3001
- [ ] No Firebase errors in logs

## Basic Testing Phase (15 Minutes)

### Test Guest Sign-In
- [ ] Open: http://localhost:3000
- [ ] Click: "Sign In" button
- [ ] Click: "Continue as Guest"
- [ ] Guest handle appears (e.g., "SilentPhoenix42")
- [ ] Can see "Get Started" button
- [ ] Cookies set (check DevTools)

### Verify Guest in Firestore
- [ ] Open [Firebase Console Firestore](https://console.firebase.google.com/project/inspire-8c6e8/firestore/data)
- [ ] Click: `guestSessions` collection
- [ ] New document exists with your guest handle
- [ ] Document has fields:
  - [ ] `id` - UUID
  - [ ] `handle` - Your random handle
  - [ ] `sessionToken` - Token ID
  - [ ] `createdAt` - Current timestamp
  - [ ] `isActive` - true

### Verify Token in Firestore
- [ ] In Firebase Console, click: `tokens` collection
- [ ] New token document exists
- [ ] Document has fields:
  - [ ] `userId` - Matches guest ID
  - [ ] `token` - JWT token (has 3 dots)
  - [ ] `createdAt` - Current timestamp
  - [ ] `expiresAt` - ~4 hours from now
  - [ ] `isActive` - true

### Test Sign-Out
- [ ] Click: User account menu (top-left)
- [ ] Click: "Sign Out"
- [ ] Back to unauthenticated state
- [ ] Cookies cleared (check DevTools)

## OTP Sign-Up Testing (15 Minutes)

### Test OTP Sign-Up
- [ ] Click: "Sign In" → "Sign Up"
- [ ] Enter:
  - [ ] Email: test@example.com
  - [ ] Password: TestPass123
  - [ ] Display Name: Test User
- [ ] Click: "Send Verification Code"
- [ ] Check backend logs for OTP code
- [ ] Open: `http://localhost:3001/dev/api/mock-verify?email=test@example.com` (if available)
- [ ] Or check: Backend logs for: `OTP code:`

### Verify OTP
- [ ] Enter OTP code from logs
- [ ] Click: "Verify & Sign In"
- [ ] User profile appears
- [ ] Can see account menu with user email

### Verify User in Firestore
- [ ] Open [Firebase Firestore](https://console.firebase.google.com/project/inspire-8c6e8/firestore/data)
- [ ] Click: `users` collection
- [ ] New user document exists (matching email)
- [ ] Document has fields:
  - [ ] `id` - User UUID
  - [ ] `email` - test@example.com
  - [ ] `displayName` - Test User
  - [ ] `createdAt` - Current timestamp
  - [ ] `isGuest` - false

### Verify New Token
- [ ] In Firestore, click: `tokens` collection
- [ ] New token document exists
- [ ] `userId` matches the user ID
- [ ] `isActive` - true

## VST OAuth Testing (10 Minutes)

### Test VST Redirect
- [ ] Open: `http://localhost:3000?vst_uri=inspirevst://auth`
- [ ] Auth modal appears (with VST branding optional)
- [ ] Click: "Continue as Guest"
- [ ] Should redirect to: `inspirevst://auth?token=...`
- [ ] Check DevTools Network for redirect
- [ ] Token should be JWT (3 parts with dots)

### Decode Token
- [ ] Copy token from redirect URL
- [ ] Go to: https://jwt.io
- [ ] Paste token in left panel
- [ ] Verify payload contains:
  - [ ] `userId` - The user ID
  - [ ] `isGuest` - true (for guest) or false (for full account)
  - [ ] `iat` - Token issued time (now)
  - [ ] `exp` - Token expiration time (1 hour from now)

## Error Resilience Testing (Optional, 10 Minutes)

### Test Firebase Unavailability
- [ ] Temporarily rename: `firebase-service-account.json` to `.bak`
- [ ] Restart dev server: `npm run dev`
- [ ] Should log: `Firebase not initialized, using local storage fallback`
- [ ] Try guest sign-in
- [ ] Should still work (with local storage)
- [ ] Restore: `firebase-service-account.json`
- [ ] Restart server

### Test Network Failure
- [ ] In DevTools Network tab, enable "Offline" mode
- [ ] Try guest sign-in
- [ ] Should still create session locally
- [ ] Turn off offline mode
- [ ] Firebase should eventually sync

## Advanced Testing (Optional, 30+ Minutes)

### Performance Testing
- [ ] Create 10 guest sessions in sequence
- [ ] Check response times in Network tab
- [ ] Should be < 500ms per request
- [ ] No timeouts or 5xx errors

### Data Integrity Testing
- [ ] Create guest session
- [ ] Check Firestore document
- [ ] Refresh page
- [ ] Sign in again (same session)
- [ ] Verify same guest handle persists

### Scale Testing
- [ ] Create 100+ packs (if implemented)
- [ ] Check Firestore collection size
- [ ] Monitor read/write usage
- [ ] Verify no query timeouts

## Documentation Review

- [ ] Read: [FIREBASE_INTEGRATION_SUMMARY.md](./FIREBASE_INTEGRATION_SUMMARY.md) (15 min)
- [ ] Understand: All auth flows
- [ ] Review: Firestore collection structure
- [ ] Plan: Next integration steps

## Pack Persistence Integration (Optional, 1-2 hours)

If integrating pack storage with Firebase:

- [ ] Read: [FIREBASE_PACK_PERSISTENCE.md](./FIREBASE_PACK_PERSISTENCE.md)
- [ ] Identify: All pack creation routes in `backend/src/index.ts`
- [ ] Add: `requireAuth` middleware to routes
- [ ] Add: Firebase store import
- [ ] Add: `storePack()` calls after `packs.set()`
- [ ] Test: Pack creation stores to Firestore
- [ ] Verify: Packs appear in `users/{userId}/packs/` collection
- [ ] Test: Pack retrieval from Firebase

## Production Preparation (Optional, 2-4 hours)

When ready for production:

- [ ] Set: Firestore security rules (restrictive, by userId)
- [ ] Enable: Firestore backups (Firebase Console)
- [ ] Set: Backup frequency (daily)
- [ ] Enable: Firestore audit logging
- [ ] Set: Alerts for quota usage
- [ ] Store: Service account securely (not in git)
- [ ] Use: Environment variables or secret manager

## Final Verification Checklist

- [ ] ✅ Firebase Admin SDK initializes
- [ ] ✅ Guest sessions stored in Firestore
- [ ] ✅ Auth tokens stored in Firestore
- [ ] ✅ User accounts stored in Firestore
- [ ] ✅ VST OAuth callback works
- [ ] ✅ Guest sign-in tested and works
- [ ] ✅ OTP sign-up tested and works
- [ ] ✅ All data visible in Firestore Console
- [ ] ✅ Documentation understood
- [ ] ✅ No errors in backend logs
- [ ] ✅ Error handling works (graceful fallback)

## Status Summary

**Setup Phase**: ⬜⬜⬜⬜⬜
- Complete this first

**Basic Testing**: ⬜⬜⬜⬜⬜
- Verify guest sign-in works

**OTP Testing**: ⬜⬜⬜⬜⬜
- Verify user accounts work

**VST Testing**: ⬜⬜⬜⬜⬜
- Verify app-to-app auth works

**Advanced** (Optional): ⬜⬜⬜⬜⬜
- Only if needed

## Common Issues & Solutions

| Issue | Solution | Time |
|-------|----------|------|
| "Admin SDK failed" | Check service account file exists | 2 min |
| "Permission denied" | Update Firestore rules | 5 min |
| "No collections appear" | Check backend logs, verify Firebase init | 5 min |
| "Token not valid" | Check JWT signature, verify secret | 5 min |
| "Guest session expired" | Increase TTL, see code comments | 5 min |

## Time Estimates

| Phase | Time | Required |
|-------|------|----------|
| Pre-Setup | 5 min | ✅ Yes |
| Setup | 5 min | ✅ Yes |
| Basic Testing | 15 min | ✅ Yes |
| OTP Testing | 15 min | ✅ Yes |
| VST Testing | 10 min | ✅ Yes |
| **Total Required** | **50 min** | **✅ Yes** |
| Error Resilience | 10 min | ⏳ Optional |
| Advanced Testing | 30+ min | ⏳ Optional |
| Pack Integration | 1-2 hours | ⏳ Optional |
| Production Setup | 2-4 hours | ⏳ Optional |

## Success Criteria

You're done when:
- ✅ All "Required" checks are complete
- ✅ Firebase Admin SDK initializes successfully
- ✅ Guest sessions appear in Firestore
- ✅ All auth flows work correctly
- ✅ VST OAuth redirect works
- ✅ No errors in logs

## Next Steps After Completion

1. ✅ Firebase setup complete!
2. ⏳ Extend pack routes to use Firebase (FIREBASE_PACK_PERSISTENCE.md)
3. ⏳ Implement Firestore security rules for production
4. ⏳ Enable backups and monitoring
5. ⏳ Add analytics and real-time features

## Support

- **Quick question**: FIREBASE_QUICKSTART.md
- **Setup issue**: FIREBASE_SETUP_GUIDE.md Troubleshooting
- **Need details**: FIREBASE_INTEGRATION_SUMMARY.md
- **Need index**: FIREBASE_DOCS_INDEX.md

---

**Last Updated**: January 2025  
**Firebase Project**: inspire-8c6e8  
**Total Docs**: 10 files  
**Total Time to Complete**: ~50 minutes (all required phases)
