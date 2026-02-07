#!/bin/bash
# Firebase Setup Script for Inspire Backend

set -e

echo "🔥 Firebase Setup for Inspire"
echo "================================"
echo ""

# Check if service account file exists
SERVICE_ACCOUNT="firebase-service-account.json"

if [ -f "$SERVICE_ACCOUNT" ]; then
  echo "✓ Service account file found: $SERVICE_ACCOUNT"
else
  echo "⚠️  Service account file NOT found!"
  echo ""
  echo "To set up Firebase:"
  echo "1. Go to: https://console.firebase.google.com/project/inspire-8c6e8"
  echo "2. Navigate to: Project Settings → Service Accounts"
  echo "3. Click: Generate New Private Key"
  echo "4. Save the JSON file as: $SERVICE_ACCOUNT"
  echo "5. Run this script again"
  echo ""
  exit 1
fi

# Check .env file
if [ ! -f ".env" ]; then
  echo "Creating .env file..."
  cat > .env << 'EOF'
# Firebase Configuration
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
FIREBASE_PROJECT_ID=inspire-8c6e8

# Backend Configuration
PORT=3001
NODE_ENV=development
EOF
  echo "✓ Created .env file"
else
  echo "✓ .env file already exists"
fi

# Check if firebase-service-account.json is in .gitignore
if grep -q "firebase-service-account.json" .gitignore 2>/dev/null; then
  echo "✓ firebase-service-account.json is in .gitignore"
else
  echo "firebase-service-account.json" >> .gitignore
  echo "✓ Added firebase-service-account.json to .gitignore"
fi

echo ""
echo "✅ Firebase setup complete!"
echo ""
echo "Next steps:"
echo "1. Run: npm install"
echo "2. Run: npm run dev"
echo "3. Test authentication at: http://localhost:3000"
echo ""
echo "Check authentication:"
echo "- POST /api/auth/guest → Get guest session"
echo "- POST /api/auth/callback?vst_uri=... → Get token for VST"
echo ""
