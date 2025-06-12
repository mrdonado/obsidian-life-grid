/**
 * CSS Utilities for Life Grid Plugin
 *
 * Provides functions to read CSS custom properties and apply styles
 * that respect theme customizations
 */

/**
 * Get a CSS custom property value from the document root
 */
export function getCSSCustomProperty(
	propertyName: string,
	fallback?: string
): string {
	const rootStyle = getComputedStyle(document.documentElement);
	const value = rootStyle.getPropertyValue(propertyName).trim();
	return value || fallback || "";
}

/**
 * Get all CSS custom properties for Life Grid styling
 */
export function getLifeGridCSSProperties() {
	return {
		// Grid Colors
		gridBgColor: getCSSCustomProperty("--life-grid-bg-color"),
		squareDefaultColor: getCSSCustomProperty(
			"--life-grid-square-default-color"
		),
		squareBorderColor: getCSSCustomProperty(
			"--life-grid-square-border-color"
		),
		squareNoteColor: getCSSCustomProperty("--life-grid-square-note-color"),
		squareTodayBorderColor: getCSSCustomProperty(
			"--life-grid-square-today-border-color"
		),

		// Year Header Colors
		yearHeaderBgColor: getCSSCustomProperty(
			"--life-grid-year-header-bg-color"
		),
		yearHeaderTextColor: getCSSCustomProperty(
			"--life-grid-year-header-text-color"
		),
		milestoneHeaderBgColor: getCSSCustomProperty(
			"--life-grid-milestone-header-bg-color"
		),
		milestoneHeaderTextColor: getCSSCustomProperty(
			"--life-grid-milestone-header-text-color"
		),

		// Tooltip Colors
		tooltipBgColor: getCSSCustomProperty("--life-grid-tooltip-bg-color"),
		tooltipTextColor: getCSSCustomProperty(
			"--life-grid-tooltip-text-color"
		),

		// Minimap Colors
		ghostPeriodColor: getCSSCustomProperty(
			"--life-grid-ghost-period-color"
		),
		decadeLineColor: getCSSCustomProperty("--life-grid-decade-line-color"),

		// Default Colors
		defaultPeriodColor: getCSSCustomProperty(
			"--life-grid-default-period-color"
		),
		whiteColor: getCSSCustomProperty("--life-grid-white-color"),
		blackColor: getCSSCustomProperty("--life-grid-black-color"),

		// Dimensions
		squareBorderWidth: parseFloat(
			getCSSCustomProperty("--life-grid-square-border-width", "1")
		),
		squareTodayBorderWidth: parseFloat(
			getCSSCustomProperty("--life-grid-square-today-border-width", "2")
		),
		gap: parseFloat(getCSSCustomProperty("--life-grid-gap", "10")),
		squareSize: parseFloat(
			getCSSCustomProperty("--life-grid-square-size", "7.5")
		),
		gridMargin: parseFloat(
			getCSSCustomProperty("--life-grid-grid-margin", "20")
		),

		// Opacity Values
		periodOpacity: getCSSCustomProperty("--life-grid-period-opacity"),
		decadeLineOpacity: getCSSCustomProperty(
			"--life-grid-decade-line-opacity"
		),

		// Tooltip Styling
		tooltipFontSize: getCSSCustomProperty("--life-grid-tooltip-font-size"),
		tooltipPadding: getCSSCustomProperty("--life-grid-tooltip-padding"),
		tooltipBorderRadius: getCSSCustomProperty(
			"--life-grid-tooltip-border-radius"
		),

		// Year Header Styling
		yearHeaderFontFamily: getCSSCustomProperty(
			"--life-grid-year-header-font-family"
		),
		yearHeaderFontSize: getCSSCustomProperty(
			"--life-grid-year-header-font-size"
		),
		yearHeaderBorderRadius: getCSSCustomProperty(
			"--life-grid-year-header-border-radius"
		),
		yearHeaderPaddingHorizontal: parseFloat(
			getCSSCustomProperty(
				"--life-grid-year-header-padding-horizontal",
				"-1"
			)
		),
		yearHeaderPaddingVertical: parseFloat(
			getCSSCustomProperty(
				"--life-grid-year-header-padding-vertical",
				"3"
			)
		),
		yearHeaderHeightExtension: parseFloat(
			getCSSCustomProperty(
				"--life-grid-year-header-height-extension",
				"4"
			)
		),

		// Minimap Styling
		minimapBorderRadius: getCSSCustomProperty(
			"--life-grid-minimap-border-radius"
		),
		minimapMargin: getCSSCustomProperty("--life-grid-minimap-margin"),
		minimapVerticalPadding: parseFloat(
			getCSSCustomProperty("--life-grid-minimap-vertical-padding", "10")
		),
		minimapLineHeight: parseFloat(
			getCSSCustomProperty("--life-grid-minimap-line-height", "3")
		),
		decadeLineStrokeWidth: getCSSCustomProperty(
			"--life-grid-decade-line-stroke-width"
		),
		eventLineMargin: parseFloat(
			getCSSCustomProperty("--life-grid-event-line-margin", "5")
		),
	};
}
