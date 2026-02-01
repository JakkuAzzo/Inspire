#!/bin/bash

# InspireVST Build Script
# Builds the InspireVST VST3 plugin and installs it to /Library/Audio/Plug-Ins/VST3
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
PLUGIN_SOURCE="$BUILD_DIR/InspireVST_artefacts/Release/VST3/InspireVST.vst3"
INSTALL_DIR="$HOME/Library/Audio/Plug-Ins/VST3"
BUILD_TYPE="Release"

# Parse arguments
CLEAN=false
if [[ "$1" == "clean" ]]; then
  CLEAN=true
  shift
fi

if [[ "$1" == "debug" || "$1" == "Debug" ]]; then
  BUILD_TYPE="Debug"
  PLUGIN_SOURCE="$BUILD_DIR/InspireVST_artefacts/Debug/VST3/InspireVST.vst3"
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
echo "Install Directory: $INSTALL_DIR"

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

# Verify VST3 bundle was created
print_section "Verifying Build Output"
if [ ! -f "$PLUGIN_SOURCE/Contents/MacOS/InspireVST" ]; then
  print_error "VST3 binary not found at expected location"
  echo "Expected: $PLUGIN_SOURCE/Contents/MacOS/InspireVST"
  exit 1
fi
print_success "VST3 binary created"

# Create install directory if needed
print_section "Installing Plugin"
if [ ! -d "$INSTALL_DIR" ]; then
  mkdir -p "$INSTALL_DIR"
  print_success "Created plugin directory: $INSTALL_DIR"
fi

# Remove old plugin if it exists
if [ -d "$INSTALL_DIR/InspireVST.vst3" ]; then
  rm -rf "$INSTALL_DIR/InspireVST.vst3"
  print_info "Removed previous installation"
fi

# Copy new plugin
if cp -r "$PLUGIN_SOURCE" "$INSTALL_DIR/"; then
  print_success "Plugin installed to $INSTALL_DIR/InspireVST.vst3"
else
  print_error "Failed to copy plugin to installation directory"
  exit 1
fi

# Verify installation
print_section "Verifying Installation"
if [ -d "$INSTALL_DIR/InspireVST.vst3" ]; then
  BINARY_SIZE=$(ls -lh "$INSTALL_DIR/InspireVST.vst3/Contents/MacOS/InspireVST" | awk '{print $5}')
  print_success "InspireVST.vst3 is installed and ready"
  echo "Location: $INSTALL_DIR/InspireVST.vst3"
  echo "Binary Size: $BINARY_SIZE"
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
echo "   $INSTALL_DIR/InspireVST.vst3"
echo ""
echo "🎵 Ableton Live:"
echo "   • Open Ableton Live"
echo "   • Create an audio track"
echo "   • In the Browser, look for InspireVST in Audio Effects"
echo "   • Drag to the track to load"
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
