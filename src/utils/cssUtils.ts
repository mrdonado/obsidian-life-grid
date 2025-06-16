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
 * Interface for Life Grid CSS properties
 */
export interface LifeGridCSSProperties {
	gridBgColor: string;
	squareDefaultColor: string;
	squareBorderColor: string;
	squareNoteColor: string;
	squareTodayBorderColor: string;
	yearHeaderBgColor: string;
	yearHeaderTextColor: string;
	yearHeaderPaddingHorizontal: number;
	yearHeaderPaddingVertical: number;
	yearHeaderHeightExtension: number;
	yearHeaderBorderRadius: string;
	yearHeaderFontFamily: string;
	yearHeaderFontSize: string;
	milestoneHeaderBgColor: string;
	milestoneHeaderTextColor: string;
	tooltipBgColor: string;
	tooltipTextColor: string;
	ghostPeriodColor: string;
	decadeLineColor: string;
	defaultPeriodColor: string;
	whiteColor: string;
	blackColor: string;
	squareBorderWidth: number;
	squareTodayBorderWidth: number;
	gap: number;
	squareSize: number;
	gridMargin: number;
	periodOpacity: number;
	decadeLineOpacity: number;
	tooltipFontSize: string;
	tooltipPadding: string;
	tooltipBorderRadius: string;
	periodsContainerMarginBottom: string;
	periodDivBorder: string;
	periodDivBorderRadius: string;
	periodDivPadding: string;
	periodDivMarginBottom: string;
	periodHeaderMarginBottom: string;
	deleteButtonPadding: string;
	deleteButtonFontSize: string;
	addButtonPadding: string;
	addButtonMarginTop: string;
	advancedSectionMarginTop: string;
	toggleButtonFontSize: string;
	jsonContainerMarginTop: string;
	jsonTextareaFontSize: string;
	minimapBorderRadius: string;
	minimapMargin: string;
	minimapVerticalPadding: number;
	minimapLineHeight: number;
	decadeLineStrokeWidth: string;
	eventLineMargin: number;
}

/**
 * Get all CSS custom properties for Life Grid styling
 */
export function getLifeGridCSSProperties(): LifeGridCSSProperties {
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
		periodOpacity: parseFloat(
			getCSSCustomProperty("--life-grid-period-opacity", "0.3")
		),
		decadeLineOpacity: parseFloat(
			getCSSCustomProperty("--life-grid-decade-line-opacity", "0.3")
		),

		// Tooltip Styling
		tooltipFontSize: getCSSCustomProperty("--life-grid-tooltip-font-size"),
		tooltipPadding: getCSSCustomProperty("--life-grid-tooltip-padding"),
		tooltipBorderRadius: getCSSCustomProperty(
			"--life-grid-tooltip-border-radius"
		),

		// Periods Container Styling
		periodsContainerMarginBottom: getCSSCustomProperty(
			"--life-grid-periods-container-margin-bottom"
		),
		periodDivBorder: getCSSCustomProperty("--life-grid-period-div-border"),
		periodDivBorderRadius: getCSSCustomProperty(
			"--life-grid-period-div-border-radius"
		),
		periodDivPadding: getCSSCustomProperty(
			"--life-grid-period-div-padding"
		),
		periodDivMarginBottom: getCSSCustomProperty(
			"--life-grid-period-div-margin-bottom"
		),
		periodHeaderMarginBottom: getCSSCustomProperty(
			"--life-grid-period-header-margin-bottom"
		),
		deleteButtonPadding: getCSSCustomProperty(
			"--life-grid-delete-button-padding"
		),
		deleteButtonFontSize: getCSSCustomProperty(
			"--life-grid-delete-button-font-size"
		),
		addButtonPadding: getCSSCustomProperty(
			"--life-grid-add-button-padding"
		),
		addButtonMarginTop: getCSSCustomProperty(
			"--life-grid-add-button-margin-top"
		),
		advancedSectionMarginTop: getCSSCustomProperty(
			"--life-grid-advanced-section-margin-top"
		),
		toggleButtonFontSize: getCSSCustomProperty(
			"--life-grid-toggle-button-font-size"
		),
		jsonContainerMarginTop: getCSSCustomProperty(
			"--life-grid-json-container-margin-top"
		),
		jsonTextareaFontSize: getCSSCustomProperty(
			"--life-grid-json-textarea-font-size"
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
