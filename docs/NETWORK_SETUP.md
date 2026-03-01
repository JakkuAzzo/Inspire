# Network Setup for Inspire VST Collaboration

## Overview
Inspire now supports collaboration over your local network (WiFi). Multiple users on the same network can run the VST and join the same rooms to collaborate in real-time.

## How It Works

### Automatic Network Detection
When you start the development server with `./run_dev.sh`, it will:
1. Detect your local IP address (e.g., `10.186.73.231`)
2. Write the server URL to `.vst-server-url` (e.g., `http://10.186.73.231:3001`)
3. The VST reads this file on startup and uses the network-accessible URL

### Server Configuration
- **Backend API**: Binds to `0.0.0.0:3001` (accessible from all network interfaces)
- **Frontend UI**: Binds to `your-local-ip:3000` (HTTPS with self-signed certificate)

## Using VST on the Same Network

### On the Host Machine (where the server runs)
1. Start the server: `./run_dev.sh`
2. Note the displayed IPs:
   ```
   Backend:   http://10.186.73.231:3001
   Frontend:  https://10.186.73.231:3000
   ```
3. Open the VST in your DAW - it will automatically connect to the server

### On Other Machines (same network)
1. Open the VST in your DAW
2. In the "Server URL" field, enter: `http://[host-ip]:3001`
   - Example: `http://10.186.73.231:3001`
3. Click Guest/Login to authenticate
4. Create or join a room with the same Room ID and Code

## Firewall Configuration

If other devices can't connect, you may need to allow incoming connections:

### macOS
```bash
# Allow Node.js to accept incoming connections
# (macOS will prompt the first time)
```

### Windows
```powershell
# Add firewall rule to allow Node.js
netsh advfirewall firewall add rule name="Inspire Backend" dir=in action=allow program="C:\Program Files\nodejs\node.exe" enable=yes
```

## Regenerating SSL Certificates

If you need to regenerate certificates with the current local IP:

```bash
rm -rf .certs/
./run_dev.sh
```

The script will create new certificates that include your local IP address.

## Troubleshooting

### "Connection Refused" Error
- Verify the server is running: `curl http://localhost:3001/api/health`
- Check firewall settings
- Ensure all devices are on the same network

### Certificate Warnings
The frontend uses a self-signed certificate for HTTPS. You'll need to:
1. Accept the certificate in your browser (one-time)
2. The VST uses HTTP (not HTTPS) so no certificate issues

### Finding Your Local IP
```bash
# macOS/Linux
ifconfig en0 | grep "inet " | awk '{print $2}'

# Windows
ipconfig | findstr IPv4
```

## Security Notes

⚠️ **Development Only**: This setup is for local network collaboration during development. For production:
- Use proper SSL certificates (not self-signed)
- Add authentication/authorization
- Consider using a reverse proxy (nginx/caddy)
- Implement rate limiting and security headers

## Quick Reference

| Service | Default Port | Protocol | Access |
|---------|-------------|----------|--------|
| Backend API | 3001 | HTTP | All network interfaces |
| Frontend UI | 3000 | HTTPS | All network interfaces |
| VST Plugin | - | HTTP client | Reads from `.vst-server-url` |

## Example Workflow

1. **Host** runs: `./run_dev.sh`
   - Server URL: `http://192.168.1.100:3001`
   
2. **Collaborator A** (on same WiFi):
   - Opens VST
   - Enters: `http://192.168.1.100:3001`
   - Clicks "Create Room"
   - Gets Room ID: `abc123`, Code: `secret123`
   
3. **Collaborator B** (on same WiFi):
   - Opens VST
   - Enters: `http://192.168.1.100:3001`
   - Clicks "Join Room"
   - Enters Room ID: `abc123`, Code: `secret123`
   
4. Both users are now in the same room and can:
   - See the four mode cards
   - Push/pull track changes
   - View room activity log

## Testing Network Connectivity

```bash
# From another machine on the network
curl http://[host-ip]:3001/api/health

# Expected response:
{"status":"healthy","timestamp":1706298123456}
```
