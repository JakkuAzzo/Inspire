#!/bin/bash

# InspireVST Build Script
# Builds InspireVST VST3 and AU plugins and installs them for DAWs/Logic
# Usage: ./inspirevst-build.sh [clean] [release|debug]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$SCRIPT_DIR/InspireVST"
BUILD_DIR="$PROJECT_DIR/build"
VST3_SOURCE="$BUILD_DIR/InspireVST_artefacts/Release/VST3/InspireVST.vst3"
AU_SOURCE="$BUILD_DIR/InspireVST_artefacts/Release/AU/InspireVST.component"
VST3_INSTALL_DIR="$HOME/Library/Audio/Plug-Ins/VST3"
AU_INSTALL_DIR="$HOME/Library/Audio/Plug-Ins/Components"
BUILD_TYPE="Release"

# Parse arguments
CLEAN=false
if [[ "$1" == "clean" ]]; then
  CLEAN=true
  shift
fi

if [[ "$1" == "debug" || "$1" == "Debug" ]]; then
  BUILD_TYPE="Debug"
  VST3_SOURCE="$BUILD_DIR/InspireVST_artefacts/Debug/VST3/InspireVST.vst3"
  AU_SOURCE="$BUILD_DIR/InspireVST_artefacts/Debug/AU/InspireVST.component"
fi

# Functions
print_header() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║ InspireVST VST3 Plugin Build Script                        ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
}

print_section() {
  echo ""
  echo -e "${YELLOW}▶ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# Main script
print_header

print_section "Configuration"
echo "Project Directory: $PROJECT_DIR"
echo "Build Directory: $BUILD_DIR"
echo "Build Type: $BUILD_TYPE"
echo "VST3 Install Directory: $VST3_INSTALL_DIR"
echo "AU Install Directory: $AU_INSTALL_DIR"

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
  print_error "InspireVST project directory not found at $PROJECT_DIR"
  exit 1
fi

# Clean build if requested
if [ "$CLEAN" = true ]; then
  print_section "Cleaning Previous Build"
  if [ -d "$BUILD_DIR" ]; then
    rm -rf "$BUILD_DIR"
    print_success "Removed build directory"
  else
    print_info "No previous build to clean"
  fi
fi

# Create build directory if it doesn't exist
if [ ! -d "$BUILD_DIR" ]; then
  mkdir -p "$BUILD_DIR"
  print_success "Created build directory"
fi

# Configure CMake
print_section "Configuring CMake"
cd "$BUILD_DIR"
if cmake -S "$PROJECT_DIR" -B "$BUILD_DIR" -DCMAKE_BUILD_TYPE="$BUILD_TYPE" > /dev/null 2>&1; then
  print_success "CMake configuration completed"
else
  print_error "CMake configuration failed"
  cmake -S "$PROJECT_DIR" -B "$BUILD_DIR" -DCMAKE_BUILD_TYPE="$BUILD_TYPE"
  exit 1
fi

# Build the project
print_section "Building InspireVST"
if cmake --build "$BUILD_DIR" --config "$BUILD_TYPE" 2>&1 | tee /tmp/build.log; then
  print_success "Build completed successfully"
else
  print_error "Build failed - see log above"
  exit 1
fi

# Verify plugin bundles were created
print_section "Verifying Build Output"
if [ ! -f "$VST3_SOURCE/Contents/MacOS/InspireVST" ]; then
  print_error "VST3 binary not found at expected location"
  echo "Expected: $VST3_SOURCE/Contents/MacOS/InspireVST"
  exit 1
fi
print_success "VST3 binary created"
if [ ! -f "$AU_SOURCE/Contents/MacOS/InspireVST" ]; then
  print_error "AU binary not found at expected location"
  echo "Expected: $AU_SOURCE/Contents/MacOS/InspireVST"
  exit 1
fi
print_success "AU component binary created"

# Create install directories if needed
print_section "Installing Plugin"
if [ ! -d "$VST3_INSTALL_DIR" ]; then
  mkdir -p "$VST3_INSTALL_DIR"
  print_success "Created plugin directory: $VST3_INSTALL_DIR"
fi
if [ ! -d "$AU_INSTALL_DIR" ]; then
  mkdir -p "$AU_INSTALL_DIR"
  print_success "Created plugin directory: $AU_INSTALL_DIR"
fi

# Remove old plugins if they exist
if [ -d "$VST3_INSTALL_DIR/InspireVST.vst3" ]; then
  rm -rf "$VST3_INSTALL_DIR/InspireVST.vst3"
  print_info "Removed previous installation"
fi
if [ -d "$AU_INSTALL_DIR/InspireVST.component" ]; then
  rm -rf "$AU_INSTALL_DIR/InspireVST.component"
  print_info "Removed previous AU installation"
fi

# Copy new plugins
if cp -r "$VST3_SOURCE" "$VST3_INSTALL_DIR/"; then
  print_success "VST3 installed to $VST3_INSTALL_DIR/InspireVST.vst3"
else
  print_error "Failed to copy VST3 plugin to installation directory"
  exit 1
fi

if cp -r "$AU_SOURCE" "$AU_INSTALL_DIR/"; then
  print_success "AU installed to $AU_INSTALL_DIR/InspireVST.component"
else
  print_error "Failed to copy AU plugin to installation directory"
  exit 1
fi

# Verify installation
print_section "Verifying Installation"
if [ -d "$VST3_INSTALL_DIR/InspireVST.vst3" ] && [ -d "$AU_INSTALL_DIR/InspireVST.component" ]; then
  VST3_BINARY_SIZE=$(ls -lh "$VST3_INSTALL_DIR/InspireVST.vst3/Contents/MacOS/InspireVST" | awk '{print $5}')
  AU_BINARY_SIZE=$(ls -lh "$AU_INSTALL_DIR/InspireVST.component/Contents/MacOS/InspireVST" | awk '{print $5}')
  print_success "InspireVST.vst3 is installed and ready"
  echo "Location: $VST3_INSTALL_DIR/InspireVST.vst3"
  echo "Binary Size: $VST3_BINARY_SIZE"
  print_success "InspireVST.component is installed and ready for Logic"
  echo "Location: $AU_INSTALL_DIR/InspireVST.component"
  echo "Binary Size: $AU_BINARY_SIZE"
else
  print_error "Installation verification failed"
  exit 1
fi

# Final summary
echo ""
print_header
echo -e "${GREEN}Build and Installation Complete!${NC}"
echo ""
echo "📍 Plugin Location:"
echo "   $VST3_INSTALL_DIR/InspireVST.vst3"
echo "   $AU_INSTALL_DIR/InspireVST.component"
echo ""
echo "🎵 Ableton Live:"
echo "   • Open Ableton Live"
echo "   • Create an audio track"
echo "   • In the Browser, look for InspireVST in Audio Effects"
echo "   • Drag to the track to load"
echo ""
echo "🎹 Logic Pro (Audio Unit):"
echo "   • Open Logic Pro"
echo "   • Insert Audio FX > Audio Units > InspireVST"
echo "   • If not visible, run Plugin Manager and rescan"
echo ""
echo "🔧 For Development:"
echo "   • Edit source files in: $PROJECT_DIR/Source/"
echo "   • Run ./inspirevst-build.sh to rebuild"
echo "   • Use './inspirevst-build.sh clean' to rebuild from scratch"
echo ""
echo "📚 Documentation:"
echo "   • See INSPIRE_VST_BUILD_REPORT.md for details"
echo ""

exit 0
