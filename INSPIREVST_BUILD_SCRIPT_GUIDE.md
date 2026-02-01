# InspireVST Build Script Documentation

## Overview

The `inspirevst-build.sh` script automates the complete build and installation process for the InspireVST VST3 plugin on macOS.

**Features:**
- ✅ Automated CMake configuration
- ✅ Clean builds with optional cleanup
- ✅ Release and Debug build modes
- ✅ Automatic plugin installation to macOS VST3 directory
- ✅ Build verification
- ✅ Color-coded console output
- ✅ Comprehensive error handling

## Quick Start

### Basic Build
```bash
cd /Users/nathanbrown-bennett/TildeSec/Inspire/Inspire
./inspirevst-build.sh
```

### Clean Rebuild
```bash
./inspirevst-build.sh clean
```

### Debug Build
```bash
./inspirevst-build.sh debug
```

### Clean + Debug Build
```bash
./inspirevst-build.sh clean debug
```

## Script Usage

### Syntax
```
./inspirevst-build.sh [clean] [release|debug]
```

### Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `clean` | Remove previous build directory and start fresh | `false` |
| `release` / `debug` | Build configuration | `release` |

### Examples

```bash
# Default: Release build, reuse existing build files
./inspirevst-build.sh

# Clean Release build
./inspirevst-build.sh clean

# Debug build for development
./inspirevst-build.sh debug

# Full clean Debug build
./inspirevst-build.sh clean debug
```

## What the Script Does

### 1. Configuration Phase
- Validates project directory exists
- Confirms build and install paths
- Displays build type (Release/Debug)

### 2. Cleaning Phase (if `clean` flag)
- Removes previous build directory
- Clears cached CMake files
- Prepares for fresh compilation

### 3. Build Directory Setup
- Creates `InspireVST/build/` directory if needed
- Ensures proper directory structure

### 4. CMake Configuration
- Runs `cmake -S InspireVST -B InspireVST/build`
- Sets build type (Release or Debug)
- Configures JUCE framework

### 5. Compilation
- Compiles all source files:
  - `PluginProcessor.cpp`
  - `PluginEditor.cpp`
  - `NetworkClient.cpp`
  - JUCE framework modules
- Links VST3 binary
- Code-signs the plugin bundle

### 6. Build Verification
- Confirms VST3 binary exists
- Checks file integrity

### 7. Installation
- Creates `~/Library/Audio/Plug-Ins/VST3/` if needed
- Removes any previous installation
- Copies new plugin bundle
- Verifies installation success
- Displays binary size

## Output Directory Structure

```
~/Library/Audio/Plug-Ins/VST3/
└── InspireVST.vst3/
    ├── Contents/
    │   ├── MacOS/
    │   │   └── InspireVST (executable binary)
    │   ├── Info.plist
    │   ├── PkgInfo
    │   └── Resources/
    │       └── moduleinfo.json
    └── _CodeSignature/

InspireVST/build/
├── CMakeFiles/
├── InspireVST_artefacts/
│   ├── Release/
│   │   ├── VST3/InspireVST.vst3/ (source)
│   │   ├── libInspireVST_SharedCode.a
│   │   └── JuceLibraryCode/
│   └── Debug/
│       └── (Debug build artifacts)
└── (CMake cache files)
```

## Using in Ableton Live

After successful build and installation:

1. **Open Ableton Live 12+**
2. **Create an Audio Track**
3. **Browser Panel** → Audio Effects
4. **Search for**: InspireVST
5. **Drag to Track** to load the plugin

Or:

1. **Devices Panel** → Click "+" icon
2. **Browse** → Audio Effects
3. **Find InspireVST**
4. **Load** to the track

## Build Modes

### Release Build (Default)
```bash
./inspirevst-build.sh
```
- ✅ Optimized for performance
- ✅ Smaller binary size
- ✅ Production-ready
- ✅ No debugging symbols

### Debug Build
```bash
./inspirevst-build.sh debug
```
- ✅ Full debugging symbols
- ✅ Better error messages
- ✅ Slower performance
- ✅ Larger binary size

## Build Times

- **First build (with JUCE fetch)**: ~60-90 seconds
- **Incremental build**: ~10-15 seconds
- **Clean build**: ~60-90 seconds

