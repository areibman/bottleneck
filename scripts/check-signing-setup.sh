#!/bin/bash
# Check if code signing is properly set up

echo "🔍 Checking code signing setup..."
echo ""

# Check for certificate
echo "1️⃣ Checking for Developer ID certificate..."
if security find-certificate -c "Developer ID Application: Alex Reibman" &>/dev/null; then
  echo "   ✅ Found Developer ID certificate"
  security find-certificate -c "Developer ID Application: Alex Reibman" | grep "labl"
else
  echo "   ❌ No Developer ID certificate found"
fi

echo ""

# Check for environment variables
echo "2️⃣ Checking .env.local..."
if [ -f ".env.local" ]; then
  echo "   ✅ .env.local file exists"
  
  if grep -q "^APPLE_ID=areibman@gmail.com" .env.local; then
    echo "   ✅ APPLE_ID is set"
  else
    echo "   ❌ APPLE_ID not set correctly"
  fi
  
  if grep -q "^APPLE_APP_SPECIFIC_PASSWORD=" .env.local && ! grep -q "REPLACE-WITH-YOUR-PASSWORD" .env.local; then
    echo "   ✅ APPLE_APP_SPECIFIC_PASSWORD is set"
  else
    echo "   ⚠️  APPLE_APP_SPECIFIC_PASSWORD needs to be updated"
  fi
  
  if grep -q "^APPLE_TEAM_ID=KQHSQY486C" .env.local; then
    echo "   ✅ APPLE_TEAM_ID is set (KQHSQY486C)"
  else
    echo "   ❌ APPLE_TEAM_ID not set correctly"
  fi
else
  echo "   ❌ .env.local file not found"
fi

echo ""

# Check for required files
echo "3️⃣ Checking required files..."
if [ -f "build/entitlements.mac.plist" ]; then
  echo "   ✅ build/entitlements.mac.plist exists"
else
  echo "   ❌ build/entitlements.mac.plist not found"
fi

if [ -f "scripts/notarize.js" ]; then
  echo "   ✅ scripts/notarize.js exists"
else
  echo "   ❌ scripts/notarize.js not found"
fi

echo ""

# Check package.json
echo "4️⃣ Checking package.json configuration..."
if grep -q '"hardenedRuntime": true' package.json; then
  echo "   ✅ hardenedRuntime enabled"
else
  echo "   ❌ hardenedRuntime not enabled"
fi

if grep -q '"afterSign": "scripts/notarize.js"' package.json; then
  echo "   ✅ afterSign hook configured"
else
  echo "   ❌ afterSign hook not configured"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Ready to build with signing!"
echo ""
echo "Run: source .env.local && npm run dist"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

