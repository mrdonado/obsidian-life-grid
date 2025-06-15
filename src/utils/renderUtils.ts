import { TFile, moment, App, WorkspaceLeaf } from "obsidian";
import * as Theme from "../theme";
import { getLifeGridCSSProperties } from "./cssUtils";
import { calculateAge } from "./ageUtils";
import { getLuminance, colorToHex, getNoteColor } from "./colorUtils";
import { SpatialIndex, ClickableDay } from "./spatialUtils";
import {
	getFormattedDateString,
	getDailyNoteFilePath,
} from "./dailyNotesUtils";

/**
 * Configuration for rendering the Life Grid SVG
 */
export interface LifeGridRenderConfig {
	startDate: Date;
	endDate: Date;
	today: Date;
	years: number;
	dailyNoteSet: Set<string>;
	dayToFilePath: { [key: string]: string };
	dayToColor: { [key: string]: string };
	periods: Array<{
		start: string;
		end: string;
		color: string;
		label?: string;
	}>;
	containerWidth: number;
	dailyNoteFormat: string;
	metadataCache: any; // Obsidian's MetadataCache
	files: TFile[];
}

/**
 * Result of rendering the Life Grid SVG
 */
export interface LifeGridRenderResult {
	svg: SVGElement;
	clickableDays: ClickableDay[];
	spatialIndex: SpatialIndex;
	dayToRect: { [key: string]: { cx: number; cy: number; radius: number } };
	paintArray: Array<YearPaint | DayPaint>;
}

/**
 * Paint instruction interfaces
 */
export interface YearPaint {
	type: "year";
	year: number;
}

export interface DayPaint {
	type: "day";
	date: string;
	isToday: boolean;
	hasNote: boolean;
	periodColor?: string;
	color?: string;
}

/**
 * Creates the main Life Grid SVG with optimized rendering
 */
export function createLifeGridSVG(
	config: LifeGridRenderConfig
): LifeGridRenderResult {
	const { years, containerWidth } = config;

	// Get CSS properties for styling
	const css = getLifeGridCSSProperties();

	// SVG grid parameters
	const headerSquares = Theme.HEADER_SQUARES;
	const gap = css.gap;
	const squareSize = css.squareSize;
	const minimapWidth = Theme.calculateMinimapWidth(squareSize, gap);
	const minimapSpaceReserved = Theme.calculateMinimapSpaceReserved(
		minimapWidth,
		gap
	);
	const gridMargin = css.gridMargin;
	const maxGridWidth = containerWidth - minimapSpaceReserved - gridMargin;

	const daysPerRow = Math.floor(
		(maxGridWidth - gap * 2) / (squareSize + gap)
	);
	const calculatedWidth = daysPerRow * (squareSize + gap) + gap;
	const width = Math.min(calculatedWidth, maxGridWidth);
	const maxRows = years * Math.ceil(366 / (daysPerRow - headerSquares));
	const height = maxRows * (squareSize + gap) + gap;

	// Create SVG element
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("width", width.toString());
	svg.setAttribute("height", height.toString());
	svg.addClass("life-grid-svg");
	svg.style.height = height + "px";
	svg.tabIndex = 0;

	// Build paint array
	const paintArray = buildPaintArray(config);

	// Create spatial index and clickable days
	const spatialIndex = new SpatialIndex();
	const clickableDays: ClickableDay[] = [];
	const dayToRect: {
		[key: string]: { cx: number; cy: number; radius: number };
	} = {};

	// Render the main grid
	renderMainGrid(
		svg,
		paintArray,
		config,
		spatialIndex,
		clickableDays,
		dayToRect,
		daysPerRow
	);

	return {
		svg,
		clickableDays,
		spatialIndex,
		dayToRect,
		paintArray,
	};
}

/**
 * Creates the minimap SVG
 */
