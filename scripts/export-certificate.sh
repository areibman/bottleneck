#!/bin/bash
# Helper script to export certificate for GitHub Actions

echo "🔐 Certificate Export Helper for GitHub Actions"
echo "================================================"
echo ""

echo "This script will help you export your Developer ID certificate"
echo "for use in GitHub Actions automated releases."
echo ""

# Check if certificate exists
CERT_NAME="Developer ID Application: Alex Reibman (KQHSQY486C)"

if ! security find-certificate -c "$CERT_NAME" &>/dev/null; then
  echo "❌ Certificate not found in Keychain"
  echo ""
  echo "Make sure you have installed your Developer ID certificate."
  echo "Run: ./scripts/check-signing-setup.sh to verify"
  exit 1
fi

echo "✅ Found certificate: $CERT_NAME"
echo ""

# Prompt for export password
echo "You need to set a password to protect the certificate file."
echo "This password will be used as MACOS_CERTIFICATE_PASSWORD in GitHub secrets."
echo ""
read -s -p "Enter export password: " EXPORT_PASSWORD
echo ""
read -s -p "Confirm password: " EXPORT_PASSWORD_CONFIRM
echo ""

if [ "$EXPORT_PASSWORD" != "$EXPORT_PASSWORD_CONFIRM" ]; then
  echo "❌ Passwords don't match"
  exit 1
fi

echo ""
echo "📦 Exporting certificate..."

# Create temp directory
TEMP_DIR=$(mktemp -d)
CERT_PATH="$TEMP_DIR/certificate.p12"
BASE64_PATH="$TEMP_DIR/certificate-base64.txt"

# Export certificate
# Note: This may prompt for your login keychain password
security export -k login.keychain-db -t identities -f pkcs12 -P "$EXPORT_PASSWORD" -o "$CERT_PATH" 2>/dev/null

if [ $? -ne 0 ]; then
  echo "❌ Failed to export certificate"
  echo ""
  echo "You may need to allow access in Keychain Access."
  echo "Try exporting manually:"
  echo "1. Open Keychain Access"
  echo "2. Select 'login' keychain"
  echo "3. Select 'My Certificates'"
  echo "4. Right-click '$CERT_NAME'"
  echo "5. Export and save as certificate.p12"
  rm -rf "$TEMP_DIR"
  exit 1
fi

echo "✅ Certificate exported"
echo ""

# Convert to base64
echo "🔄 Converting to base64..."
base64 -i "$CERT_PATH" > "$BASE64_PATH"

if [ $? -eq 0 ]; then
  echo "✅ Base64 encoding complete"
else
  echo "❌ Failed to encode"
  rm -rf "$TEMP_DIR"
  exit 1
fi

echo ""
echo "================================================"
echo "✅ Export Complete!"
echo "================================================"
echo ""
echo "Files created in: $TEMP_DIR"
echo ""
echo "📋 Next Steps - Add these to GitHub Secrets:"
echo ""
echo "1. Go to: https://github.com/areibman/bottleneck/settings/secrets/actions"
echo ""
echo "2. Add these secrets:"
echo ""
echo "   MACOS_CERTIFICATE:"
echo "   Copy the contents of: $BASE64_PATH"
echo ""
echo "   MACOS_CERTIFICATE_PASSWORD:"
echo "   The password you just entered"
echo ""
echo "   KEYCHAIN_PASSWORD:"
echo "   Any secure password (only used in CI, make up a strong one)"
echo ""
echo "   APPLE_ID:"
echo "   areibman@gmail.com"
echo ""
echo "   APPLE_APP_SPECIFIC_PASSWORD:"
echo "   (Same password from your .env.local file)"
echo ""
echo "   APPLE_TEAM_ID:"
echo "   KQHSQY486C"
echo ""
echo "3. After adding secrets, DELETE these files for security:"
echo "   rm -rf $TEMP_DIR"
echo ""
echo "📖 For full instructions, see your internal release process docs"
echo ""

# Open the temp directory in Finder
open "$TEMP_DIR"

