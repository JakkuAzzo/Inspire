# Quick Reference: Camera Access Fix

## The Issue
```
⚠️ Camera/microphone access requires HTTPS. 
   Use localhost with http://localhost:8080
```

## The Fix (30 seconds)

### Step 1: Check Your URL
Look at your browser's address bar. It should show:
```
http://localhost:8080   ✅ CORRECT
http://127.0.0.1:8080   ❌ WRONG
http://192.168.1.1:8080 ❌ WRONG
```

If you see 127.0.0.1 or an IP address, replace it with `localhost`:
```
http://localhost:8080
```

### Step 2: Grant Permissions
When the browser asks for camera/microphone:
1. Click **"Allow"** (not "Block")
2. If you already clicked "Block", click the lock 🔒 in the address bar and change to "Allow"
3. Refresh the page

### Step 3: Close Camera Conflicts
If you get "Camera already in use" error:
- Close Zoom, Teams, FaceTime, Discord, OBS
- Only one app can use the camera at a time

### Step 4: Refresh
```
Press: Ctrl+R (Windows) or Cmd+R (Mac)
```

## Why This Happens

Browsers only allow camera/microphone access from:
- ✅ **HTTPS** (secure websites)
- ✅ **localhost** (your local computer)
- ❌ ~~HTTP IP addresses~~ (security restriction)

When you access via 127.0.0.1 or 192.168.x.x, it's treated as a remote HTTP connection, which requires HTTPS.

## Start Dev Server Correctly

```bash
# This is already done by run_dev.sh
sh run_dev.sh

# You'll see:
# ➜  Local:   http://localhost:8080/
# ➜  Network: http://192.168.1.100:8080/
#
# Use the LOCAL url (localhost), not the NETWORK url (IP)
```

## Verify It's Working

1. Open browser DevTools (F12)
2. Go to Console tab
3. Copy and paste this:
   ```javascript
   console.log({
     hostname: window.location.hostname,
     isLocalhost: window.location.hostname === 'localhost',
     hasMediaDevices: !!navigator.mediaDevices,
     protocol: window.location.protocol
   })
   ```
4. Should show:
   ```javascript
   {
     hostname: "localhost",
     isLocalhost: true,
     hasMediaDevices: true,
     protocol: "http:"
   }
   ```

If `isLocalhost: false` or `hasMediaDevices: false`, then fix is needed.

## Common Solutions

| Problem | Solution |
|---------|----------|
| "Camera already in use" | Close other apps using camera |
| "Access denied" | Click lock icon, allow camera/mic |
| "No camera found" | Check hardware connected & working |
| Still shows error | Refresh page (Ctrl+R / Cmd+R) |
| Browser blocked it before | Clear site data or use incognito |

## Still Not Working?

See the full troubleshooting guide:
👉 **[CAMERA_TROUBLESHOOTING.md](./CAMERA_TROUBLESHOOTING.md)**

---

**TL;DR**: Use `http://localhost:8080` (not IP), grant permissions, close other camera apps, refresh. ✅
