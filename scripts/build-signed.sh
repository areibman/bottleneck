#!/bin/bash
# Build signed and notarized Bottleneck app

set -e

echo "🔨 Building signed & notarized Bottleneck..."
echo ""

# Load environment variables
export $(cat .env.local | grep -v "^#" | xargs)

# Build
npm run dist

echo ""
echo "✅ Build complete!"
echo ""
echo "Verify signature:"
echo "  codesign -dvvv release/mac-arm64/Bottleneck.app | head -15"
echo ""
echo "Verify notarization:"
echo "  spctl -a -vvv -t install release/mac-arm64/Bottleneck.app"
echo ""
echo "Your signed .dmg files are in:"
echo "  release/Bottleneck-0.1.6-arm64.dmg (Apple Silicon)"
echo "  release/Bottleneck-0.1.6.dmg (Intel)"
echo ""