export function createMinimapSVG(
	config: LifeGridRenderConfig,
	paintArray: Array<YearPaint | DayPaint>,
	minimapHeight: number = 600
): SVGElement {
	const {
		startDate,
		today,
		periods,
		metadataCache,
		dayToFilePath,
		dailyNoteFormat,
		years,
	} = config;
	const css = getLifeGridCSSProperties();
	const gap = css.gap;
	const minimapWidth = Theme.calculateMinimapWidth(css.squareSize, gap);

	// Create minimap SVG
	const minimapSvg = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"svg"
	);
	minimapSvg.setAttribute("width", minimapWidth.toString());
	minimapSvg.setAttribute("height", minimapHeight.toString());
	minimapSvg.addClass("life-grid-minimap-svg");

	// CSS-based style variables for minimap
	const minimapVerticalPadding = css.minimapVerticalPadding;
	const ghostPeriodColor = css.ghostPeriodColor;
	const decadeLineOpacity = css.decadeLineOpacity;
	const periodOpacity = css.periodOpacity;
	const decadeLineColor = css.decadeLineColor;
	const decadeLineStrokeWidth = css.decadeLineStrokeWidth;
	const eventLineMargin = css.eventLineMargin;

	// Calculate total days for configurable timeline
	const totalLifeDays = years * 365.25;
	const usableHeight = minimapHeight - minimapVerticalPadding * 2;

	// Draw ghost period background
	const ghostPeriodRect = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"rect"
	);
	ghostPeriodRect.setAttribute("x", "0");
	ghostPeriodRect.setAttribute("y", minimapVerticalPadding.toString());
	ghostPeriodRect.setAttribute("width", gap.toString());
	ghostPeriodRect.setAttribute("height", "100%");
	ghostPeriodRect.setAttribute("fill", ghostPeriodColor);
	ghostPeriodRect.setAttribute("opacity", decadeLineOpacity);
	minimapSvg.appendChild(ghostPeriodRect);

	// Draw periods
	for (const period of periods) {
		const periodStartDate = new Date(period.start);
		const startDaysSinceBirth = Math.round(
			(periodStartDate.getTime() - startDate.getTime()) /
				(1000 * 60 * 60 * 24)
		);
		const startProgress = Math.max(0, startDaysSinceBirth) / totalLifeDays;

		let periodEndDate: Date;
		if (
			period.end.trim() === "" ||
			period.end.toLowerCase() === "present"
		) {
			periodEndDate = today;
		} else {
			periodEndDate = new Date(period.end);
		}
		const endDaysSinceBirth = Math.round(
			(periodEndDate.getTime() - startDate.getTime()) /
				(1000 * 60 * 60 * 24)
		);
		const endProgress = Math.min(1, endDaysSinceBirth / totalLifeDays);

		if (startProgress <= 1 && endProgress >= 0) {
			const startY =
				minimapVerticalPadding + startProgress * usableHeight;
			const endY = minimapVerticalPadding + endProgress * usableHeight;
			const height = Math.max(Theme.MINIMAP_MIN_HEIGHT, endY - startY);

			const periodRect = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"rect"
			);
			periodRect.setAttribute("x", "0");
			periodRect.setAttribute("y", startY.toString());
			periodRect.setAttribute("width", gap.toString());
			periodRect.setAttribute("height", height.toString());
			periodRect.setAttribute("fill", period.color);
			periodRect.setAttribute("opacity", periodOpacity);
			periodRect.classList.add("life-grid-cursor-pointer");
			minimapSvg.appendChild(periodRect);
		}
	}

	// Draw decade markers
	for (let decade = 0; decade <= 90; decade += 10) {
		const decadeProgress = (decade * 365.25) / totalLifeDays;
		const y = minimapVerticalPadding + decadeProgress * usableHeight;
		const line = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"line"
		);
		line.setAttribute("x1", gap.toString());
		line.setAttribute("y1", y.toString());
		line.setAttribute("x2", minimapWidth.toString());
		line.setAttribute("y2", y.toString());
		line.setAttribute("stroke", decadeLineColor);
		line.setAttribute("stroke-width", decadeLineStrokeWidth);
		line.setAttribute("opacity", decadeLineOpacity);
		minimapSvg.appendChild(line);
	}

	// Draw events
	const events = collectEvents(
		paintArray,
		dayToFilePath,
		metadataCache,
		startDate,
		dailyNoteFormat
	);
	const minimapLineHeight = 3;

	events.forEach((event) => {
		const lifeProgress = event.daysSinceBirth / totalLifeDays;
		const y = minimapVerticalPadding + lifeProgress * usableHeight;
		const lineWidth = minimapWidth - 10 - gap;

		const eventRect = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"rect"
		);
		eventRect.setAttribute("x", (eventLineMargin + gap).toString());
		eventRect.setAttribute("y", y.toString());
		eventRect.setAttribute("width", lineWidth.toString());
		eventRect.setAttribute("height", minimapLineHeight.toString());
		eventRect.setAttribute("fill", event.color);
		eventRect.classList.add("life-grid-cursor-pointer");
		minimapSvg.appendChild(eventRect);
	});

	return minimapSvg;
}

/**
 * Builds the paint array with all the rendering instructions
 */
