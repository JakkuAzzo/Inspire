# Camera/Microphone Access Troubleshooting

## The Problem

You see: **"Camera/microphone access requires HTTPS. Use localhost with http://localhost:8080"**

This happens when:
1. You access the app via **IP address** (e.g., `http://192.168.1.100:8080` or `http://127.0.0.1:8080`)
2. You're not on **HTTPS** (localhost is an exception)
3. Your browser doesn't support mediaDevices

## The Solution

### ✅ Correct Way to Access

**Use `http://localhost:8080` NOT an IP address**

```bash
# ✅ GOOD - localhost allows camera access over HTTP
http://localhost:8080

# ❌ BAD - IP addresses require HTTPS
http://127.0.0.1:8080
http://192.168.1.100:8080
http://10.0.0.5:8080
```

### Why?

Browsers restrict camera/microphone access to:
- HTTPS connections (secure)
- **localhost** (trusted local domain)
- File:// protocol with explicit permission

## Steps to Fix

### Step 1: Start the Dev Server
```bash
sh run_dev.sh
```

Output will show:
```
Starting Inspire frontend on http://0.0.0.0:8080
  ➜  Local:   http://localhost:8080/
  ➜  Network: http://192.168.1.100:8080/
```

### Step 2: Use the Correct URL
**Copy this URL from the Local line:**
```
http://localhost:8080/
```

**NOT the Network line** (that requires HTTPS for camera access).

### Step 3: Check Your Browser Tab
- Look at your address bar
- Should show: `http://localhost:8080`
- NOT `http://127.0.0.1:8080` or any IP address

### Step 4: Grant Permissions
When prompted, click **"Allow"** for camera and microphone.

## Diagnosis: Check Browser Console

Open DevTools (F12) and look for console logs like:

**If mediaDevices is available:**
```javascript
{
  mediaDevices: true,
  protocol: "http:",
  hostname: "localhost",
  isLocalhost: true,
  isHTTPS: false
}
```

**If NOT available:**
```javascript
{
  mediaDevices: false,
  protocol: "http:",
  hostname: "127.0.0.1",  // ← WRONG
  isLocalhost: false,      // ← This is the problem!
  isHTTPS: false
}
```

## Common Mistakes

### ❌ Mistake 1: Using 127.0.0.1
```
http://127.0.0.1:8080  ← Won't work for camera
```

Fix: Use `http://localhost:8080` instead

### ❌ Mistake 2: Using Network IP
```
http://192.168.1.100:8080  ← Won't work for camera
```

Fix: Use `http://localhost:8080` instead

### ❌ Mistake 3: Denying Permissions
If you click "Deny" or "Block" on the permission dialog:
1. Right-click the address bar
2. Click the camera icon
3. Select "Always allow on this site"
4. Refresh the page

### ❌ Mistake 4: Camera Already in Use
```
Error: NotReadableError - Camera/microphone is already in use
```

Fix: Close other apps using your camera:
- Zoom
- Teams
- FaceTime
- Discord
- OBS (if recording)

## Browser-Specific Steps

### Chrome / Chromium
1. Navigate to `http://localhost:8080`
2. Click 🔒 lock icon in address bar
3. Find Camera/Microphone settings
4. Click "Allow" (or change from "Block" to "Allow")
5. Refresh the page

### Firefox
1. Navigate to `http://localhost:8080`
2. Click 🛡️ shield icon in address bar
3. Click "Information" button
4. Allow camera and microphone
5. Refresh the page

### Safari
1. Open `http://localhost:8080`
2. If prompted, click "Allow"
3. If already denied, go to Settings → Websites → Camera/Microphone
4. Find inspire.localhost or localhost
5. Change to "Allow"
6. Refresh the page

## Testing With Playwright

Tests automatically grant permissions, so they should work with:
```bash
npx playwright test collaboration-multiuser.spec.ts --headed
```

If tests fail with camera error, check:
1. Run with `--debug` flag
2. Check browser context permissions were granted
3. Look at Playwright logs for mediaDevices errors

## Quick Checklist

- [ ] Using `http://localhost:8080` (NOT IP address)
- [ ] Browser shows "localhost" in address bar (NOT 127.0.0.1)
- [ ] Allowed camera/microphone permissions
- [ ] No other apps using your camera
- [ ] Using a modern browser (Chrome, Firefox, Safari, Edge)
- [ ] Camera hardware is connected and working

## Still Not Working?

1. **Check DevTools Console** (F12)
   - Look for error messages with details
   - Note the error name (NotAllowedError, NotFoundError, etc.)

2. **Try a Different Browser**
   - Test in Chrome or Firefox
   - Confirms if it's a browser-specific issue

3. **Test Hardware**
   - Open system camera app
   - Make sure camera works outside the browser

4. **Check Network/Corporate Setup**
   - Some networks block mediaDevices
   - Try on a personal network or hotspot

5. **Still Stuck?**
   - Check browser console for full error message
   - Include that in any bug report
   - See CAMERA_TESTING_GUIDE.md for more details

## Related Documents

- [CAMERA_TESTING_GUIDE.md](./CAMERA_TESTING_GUIDE.md) - Full setup guide
- [COLLABORATION_VISUAL_GUIDE.md](./COLLABORATION_VISUAL_GUIDE.md) - Architecture & debugging
- [README.md](./README.md) - See 🎬 Collaboration section for overview
