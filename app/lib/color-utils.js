/**
 * Utility functions for color conversion and PDF compatibility
 */

/**
 * Convert oklch color to hex color
 * This is a simplified conversion for common oklch values
 * @param {string} oklchString - oklch color string like "oklch(0.5 0.1 180)"
 * @returns {string} - hex color string like "#ffffff"
 */
export function oklchToHex(oklchString) {
  if (!oklchString || !oklchString.includes('oklch(')) {
    return oklchString; // Return as-is if not oklch
  }

  // Extract values from oklch(L C H) or oklch(L C H / A)
  const match = oklchString.match(/oklch\(([^)]+)\)/);
  if (!match) return oklchString;

  const values = match[1].split(' ').map(v => v.trim());
  const l = parseFloat(values[0]) || 0; // Lightness (0-1)
  const c = parseFloat(values[1]) || 0; // Chroma
  const h = parseFloat(values[2]) || 0; // Hue (0-360)
  const a = values[3] ? parseFloat(values[3]) : 1; // Alpha

  // Convert OKLCH to RGB (simplified conversion)
  const rgb = oklchToRgb(l, c, h);
  
  // Convert RGB to hex
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
  
  return a < 1 ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})` : hex;
}

/**
 * Convert OKLCH to RGB (simplified conversion)
 * This is a basic approximation - for production use, consider a more accurate library
 */
function oklchToRgb(l, c, h) {
  // Convert OKLCH to LAB first (simplified)
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  
  // Convert LAB to XYZ (simplified)
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  
  const delta = 6 / 29;
  const delta2 = delta * delta;
  const delta3 = delta2 * delta;
  
  const fx3 = fx * fx * fx;
  const fy3 = fy * fy * fy;
  const fz3 = fz * fz * fz;
  
  const x = (fx3 > delta3) ? fx3 : (3 * delta2 * (fx - 4/29));
  const y = (fy3 > delta3) ? fy3 : (3 * delta2 * (fy - 4/29));
  const z = (fz3 > delta3) ? fz3 : (3 * delta2 * (fz - 4/29));
  
  // D65 illuminant
  const xn = 0.95047;
  const yn = 1.00000;
  const zn = 1.08883;
  
  const xr = x * xn;
  const yr = y * yn;
  const zr = z * zn;
  
  // Convert XYZ to RGB
  const red = xr *  3.2406 + yr * -1.5372 + zr * -0.4986;
  const green = xr * -0.9689 + yr *  1.8758 + zr *  0.0415;
  const blue = xr *  0.0557 + yr * -0.2040 + zr *  1.0570;
  
  // Apply gamma correction
  const gamma = (val) => {
    if (val <= 0.0031308) {
      return 12.92 * val;
    } else {
      return 1.055 * Math.pow(val, 1/2.4) - 0.055;
    }
  };
  
  return {
    r: Math.round(Math.max(0, Math.min(255, gamma(red) * 255))),
    g: Math.round(Math.max(0, Math.min(255, gamma(green) * 255))),
    b: Math.round(Math.max(0, Math.min(255, gamma(blue) * 255)))
  };
}

/**
 * Convert RGB values to hex color
 */
function rgbToHex(r, g, b) {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Convert CSS custom properties with oklch colors to PDF-compatible values
 * @param {string} cssText - CSS text containing oklch colors
 * @returns {string} - CSS text with oklch colors converted to hex
 */
export function convertOklchToHex(cssText) {
  if (!cssText) return cssText;
  
  // Find all oklch() functions and convert them
  return cssText.replace(/oklch\([^)]+\)/g, (match) => {
    return oklchToHex(match);
  });
}

/**
 * Get PDF-compatible color values for common CSS custom properties
 * This provides fallback values for PDF generation
 */
export const PDF_COLORS = {
  '--background': '#ffffff',
  '--foreground': '#000000',
  '--card': '#ffffff',
  '--card-foreground': '#000000',
  '--popover': '#ffffff',
  '--popover-foreground': '#000000',
  '--primary': '#000000',
  '--primary-foreground': '#ffffff',
  '--secondary': '#f5f5f5',
  '--secondary-foreground': '#000000',
  '--muted': '#f5f5f5',
  '--muted-foreground': '#737373',
  '--accent': '#f5f5f5',
  '--accent-foreground': '#000000',
  '--destructive': '#dc2626',
  '--border': '#e5e5e5',
  '--input': '#e5e5e5',
  '--ring': '#a3a3a3',
  '--chart-1': '#f59e0b',
  '--chart-2': '#3b82f6',
  '--chart-3': '#1d4ed8',
  '--chart-4': '#10b981',
  '--chart-5': '#f59e0b',
  '--sidebar': '#ffffff',
  '--sidebar-foreground': '#000000',
  '--sidebar-primary': '#000000',
  '--sidebar-primary-foreground': '#ffffff',
  '--sidebar-accent': '#f5f5f5',
  '--sidebar-accent-foreground': '#000000',
  '--sidebar-border': '#e5e5e5',
  '--sidebar-ring': '#a3a3a3'
};