function buildPaintArray(
	config: LifeGridRenderConfig
): Array<YearPaint | DayPaint> {
	const {
		startDate,
		endDate,
		today,
		dailyNoteSet,
		dayToFilePath,
		dayToColor,
		periods,
		dailyNoteFormat,
	} = config;

	const paintArray: Array<YearPaint | DayPaint> = [];
	const totalDays = Math.round(
		(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
	);
	let d = new Date(startDate);

	for (let i = 0; i <= totalDays; i++) {
		const dayStr = getFormattedDateString(d, dailyNoteFormat);
		const isFirstDay = i === 0 || (d.getMonth() === 0 && d.getDate() === 1);

		if (isFirstDay) {
			paintArray.push({ type: "year", year: d.getFullYear() });
		}

		if (!(d.getMonth() === 0 && d.getDate() === 1 && i !== 0)) {
			const isToday =
				dayStr === getFormattedDateString(today, dailyNoteFormat);
			const hasNote = dailyNoteSet.has(dayStr) && !!dayToFilePath[dayStr];

			// Helper function to check if a date is within a period
			const isDateInPeriod = (
				date: string,
				period: { start: string; end: string }
			) => {
				const periodEnd =
					period.end.trim() === "" ||
					period.end.toLowerCase() === "present"
						? getFormattedDateString(today, dailyNoteFormat)
						: period.end;
				return date >= period.start && date <= periodEnd;
			};

			const period = periods.find((p) => isDateInPeriod(dayStr, p));
			const color = dayToColor[dayStr];

			paintArray.push({
				type: "day",
				date: dayStr,
				isToday,
				hasNote,
				periodColor: period?.color,
				...(color ? { color } : {}),
			});
		}

		d.setDate(d.getDate() + 1);
	}

	return paintArray;
}

/**
 * Renders the main grid SVG with all circles and year headers
 */
function renderMainGrid(
	svg: SVGElement,
	paintArray: Array<YearPaint | DayPaint>,
	config: LifeGridRenderConfig,
	spatialIndex: SpatialIndex,
	clickableDays: ClickableDay[],
	dayToRect: { [key: string]: { cx: number; cy: number; radius: number } },
	daysPerRow: number
) {
	const { dayToFilePath, metadataCache } = config;
	const css = getLifeGridCSSProperties();
	const headerSquares = Theme.HEADER_SQUARES;
	const gap = css.gap;
	const squareSize = css.squareSize;

	// Use DocumentFragment for batch DOM updates
	const fragment = document.createDocumentFragment();

	// Group circles by color for massive performance improvement
	const circlesByColor = new Map<
		string,
		Array<{
			cx: number;
			cy: number;
			r: number;
			date: string;
			hasSpecialBorder: boolean;
			isToday: boolean;
			isEvent: boolean;
		}>
	>();

	const yearData: Array<{
		x: number;
		y: number;
		width: number;
		height: number;
		textX: number;
		textY: number;
		year: number;
	}> = [];

	// Process paint array to collect render data efficiently
	let row = 0;
	let col = 0;

	for (const item of paintArray) {
		if (item.type === "year") {
			if (col > daysPerRow - headerSquares) {
				row++;
				col = 0;
			}

			yearData.push({
				x: col * (squareSize + gap) + gap,
				y: row * (squareSize + gap) + gap,
				width: headerSquares * (squareSize + gap) - gap,
				height: squareSize,
				textX:
					col * (squareSize + gap) +
					gap +
					(headerSquares * (squareSize + gap) - gap) / 2,
				textY: row * (squareSize + gap) + gap + squareSize / 2,
				year: item.year,
			});

			col += headerSquares;
		} else if (item.type === "day") {
			if (col >= daysPerRow) {
				row++;
				col = 0;
			}

			const x = col * (squareSize + gap) + gap;
			const y = row * (squareSize + gap) + gap;
			let color = css.squareDefaultColor;
			let isEvent = false;

			if (item.periodColor) color = item.periodColor;
			if (item.hasNote)
				color = getNoteColor(item.periodColor, css.squareNoteColor);

			// Use custom color property if present (overrides periodColor and note color)
			if (item.color) {
				color = item.color;
				isEvent = true;
			}

			const cx = x + squareSize / 2;
			const cy = y + squareSize / 2;
			const targetArea = squareSize * squareSize;
			const baseRadius = Math.sqrt(targetArea / Math.PI);
			const radius =
				baseRadius *
				(isEvent
					? Theme.CIRCLE_GAP * Theme.EVENT_CIRCLE_MULTIPLIER
					: Theme.CIRCLE_GAP * Theme.REGULAR_CIRCLE_MULTIPLIER);

			// Check for special borders
			let hasEventBorder = false;
			if (isEvent) {
				const fileCache = metadataCache.getCache(
					dayToFilePath[item.date]
				);
				if (
					fileCache &&
					fileCache.frontmatter &&
					typeof fileCache.frontmatter["eventName"] === "string"
				) {
					hasEventBorder = true;
				}
			}

			// Group by color+stroke combination for batch rendering
			const stroke =
				color === css.squareDefaultColor
					? css.squareBorderColor
					: "none";
			const strokeWidth =
				color === css.squareDefaultColor ? css.squareBorderWidth : 0;
			const colorKey = `${color}-${stroke}-${strokeWidth}`;

			if (!circlesByColor.has(colorKey)) {
				circlesByColor.set(colorKey, []);
			}

			circlesByColor.get(colorKey)!.push({
				cx,
				cy,
				r: radius,
				date: item.date,
				hasSpecialBorder: item.isToday || hasEventBorder,
				isToday: item.isToday,
				isEvent,
			});

			// Add to clickable days and spatial index
			const clickableDay = { date: item.date, cx, cy, radius, color };
			clickableDays.push(clickableDay);
			spatialIndex.add(clickableDay);
			dayToRect[item.date] = { cx, cy, radius };
			col++;
		}
	}

	// Render year headers
	renderYearHeaders(fragment, yearData, css);

	// Render circles
	renderCircles(fragment, circlesByColor, css);

	// Single DOM update for massive performance improvement
	svg.appendChild(fragment);
}

/**
 * Renders year headers
 */
function renderYearHeaders(
	fragment: DocumentFragment,
	yearData: any[],
	css: any
) {
	const yearGroup = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"g"
	);
	yearGroup.setAttribute("class", "year-headers");

	for (const year of yearData) {
		// Add visual distinction for 5-year milestones
		const isFiveYearMilestone = year.year % 5 === 0;
		const headerBgColor = isFiveYearMilestone
			? css.milestoneHeaderBgColor
			: css.yearHeaderBgColor;
		const textColor = isFiveYearMilestone
			? css.milestoneHeaderTextColor
			: css.yearHeaderTextColor;

		const horizontalPadding = css.yearHeaderPaddingHorizontal;
		const heightExtension = css.yearHeaderHeightExtension;
		const headerRect = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"rect"
		);
		headerRect.setAttribute("x", (year.x + horizontalPadding).toString());
		headerRect.setAttribute(
			"y",
			(
				year.y -
				css.yearHeaderPaddingVertical -
				heightExtension / 2
			).toString()
		);
		headerRect.setAttribute(
			"width",
			(year.width - horizontalPadding * 2).toString()
		);
		headerRect.setAttribute(
			"height",
			(
				year.height +
				css.yearHeaderPaddingVertical * 2 +
				heightExtension
			).toString()
		);
		headerRect.setAttribute("fill", headerBgColor);
		headerRect.setAttribute("rx", css.yearHeaderBorderRadius);
		yearGroup.appendChild(headerRect);

		const yearText = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"text"
		);
		yearText.setAttribute("x", year.textX.toString());
		yearText.setAttribute("y", year.textY.toString());
		yearText.setAttribute("text-anchor", "middle");
		yearText.setAttribute("dominant-baseline", "middle");
		yearText.setAttribute("fill", textColor);
		yearText.setAttribute("font-family", css.yearHeaderFontFamily);
		yearText.setAttribute("font-size", css.yearHeaderFontSize);
		yearText.setAttribute("filter", Theme.YEAR_HEADER_TEXT_SHADOW);
		yearText.textContent = year.year.toString();
		yearGroup.appendChild(yearText);
	}

	fragment.appendChild(yearGroup);
}

