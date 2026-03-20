#!/bin/bash

# Multi-User VST Testing Setup Helper
# This script prepares the system for two-user VST testing between Ableton and Logic

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  InspireVST Multi-User Testing Setup                       ║${NC}"
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

# Get current user
CURRENT_USER=$(whoami)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

print_section "Configuration"
echo "Current User: $CURRENT_USER"
echo "Project Directory: $PROJECT_DIR"
echo "Script Directory: $SCRIPT_DIR"

# Verify plugins are built
print_section "Checking Plugin Installation"

VST3_PATH="$HOME/Library/Audio/Plug-Ins/VST3/InspireVST.vst3"
AU_PATH="$HOME/Library/Audio/Plug-Ins/Components/InspireVST.component"

if [ -d "$VST3_PATH" ]; then
  print_success "VST3 plugin found at $VST3_PATH"
else
  print_error "VST3 plugin not found. Run ./inspirevst-build.sh first"
  exit 1
fi

if [ -d "$AU_PATH" ]; then
  print_success "AU plugin found at $AU_PATH"
else
  print_error "AU plugin not found. Run ./inspirevst-build.sh first"
  exit 1
fi

# Check backend
print_section "Checking Backend"

if curl -s http://localhost:3001/dev/api/health > /dev/null 2>&1; then
  print_success "Backend is running on http://localhost:3001"
else
  print_error "Backend not running on port 3001"
  print_info "Start backend with: npm run dev"
  echo ""
  echo "To fix:"
  echo "  1. cd $PROJECT_DIR"
  echo "  2. npm run dev"
  echo "  3. Leave running in a separate terminal"
  echo "  4. Run this script again"
  exit 1
fi

# Generate test configuration
print_section "Generating Test Configuration"

TEST_CONFIG_FILE="$SCRIPT_DIR/MULTI_USER_TEST_SESSION.md"

cat > "$TEST_CONFIG_FILE" << 'EOF'
# Multi-User VST Test Session

Generated on: $(date)
Backend URL: http://localhost:3001
Main User: $CURRENT_USER
Secondary User: testuser2 (or your secondary account)

## Quick Start

### On Main Account ($CURRENT_USER):

1. Open Ableton Live
2. Add InspireVST to audio track
3. Select Role: **Master**
4. Enter Server: http://localhost:3001
5. Click **Create Room**
6. Note the **Room Code** displayed

### On Secondary Account (testuser2):

1. Switch user (Command+Q → Login → testuser2)
2. Open Logic Pro
3. Add InspireVST to audio track (Insert Audio FX → Audio Units)
4. Select Role: **Relay**
5. Enter Server: http://localhost:3001
6. Enter **Room Code** from Ableton
7. Click **Join Room**

## Test Matrix

- [ ] Relay connects to Master
- [ ] Master pack data visible on Relay
- [ ] Master pushes track state
- [ ] Relay pulls track state
- [ ] No conflicts when second Relay joins same track
- [ ] Error on attempt to join as second Master
- [ ] Timestamps and source attribution preserved

## Notes

- Backend must remain running on main account
- Use localhost (accessible from both accounts)
- Each DAW instance should connect to backend on port 3001

EOF

print_success "Test configuration created: $TEST_CONFIG_FILE"

# Display user account creation instructions
print_section "Setting Up Secondary User Account"

SECONDARY_USER=$(dscl /var/db/dslocal/nodes/Default -list /Users | grep -v "_" | grep -v "root" | grep -v "$CURRENT_USER" | head -1)

if [ -z "$SECONDARY_USER" ]; then
  print_info "No secondary user account found. To create one manually:"
  echo ""
  echo "  1. System Settings → General → Users & Groups"
  echo "  2. Click the lock icon to unlock"
  echo "  3. Click the + button to add a new user"
  echo "  4. Select 'User' account type"
  echo "  5. Configure:"
  echo "     - Full Name: Inspire Test User 2"
  echo "     - Account name: testuser2"
  echo "     - Password: (set a password)"
  echo "  6. Click 'Create User'"
  echo ""
  echo "  Then switch to that account and run:"
  echo "    cd $PROJECT_DIR"
  echo "    ./inspirevst-build.sh"
else
  print_success "Secondary user found: $SECONDARY_USER"
  echo "Plugin path on secondary account:"
  echo "  VST3: /Users/$SECONDARY_USER/Library/Audio/Plug-Ins/VST3/InspireVST.vst3"
  echo "  AU: /Users/$SECONDARY_USER/Library/Audio/Plug-Ins/Components/InspireVST.component"
fi

# Final instructions
print_section "Next Steps"

echo "1. Create or verify secondary user account (see above)"
echo ""
echo "2. On secondary account, install plugins:"
echo "   cd $PROJECT_DIR"
echo "   ./inspirevst-build.sh"
echo ""
echo "3. Keep backend running on this account ($CURRENT_USER):"
echo "   cd $PROJECT_DIR"
echo "   npm run dev"
echo ""
echo "4. On this account ($CURRENT_USER):"
echo "   - Open Ableton Live"
echo "   - Create room as Master"
echo "   - Note room code"
echo ""
echo "5. On secondary account:"
echo "   - Open Logic Pro"
echo "   - Join room as Relay"
echo "   - Use room code from step 4"
echo ""
echo "6. Test scenarios in: $SCRIPT_DIR/../docs/MULTI_USER_VST_TESTING.md"
echo ""

print_section "Verification"

print_success "Setup complete!"
echo ""
echo "Backend Status: ✓ Running"
echo "VST3 Plugin: ✓ Installed"
echo "AU Plugin: ✓ Installed"
echo "Documentation: ✓ Generated"
echo ""
echo "Ready for multi-user testing!"

exit 0
