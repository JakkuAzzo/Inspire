# Ableton Live VST3 Plugin Troubleshooting

## Issue: InspireVST not appearing in Ableton Live

### Quick Fix

**1. Force Ableton to rescan VST3 plugins:**

```bash
# macOS - Remove Ableton's plugin cache
rm -rf ~/Library/Preferences/Ableton/*/Plugins.cfg
rm -rf ~/Library/Preferences/Ableton/*/PluginDatabase.cfg
```

**2. Restart Ableton Live**
- Quit Ableton completely (⌘Q)
- Reopen Ableton Live
- It will automatically rescan all plugins on startup

**3. Check VST3 is enabled in Ableton:**
- Open Ableton Live → Preferences (⌘,)
- Go to **Plug-Ins** tab
- Check "Use VST3 Plug-In System Folders" is **enabled**
- Check "Use VST3 Custom Folder" if you have custom locations
- Click "Rescan" button

**4. Verify plugin location:**
```bash
ls -la ~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3
```

Should show:
```
drwxr-xr-x@ 3 user  staff  96 Feb  2 16:54 InspireVST.vst3
```

### Where to Find InspireVST in Ableton

**Location in Browser:**
- Open Ableton Live
- Click **Browser** (left panel)
- Navigate to: **Plug-ins → Audio Effects → Inspire → InspireVST**
  - OR: **Plug-ins → VST3 → InspireVST**

**Drag to track:**
1. Create an **Audio** or **MIDI** track
2. Drag **InspireVST** from Browser to the track
3. VST UI should appear in the bottom panel

### Advanced Troubleshooting

#### VST3 not listed at all?

**Check if VST3 scanning is enabled:**
```bash
# Open Ableton preferences file
open ~/Library/Preferences/Ableton/Live*/Preferences.cfg
```

Look for:
```
-UseVst3="1"
```

If it's "0", change to "1" and restart Ableton.

#### Still not appearing?

**Verify VST3 bundle structure:**
```bash
# Should show moduleinfo.json
ls ~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3/Contents/Resources/

# Should show InspireVST binary
ls ~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3/Contents/MacOS/
```

**Check code signature (for Apple Silicon):**
```bash
codesign -dv ~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3
```

Should show:
```
Executable=/Users/.../InspireVST.vst3/Contents/MacOS/InspireVST
Identifier=com.Inspire.InspireVST
Format=bundle with Mach-O universal (x86_64 arm64)
```

**If signature is invalid, re-sign:**
```bash
codesign --force --deep --sign - ~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3
```

#### Manual Plugin Rescan

**From Ableton's Plugin Folder:**
1. Open Finder
2. Press ⌘⇧G (Go to Folder)
3. Enter: `~/Library/Audio/Plug-Ins/VST3/`
4. You should see `InspireVST.vst3`

**Rescan in Ableton:**
1. Ableton Live → Preferences → Plug-Ins
2. Click **Rescan** button
3. Wait for scan to complete (may take 1-2 minutes)
4. Close preferences
5. Check Browser → Plug-ins → Audio Effects

### Common Issues

#### Issue: "Plugin failed to load"
**Cause:** Missing dependencies or incompatible architecture

**Fix:**
```bash
# Check architecture
file ~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3/Contents/MacOS/InspireVST
```

Should show:
```
Mach-O universal binary with 2 architectures:
- x86_64
- arm64
```

If only one architecture, rebuild:
```bash
cd /Users/nathanbrown-bennett/TildeSec/Inspire/Inspire
./inspirevst-build.sh clean release
```

#### Issue: "InspireVST crashes Ableton"
**Cause:** Runtime error or initialization failure

**Fix:**
1. Check Ableton crash logs:
   ```bash
   open ~/Library/Logs/Ableton/
   ```

2. Check VST logs in Console:
   ```bash
   log show --predicate 'process == "Live"' --last 5m | grep -i inspire
   ```

3. Rebuild VST in Debug mode for detailed logs:
   ```bash
   ./inspirevst-build.sh clean debug
   ```

#### Issue: Plugin appears but has no UI
**Cause:** JUCE GUI not initializing

**Check in VST source:**
- `InspireVST/Source/PluginEditor.cpp` - Verify createEditor() returns valid editor
- `InspireVST/Source/PluginProcessor.cpp` - Check hasEditor() returns true

### Rebuild & Reinstall

**Clean rebuild:**
```bash
cd /Users/nathanbrown-bennett/TildeSec/Inspire/Inspire
./inspirevst-build.sh clean release
```

Output should show:
```
✅ Build completed successfully
✅ Plugin installed to /Users/.../Library/Audio/Plug-Ins/VST3/InspireVST.vst3
```

**Force Ableton rescan:**
```bash
# Remove cache
rm -rf ~/Library/Preferences/Ableton/*/Plugins.cfg
rm -rf ~/Library/Preferences/Ableton/*/PluginDatabase.cfg

# Restart Ableton
killall "Ableton Live 11 Suite"  # or your version
open -a "Ableton Live 11 Suite"
```

### Testing the VST

**1. In Ableton:**
- Create Audio track
- Add InspireVST from Browser
- Click "Sign in with Inspire" button
- Browser should open to https://10.154.75.2:3000

**2. Verify OAuth flow:**
- Sign in as Guest in browser
- Browser redirects to `inspirevst://auth?token=...`
- VST should show authenticated username

**3. Test pack generation:**
- Click "Generate Pack" in VST
- Should receive mode pack from backend
- Words/samples should populate VST UI

### Backend Server Must Be Running

InspireVST requires the backend server:

```bash
# Start server
cd /Users/nathanbrown-bennett/TildeSec/Inspire/Inspire
npm run dev
```

Wait for:
```
✓ Firebase Admin SDK initialized
🚀 Inspire API running on http://localhost:3001
```

### Helpful Commands

**Check if VST is installed:**
```bash
ls -lh ~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3/Contents/MacOS/InspireVST
```

**Check VST metadata:**
```bash
cat ~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3/Contents/Resources/moduleinfo.json
```

**Check Ableton's VST3 folders:**
```bash
defaults read com.ableton.live Vst3PluginFolders
```

**Monitor Ableton plugin loading:**
```bash
log stream --predicate 'process == "Live"' --info | grep -i vst
```

### Still Having Issues?

1. **Check build logs:**
   ```bash
   cat InspireVST/build/CMakeFiles/CMakeError.log
   ```

2. **Verify JUCE framework:**
   ```bash
   ls InspireVST/build/_deps/juce-src/modules/
   ```

3. **Test VST in different host:**
   - Try loading InspireVST in: Logic Pro, Reaper, or VST3PluginTestHost
   - If it works elsewhere, issue is Ableton-specific

4. **Rebuild with verbose logging:**
   ```bash
   cd InspireVST/build
   make VERBOSE=1
   ```

5. **Contact support:**
   - Ableton version: Check Help → About Ableton Live
   - macOS version: `sw_vers`
   - Architecture: `uname -m`
   - VST details: `file ~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3/Contents/MacOS/InspireVST`

---

## Success Checklist

- [ ] VST installed to `~/Library/Audio/Plug-Ins/VST3/`
- [ ] Ableton preferences enable VST3
- [ ] Ableton cache cleared and rescanned
- [ ] Backend server running on :3001
- [ ] Firebase initialized successfully
- [ ] InspireVST appears in Ableton Browser
- [ ] VST loads without errors
- [ ] OAuth flow completes (browser → VST)
- [ ] Pack generation works
