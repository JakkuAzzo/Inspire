# Firebase Quick Start - 5 Minute Setup

Get Firebase working in Inspire in just 5 minutes.

## Step 1: Get Service Account (2 min)

1. Open [Firebase Console - inspire-8c6e8](https://console.firebase.google.com/project/inspire-8c6e8)
2. Click ⚙️ **Project Settings** (top-left corner)
3. Click **Service Accounts** tab
4. Click **Generate New Private Key** button
5. A JSON file downloads

**Save to project root**:
```bash
# Save the downloaded JSON file as:
~/TildeSec/Inspire/Inspire/firebase-service-account.json
```

## Step 2: Create Environment File (1 min)

Create `backend/.env`:

```bash
cat > backend/.env << 'EOF'
GOOGLE_APPLICATION_CREDENTIALS=../firebase-service-account.json
FIREBASE_PROJECT_ID=inspire-8c6e8
PORT=3001
NODE_ENV=development
EOF
```

## Step 3: Verify Setup (1 min)

```bash
./verify-firebase.sh
```

You should see:
```
✓ Service account file
✓ .env file
✓ Firebase admin module
✓ Firebase store module
✓ Firebase initialization
```

## Step 4: Start Dev Server (1 min)

```bash
npm run dev
```

Look for in terminal:
```
✓ Firebase Admin SDK initialized
```

## Step 5: Test It (0 min - automatic)

Open http://localhost:3000:
1. Click **Sign In**
2. Click **Continue as Guest**
3. You should see a random handle (e.g., "SilentPhoenix42")

**Check Firebase Console**:
1. Open https://console.firebase.google.com/project/inspire-8c6e8/firestore/data
2. Click **guestSessions** collection
3. You should see your guest session!

## That's It! 🎉

Your Firebase integration is working. Your data flows:

```
App → Backend → Firebase Firestore
       ↓
    Auth Tokens    stored in: tokens/{token}
    Guest Sessions stored in: guestSessions/{id}
    User Profiles   stored in: users/{userId}
    Fuel Packs      stored in: users/{userId}/packs/{packId}
```

## Common Commands

```bash
# Start dev server
npm run dev

# Run verification
./verify-firebase.sh

# Run setup script
./setup-firebase.sh

# Check Firebase status
npm run dev 2>&1 | grep -i firebase
```

## What's Stored Where

| Data | Firestore Collection | When |
|------|----------------------|------|
| Auth Token | `tokens/{token}` | After any login |
| Guest Session | `guestSessions/{id}` | When guest signs in |
| User Account | `users/{userId}` | After OTP verification |
| Fuel Pack | `users/{userId}/packs/{id}` | When pack created |

## Troubleshooting

### "Firebase initialization failed"
```bash
# Check file exists
ls -la firebase-service-account.json

# Check it's valid JSON
cat firebase-service-account.json | jq .

# Check env vars
grep GOOGLE_APPLICATION_CREDENTIALS backend/.env
```

### "Permission denied"
1. Go to Firestore → Rules
2. Replace all rules with:
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

### "Still not working?"

Check logs:
```bash
npm run dev 2>&1 | tail -50
```

Look for lines starting with:
- `✓ Firebase` (good)
- `Firebase Admin SDK initialization` (status)
- `Error:` or `Failed:` (problems)

## Next Steps

Read the full guides:
- [FIREBASE_SETUP_GUIDE.md](./FIREBASE_SETUP_GUIDE.md) - Complete setup guide
- [FIREBASE_PACK_PERSISTENCE.md](./FIREBASE_PACK_PERSISTENCE.md) - Pack storage integration
- [FIREBASE_INTEGRATION_SUMMARY.md](./FIREBASE_INTEGRATION_SUMMARY.md) - Complete overview

---

**Time to complete**: ~5 minutes  
**Status**: Ready to test  
**Firebase Project**: inspire-8c6e8
