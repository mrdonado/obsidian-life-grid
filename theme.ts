/**
 * Life Grid Theme Configuration
 *
 * This file contains all styling constants, colors, dimensions, and layout values
 * used throughout the Life Grid plugin to provide consistent theming and easy
 * customization in the future.
 */

// === COLOR CONSTANTS ===

/** Main background color for the grid and minimap */
export const GRID_BG_COLOR = "#181a1b";

/** Default color for empty days (very dark, just above background) */
export const SQUARE_DEFAULT_COLOR = "#23272e";

/** Border color for squares (subtle dark border) */
export const SQUARE_BORDER_COLOR = "#23272e";

/** Color for days with notes (natural green fallback) */
export const SQUARE_NOTE_COLOR = "#6fcf97";

/** Border color for today's square (warm yellow highlight) */
export const SQUARE_TODAY_BORDER_COLOR = "#ffe082";

/** Background color for year headers (slightly lighter than background) */
export const YEAR_HEADER_BG_COLOR = "#23272e";

/** Text color for year headers (soft off-white) */
export const YEAR_HEADER_TEXT_COLOR = "#e0e0e0";

/** Background color for tooltips */
export const TOOLTIP_BG_COLOR = "#23272e";

/** Text color for tooltips (warm yellow) */
export const TOOLTIP_TEXT_COLOR = "#ffe082";

// === MILESTONE COLORS ===

/** Background color for 5-year milestone headers (yellowish) */
export const MILESTONE_HEADER_BG_COLOR = "#ffe082";

/** Text color for 5-year milestone headers (dark) */
export const MILESTONE_HEADER_TEXT_COLOR = "#1a1a1a";

/** Ghost period color for minimap (slightly lighter than background) */
export const GHOST_PERIOD_COLOR = "#555";

/** Decade line color for minimap */
export const DECADE_LINE_COLOR = "#333";

/** Default color for new periods in settings */
export const DEFAULT_PERIOD_COLOR = "#4E8C8C";

// === CONTRAST COLORS ===

/** White color for text contrast calculations */
export const WHITE_COLOR = "#fff";

/** Black color for text contrast calculations */
export const BLACK_COLOR = "#000";

// === DIMENSION CONSTANTS ===

/** Width of square borders */
export const SQUARE_BORDER_WIDTH = 1;

/** Width of today's square border (thicker for emphasis) */
export const SQUARE_TODAY_BORDER_WIDTH = 2;

/** Circle fill ratio within squares (90% of square space) */
export const CIRCLE_GAP = 0.9;

/** Number of squares to use for year labels */
export const HEADER_SQUARES = 4;

/** Consistent gap between grid elements and minimap */
export const GAP = 10;

/** Fixed size for all day dots (constant across screen sizes) */
export const SQUARE_SIZE = 7.5;

/** Number of dots to match for minimap width calculation */
export const MINIMAP_DOTS = 5;

/** Extra margin for grid safety */
export const GRID_MARGIN = 20;

/** Cell size for spatial indexing (performance optimization) */
export const GRID_CELL_SIZE = 50;

// === TOOLTIP STYLING ===

/** Font size for tooltips */
export const TOOLTIP_FONT_SIZE = "16px";

/** Padding for tooltips */
export const TOOLTIP_PADDING = "6px 14px";

/** Border radius for tooltips */
export const TOOLTIP_BORDER_RADIUS = "8px";

// === OPACITY VALUES ===

/** Opacity for period rectangles in minimap */
export const PERIOD_OPACITY = "0.8";

/** Opacity for decade lines in minimap */
export const DECADE_LINE_OPACITY = "0.3";

// === DERIVED CALCULATIONS ===

/** Calculate minimap width based on dots and spacing */
export const MINIMAP_WIDTH = MINIMAP_DOTS * (SQUARE_SIZE + GAP) - GAP;

/** Total space reserved for minimap including gap */
export const MINIMAP_SPACE_RESERVED = MINIMAP_WIDTH + GAP;

// === MINIMAP SPECIFIC ===

