/**
 * Color manipulation utilities for the Life Grid plugin.
 *
 * Provides functions for color conversion, luminance calculation, and color adjustments.
 */

import * as Theme from "../theme";

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
		parseInt(hex.substr(Theme.HEX_RED_START, Theme.HEX_RED_LENGTH), 16) /
		Theme.RGB_NORMALIZE_FACTOR;
	const g =
		parseInt(
			hex.substr(Theme.HEX_GREEN_START, Theme.HEX_GREEN_LENGTH),
			16
		) / Theme.RGB_NORMALIZE_FACTOR;
	const b =
		parseInt(hex.substr(Theme.HEX_BLUE_START, Theme.HEX_BLUE_LENGTH), 16) /
		Theme.RGB_NORMALIZE_FACTOR;
	const a = [r, g, b].map((v) =>
		v <= Theme.RGB_LINEAR_THRESHOLD
			? v / Theme.RGB_LINEAR_DIVISOR
			: Math.pow(
					(v + Theme.RGB_GAMMA_OFFSET) / Theme.RGB_GAMMA_DIVISOR,
					Theme.RGB_GAMMA_EXPONENT
			  )
	);
	return (
		Theme.LUMINANCE_RED_COEFFICIENT * a[0] +
		Theme.LUMINANCE_GREEN_COEFFICIENT * a[1] +
		Theme.LUMINANCE_BLUE_COEFFICIENT * a[2]
	);
}

/**
 * Convert color names or rgb() values to hex format.
 *
 * @param color Color string (name, rgb(), rgba(), or hex)
 * @returns Hex color string
 */
export function colorToHex(color: string): string {
	const div = document.createElement("div");
	div.style.color = color;
	document.body.appendChild(div);
	const computedColor = window.getComputedStyle(div).color;
	document.body.removeChild(div);

	const match = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
	if (match) {
		const r = parseInt(match[1]).toString(16).padStart(2, "0");
		const g = parseInt(match[2]).toString(16).padStart(2, "0");
		const b = parseInt(match[3]).toString(16).padStart(2, "0");
		return `#${r}${g}${b}`;
	}
	return color; // Fallback if regex doesn't match or color is already hex
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

	const r = parseInt(hex.substr(0, 2), 16);
	const g = parseInt(hex.substr(2, 2), 16);
	const b = parseInt(hex.substr(4, 2), 16);

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
 * @returns Hex color string for the note
 */
export function getNoteColor(
	periodColor: string | undefined,
	fallbackColor: string
): string {
	if (!periodColor) {
		return fallbackColor; // Fallback to default green
	}

	const luminance = getLuminance(periodColor);

	// If the period color is dark, make note color lighter
	// If the period color is light, make note color darker
	if (luminance < Theme.LIGHT_COLOR_THRESHOLD) {
		// Dark color: lighten it by 40-60 units
		return adjustColor(periodColor, Theme.COLOR_LIGHTEN_AMOUNT);
	} else {
		// Light color: darken it by 40-60 units
		return adjustColor(periodColor, -Theme.COLOR_LIGHTEN_AMOUNT);
	}
}