## Troubleshooting

### "CMake configuration failed"
```bash
# Ensure CMake is installed
brew install cmake

# Try again
./inspirevst-build.sh clean
```

### "Build failed"
- Check the error message in the terminal
- Ensure Xcode Command Line Tools are installed:
  ```bash
  xcode-select --install
  ```
- Verify `/Users/nathanbrown-bennett/TildeSec/Inspire/Inspire/InspireVST` directory exists

### "Plugin not visible in Ableton"
- Run `./inspirevst-build.sh` to ensure latest version
- Restart Ableton Live
- Force Ableton to rescan plugins:
  - Preferences → Plugins (macOS 11+)
  - Click "Rescan"

### "Permission denied" when running script
```bash
chmod +x ./inspirevst-build.sh
./inspirevst-build.sh
```

## Development Workflow

### Typical Development Cycle

1. **Edit source code**
   ```bash
   # Edit files in InspireVST/Source/
   vim InspireVST/Source/PluginEditor.cpp
   ```

2. **Build and install**
   ```bash
   ./inspirevst-build.sh
   ```

3. **Test in Ableton**
   - Restart Ableton Live
   - Load InspireVST plugin
   - Test changes

4. **Repeat** from step 1

### Fast Iteration
For rapid development, use incremental builds:
```bash
./inspirevst-build.sh
# Builds only changed files, installs to Ableton
# Takes ~10-15 seconds
```

### Full Rebuild
For major changes or when issues occur:
```bash
./inspirevst-build.sh clean
# Complete rebuild from scratch
# Takes ~60-90 seconds
```

## Source File Locations

All source files are in `InspireVST/Source/`:

| File | Purpose |
|------|---------|
| `PluginProcessor.h/.cpp` | VST3 AudioProcessor (minimal audio engine) |
| `PluginEditor.h/.cpp` | UI with room join, file sync, download |
| `NetworkClient.h/.cpp` | Cloud Functions integration |
| `CMakeLists.txt` | Build configuration |

## Project Configuration

Edit `InspireVST/CMakeLists.txt` to modify:
- Plugin name
- Version number
- Manufacturer info
- Compiler flags
- Dependencies

## Environment Variables

The script uses standard macOS paths:
- **Build Dir**: `$PROJECT_DIR/build`
- **Install Dir**: `$HOME/Library/Audio/Plug-Ins/VST3`

No environment variables need to be set.

## CI/CD Integration

To use this script in automated builds:

```bash
#!/bin/bash
set -e

cd /path/to/Inspire
./inspirevst-build.sh clean

# Verify installation
if [ -f ~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3/Contents/MacOS/InspireVST ]; then
  echo "✅ Build successful"
  exit 0
else
  echo "❌ Build failed"
  exit 1
fi
```

## Script Output Legend

| Symbol | Meaning |
|--------|---------|
| 🔵 `▶` | Section header |
| ✅ | Success |
| ❌ | Error |
| ⚠️ | Warning (ℹ) |
| 📍 | Location |
| 🎵 | Ableton-related |
| 🔧 | Development-related |
| 📚 | Documentation |

## Advanced: Modifying the Script

### Change Installation Directory
Edit the `INSTALL_DIR` variable:
```bash
# Line ~20 in the script
INSTALL_DIR="/path/to/custom/vst3/folder"
```

### Custom Build Options
Add CMake flags:
```bash
# In "Configuring CMake" section
cmake -S "$PROJECT_DIR" -B "$BUILD_DIR" \
  -DCMAKE_BUILD_TYPE="$BUILD_TYPE" \
  -DCUSTOM_FLAG=value
```

## Support & Documentation

- **Build Report**: `INSPIRE_VST_BUILD_REPORT.md`
- **Project Structure**: See `InspireVST/` directory
- **Ableton MCP**: See `tools/ableton-copilot-mcp/`
- **Firebase Backend**: See `firebase-vst-backend/`

## Version History

**v1.0** (Jan 30, 2026)
- Initial release
- CMake integration
- Color-coded output
- Automatic installation
- Clean build support
- Release/Debug modes

---

**Last Updated**: January 30, 2026  
**Maintained by**: Nathan Brown-Bennett  
**Status**: ✅ Production Ready
