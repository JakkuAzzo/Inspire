# Firebase Implementation Checklist

Complete guide to implementing and verifying Firebase integration in Inspire.

## Phase 1: Setup (Day 1)

### Get Credentials
- [ ] Navigate to [Firebase Console](https://console.firebase.google.com/project/inspire-8c6e8)
- [ ] Click Project Settings (⚙️ icon)
- [ ] Go to Service Accounts tab
- [ ] Click "Generate New Private Key"
- [ ] Save JSON file as `firebase-service-account.json` in project root
- [ ] Verify file is valid: `cat firebase-service-account.json | jq .`
- [ ] Verify file is in `.gitignore`: `grep firebase-service-account.json .gitignore`

### Configure Environment
- [ ] Create/update `backend/.env` with:
  ```env
  GOOGLE_APPLICATION_CREDENTIALS=../firebase-service-account.json
  FIREBASE_PROJECT_ID=inspire-8c6e8
  PORT=3001
  NODE_ENV=development
  ```
- [ ] Verify env file exists: `ls -la backend/.env`
- [ ] Test env loading: `npm run dev 2>&1 | grep "Firebase Admin SDK initialized"`

### Verify Installation
- [ ] Run `./verify-firebase.sh`
- [ ] All checks should show ✓
- [ ] Check for Firebase modules: `ls backend/src/firebase/`
- [ ] Verify auth routes have Firebase: `grep -c "storeAuthToken\|storeGuestSession" backend/src/auth/routes.ts`

### Start Dev Server
- [ ] Run `npm run dev`
- [ ] Look for: `✓ Firebase Admin SDK initialized`
- [ ] No errors about missing credentials
- [ ] Frontend available at http://localhost:3000
- [ ] Backend available at http://localhost:3001

## Phase 2: Basic Authentication Testing (Day 1-2)

### Test Guest Sign-In
- [ ] Open http://localhost:3000
- [ ] Click "Sign In" button
- [ ] Click "Continue as Guest"
- [ ] Guest handle appears (e.g., "SilentPhoenix42")
- [ ] Session cookies are set (check DevTools → Application → Cookies)
- [ ] Backend logs show guest session created

### Verify Guest in Firestore
- [ ] Open [Firebase Console - Firestore](https://console.firebase.google.com/project/inspire-8c6e8/firestore/data)
- [ ] Navigate to `guestSessions` collection
- [ ] New document exists with matching handle
- [ ] Document has fields: `id`, `handle`, `sessionToken`, `createdAt`, `isActive`
- [ ] `createdAt` timestamp is recent
- [ ] `isActive` is true

### Verify Token in Firestore
- [ ] In Firebase Console, click `tokens` collection
- [ ] New token document exists
- [ ] Document has fields: `userId`, `token`, `createdAt`, `expiresAt`, `isActive`
- [ ] `userId` matches guest session ID
- [ ] `expiresAt` is ~4 hours from now

### Test OTP Sign-Up
- [ ] Open http://localhost:3000
- [ ] Click "Sign In" → "Sign Up"
- [ ] Enter: email, password, display name
- [ ] Click "Send Verification Code"
- [ ] Check backend logs for OTP code (printed in dev mode)
- [ ] Enter OTP and verify

### Verify User in Firestore
- [ ] In Firebase Console, click `users` collection
- [ ] New user document exists
- [ ] Document has fields: `id`, `email`, `displayName`, `createdAt`
- [ ] `createdAt` timestamp is recent
- [ ] New token also appears in `tokens` collection for this user

### Test Sign-Out
- [ ] Click user account menu (top-left)
- [ ] Click "Sign Out"
- [ ] Session cookies cleared
- [ ] Back to unauthenticated state
- [ ] Verify token `isActive` changed to false (optional check in Firestore)

## Phase 3: VST OAuth Testing (Day 2-3)

### Simulate VST App Launch
- [ ] Open: `http://localhost:3000?vst_uri=inspirevst://auth`
- [ ] Frontend should detect `vst_uri` parameter
- [ ] Auth modal shows VST branding (optional)

### Test VST Guest Login
- [ ] With `?vst_uri=inspirevst://auth` open
- [ ] Click "Continue as Guest"
- [ ] Should redirect to `inspirevst://auth?token=<JWT>`
- [ ] Check browser dev console for redirect (or capture redirect in DevTools Network)
- [ ] Verify token format is valid JWT (has 3 parts separated by dots)

### Test VST OTP Login
- [ ] With `?vst_uri=inspirevst://auth` open
- [ ] Click "Sign Up" and complete OTP flow
- [ ] After verification, should redirect to `inspirevst://auth?token=<JWT>`
- [ ] Verify token is present in redirect URL

### Verify VST OAuth Token
- [ ] Copy token from redirect URL
- [ ] Decode token at [jwt.io](https://jwt.io)
- [ ] Verify payload contains: `userId`, `email` (if full account), `isGuest`, `iat`, `exp`
- [ ] Verify signature matches backend's JWT secret

## Phase 4: Pack Persistence Testing (Day 3-4)

### Test Pack Creation
- [ ] Sign in (guest or full account)
- [ ] Click "Generate Fuel Pack" in lyricist mode
- [ ] Select filters (timeframe, tone, semantic)
- [ ] Click "Generate"
- [ ] Pack displays with content

### Verify Pack in Firestore
- [ ] Open Firebase Console → Firestore
- [ ] Navigate to `users` → `{userId}` → `packs` collection
- [ ] New pack document exists
- [ ] Document has fields: `id`, `mode`, `submode`, `title`, `content`, `createdAt`
- [ ] Pack content matches what's displayed in frontend

### Test Multiple Packs
- [ ] Create 3 different packs in different modes
- [ ] Check Firestore shows all 3 in user's packs collection
- [ ] Verify each has unique ID
- [ ] Verify timestamps are sequential

### Test Pack Retrieval
- [ ] Refresh page
- [ ] Sign in again (with same account/session)
- [ ] Check if historical packs appear in queue/list (if implemented)
- [ ] Verify packs retrieved from Firebase match created packs

## Phase 5: Error Handling & Resilience (Day 4)

### Test Firebase Unavailability
- [ ] Stop Firebase Admin SDK initialization (temporarily break credentials)
- [ ] Try signing in
- [ ] App should still work with local storage fallback
- [ ] Check logs for: "Firebase not initialized, using local storage"
- [ ] Restore credentials

### Test Network Failure
- [ ] In network tab, block `googleapis.com` requests
- [ ] Try guest sign-in
- [ ] App should still create session locally
- [ ] Verify local fallback works
- [ ] Restore network access
- [ ] Verify Firebase eventually syncs when available

### Test Token Expiration
- [ ] Create guest session
- [ ] Wait for token to expire (or manually expire in Firestore)
- [ ] Try to use expired token
- [ ] App should request new token
- [ ] New token appears in Firestore

## Phase 6: Performance & Monitoring (Day 5)

### Monitor Firestore Reads/Writes
- [ ] Open Firebase Console → Firestore → Usage
- [ ] Create multiple packs
- [ ] Watch read/write count increase
- [ ] Verify counts match operations
- [ ] Check daily quota usage

### Check Firestore Rules
- [ ] Open Firebase Console → Firestore → Rules
- [ ] Review current rules (should be open for dev)
- [ ] Plan production rules (restrict by userId)

### Database Size
- [ ] Open Firebase Console → Firestore → Database
- [ ] Check collection sizes: tokens, guestSessions, users, packs
- [ ] Estimate growth over time

### Performance Check
- [ ] Create 10+ packs in sequence
- [ ] Measure response times (check Network tab)
- [ ] Verify no timeouts or errors
- [ ] Check backend logs for Firebase latency

## Phase 7: Documentation & Knowledge Transfer (Day 5-6)

### Create Documentation
- [ ] ✅ [FIREBASE_QUICKSTART.md](./FIREBASE_QUICKSTART.md) - Quick start guide
- [ ] ✅ [FIREBASE_SETUP_GUIDE.md](./FIREBASE_SETUP_GUIDE.md) - Detailed setup
- [ ] ✅ [FIREBASE_PACK_PERSISTENCE.md](./FIREBASE_PACK_PERSISTENCE.md) - Pack storage integration
- [ ] ✅ [FIREBASE_INTEGRATION_SUMMARY.md](./FIREBASE_INTEGRATION_SUMMARY.md) - Complete overview

### Create Runbooks
- [ ] [ ] Firebase Troubleshooting Guide (add to docs/)
- [ ] [ ] Data Recovery Procedures (add to docs/)
- [ ] [ ] Backup & Restore Guide (add to docs/)

### Update README
- [ ] [ ] Add Firebase setup section to README.md
- [ ] [ ] Link to FIREBASE_QUICKSTART.md
- [ ] [ ] Add Firebase architecture diagram

## Phase 8: Production Preparation (Day 6-7)

### Security Rules
- [ ] [ ] Design Firestore security rules (by userId)
- [ ] [ ] Implement rules in Firebase Console
- [ ] [ ] Test rules with unauthorized access (should fail)
- [ ] [ ] Test rules with authorized access (should succeed)

### Backups
- [ ] [ ] Enable Firestore backups (Firebase Console)
- [ ] [ ] Set backup frequency (daily recommended)
- [ ] [ ] Test restore procedure (on test project)

### Monitoring
- [ ] [ ] Set up Firestore alerts for quota usage
- [ ] [ ] Set up alerts for Firebase Auth failures
- [ ] [ ] Configure Cloud Logging integration

### Environment Secrets
- [ ] [ ] Store `firebase-service-account.json` in secure secret management (not git)
- [ ] [ ] For GitHub Actions: Store as repository secret
- [ ] [ ] For deployment: Use environment variables or secret manager

## Testing Checklist Summary

### Automated Tests
- [ ] Backend unit tests for Firebase store functions
- [ ] E2E tests for auth flows with Firestore verification
- [ ] Load tests for concurrent pack creation

### Manual Tests
- [ ] ✅ Guest sign-in flow
- [ ] ✅ OTP sign-up flow
- [ ] ✅ VST OAuth flow
- [ ] ✅ Pack creation and persistence
- [ ] ✅ Token expiration handling
- [ ] ✅ Firebase unavailability fallback

### Integration Tests
- [ ] ✅ Guest session stored and retrievable
- [ ] ✅ Token stored and valid
- [ ] ✅ User account created and persistent
- [ ] ✅ Packs saved and retrievable
- [ ] ✅ VST app receives token

## Success Criteria

All of the following must be true:

- [ ] Firebase Admin SDK initializes successfully on startup
- [ ] Guest sessions are created in Firestore `guestSessions` collection
- [ ] Auth tokens are stored in Firestore `tokens` collection
- [ ] User accounts are created in Firestore `users` collection
- [ ] Packs are stored in Firestore `users/{userId}/packs` collection
- [ ] VST OAuth callback returns token with `vst_uri` redirect
- [ ] App works with Firebase unavailable (local fallback)
- [ ] All errors are handled gracefully
- [ ] Documentation is complete and accurate
- [ ] Team can reproduce Firebase setup from documentation

## Post-Implementation

### Monitoring (Ongoing)
- [ ] Watch Firestore usage metrics daily
- [ ] Monitor Firebase Auth dashboard
- [ ] Review error logs weekly
- [ ] Track token creation/expiration patterns

### Maintenance (Weekly)
- [ ] Review Firestore rules
- [ ] Check backup status
- [ ] Verify all collections have appropriate indexes
- [ ] Clean up expired tokens/sessions if needed

### Improvements (As Needed)
- [ ] Optimize Firestore queries with indexes
- [ ] Implement caching layer for frequently accessed data
- [ ] Add Firestore aggregation for analytics
- [ ] Implement real-time sync for collaborative features

## Quick Reference

```bash
# Verify setup
./verify-firebase.sh

# Start dev server
npm run dev

# Check Firebase status
npm run dev 2>&1 | grep -i firebase

# Access Firebase Console
https://console.firebase.google.com/project/inspire-8c6e8/firestore

# Backend logs
npm run dev 2>&1 | tail -100
```

## Important Files

| File | Purpose |
|------|---------|
| `firebase-service-account.json` | Service account credentials (DO NOT COMMIT) |
| `backend/.env` | Environment configuration |
| `backend/src/firebase/admin.ts` | Firebase Admin SDK init |
| `backend/src/firebase/store.ts` | Firestore CRUD operations |
| `backend/src/auth/routes.ts` | Auth endpoints with Firebase |
| `backend/src/index.ts` | Server entry point (Firebase init) |
| `FIREBASE_QUICKSTART.md` | This quick start guide |

## Support & Resources

- [Firebase Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [Firebase Emulator](https://firebase.google.com/docs/emulator-suite)

---

**Project**: Inspire  
**Firebase Project**: inspire-8c6e8  
**Status**: Implementation in progress  
**Last Updated**: January 2025

## Status Tracking

Date | Phase | Status | Notes
-----|-------|--------|------
2025-01-15 | Setup | ✅ Complete | Firebase modules created, env configured
2025-01-15 | Auth Testing | ✅ Complete | Guest & OTP flows working
2025-01-15 | VST OAuth | ✅ Complete | Callback endpoint implemented
2025-01-15 | Pack Persistence | ⏳ In Progress | Functions exist, routes need integration
2025-01-15 | Error Handling | ✅ Complete | Graceful fallback implemented
TBD | Production | ⏳ Pending | Security rules, backups, monitoring

