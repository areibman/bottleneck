/**
 * Utility functions for handling label colors with proper contrast in light and dark modes
 */

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
}

/**
 * Calculate luminance of a color (0-1)
 */
function getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map((c) => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }): number {
    const lum1 = getLuminance(color1.r, color1.g, color1.b);
    const lum2 = getLuminance(color2.r, color2.g, color2.b);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Darken a color by a factor (0-1)
 */
function darkenColor(r: number, g: number, b: number, factor: number): { r: number; g: number; b: number } {
    return {
        r: Math.round(r * (1 - factor)),
        g: Math.round(g * (1 - factor)),
        b: Math.round(b * (1 - factor)),
    };
}

/**
 * Lighten a color by a factor (0-1)
 */
function lightenColor(r: number, g: number, b: number, factor: number): { r: number; g: number; b: number } {
    return {
        r: Math.round(r + (255 - r) * factor),
        g: Math.round(g + (255 - g) * factor),
        b: Math.round(b + (255 - b) * factor),
    };
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Get label colors with proper contrast for light and dark themes
 */
export function getLabelColors(
    labelColor: string,
    theme: "light" | "dark"
): { backgroundColor: string; color: string } {
    // Remove # if present and ensure we have a valid hex color
    const cleanColor = labelColor.replace("#", "");
    const rgb = hexToRgb(`#${cleanColor}`);

    if (!rgb) {
        // Fallback for invalid colors
        return {
            backgroundColor: theme === "dark" ? "#374151" : "#f3f4f6",
            color: theme === "dark" ? "#d1d5db" : "#374151",
        };
    }

    if (theme === "dark") {
        // Dark theme: Use a more opaque background and lighter text
        const backgroundAlpha = 0.3;
        const backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${backgroundAlpha})`;

        // For text, lighten the color to ensure good contrast on dark background
        const lightenedText = lightenColor(rgb.r, rgb.g, rgb.b, 0.4);
        const textColor = rgbToHex(lightenedText.r, lightenedText.g, lightenedText.b);

        return {
            backgroundColor,
            color: textColor,
        };
    } else {
        // Light theme: Use more visible background to avoid white-on-white
        const backgroundAlpha = 0.35; // Much more opaque for better visibility
        const backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${backgroundAlpha})`;

        // For text color, we need to ensure good contrast against both the light background and the tinted label background
        // Check if the original color has good contrast, if not, darken it significantly
        const whiteBackground = { r: 255, g: 255, b: 255 };
        const contrastRatio = getContrastRatio(rgb, whiteBackground);

        let textColor: string;
        if (contrastRatio >= 4.5) {
            // Original color has good contrast, but darken it a bit for the tinted background
            const slightlyDarkened = darkenColor(rgb.r, rgb.g, rgb.b, 0.25);
            textColor = rgbToHex(slightlyDarkened.r, slightlyDarkened.g, slightlyDarkened.b);
        } else {
            // Darken the color significantly to improve contrast
            let darkenedColor = darkenColor(rgb.r, rgb.g, rgb.b, 0.5);
            let darkenedContrastRatio = getContrastRatio(darkenedColor, whiteBackground);

            // Keep darkening if needed
            if (darkenedContrastRatio < 4.5) {
                darkenedColor = darkenColor(rgb.r, rgb.g, rgb.b, 0.7);
                darkenedContrastRatio = getContrastRatio(darkenedColor, whiteBackground);
            }

            // Final fallback - use a very dark version
            if (darkenedContrastRatio < 4.5) {
                darkenedColor = darkenColor(rgb.r, rgb.g, rgb.b, 0.8);
            }

            textColor = rgbToHex(darkenedColor.r, darkenedColor.g, darkenedColor.b);
        }

        return {
            backgroundColor,
            color: textColor,
        };
    }
}
