# Camera/Microphone Testing Guide

## Setup Requirements

1. **Use localhost**: The app must be accessed via `http://localhost:5173` or `http://localhost:8080` (not 127.0.0.1)
   - `navigator.mediaDevices.getUserMedia()` requires either HTTPS or localhost

2. **Grant Permissions**: When prompted by your browser:
   - ✅ Allow camera access
   - ✅ Allow microphone access

3. **Physical Hardware**: 
   - Your machine must have a webcam/microphone connected
   - Or use a virtual camera like OBS Virtual Camera

## Running Tests with Camera Feeds

### Manual Testing (One User)

1. Start dev server:
   ```bash
   sh run_dev.sh
   ```

2. Open browser to `http://localhost:8080`

3. Click "Collaborate" peak → "Start Collaboration"

4. Accept camera/microphone permissions when prompted

5. You should see your camera feed in the video grid

### Automated Testing (Two Users with Cameras)

```bash
# Run the multi-user test with real camera feeds
npx playwright test collaboration-multiuser.spec.ts --headed

# Options:
# --headed          = Show browser windows during test
# --debug           = Step through the test interactively  
# --trace on        = Record trace files (DevTools Recorder format)
# --video=retain-on-failure = Record video only if test fails
```

## Playwright Context Permissions

The test is configured to grant camera/microphone permissions automatically:

```typescript
const context = await browser.newContext({
  permissions: ['camera', 'microphone'],
  recordVideo: { dir: 'test-artifacts/videos' } // Optional: record video
});
```

This means:
- ✅ Both browsers will automatically grant camera/mic access
- ✅ No permission dialogs will appear
- ✅ You can see actual camera feeds from both users

## Troubleshooting Camera Issues

### Issue: "Camera/microphone access not available"

**Solution 1**: Make sure you're using localhost
```
✅ Correct:  http://localhost:8080
❌ Wrong:    http://127.0.0.1:8080
❌ Wrong:    http://192.168.1.100:8080
```

**Solution 2**: Use HTTPS on non-localhost
- Deploy to HTTPS server, or
- Use ngrok to tunnel localhost to HTTPS

**Solution 3**: Check browser console
```javascript
// In browser DevTools console:
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => console.log('✅ Access granted'))
  .catch(err => console.error('❌ Error:', err))
```

### Issue: "No camera or microphone found"

- Verify hardware is connected and working
- Check system Settings → Privacy & Security → Camera/Microphone
- Try a virtual camera: [OBS Virtual Camera](https://obsproject.com/)

### Issue: "Camera already in use"

- Close other apps using the camera (Zoom, FaceTime, etc.)
- Or use a virtual camera that supports multiple access

## Expected Behavior

### Single User
1. Opens collaboration session
2. Browser prompts for camera/mic permissions
3. Allows permissions
4. See own video feed in 1x1 grid
5. See "MM:SS remaining" timer (guest sessions only)

### Two Users
1. User 1 creates session
2. User 2 joins same session
3. Both see:
   - Their own video (top-left, highlighted)
   - Other user's video (other tiles)
   - Shared DAW/notes
   - Session timer
4. Can toggle video/audio on/off
5. Session persists until timer expires (guests: 60 min)

## Video Grid Layouts

Based on participant count:

```
1 user:   ┌─────┐
          │  1  │
          └─────┘

2 users:  ┌─────┬─────┐
          │  1  │  2  │
          └─────┴─────┘

3 users:  ┌─────┬─────┐
          │  1  │  2  │
          ├─────┼─────┤
          │  3  │     │
          └─────┴─────┘

4 users:  ┌─────┬─────┐
          │  1  │  2  │
          ├─────┼─────┤
          │  3  │  4  │
          └─────┴─────┘
```

## Performance Tips

- Close unnecessary apps to free up CPU
- Use good lighting for better video quality
- Keep microphone away from fans/background noise
- On slow networks, video quality automatically degrades

## Next Steps

Once camera feeds are working:
1. ✅ Test with 2-4 simultaneous users
2. ✅ Verify audio/video toggling works
3. ✅ Test WebRTC connection stability
4. ✅ Run full collaboration test suite
5. ✅ Implement Socket.io real-time sync
