#!/bin/bash

set -euo pipefail

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null; then
    echo "Error: ImageMagick is not installed. Install it with: brew install imagemagick"
    exit 1
fi

# Content shrink percentage inside each icon canvas (standard for macOS: 80)
SHRINK_PERCENT="${SHRINK_PERCENT:-80}"

INPUT="1024.png"

if [ ! -f "$INPUT" ]; then
    echo "Error: $INPUT not found in current directory"
    exit 1
fi

echo "Creating rounded corner icons from $INPUT..."
echo "macOS icons will be shrunk to ${SHRINK_PERCENT}% of canvas; Windows/Linux remain 100%."

# Function to create rounded corners
create_rounded() {
    local input="$1"
    local output="$2"
    local size="$3"
    local shrink_percent="${4:-$SHRINK_PERCENT}"
    local inner_size=$(( size * shrink_percent / 100 ))
    local radius=$((inner_size * 18 / 100))  # 18% radius based on content size, not canvas
    
    # First, resize the input and apply rounded corners to it
    magick -size "${inner_size}x${inner_size}" xc:none \
        -fill white \
        -draw "roundrectangle 0,0 $((inner_size-1)),$((inner_size-1)) $radius,$radius" \
        /tmp/rounded_mask_${size}.png
    
    # Resize input
    magick "$input" \
        -resize "${inner_size}x${inner_size}" \
        /tmp/resized_${size}.png
    
    # Apply rounded mask
    magick /tmp/resized_${size}.png /tmp/rounded_mask_${size}.png \
        -compose DstIn -composite \
        /tmp/rounded_${size}.png
    
    # Center on final canvas
    magick /tmp/rounded_${size}.png \
        -gravity center \
        -background none \
        -extent "${size}x${size}" \
        "$output"
    
    # Clean up temporary files
    rm -f /tmp/rounded_mask_${size}.png /tmp/resized_${size}.png /tmp/rounded_${size}.png
}

## macOS
echo "Generating macOS icons..."
rm -rf icon.iconset
mkdir -p icon.iconset

for i in 16 32 64 128 256 512 1024; do
  half=$((i / 2))
  echo "  Creating ${i}x${i}..."
  create_rounded "$INPUT" "icon.iconset/icon_${i}x${i}.png" "$i" "$SHRINK_PERCENT"
  
  if [[ $i -ne 16 ]]; then
    echo "  Creating ${half}x${half}@2x..."
    cp "icon.iconset/icon_${i}x${i}.png" "icon.iconset/icon_${half}x${half}@2x.png"
  fi
done

iconutil --convert icns -o icon.icns icon.iconset
rm -rf icon.iconset
echo "✓ Created icon.icns"

## Windows
echo "Generating Windows icon..."
# Create temporary rounded versions for Windows
mkdir -p temp_win
for i in 16 20 24 32 40 48 60 64 72 80 96 256; do
    create_rounded "$INPUT" "temp_win/${i}.png" "$i" 100
done

magick temp_win/*.png icon.ico
rm -rf temp_win
echo "✓ Created icon.ico"

## Linux
echo "Generating Linux icons..."
mkdir -p icons
for i in 16 22 24 32 36 48 64 72 96 128 192 256 512; do
  echo "  Creating ${i}x${i}..."
  create_rounded "$INPUT" "icons/${i}x${i}.png" "$i" 100
done
echo "✓ Created Linux icons in icons/ directory"

echo ""
echo "✅ All icons generated successfully!"
echo ""
echo "Files created:"
echo "  - icon.icns (macOS)"
echo "  - icon.ico (Windows)"
echo "  - icons/*.png (Linux)"