/**
 * Renders circles optimized with batch processing
 */
function renderCircles(
	fragment: DocumentFragment,
	circlesByColor: Map<string, any[]>,
	css: any
) {
	// Ultra-optimized circle rendering using single path elements per color
	for (const [colorKey, circles] of circlesByColor) {
		const [fill, stroke, strokeWidth] = colorKey.split("-");

		// Create a single path element for all circles of this color
		const pathData: string[] = [];
		const bordersPathData: string[] = [];

		for (const circle of circles) {
			// Add circle to path data using arc commands for better performance
			pathData.push(`M ${circle.cx + circle.r} ${circle.cy}`);
			pathData.push(
				`A ${circle.r} ${circle.r} 0 1 0 ${circle.cx - circle.r} ${
					circle.cy
				}`
			);
			pathData.push(
				`A ${circle.r} ${circle.r} 0 1 0 ${circle.cx + circle.r} ${
					circle.cy
				}`
			);

			// Handle special borders in separate path
			if (circle.hasSpecialBorder) {
				const borderRadius = circle.r + 2;
				bordersPathData.push(
					`M ${circle.cx + borderRadius} ${circle.cy}`
				);
				bordersPathData.push(
					`A ${borderRadius} ${borderRadius} 0 1 0 ${
						circle.cx - borderRadius
					} ${circle.cy}`
				);
				bordersPathData.push(
					`A ${borderRadius} ${borderRadius} 0 1 0 ${
						circle.cx + borderRadius
					} ${circle.cy}`
				);
			}
		}

		// Create single path element for all circles of this color
		if (pathData.length > 0) {
			const path = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"path"
			);
			path.setAttribute("d", pathData.join(" "));
			path.setAttribute("fill", fill);
			if (stroke !== "none" && parseInt(strokeWidth) > 0) {
				path.setAttribute("stroke", stroke);
				path.setAttribute("stroke-width", strokeWidth);
			}
			fragment.appendChild(path);
		}

		// Create special borders path if needed
		if (bordersPathData.length > 0) {
			const borderPath = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"path"
			);
			borderPath.setAttribute("d", bordersPathData.join(" "));
			borderPath.setAttribute("fill", "none");
			borderPath.setAttribute("stroke", css.squareTodayBorderColor);
			borderPath.setAttribute(
				"stroke-width",
				css.squareTodayBorderWidth.toString()
			);
			fragment.appendChild(borderPath);
		}
	}
}

/**
 * Collects events from the paint array
 */
function collectEvents(
	paintArray: Array<YearPaint | DayPaint>,
	dayToFilePath: { [key: string]: string },
	metadataCache: any,
	startDate: Date,
	dailyNoteFormat: string
): Array<{
	date: string;
	color: string;
	eventName: string;
	daysSinceBirth: number;
}> {
	const events: Array<{
		date: string;
		color: string;
		eventName: string;
		daysSinceBirth: number;
	}> = [];

	for (const item of paintArray) {
		if (item.type === "day") {
			const fileCache = metadataCache.getCache(dayToFilePath[item.date]);
			if (
				fileCache &&
				fileCache.frontmatter &&
				typeof fileCache.frontmatter["color"] === "string" &&
				typeof fileCache.frontmatter["eventName"] === "string"
			) {
				const eventDate = moment(item.date, dailyNoteFormat).toDate();
				const daysSinceBirth = Math.round(
					(eventDate.getTime() - startDate.getTime()) /
						(1000 * 60 * 60 * 24)
				);

				events.push({
					date: item.date,
					color: fileCache.frontmatter["color"],
					eventName: fileCache.frontmatter["eventName"],
					daysSinceBirth,
				});
			}
		}
	}

	return events;
}

