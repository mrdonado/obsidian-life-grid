/**
 * Life Grid Configuration Constants
 *
 * This file contains non-visual configuration constants, calculations, and dimensional values
 * used throughout the Life Grid plugin. Visual styling has been moved to CSS for better
 * theme compatibility.
 */

// === CALCULATION CONSTANTS ===

/** Number of squares to use for year labels */
export const HEADER_SQUARES = 4;

/** Number of dots to match for minimap width calculation */
export const MINIMAP_DOTS = 5;

/** Cell size for spatial indexing (performance optimization) */
export const GRID_CELL_SIZE = 50;

/** Minimum height for minimap elements */
export const MINIMAP_MIN_HEIGHT = 1;

// === LUMINANCE THRESHOLDS (for calculations, not styling) ===

/** Threshold for determining if a color is very dark (for contrast) */
export const VERY_DARK_COLOR_THRESHOLD = 0.08;

// === CALCULATION CONSTANTS ===

/** Days per leap year cycle for age calculations */
export const DAYS_PER_YEAR = 365.25;

/** Milliseconds conversion factors */
export const MS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;

/** Age precision for display (decimal places) */
export const AGE_PRECISION_MULTIPLIER = 10;

// === COLOR PARSING CONSTANTS ===

/** Hex color substring positions */
export const HEX_RED_START = 0;
export const HEX_RED_LENGTH = 2;
export const HEX_GREEN_START = 2;
export const HEX_GREEN_LENGTH = 2;
export const HEX_BLUE_START = 4;
export const HEX_BLUE_LENGTH = 2;

/** RGB to linear conversion constants */
export const RGB_LINEAR_THRESHOLD = 0.03928;
export const RGB_LINEAR_DIVISOR = 12.92;
export const RGB_GAMMA_OFFSET = 0.055;
export const RGB_GAMMA_DIVISOR = 1.055;
export const RGB_GAMMA_EXPONENT = 2.4;
export const RGB_NORMALIZE_FACTOR = 255;

/** Luminance calculation coefficients (ITU-R BT.709) */
export const LUMINANCE_RED_COEFFICIENT = 0.2126;
export const LUMINANCE_GREEN_COEFFICIENT = 0.7152;
export const LUMINANCE_BLUE_COEFFICIENT = 0.0722;

/** Contrast ratio offset for WCAG calculations */
export const CONTRAST_OFFSET = 0.05;

// === DERIVED CALCULATIONS ===
// These depend on CSS custom properties and should be calculated at runtime

/** Calculate minimap width based on dots and spacing */
export function calculateMinimapWidth(squareSize: number, gap: number): number {
	return MINIMAP_DOTS * (squareSize + gap) - gap;
}

/** Calculate total space reserved for minimap including gap */
export function calculateMinimapSpaceReserved(
	minimapWidth: number,
	gap: number
): number {
	return minimapWidth + gap;
}
