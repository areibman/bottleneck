#!/bin/bash

# Icon generation script with 80% shrink for macOS dock
# This script addresses the issue where Electron app icons appear too large
# in the macOS dock by creating icons that are 80% of their target size
# with transparent padding around them.

set -euo pipefail

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null; then
    echo "Error: ImageMagick is not installed. Install it with: brew install imagemagick"
    exit 1
fi

INPUT="1024.png"

if [ ! -f "$INPUT" ]; then
    echo "Error: $INPUT not found in current directory"
    exit 1
fi

echo "Creating rounded corner icons with 80% shrink (macOS dock padding) from $INPUT..."

# Function to create rounded corners with 80% shrink (padding for macOS dock)
# This addresses the issue where Electron app icons appear too large in the macOS dock
# by creating icons that are 80% of their target size with transparent padding
create_rounded() {
    local input="$1"
    local output="$2"
    local size="$3"
    local radius=$((size / 8))  # 12.5% radius for nice rounded corners
    
    # Calculate 80% of the target size for the actual icon content
    # This creates the visual effect of the icon being 80% of its original size
    local icon_size=$((size * 80 / 100))
    local padding=$((size - icon_size))
    
    # Step 1: Resize the input image to 80% of the target size
    # Step 2: Add transparent padding to center the icon within the full target size
    # Step 3: Apply rounded corners to the final result
    magick "$input" \
        -resize "${icon_size}x${icon_size}" \
        -background transparent \
        -gravity center \
        -extent "${size}x${size}" \
        \( +clone -alpha extract \
           -draw "fill black polygon 0,0 0,$radius $radius,0 fill white circle $radius,$radius $radius,0" \
           \( +clone -flip \) -compose Multiply -composite \
           \( +clone -flop \) -compose Multiply -composite \
        \) -alpha off -compose CopyOpacity -composite \
        "$output"
}

## macOS
echo "Generating macOS icons..."
rm -rf icon.iconset
mkdir -p icon.iconset

for i in 16 32 64 128 256 512 1024; do
  half=$((i / 2))
  echo "  Creating ${i}x${i}..."
  create_rounded "$INPUT" "icon.iconset/icon_${i}x${i}.png" "$i"
  
  if [[ $i -ne 16 ]]; then
    echo "  Creating ${half}x${half}@2x..."
    cp "icon.iconset/icon_${i}x${i}.png" "icon.iconset/icon_${half}x${half}@2x.png"
  fi
done

iconutil --convert icns -o icon.icns icon.iconset
echo "✓ Created icon.icns"

## Windows
echo "Generating Windows icon..."
# Create temporary rounded versions for Windows
mkdir -p temp_win
for i in 16 20 24 32 40 48 60 64 72 80 96 256; do
    create_rounded "$INPUT" "temp_win/${i}.png" "$i"
done

magick temp_win/*.png icon.ico
rm -rf temp_win
echo "✓ Created icon.ico"

## Linux
echo "Generating Linux icons..."
mkdir -p icons
for i in 16 22 24 32 36 48 64 72 96 128 192 256 512; do
  echo "  Creating ${i}x${i}..."
  create_rounded "$INPUT" "icons/${i}x${i}.png" "$i"
done
echo "✓ Created Linux icons in icons/ directory"

# Create a rounded version of the main icon
echo "Creating rounded 1024.png..."
create_rounded "$INPUT" "1024-rounded.png" 1024
echo "✓ Created 1024-rounded.png"

echo ""
echo "✅ All icons generated successfully with 80% shrink for macOS dock!"
echo ""
echo "Files created:"
echo "  - icon.icns (macOS with 80% shrink padding)"
echo "  - icon.ico (Windows)"
echo "  - icons/*.png (Linux)"
echo "  - 1024-rounded.png (source with rounded corners and 80% shrink)"
echo ""
echo "To use the rounded version as your app icon, run:"
echo "  mv 1024-rounded.png 1024.png"