/**
 * Configuration for UI interactions
 */
export interface UIInteractionConfig extends LifeGridRenderConfig {
	app: App;
	leaf: WorkspaceLeaf;
	plugin: any; // The plugin instance for accessing methods
	cleanupFunctions: Array<() => void>;
}

/**
 * Setup UI interactions for the Life Grid
 */
export function setupUIInteractions(
	config: UIInteractionConfig,
	renderResult: LifeGridRenderResult,
	minimapSvg: SVGElement,
	scrollWrapper: HTMLElement
) {
	const {
		app,
		leaf,
		plugin,
		cleanupFunctions,
		startDate,
		today,
		periods,
		dailyNoteSet,
		dayToFilePath,
		dailyNoteFormat,
		metadataCache,
	} = config;

	const { svg, spatialIndex, dayToRect, paintArray } = renderResult;
	const css = getLifeGridCSSProperties();

	// Tooltip management
	let currentTooltip: HTMLDivElement | null = null;
	let lastHoveredDay: string | null = null;

	// Helper function to get day information for tooltip
	const getDayInfo = (day: ClickableDay) => {
		const fileCache = metadataCache.getCache(dayToFilePath[day.date]);

		// Get event name if present
		let eventName: string | undefined;
		if (
			fileCache &&
			fileCache.frontmatter &&
			typeof fileCache.frontmatter["eventName"] === "string"
		) {
			eventName = fileCache.frontmatter["eventName"];
		}

		// Get period label if present
		let periodLabel: string | undefined;
		const period = periods.find((p) => {
			const periodEnd =
				p.end.trim() === "" || p.end.toLowerCase() === "present"
					? getFormattedDateString(today, dailyNoteFormat)
					: p.end;
			return day.date >= p.start && day.date <= periodEnd;
		});
		if (period && period.label) {
			periodLabel = period.label;
		}

		// Check if day has a note
		const hasNote = dailyNoteSet.has(day.date) && !!dayToFilePath[day.date];

		return { eventName, periodLabel, hasNote };
	};

	// Main tooltip handler
	const mouseEventHandler = (e: MouseEvent) => {
		const rect = svg.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;

		// Use spatial index for ultra-fast collision detection
		const nearbyCells = spatialIndex.getNearbyCells(mx, my);
		let hoveredDay: ClickableDay | null = null;

		// Find the day under cursor
		for (const day of nearbyCells) {
			const dist = Math.sqrt((mx - day.cx) ** 2 + (my - day.cy) ** 2);
			if (dist <= day.radius * 1.2) {
				hoveredDay = day;
				break;
			}
		}

		// Handle tooltip state changes
		if (!hoveredDay) {
			if (currentTooltip) {
				currentTooltip.remove();
				currentTooltip = null;
				lastHoveredDay = null;
				svg.removeClass("life-grid-cursor-pointer");
				svg.addClass("life-grid-cursor-default");
			}
			return;
		}

		// Check if we're still hovering the same day
		if (hoveredDay.date === lastHoveredDay) {
			if (currentTooltip) {
				const svgMidX = rect.left + rect.width / 2;
				if (e.clientX > svgMidX) {
					const tooltipWidth = 200;
					currentTooltip.style.left =
						e.clientX - tooltipWidth - 16 + "px";
				} else {
					currentTooltip.style.left = e.clientX + 12 + "px";
				}
				currentTooltip.style.top = e.clientY + 8 + "px";
			}
			return;
		}

		// New day hovered - create new tooltip
		lastHoveredDay = hoveredDay.date;
		svg.removeClass("life-grid-cursor-default");
		svg.addClass("life-grid-cursor-pointer");

		// Remove old tooltip
		if (currentTooltip) {
			currentTooltip.remove();
		}

		// Create new tooltip
		const tooltip = document.createElement("div");
		tooltip.addClass("life-grid-tooltip");
		tooltip.setAttribute("data-plugin-id", "obsidian-life-grid");
		tooltip.style.position = "fixed";
		tooltip.style.pointerEvents = "auto";
		tooltip.style.zIndex = "9999";

		// Hide tooltip when hovering over it
		tooltip.addEventListener("mouseenter", () => {
			tooltip.remove();
			currentTooltip = null;
			lastHoveredDay = null;
			svg.removeClass("life-grid-cursor-pointer");
			svg.addClass("life-grid-cursor-default");
		});

		// Calculate age for this day
		const dayDate = moment(hoveredDay.date, dailyNoteFormat).toDate();
		const age = calculateAge(startDate, dayDate);

		// Get day information
		const dayInfo = getDayInfo(hoveredDay);

		// Set tooltip content based on what information is available
		let tooltipText = `${age}yo ${hoveredDay.date}`;
		if (dayInfo.eventName) {
			tooltipText += ` — ${dayInfo.eventName}`;
		} else if (dayInfo.hasNote) {
			tooltipText = `${age}yo ${hoveredDay.date}`;
		} else if (dayInfo.periodLabel) {
			tooltipText += ` — ${dayInfo.periodLabel}`;
		}

		tooltip.textContent = tooltipText;

		// Set tooltip color based on day color
		const normalizedColor = colorToHex(hoveredDay.color);
		const luminanceValue = getLuminance(normalizedColor);
		const isLight = luminanceValue > Theme.LIGHT_COLOR_THRESHOLD;
		const isVeryDark = luminanceValue < Theme.VERY_DARK_COLOR_THRESHOLD;

		// Remove existing tooltip color classes
		tooltip.removeClass("life-grid-tooltip--light-bg");
		tooltip.removeClass("life-grid-tooltip--colored-bg");
		tooltip.removeClass("life-grid-tooltip--very-dark");

		if (isVeryDark) {
			tooltip.addClass("life-grid-tooltip--very-dark");
		} else if (isLight) {
			tooltip.style.color = normalizedColor;
			tooltip.addClass("life-grid-tooltip--light-bg");
		} else {
			const whiteLuminance = getLuminance(css.whiteColor);
			const blackLuminance = getLuminance(css.blackColor);
			const contrastWhite =
				(whiteLuminance + Theme.CONTRAST_OFFSET) /
				(luminanceValue + Theme.CONTRAST_OFFSET);
			const contrastBlack =
				(luminanceValue + Theme.CONTRAST_OFFSET) /
				(blackLuminance + Theme.CONTRAST_OFFSET);
			tooltip.style.background = normalizedColor;
			tooltip.style.color =
				contrastWhite >= contrastBlack
					? css.whiteColor
					: css.blackColor;
			tooltip.addClass("life-grid-tooltip--colored-bg");
		}

		// Position tooltip
		const svgMidX = rect.left + rect.width / 2;
		if (e.clientX > svgMidX) {
			const tooltipWidth = 200;
			tooltip.style.left = e.clientX - tooltipWidth - 16 + "px";
		} else {
			tooltip.style.left = e.clientX + 12 + "px";
		}
		tooltip.style.top = e.clientY + 8 + "px";

		document.body.appendChild(tooltip);
		currentTooltip = tooltip;
	};

	svg.addEventListener("mousemove", mouseEventHandler);
	cleanupFunctions.push(() =>
		svg.removeEventListener("mousemove", mouseEventHandler)
	);

	// Mouse leave handler
	const mouseleaveHandler = () => {
		if (currentTooltip) {
			currentTooltip.remove();
			currentTooltip = null;
			lastHoveredDay = null;
			svg.removeClass("life-grid-cursor-pointer");
			svg.addClass("life-grid-cursor-default");
		}
	};

	svg.addEventListener("mouseleave", mouseleaveHandler);
	cleanupFunctions.push(() =>
		svg.removeEventListener("mouseleave", mouseleaveHandler)
	);

	// Click handler for days
	const clickHandler = async (e: MouseEvent) => {
		if (e.button !== 0 && e.button !== 1) return;

		try {
			const rect = svg.getBoundingClientRect();
			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;

			const nearbyCells = spatialIndex.getNearbyCells(mx, my);
			for (const day of nearbyCells) {
				const hitRadius = Math.max(day.radius * 1.1, day.radius + 3);
				const dist = Math.sqrt((mx - day.cx) ** 2 + (my - day.cy) ** 2);
				if (dist <= hitRadius) {
					// Clean up tooltips
					if (currentTooltip) {
						currentTooltip.remove();
						currentTooltip = null;
						lastHoveredDay = null;
						svg.style.cursor = "default";
					}

					const filePath = dayToFilePath[day.date];
					if (filePath) {
						const file = app.vault.getAbstractFileByPath(filePath);
						if (file instanceof TFile) {
							if (e.button === 1) {
								await plugin.openFileInNewTab(file);
							} else {
								await leaf.openFile(file);
							}
						}
					} else {
						const newFile = await app.vault.create(
							getDailyNoteFilePath(
								day.date,
								plugin.settings.dailyNoteFolder || ""
							),
							`# ${day.date}\n`
						);
						if (e.button === 1) {
							await plugin.openFileInNewTab(newFile);
						} else {
							await leaf.openFile(newFile);
						}
					}
					break;
				}
			}
		} catch (error) {
			console.error("Life Grid: Error handling click event:", error);
		}
	};

	svg.addEventListener("mousedown", clickHandler);
	cleanupFunctions.push(() =>
		svg.removeEventListener("mousedown", clickHandler)
	);

	// Setup minimap interactions
	setupMinimapInteractions(
		minimapSvg,
		config,
		paintArray,
		dayToRect,
		scrollWrapper,
		cleanupFunctions
	);
}

