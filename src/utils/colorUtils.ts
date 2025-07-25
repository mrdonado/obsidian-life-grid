/**
 * Color manipulation utilities for the Life Grid plugin.
 *
 * Provides functions for color conversion, luminance calculation, and color adjustments.
 */

import * as GridConfig from "../GridConfig";

/**
 * Calculate the luminance of a hex color using ITU-R BT.709 coefficients.
 *
 * @param hex Hex color string (with or without #)
 * @returns Luminance value between 0 and 1
 */
export function getLuminance(hex: string): number {
	hex = hex.replace("#", "");
	if (hex.length === 3) {
		hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
	}
	const r =
		parseInt(
			hex.substring(
				GridConfig.HEX_RED_START,
				GridConfig.HEX_RED_START + GridConfig.HEX_RED_LENGTH
			),
			16
		) / GridConfig.RGB_NORMALIZE_FACTOR;
	const g =
		parseInt(
			hex.substring(
				GridConfig.HEX_GREEN_START,
				GridConfig.HEX_GREEN_START + GridConfig.HEX_GREEN_LENGTH
			),
			16
		) / GridConfig.RGB_NORMALIZE_FACTOR;
	const b =
		parseInt(
			hex.substring(
				GridConfig.HEX_BLUE_START,
				GridConfig.HEX_BLUE_START + GridConfig.HEX_BLUE_LENGTH
			),
			16
		) / GridConfig.RGB_NORMALIZE_FACTOR;
	const a = [r, g, b].map((v) =>
		v <= GridConfig.RGB_LINEAR_THRESHOLD
			? v / GridConfig.RGB_LINEAR_DIVISOR
			: Math.pow(
					(v + GridConfig.RGB_GAMMA_OFFSET) /
						GridConfig.RGB_GAMMA_DIVISOR,
					GridConfig.RGB_GAMMA_EXPONENT
			  )
	);
	return (
		GridConfig.LUMINANCE_RED_COEFFICIENT * a[0] +
		GridConfig.LUMINANCE_GREEN_COEFFICIENT * a[1] +
		GridConfig.LUMINANCE_BLUE_COEFFICIENT * a[2]
	);
}

/**
 * Convert color names or rgb() values to hex format using pure JavaScript parsing.
 *
 * @param color Color string (name, rgb(), rgba(), or hex)
 * @returns Hex color string
 */
export function colorToHex(color: string): string {
	// Remove whitespace and convert to lowercase for consistency
	const cleanColor = color.trim().toLowerCase();

	// If it's already hex, just return it (with # prefix)
	if (cleanColor.startsWith("#")) {
		return cleanColor;
	}
	if (/^[0-9a-f]{6}$/i.test(cleanColor)) {
		return `#${cleanColor}`;
	}
	if (/^[0-9a-f]{3}$/i.test(cleanColor)) {
		return `#${cleanColor}`;
	}

	// Handle rgb() and rgba() formats
	const rgbMatch = cleanColor.match(
		/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/
	);
	if (rgbMatch) {
		const r = parseInt(rgbMatch[1]).toString(16).padStart(2, "0");
		const g = parseInt(rgbMatch[2]).toString(16).padStart(2, "0");
		const b = parseInt(rgbMatch[3]).toString(16).padStart(2, "0");
		return `#${r}${g}${b}`;
	}

	// Handle common color names
	const colorNames: { [key: string]: string } = {
		red: "#ff0000",
		green: "#008000",
		blue: "#0000ff",
		yellow: "#ffff00",
		orange: "#ffa500",
		purple: "#800080",
		pink: "#ffc0cb",
		brown: "#a52a2a",
		black: "#000000",
		white: "#ffffff",
		gray: "#808080",
		grey: "#808080",
		cyan: "#00ffff",
		magenta: "#ff00ff",
		lime: "#00ff00",
		maroon: "#800000",
		navy: "#000080",
		olive: "#808000",
		teal: "#008080",
		silver: "#c0c0c0",
		gold: "#ffd700",
		violet: "#ee82ee",
		indigo: "#4b0082",
		turquoise: "#40e0d0",
		coral: "#ff7f50",
		salmon: "#fa8072",
		khaki: "#f0e68c",
		crimson: "#dc143c",
		orchid: "#da70d6",
	};

	if (colorNames[cleanColor]) {
		return colorNames[cleanColor];
	}

	// If we can't parse it, return it as-is (might be a CSS variable or unknown format)
	return color;
}

/**
 * Adjust the brightness of a hex color by a specified amount.
 *
 * @param hex Hex color string (with or without #)
 * @param amount Amount to adjust brightness (-255 to +255)
 * @returns Adjusted hex color string
 */
export function adjustColor(hex: string, amount: number): string {
	hex = hex.replace("#", "");
	if (hex.length === 3) {
		hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
	}

	const r = parseInt(hex.substring(0, 2), 16);
	const g = parseInt(hex.substring(2, 4), 16);
	const b = parseInt(hex.substring(4, 6), 16);

	const newR = Math.min(255, Math.max(0, r + amount));
	const newG = Math.min(255, Math.max(0, g + amount));
	const newB = Math.min(255, Math.max(0, b + amount));

	return (
		"#" +
		newR.toString(16).padStart(2, "0") +
		newG.toString(16).padStart(2, "0") +
		newB.toString(16).padStart(2, "0")
	);
}

/**
 * Get an appropriate note color based on the period color.
 * Automatically adjusts for contrast and readability.
 *
 * @param periodColor The background period color (hex string or undefined)
 * @param fallbackColor The default color to use if no period color
 * @param lightColorThreshold Threshold for determining light vs dark colors
 * @param colorLightenAmount Amount to adjust color brightness
 * @returns Hex color string for the note
 */
export function getNoteColor(
	periodColor: string | undefined,
	fallbackColor: string,
	lightColorThreshold: number = 0.5,
	colorLightenAmount: number = 50
): string {
	if (!periodColor) {
		return fallbackColor; // Fallback to default green
	}

	const luminance = getLuminance(periodColor);

	// If the period color is dark, make note color lighter
	// If the period color is light, make note color darker
	if (luminance < lightColorThreshold) {
		// Dark color: lighten it by specified amount
		return adjustColor(periodColor, colorLightenAmount);
	} else {
		// Light color: darken it by specified amount
		return adjustColor(periodColor, -colorLightenAmount);
	}
}
