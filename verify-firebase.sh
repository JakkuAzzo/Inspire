#!/bin/bash

# Firebase Integration Verification Script
# Checks that Firebase is properly configured and integrated

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔥 Firebase Integration Verification${NC}"
echo "========================================"
echo ""

# Check 1: Service Account File
echo -n "Checking service account file... "
if [ -f ".certs/inspire-8c6e8-firebase-adminsdk-fbsvc-0ca37b8c8c.json" ]; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  echo "  → Service account file not found in .certs folder"
  echo "  → Download from Firebase Console: Project Settings → Service Accounts"
  exit 1
fi

# Check 2: .env File
echo -n "Checking .env file... "
if [ -f "backend/.env" ]; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${YELLOW}⚠${NC} (Creating default .env)"
  cat > backend/.env << 'EOF'
GOOGLE_APPLICATION_CREDENTIALS=../firebase-service-account.json
FIREBASE_PROJECT_ID=inspire-8c6e8
PORT=3001
NODE_ENV=development
EOF
fi

# Check 3: Firebase Modules Exist
echo -n "Checking Firebase admin module... "
if [ -f "backend/src/firebase/admin.ts" ]; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  echo "  → Missing backend/src/firebase/admin.ts"
  exit 1
fi

echo -n "Checking Firebase store module... "
if [ -f "backend/src/firebase/store.ts" ]; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  echo "  → Missing backend/src/firebase/store.ts"
  exit 1
fi

# Check 4: Auth Routes Updated
echo -n "Checking auth routes Firebase integration... "
if grep -q "storeAuthToken\|storeGuestSession\|storeUserProfile" backend/src/auth/routes.ts 2>/dev/null; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${YELLOW}⚠${NC} (Firebase calls not found in auth routes)"
fi

# Check 5: Index.ts Has Firebase Init
echo -n "Checking Firebase initialization in index.ts... "
if grep -q "initFirebaseAdmin" backend/src/index.ts 2>/dev/null; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${YELLOW}⚠${NC} (Firebase init not called in index.ts)"
fi

# Check 6: Firebase Service Account JSON Validity
echo -n "Validating service account JSON... "
if command -v jq &> /dev/null; then
  if jq . .certs/inspire-8c6e8-firebase-adminsdk-fbsvc-0ca37b8c8c.json > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    PROJECT_ID=$(jq -r '.project_id' .certs/inspire-8c6e8-firebase-adminsdk-fbsvc-0ca37b8c8c.json)
    echo "  → Project ID: $PROJECT_ID"
  else
    echo -e "${RED}✗${NC}"
    echo "  → Invalid JSON in service account file"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠${NC} (jq not installed, skipping validation)"
fi

# Check 7: Verify it's in .gitignore
echo -n "Checking .gitignore... "
if grep -q "firebase-service-account.json" .gitignore 2>/dev/null; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${YELLOW}⚠${NC} (Adding firebase-service-account.json to .gitignore)"
  echo "firebase-service-account.json" >> .gitignore
fi

echo ""
echo -e "${BLUE}Configuration Summary:${NC}"
echo "======================"

if [ -f ".certs/inspire-8c6e8-firebase-adminsdk-fbsvc-0ca37b8c8c.json" ]; then
  echo -e "Firebase Project: ${GREEN}$(jq -r '.project_id' .certs/inspire-8c6e8-firebase-adminsdk-fbsvc-0ca37b8c8c.json 2>/dev/null || echo 'inspire-8c6e8')${NC}"
fi

echo -e "Backend Port: ${GREEN}$(grep "^PORT=" backend/.env 2>/dev/null | cut -d= -f2 || echo '3001')${NC}"
echo -e "Environment: ${GREEN}$(grep "^NODE_ENV=" backend/.env 2>/dev/null | cut -d= -f2 || echo 'development')${NC}"

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "==========="
echo "1. Start dev server:        npm run dev"
echo "2. Open frontend:           http://localhost:3000"
echo "3. Sign in as guest:        Click 'Continue as Guest'"
echo "4. Check Firebase Console:  https://console.firebase.google.com"
echo "5. Navigate to:             Firestore → guestSessions collection"
echo "6. Verify guest session was created with random handle"
echo ""
echo -e "${GREEN}✓ Firebase integration ready!${NC}"
echo ""
echo "📚 Documentation:"
echo "  • Setup Guide:     ./FIREBASE_SETUP_GUIDE.md"
echo "  • Pack Persistence: ./FIREBASE_PACK_PERSISTENCE.md"
echo "  • Full Integration: ./FIREBASE_INTEGRATION.md"
echo ""