/**
 * Setup minimap UI interactions
 */
function setupMinimapInteractions(
	minimapSvg: SVGElement,
	config: UIInteractionConfig,
	paintArray: Array<YearPaint | DayPaint>,
	dayToRect: { [key: string]: { cx: number; cy: number; radius: number } },
	scrollWrapper: HTMLElement,
	cleanupFunctions: Array<() => void>
) {
	const {
		app,
		leaf,
		plugin,
		startDate,
		today,
		periods,
		dayToFilePath,
		dailyNoteFormat,
		metadataCache,
		years,
	} = config;

	const css = getLifeGridCSSProperties();
	const gap = css.gap;
	const minimapHeight = parseInt(minimapSvg.getAttribute("height") || "600");
	const minimapVerticalPadding = css.minimapVerticalPadding;
	const totalLifeDays = years * 365.25;
	const usableHeight = minimapHeight - minimapVerticalPadding * 2;

	// Collect periods and events for interaction
	const minimapPeriods: Array<{
		period: { start: string; end: string; color: string; label?: string };
		startY: number;
		endY: number;
		height: number;
	}> = [];

	// Build periods data
	for (const period of periods) {
		const periodStartDate = new Date(period.start);
		const startDaysSinceBirth = Math.round(
			(periodStartDate.getTime() - startDate.getTime()) /
				(1000 * 60 * 60 * 24)
		);
		const startProgress = Math.max(0, startDaysSinceBirth) / totalLifeDays;

		let periodEndDate: Date;
		if (
			period.end.trim() === "" ||
			period.end.toLowerCase() === "present"
		) {
			periodEndDate = today;
		} else {
			periodEndDate = new Date(period.end);
		}
		const endDaysSinceBirth = Math.round(
			(periodEndDate.getTime() - startDate.getTime()) /
				(1000 * 60 * 60 * 24)
		);
		const endProgress = Math.min(1, endDaysSinceBirth / totalLifeDays);

		if (startProgress <= 1 && endProgress >= 0) {
			const startY =
				minimapVerticalPadding + startProgress * usableHeight;
			const endY = minimapVerticalPadding + endProgress * usableHeight;
			const height = Math.max(Theme.MINIMAP_MIN_HEIGHT, endY - startY);

			minimapPeriods.push({
				period,
				startY,
				endY,
				height,
			});
		}
	}

	// Collect events
	const minimapEvents = collectEvents(
		paintArray,
		dayToFilePath,
		metadataCache,
		startDate,
		dailyNoteFormat
	);
	const minimapEventsWithPosition = minimapEvents.map((event) => ({
		...event,
		y:
			minimapVerticalPadding +
			(event.daysSinceBirth / totalLifeDays) * usableHeight,
		height: 3,
	}));

	let tooltipDiv: HTMLDivElement | null = null;

	// Minimap mousemove handler
	const minimapMousemoveHandler = (e: MouseEvent) => {
		const rect = minimapSvg.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;

		if (!tooltipDiv) {
			tooltipDiv = document.createElement("div");
			tooltipDiv.addClass("life-grid-tooltip");
			tooltipDiv.style.position = "fixed";
			tooltipDiv.style.pointerEvents = "auto";
			tooltipDiv.style.zIndex = "9999";
			document.body.appendChild(tooltipDiv);

			tooltipDiv.addEventListener("mouseenter", () => {
				if (tooltipDiv) {
					tooltipDiv.remove();
					tooltipDiv = null;
				}
			});
		}

		// Calculate age based on Y position
		const relativeY = Math.max(0, my - minimapVerticalPadding);
		const progress = Math.min(1, relativeY / usableHeight);
		const daysFromBirth = progress * totalLifeDays;
		const ageAtPosition = daysFromBirth / 365.25;
		const ageString = `${Math.floor(ageAtPosition)}yo`;

		let tooltipText = ageString;
		let isSpecialItem = false;
		let specialColor = css.tooltipTextColor;

		// Check for period rectangles
		if (mx >= 0 && mx <= gap) {
			for (const periodData of minimapPeriods) {
				if (my >= periodData.startY && my <= periodData.endY) {
					isSpecialItem = true;
					const periodStartDate = new Date(periodData.period.start);
					const startAge = calculateAge(startDate, periodStartDate);

					let endAge: string;
					if (
						periodData.period.end.trim() === "" ||
						periodData.period.end.toLowerCase() === "present"
					) {
						endAge = calculateAge(startDate, today);
					} else {
						const periodEndDate = new Date(periodData.period.end);
						endAge = calculateAge(startDate, periodEndDate);
					}

					const periodLabel =
						periodData.period.label || "Unnamed Period";
					tooltipText = `${ageString} — ${periodLabel} (${startAge}yo to ${endAge}yo)`;
					specialColor = periodData.period.color;
					break;
				}
			}
		}

		// Check for events
		if (!isSpecialItem) {
			for (const event of minimapEventsWithPosition) {
				if (my >= event.y && my <= event.y + event.height) {
					isSpecialItem = true;
					const eventDate = moment(
						event.date,
						dailyNoteFormat
					).toDate();
					const age = calculateAge(startDate, eventDate);
					tooltipText = `${age}yo ${event.date} — ${event.eventName}`;
					specialColor = event.color;
					break;
				}
			}
		}

		// Update tooltip
		tooltipDiv.textContent = tooltipText;

		// Apply color styling
		if (
			isSpecialItem &&
			specialColor !== css.tooltipTextColor &&
			specialColor !== css.squareDefaultColor
		) {
			const normalizedColor = colorToHex(specialColor);
			const isLight =
				getLuminance(normalizedColor) > Theme.LIGHT_COLOR_THRESHOLD;
			const isVeryDark =
				getLuminance(normalizedColor) < Theme.VERY_DARK_COLOR_THRESHOLD;

			if (isVeryDark) {
				tooltipDiv.style.background = css.tooltipBgColor;
				tooltipDiv.style.color = css.whiteColor;
			} else if (isLight) {
				tooltipDiv.style.color = normalizedColor;
				tooltipDiv.style.background = css.tooltipBgColor;
			} else {
				const contrastWhite =
					(getLuminance(css.whiteColor) + Theme.CONTRAST_OFFSET) /
					(getLuminance(normalizedColor) + Theme.CONTRAST_OFFSET);
				const contrastBlack =
					(getLuminance(normalizedColor) + Theme.CONTRAST_OFFSET) /
					(getLuminance(css.blackColor) + Theme.CONTRAST_OFFSET);
				tooltipDiv.style.background = normalizedColor;
				tooltipDiv.style.color =
					contrastWhite >= contrastBlack
						? css.whiteColor
						: css.blackColor;
			}
		} else {
			tooltipDiv.style.color = css.tooltipTextColor;
			tooltipDiv.style.background = css.tooltipBgColor;
		}

		// Position tooltip
		tooltipDiv.style.left =
			e.clientX - (tooltipDiv.offsetWidth || 200) - 16 + "px";
		tooltipDiv.style.top = e.clientY + 8 + "px";
	};

	minimapSvg.addEventListener("mousemove", minimapMousemoveHandler);
	cleanupFunctions.push(() =>
		minimapSvg.removeEventListener("mousemove", minimapMousemoveHandler)
	);

	// Minimap mouseleave handler
	const minimapMouseleaveHandler = () => {
		if (tooltipDiv) {
			tooltipDiv.remove();
			tooltipDiv = null;
		}
	};

	minimapSvg.addEventListener("mouseleave", minimapMouseleaveHandler);
	cleanupFunctions.push(() =>
		minimapSvg.removeEventListener("mouseleave", minimapMouseleaveHandler)
	);

	// Minimap click handler
	let lastClickedEvent: string | null = null;
	let lastClickTime = 0;
	const DOUBLE_CLICK_THRESHOLD = 500;

	const minimapClickHandler = async (e: MouseEvent) => {
		const rect = minimapSvg.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;
		const currentTime = Date.now();

		// Check for period clicks
		if (mx >= 0 && mx <= gap) {
			for (const periodData of minimapPeriods) {
				if (my >= periodData.startY && my <= periodData.endY) {
					if (tooltipDiv) {
						tooltipDiv.remove();
						tooltipDiv = null;
					}

					const periodStartDate = new Date(periodData.period.start);
					const startDateString = getFormattedDateString(
						periodStartDate,
						dailyNoteFormat
					);

					if (dayToRect[startDateString]) {
						const { cx, cy } = dayToRect[startDateString];
						const scrollX = cx - scrollWrapper.clientWidth / 2;
						const scrollY = cy - scrollWrapper.clientHeight / 2;
						scrollWrapper.scrollTo({
							top: Math.max(0, scrollY),
							left: Math.max(0, scrollX),
							behavior: "smooth",
						});
					}
					return;
				}
			}
		}

		// Check for event clicks
		for (const event of minimapEventsWithPosition) {
			if (my >= event.y && my <= event.y + event.height) {
				if (
					lastClickedEvent === event.date &&
					currentTime - lastClickTime < DOUBLE_CLICK_THRESHOLD
				) {
					// Double click - open file
					if (tooltipDiv) {
						tooltipDiv.remove();
						tooltipDiv = null;
					}

					const filePath = dayToFilePath[event.date];
					if (filePath) {
						const file = app.vault.getAbstractFileByPath(filePath);
						if (file instanceof TFile) {
							await leaf.openFile(file);
						}
					} else {
						const newFile = await app.vault.create(
							getDailyNoteFilePath(
								event.date,
								plugin.settings.dailyNoteFolder || ""
							),
							`# ${event.date}\n`
						);
						await leaf.openFile(newFile);
					}
					lastClickedEvent = null;
					lastClickTime = 0;
				} else {
					// Single click - scroll to event
					if (dayToRect[event.date]) {
						const { cx, cy } = dayToRect[event.date];
						const scrollX = cx - scrollWrapper.clientWidth / 2;
						const scrollY = cy - scrollWrapper.clientHeight / 2;
						scrollWrapper.scrollTo({
							top: Math.max(0, scrollY),
							left: Math.max(0, scrollX),
							behavior: "smooth",
						});
					}
					lastClickedEvent = event.date;
					lastClickTime = currentTime;
				}
				break;
			}
		}
	};

	minimapSvg.addEventListener("click", minimapClickHandler);
	cleanupFunctions.push(() =>
		minimapSvg.removeEventListener("click", minimapClickHandler)
	);
}
