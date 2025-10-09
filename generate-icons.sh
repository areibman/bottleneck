#!/bin/bash

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

echo "Creating rounded corner icons from $INPUT..."

# Function to create rounded corners with 80% shrink for Electron dock icon
create_rounded() {
    local input="$1"
    local output="$2"
    local size="$3"
    
    # Calculate 80% of the target size for the actual icon content
    local content_size=$(awk "BEGIN {print int($size * 0.8)}")
    local radius=$((content_size / 8))  # 12.5% radius for nice rounded corners
    
    # Calculate offset to center the 80% sized content
    local offset=$(awk "BEGIN {print int(($size - $content_size) / 2)}")
    
    # Create the icon at 80% size with rounded corners, then composite onto full-size transparent canvas
    magick "$input" \
        -resize "${content_size}x${content_size}" \
        \( +clone -alpha extract \
           -draw "fill black polygon 0,0 0,$radius $radius,0 fill white circle $radius,$radius $radius,0" \
           \( +clone -flip \) -compose Multiply -composite \
           \( +clone -flop \) -compose Multiply -composite \
        \) -alpha off -compose CopyOpacity -composite \
        -background none -gravity center -extent "${size}x${size}" \
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
echo "✅ All icons generated successfully!"
echo ""
echo "Files created:"
echo "  - icon.icns (macOS)"
echo "  - icon.ico (Windows)"
echo "  - icons/*.png (Linux)"
echo "  - 1024-rounded.png (source with rounded corners)"
echo ""
echo "To use the rounded version as your app icon, run:"
echo "  mv 1024-rounded.png 1024.png"

