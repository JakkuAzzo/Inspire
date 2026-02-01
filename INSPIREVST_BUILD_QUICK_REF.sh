#!/bin/bash
# InspireVST Build Script - Quick Reference

# =============================================================================
# USAGE
# =============================================================================

# Default build (Release mode, incremental)
./inspirevst-build.sh

# Clean rebuild (removes old build, starts fresh)
./inspirevst-build.sh clean

# Debug build (with debugging symbols)
./inspirevst-build.sh debug

# Clean debug rebuild
./inspirevst-build.sh clean debug

# =============================================================================
# WHAT HAPPENS
# =============================================================================

# 1. CMake configure (sets up build system)
# 2. Compile all source files (PluginProcessor, PluginEditor, NetworkClient)
# 3. Build JUCE framework modules
# 4. Link VST3 plugin bundle
# 5. Code-sign the plugin
# 6. Install to ~/Library/Audio/Plug-Ins/VST3/
# 7. Verify installation

# =============================================================================
# OUTPUT
# =============================================================================

# On success:
# ✅ Build completed successfully
# ✅ VST3 binary created
# ✅ Plugin installed to ~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3
# ✅ InspireVST.vst3 is installed and ready

# Installation location:
# ~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3

# =============================================================================
# USING IN ABLETON LIVE
# =============================================================================

# 1. Open Ableton Live 12+
# 2. Create an Audio Track
# 3. Browser Panel → Audio Effects
# 4. Search: "InspireVST"
# 5. Drag to track to load

# =============================================================================
# DEVELOPMENT WORKFLOW
# =============================================================================

# Edit source code:
# - InspireVST/Source/PluginProcessor.cpp  (audio processing)
# - InspireVST/Source/PluginEditor.cpp     (UI: room join, file sync)
# - InspireVST/Source/NetworkClient.cpp    (Firebase Cloud Functions)

# Build after changes:
./inspirevst-build.sh

# Restart Ableton Live to reload the plugin

# =============================================================================
# BUILD TIMES
# =============================================================================

# First build (downloads JUCE):   ~60-90 seconds
# Incremental build (changes):    ~10-15 seconds
# Clean rebuild:                   ~60-90 seconds

# =============================================================================
# TROUBLESHOOTING
# =============================================================================

# If "Permission denied":
chmod +x ./inspirevst-build.sh

# If CMake not found:
brew install cmake

# If Xcode tools missing:
xcode-select --install

# If plugin not visible in Ableton:
# 1. Run: ./inspirevst-build.sh
# 2. Restart Ableton Live
# 3. Preferences → Plugins → Rescan

# =============================================================================
# FILE LOCATIONS
# =============================================================================

# Build output:
# InspireVST/build/InspireVST_artefacts/Release/VST3/InspireVST.vst3

# Installed plugin:
# ~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3

# Source code:
# InspireVST/Source/

# =============================================================================
# DOCUMENTATION
# =============================================================================

# Detailed guide: INSPIREVST_BUILD_SCRIPT_GUIDE.md
# Build report: INSPIRE_VST_BUILD_REPORT.md
# Script file: inspirevst-build.sh

# =============================================================================
