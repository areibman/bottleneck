#!/bin/bash

echo "🎬 Rendering Bottleneck Promotional Video..."
echo "This may take a few minutes..."

# Create output directory
mkdir -p out

# Render the video
npx remotion render src/index.ts BottleneckPromo out/bottleneck-promo.mp4

echo "✅ Video rendered successfully!"
echo "📁 Output: out/bottleneck-promo.mp4"
echo "📊 Duration: ~33 seconds"
echo "📺 Resolution: 1920x1080 @ 30fps"