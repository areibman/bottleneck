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

# Function to create rounded corners with padding for macOS
# According to Apple HIG, the logo should be ~80% of the canvas
create_rounded() {
    local input="$1"
    local output="$2"
    local size="$3"
    local is_macos="${4:-false}"  # Optional parameter for macOS-specific sizing
    
    # For macOS icons, shrink to 80% and add padding
    if [ "$is_macos" = "true" ]; then
        local logo_size=$((size * 80 / 100))  # 80% of the canvas
        local padding=$(( (size - logo_size) / 2 ))  # Center the logo
        local radius=$((logo_size / 8))  # 12.5% radius based on logo size
        
        # Create a transparent canvas and place the resized logo in the center
        magick -size "${size}x${size}" xc:transparent \
            \( "$input" -resize "${logo_size}x${logo_size}" \
               \( +clone -alpha extract \
                  -draw "fill black polygon 0,0 0,$radius $radius,0 fill white circle $radius,$radius $radius,0" \
                  \( +clone -flip \) -compose Multiply -composite \
                  \( +clone -flop \) -compose Multiply -composite \
               \) -alpha off -compose CopyOpacity -composite \
            \) -geometry "+${padding}+${padding}" -composite \
            "$output"
    else
        # Original behavior for non-macOS icons (full size)
        local radius=$((size / 8))  # 12.5% radius for nice rounded corners
        
        magick "$input" \
            -resize "${size}x${size}" \
            \( +clone -alpha extract \
               -draw "fill black polygon 0,0 0,$radius $radius,0 fill white circle $radius,$radius $radius,0" \
               \( +clone -flip \) -compose Multiply -composite \
               \( +clone -flop \) -compose Multiply -composite \
            \) -alpha off -compose CopyOpacity -composite \
            "$output"
    fi
}

## macOS
echo "Generating macOS icons..."
rm -rf icon.iconset
mkdir -p icon.iconset

for i in 16 32 64 128 256 512 1024; do
  half=$((i / 2))
  echo "  Creating ${i}x${i} with 80% logo and padding..."
  create_rounded "$INPUT" "icon.iconset/icon_${i}x${i}.png" "$i" "true"
  
  if [[ $i -ne 16 ]]; then
    echo "  Creating ${half}x${half}@2x with 80% logo and padding..."
    cp "icon.iconset/icon_${i}x${i}.png" "icon.iconset/icon_${half}x${half}@2x.png"
  fi
done

# Convert to .icns (only works on macOS)
if command -v iconutil &> /dev/null; then
    iconutil --convert icns -o icon.icns icon.iconset
    echo "✓ Created icon.icns"
else
    echo "⚠ Skipping .icns creation (iconutil not found - macOS only)"
    echo "  The icon.iconset directory contains all necessary PNG files"
fi

## Windows
echo "Generating Windows icon..."
# Create temporary rounded versions for Windows (no padding needed)
mkdir -p temp_win
for i in 16 20 24 32 40 48 60 64 72 80 96 256; do
    create_rounded "$INPUT" "temp_win/${i}.png" "$i" "false"
done

magick temp_win/*.png icon.ico
rm -rf temp_win
echo "✓ Created icon.ico"

## Linux
echo "Generating Linux icons..."
mkdir -p icons
for i in 16 22 24 32 36 48 64 72 96 128 192 256 512; do
  echo "  Creating ${i}x${i}..."
  create_rounded "$INPUT" "icons/${i}x${i}.png" "$i" "false"
done
echo "✓ Created Linux icons in icons/ directory"

# Create a rounded version of the main icon (with macOS padding for preview)
echo "Creating rounded 1024.png with macOS-style padding..."
create_rounded "$INPUT" "1024-rounded.png" 1024 "true"
echo "✓ Created 1024-rounded.png"

echo ""
echo "✅ All icons generated successfully!"
echo ""
echo "Files created:"
echo "  - icon.icns (macOS - with 80% logo and padding per Apple HIG)"
echo "  - icon.ico (Windows - full size logo)"
echo "  - icons/*.png (Linux - full size logo)"
echo "  - 1024-rounded.png (preview with macOS-style padding)"
echo ""
echo "Note: macOS icons have been generated with 80% logo size and padding"
echo "to comply with Apple Human Interface Guidelines for proper Dock display."

