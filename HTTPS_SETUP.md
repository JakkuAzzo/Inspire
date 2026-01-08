# HTTPS Setup Guide

## Overview

The `run_dev.sh` script has been updated to automatically generate and use a self-signed HTTPS certificate. This enables browser camera/microphone access without needing to deploy to a live HTTPS server.

## How It Works

1. **Certificate Generation** (one-time)
   - On first run, `setup_https_certs()` creates a `.certs` directory
   - Generates a self-signed certificate valid for 365 days
   - Uses OpenSSL (built-in on macOS/Linux, available on Windows via WSL)

2. **HTTPS Server**
   - Frontend starts on `https://localhost:8080` instead of `http://0.0.0.0:8080`
   - Backend still runs on `http://localhost:3001` (can be upgraded separately if needed)
   - Vite passes cert/key files via `--https` flag

3. **Browser Certificate Warning**
   - You'll see a browser warning: "Your connection is not private"
   - This is normal for self-signed certificates
   - Click "Advanced" → "Proceed to localhost (unsafe)" to continue
   - Subsequent visits won't show the warning (browser remembers)

## Usage

```bash
sh run_dev.sh
```

The script will:
1. Generate certificate if needed (`.certs/cert.pem`, `.certs/key.pem`)
2. Kill any existing processes on ports 3001 and 8080
3. Start backend on `http://localhost:3001`
4. Start frontend on `https://localhost:8080`

Access the app at: **https://localhost:8080**

## Certificate Files

Generated in `.certs/`:
- `cert.pem` – Public certificate (safe to share)
- `key.pem` – Private key (never commit to repo)

The `.certs` directory is already in `.gitignore` to prevent accidental commits.

## Camera/Microphone Access

With HTTPS enabled:
- ✅ Camera/microphone access allowed
- ✅ Navigator.mediaDevices API available
- ✅ WebRTC video streams work
- ✅ Collaboration sessions can use real cameras

## Browser Certificate Trust (Optional)

To avoid the "Not private" warning on every visit:

### macOS
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain .certs/cert.pem
```

### Linux
```bash
sudo cp .certs/cert.pem /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

### Windows (WSL)
```bash
sudo cp .certs/cert.pem /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

## Troubleshooting

### Certificate generation fails
**Error**: "Error: Failed to generate certificate. Make sure OpenSSL is installed."

**Solution**:
```bash
# macOS
brew install openssl

# Ubuntu/Debian
sudo apt-get install openssl

# Windows (use WSL)
wsl sudo apt-get install openssl
```

### Port already in use
The script automatically kills processes on ports 3001 and 8080. If it fails:
```bash
# Kill manually
lsof -ti tcp:8080 | xargs kill -9
lsof -ti tcp:3001 | xargs kill -9
```

### Certificate not trusted
Clear browser cache and restart:
```bash
# Restart server
sh run_dev.sh

# Clear browser cache (Ctrl+Shift+Delete)
# Then reload page
```

### CORS or API errors
If the frontend can't reach the backend, verify:
- Backend is running on `http://localhost:3001`
- Frontend Vite proxy settings point to backend (check `vite.config.ts`)
- Both are in `.env` or hardcoded correctly

## Environment Variables

No changes needed. The script automatically:
- Sets `NODE_ENV=development` for backend
- Uses certificate files from `.certs/` directory
- Maintains existing Vite config

## Next Steps

After HTTPS is enabled:

1. **Test Camera Access**
   - Start a collaboration session
   - Verify camera feed displays without error
   - Check browser console for diagnostics (should show `isLocalhost: true`)

2. **Test Across Network**
   - You can now access from another device on the same network using `https://YOUR_IP:8080`
   - Browser will warn about certificate, but mediaDevices will still work

3. **Production Deployment**
   - For production, replace self-signed cert with real SSL certificate (Let's Encrypt, AWS ACM, etc.)
   - Update backend to serve HTTPS if needed
   - Consider environment-based configuration for cert paths

## Files Modified

- `run_dev.sh` – Added certificate generation and HTTPS startup
- `.gitignore` – Already ignores `.certs/` directory (if present)

## See Also

- [CAMERA_TROUBLESHOOTING.md](./CAMERA_TROUBLESHOOTING.md) – Camera access issues
- [CAMERA_QUICK_FIX.md](./CAMERA_QUICK_FIX.md) – 30-second camera fix
- [CAMERA_ERROR_FIX_SUMMARY.md](./CAMERA_ERROR_FIX_SUMMARY.md) – Error message improvements
