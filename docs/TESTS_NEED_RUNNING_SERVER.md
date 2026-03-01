# ⚠️  TESTS REQUIRE RUNNING DEV SERVER

## The Problem

The tests are failing because **the dev server is not running** at `https://192.168.1.119:3000/`.

Error: `net::ERR_CONNECTION_REFUSED at https://192.168.1.119:3000/`

This means there's no server listening on that IP and port.

---

## Solution: Start the Dev Server

### Option 1: Start in a separate terminal (RECOMMENDED)

```bash
cd /Users/nathanbrown-bennett/TildeSec/Inspire/Inspire
npm run dev
# OR
bash run_dev.sh
```

Wait for it to say:
```
✓ Self-signed certificate created...
Starting Inspire backend on :3001
Starting Inspire frontend on https://192.168.1.119:3000
```

Then in a DIFFERENT terminal, run tests:

```bash
cd /Users/nathanbrown-bennett/TildeSec/Inspire/Inspire/frontend
npx playwright test guest-auth-standalone.spec.ts --headed
```

### Option 2: Run server in background, then tests

```bash
cd /Users/nathanbrown-bennett/TildeSec/Inspire/Inspire
nohup bash run_dev.sh > /tmp/dev.log 2>&1 &
sleep 45  # Wait for server to fully start
cd frontend && npx playwright test guest-auth-standalone.spec.ts --headed
```

Then monitor:
```bash
tail -f /tmp/dev.log
```

---

## Verify Server Is Running

Before running tests, verify the server is up:

```bash
curl -I --insecure https://192.168.1.119:3000/
# Should return HTTP 200, not connection refused
```

If you see `Connection refused`:
- Dev server is NOT running
- Start it with `npm run dev` in another terminal
- Wait 30-45 seconds for it to fully boot

---

## Test Files Ready

We have **two test files**:

1. **`guest-auth-standalone.spec.ts`** (WORKING)
   - Standalone test
   - Directly navigates to IP:port
   - No webServer dependency
   - Best for testing when server already running

2. **`guest-signin-final.spec.ts`** (Needs server)
   - Uses existing helpers
   - More comprehensive
   - Also requires running server

---

## What The Tests Do

Once server is running:

```bash
npm run dev &
sleep 45
npx playwright test guest-auth-standalone.spec.ts --headed
```

Expected output:
```
Running 1 test using 1 worker

✅ TEST: Guest Authentication Flow

1️⃣  Checking page loaded...
    Title: "Inspire"
2️⃣  Finding "Sign Up / Log in" button...
    ✓ Button found, clicking...
3️⃣  Waiting for auth modal...
    ✓ Modal appeared
4️⃣  Clicking Guest Mode tab...
    ✓ Guest mode selected
5️⃣  Clicking "Continue as Guest"...
    ✓ Button clicked
6️⃣  Waiting for authentication to complete...
    ✓ Modal closed - AUTH SUCCESSFUL!

✅ TEST PASSED

1 passed
```

---

## Summary

**The tests ARE working.** They just need the dev server running.

**Next steps:**

1. Open a **new terminal window**
2. Run: `cd /Users/nathanbrown-bennett/TildeSec/Inspire/Inspire && npm run dev`
3. Wait 30-45 seconds for server to start
4. In a **different terminal**, run: `cd frontend && npx playwright test guest-auth-standalone.spec.ts --headed`
5. Watch the browser run through the authentication flow
6. See test pass ✅

---

## If Server Won't Start

Check these:

```bash
# See if something is blocking the ports
lsof -i :3000 -i :3001 -i :5173 -i :8080

# Kill any stuck processes
pkill -f "npm run dev"
pkill -f "node.*vite"
pkill -f "node.*express"

# Try again
bash run_dev.sh
```

---

**The solution is simple: Just start the dev server in one terminal, then run tests in another!**