/** Height for event lines in minimap */
export const MINIMAP_LINE_HEIGHT = 3;

/** Stroke width for decade lines */
export const DECADE_LINE_STROKE_WIDTH = "1";

/** Vertical padding for minimap content */
export const MINIMAP_VERTICAL_PADDING = 10;

/** Minimum height for minimap elements */
export const MINIMAP_MIN_HEIGHT = 1;

// === EVENT STYLING ===

/** Multiplier for event circle size (larger than regular days) */
export const EVENT_CIRCLE_MULTIPLIER = 1.25;

/** Multiplier for regular day circle size */
export const REGULAR_CIRCLE_MULTIPLIER = 1.225;

/** Border radius for special event borders */
export const EVENT_BORDER_RADIUS_OFFSET = 2;

// === YEAR HEADER STYLING ===

/** Horizontal padding for year headers */
export const YEAR_HEADER_HORIZONTAL_PADDING = -1;

/** Height extension for year headers */
export const YEAR_HEADER_HEIGHT_EXTENSION = 4;

/** Vertical padding adjustment for year headers */
export const YEAR_HEADER_VERTICAL_PADDING = 3;

/** Border radius for year header rectangles */
export const YEAR_HEADER_BORDER_RADIUS = "4";

/** Font family for year header text */
export const YEAR_HEADER_FONT_FAMILY = "sans-serif";

/** Font size for year header text */
export const YEAR_HEADER_FONT_SIZE = "12px";

/** Text shadow filter for year headers */
export const YEAR_HEADER_TEXT_SHADOW = "drop-shadow(0 0 2px rgba(0,0,0,1))";

// === LUMINANCE THRESHOLDS ===

/** Threshold for determining if a color is light (for contrast) */
export const LIGHT_COLOR_THRESHOLD = 0.5;

/** Threshold for determining if a color is very dark (for contrast) */
export const VERY_DARK_COLOR_THRESHOLD = 0.08;

// === COLOR ADJUSTMENT ===

/** Amount to lighten dark period colors for note visibility */
export const COLOR_LIGHTEN_AMOUNT = 50;

// === UI COMPONENT STYLING ===

/** Border radius for minimap container */
export const MINIMAP_BORDER_RADIUS = "4px";

/** Margin between minimap and other content */
export const MINIMAP_MARGIN = "10px";

/** Margin for event lines from edges */
export const EVENT_LINE_MARGIN = 5;

// === SETTINGS PANEL STYLING ===

/** Margin bottom for periods container */
export const PERIODS_CONTAINER_MARGIN_BOTTOM = "20px";

/** Border radius for period div containers */
export const PERIOD_DIV_BORDER_RADIUS = "8px";

/** Padding for period div containers */
export const PERIOD_DIV_PADDING = "16px";

/** Margin bottom for period divs */
export const PERIOD_DIV_MARGIN_BOTTOM = "12px";

/** Margin bottom for period headers */
export const PERIOD_HEADER_MARGIN_BOTTOM = "12px";

/** Padding for delete buttons in settings */
export const DELETE_BUTTON_PADDING = "4px 8px";

/** Font size for delete buttons */
export const DELETE_BUTTON_FONT_SIZE = "12px";

/** Padding for add period button */
export const ADD_BUTTON_PADDING = "12px";

/** Margin top for add button */
export const ADD_BUTTON_MARGIN_TOP = "8px";

/** Margin top for advanced settings section */
export const ADVANCED_SECTION_MARGIN_TOP = "20px";

/** Font size for toggle button */
export const TOGGLE_BUTTON_FONT_SIZE = "14px";

/** Margin top for JSON container */
export const JSON_CONTAINER_MARGIN_TOP = "8px";

/** Font size for JSON text area */
export const JSON_TEXTAREA_FONT_SIZE = "12px";

/** Border definition for period containers */
export const PERIOD_DIV_BORDER = "1px solid var(--background-modifier-border)";

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

// === CONTRAST CALCULATION CONSTANTS ===

/** Contrast ratio offset for WCAG calculations */
export const CONTRAST_OFFSET = 0.05;
