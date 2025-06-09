import { App, TFile, Plugin, ItemView, WorkspaceLeaf } from "obsidian";
import * as Theme from "./theme";
import { LifeGridSettingTab } from "./src/settings/LifeGridSettingTab";
import {
	LifeGridSettings,
	DEFAULT_SETTINGS,
	LIFE_GRID_VIEW_TYPE,
} from "./src/types/Settings";

class LifeGridView extends ItemView {
	plugin: LifeGridPlugin;
	private resizeHandler?: () => void;
	private scrollHandler?: () => void;

	constructor(leaf: WorkspaceLeaf, plugin: LifeGridPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return LIFE_GRID_VIEW_TYPE;
	}

	getDisplayText() {
		return "Life Grid";
	}

	// Override canAcceptExtension to make this view appear replaceable
	canAcceptExtension(extension: string) {
		return false; // We don't accept file extensions, but this helps identify us as a file-like view
	}

	// Override allowNoFile to indicate this view can exist without a file
	allowNoFile() {
		return true;
	}

	// Make this view appear as a "special" file view that can be replaced
	getEphemeralState() {
		return { subpath: "", focus: true };
	}

	// Override to make the view appear replaceable to other plugins
	// This is a key method that other plugins check to determine if a view is replaceable
	getState() {
		return {
			type: LIFE_GRID_VIEW_TYPE,
			state: {
				mode: "source", // Mimic file view structure
				source: false,
				replaceable: true, // Explicitly mark as replaceable
			},
		};
	}

	/**
	 * Convert a date format string (e.g., "YYYY-MM-DD") to a regex pattern
	 */
	private formatToRegex(format: string): RegExp {
		// Escape special regex characters except for our placeholders
		let pattern = format.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

		// Replace date format tokens with regex patterns
		pattern = pattern
			.replace(/YYYY/g, "\\d{4}")
			.replace(/YY/g, "\\d{2}")
			.replace(/MM/g, "\\d{2}")
			.replace(/DD/g, "\\d{2}")
			.replace(/M/g, "\\d{1,2}")
			.replace(/D/g, "\\d{1,2}");

		return new RegExp(`^${pattern}$`);
	}

	/**
	 * Check if a file is in the configured daily notes folder
	 * Uses recursive search: empty folder setting searches entire vault,
	 * specific folder setting searches within that folder and all subfolders
	 */
	private isInDailyNotesFolder(
		file: TFile,
		dailyNoteFolder: string
	): boolean {
		// Handle root folder cases: empty string or just "/"
		if (!dailyNoteFolder || dailyNoteFolder === "/") {
			// Root of vault - search recursively throughout entire vault
			return true;
		}

		// For specific folder, search recursively within that folder and its subfolders
		// Ensure folder path ends with '/' for proper prefix matching
		const folderPath = dailyNoteFolder.endsWith("/")
			? dailyNoteFolder
			: dailyNoteFolder + "/";
		return file.path.startsWith(folderPath);
	}

	/**
	 * Generate the full file path for a daily note based on configured format and folder
	 */
	private getDailyNoteFilePath(dateString: string): string {
		const dailyNoteFolder = this.plugin.settings.dailyNoteFolder || "";

		// Handle root folder cases: empty string or just "/"
		if (!dailyNoteFolder || dailyNoteFolder === "/") {
			// Root of vault
			return `${dateString}.md`;
		}

		// Ensure folder path ends with '/' for proper path construction
		const folderPath = dailyNoteFolder.endsWith("/")
			? dailyNoteFolder
			: dailyNoteFolder + "/";
		return `${folderPath}${dateString}.md`;
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container
			.createEl("h2", { text: "Life Grid" })
			.addEventListener("click", () => {
				// Repaint the grid by re-running onOpen
				this.onOpen();
			});

		const birthday = this.plugin.settings.birthday;
		if (!birthday) {
			container.createEl("div", {
				text: "Please set your birthday in the plugin settings.",
			});
			return;
		}

		const startDate = new Date(birthday);
		const endDate = new Date(startDate);
		const YEARS = this.plugin.settings.maxAge || 95;
		endDate.setFullYear(startDate.getFullYear() + YEARS);
		const today = new Date();
		today.setHours(0, 0, 0, 0); // Force today to midnight local time

		// Get all daily notes using configurable format and folder
		const files = this.plugin.app.vault.getFiles();
		const dailyNoteSet = new Set<string>();
		const dailyNoteFormat =
			this.plugin.settings.dailyNoteFormat || "YYYY-MM-DD";
		const dailyNoteFolder = this.plugin.settings.dailyNoteFolder || "";
		const formatRegex = this.formatToRegex(dailyNoteFormat);

		let filesChecked = 0;
		let filesInFolder = 0;
		let filesMatchingFormat = 0;

		for (const file of files) {
			filesChecked++;

			// Check if file is in the correct folder
			const isInFolder = this.isInDailyNotesFolder(file, dailyNoteFolder);
			if (isInFolder) {
				filesInFolder++;
				// Check if filename matches the date format
				const match = file.basename.match(formatRegex);
				if (match) {
					filesMatchingFormat++;
					dailyNoteSet.add(file.basename);
				}
			}
		}

		// Prepare periods
		const periods = this.plugin.settings.periods || [];

		// SVG grid parameters
		const headerSquares = Theme.HEADER_SQUARES; // number of squares to use for year label
		const years = YEARS;
		const gap = Theme.GAP; // Consistent gap between grid and minimap
		const containerWidth = container.clientWidth || 800;
		// Fixed day dot size - no longer responsive to screen size
		const squareSize = Theme.SQUARE_SIZE; // Constant size for all day dots
		// Make minimap width fixed to match 5 dots of the grid
		const minimapDots = Theme.MINIMAP_DOTS; // Number of dots to match for minimap width
		const minimapWidth = Theme.MINIMAP_WIDTH; // Width calculation moved to theme
		const minimapSpaceReserved = Theme.MINIMAP_SPACE_RESERVED;
		// Add extra margin to ensure all dots fit comfortably
		const gridMargin = Theme.GRID_MARGIN; // Extra margin for safety
		const maxGridWidth = containerWidth - minimapSpaceReserved - gridMargin;

		const daysPerRow = Math.floor(
			(maxGridWidth - gap * 2) / (squareSize + gap)
		); // Calculate days per row based on fixed size, with extra gap buffer

		// Calculate final width based on what actually fits, ensuring it doesn't exceed available space
		const calculatedWidth = daysPerRow * (squareSize + gap) + gap;
		const width = Math.min(calculatedWidth, maxGridWidth);

		// Estimate max possible rows (overestimate, SVG can be larger than needed)
		const maxRows = years * Math.ceil(366 / (daysPerRow - headerSquares));
		const height = maxRows * (squareSize + gap) + gap;

		// Create SVG element
		const svg = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"svg"
		);
		svg.setAttribute("width", width.toString());
		svg.setAttribute("height", height.toString());
		svg.style.width = "100%";
		svg.style.height = height + "px";
		svg.style.display = "block";
		svg.style.maxWidth = "100%";
		// Use GRID_BG_COLOR from theme
		svg.style.background = Theme.GRID_BG_COLOR;
		svg.tabIndex = 0;

		// Create main container with flex layout for grid and minimap
		const mainContainer = container.createEl("div");
		mainContainer.style.display = "flex";
		mainContainer.style.width = "100%";
		mainContainer.style.height = "80vh";
		mainContainer.style.gap = gap + "px"; // Use consistent gap

		// Wrap SVG in a scrollable container
		const scrollWrapper = mainContainer.createEl("div");
		scrollWrapper.style.overflow = "auto";
		scrollWrapper.style.flex = "1";
		scrollWrapper.style.maxHeight = "100%";
		scrollWrapper.appendChild(svg);

		// Create minimap container
		const minimapContainer = mainContainer.createEl("div");
		minimapContainer.style.width = minimapWidth + "px"; // Use calculated proportional width
		minimapContainer.style.height = "100%";
		minimapContainer.style.position = "relative";
		minimapContainer.style.backgroundColor = Theme.GRID_BG_COLOR;
		minimapContainer.style.borderRadius = Theme.MINIMAP_BORDER_RADIUS;
		minimapContainer.style.overflow = "hidden";

		// Map day string to file path for existing notes
		const dayToFilePath: { [key: string]: string } = {};
		// Map day string to custom color from frontmatter
		const dayToColor: { [key: string]: string } = {};
		for (const file of files) {
			// Check if file is in the correct folder and matches the format
			if (this.isInDailyNotesFolder(file, dailyNoteFolder)) {
				const match = file.basename.match(formatRegex);
				if (match) {
					dayToFilePath[file.basename] = file.path;
					// Try to extract color from frontmatter if present
					const fileCache = this.plugin.app.metadataCache.getCache(
						file.path
					);
					if (
						fileCache &&
						fileCache.frontmatter &&
						typeof fileCache.frontmatter["color"] === "string"
					) {
						dayToColor[file.basename] =
							fileCache.frontmatter["color"];
					}
				}
			}
		}

		// All drawing is done with SVG elements

		// Helper to get local date string in YYYY-MM-DD
		function getLocalDateString(date: Date): string {
			const year = date.getFullYear();
			const month = (date.getMonth() + 1).toString().padStart(2, "0");
			const day = date.getDate().toString().padStart(2, "0");
			return `${year}-${month}-${day}`;
		}

		// Helper to calculate age in years with 1 decimal (floored to not show older before birthday)
		function calculateAge(birthDate: Date, targetDate: Date): string {
			const ageInMilliseconds =
				targetDate.getTime() - birthDate.getTime();
			const ageInYears =
				ageInMilliseconds /
				(Theme.MS_PER_SECOND *
					Theme.SECONDS_PER_MINUTE *
					Theme.MINUTES_PER_HOUR *
					Theme.HOURS_PER_DAY *
					Theme.DAYS_PER_YEAR);
			// Floor to whole years, then add decimal part
			const wholeYears = Math.floor(ageInYears);
			const decimalPart = ageInYears - wholeYears;
			return (
				wholeYears +
				Math.floor(decimalPart * Theme.AGE_PRECISION_MULTIPLIER) /
					Theme.AGE_PRECISION_MULTIPLIER
			).toFixed(1);
		}

		// Helper to get luminance of a color
		function getLuminance(hex: string): number {
			hex = hex.replace("#", "");
			if (hex.length === 3) {
				hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
			}
			const r =
				parseInt(
					hex.substr(Theme.HEX_RED_START, Theme.HEX_RED_LENGTH),
					16
				) / Theme.RGB_NORMALIZE_FACTOR;
			const g =
				parseInt(
					hex.substr(Theme.HEX_GREEN_START, Theme.HEX_GREEN_LENGTH),
					16
				) / Theme.RGB_NORMALIZE_FACTOR;
			const b =
				parseInt(
					hex.substr(Theme.HEX_BLUE_START, Theme.HEX_BLUE_LENGTH),
					16
				) / Theme.RGB_NORMALIZE_FACTOR;
			const a = [r, g, b].map((v) =>
				v <= Theme.RGB_LINEAR_THRESHOLD
					? v / Theme.RGB_LINEAR_DIVISOR
					: Math.pow(
							(v + Theme.RGB_GAMMA_OFFSET) /
								Theme.RGB_GAMMA_DIVISOR,
							Theme.RGB_GAMMA_EXPONENT
					  )
			);
			return (
				Theme.LUMINANCE_RED_COEFFICIENT * a[0] +
				Theme.LUMINANCE_GREEN_COEFFICIENT * a[1] +
				Theme.LUMINANCE_BLUE_COEFFICIENT * a[2]
			);
		}

		// Helper to convert color names/rgb to hex (this might have been added previously with a faulty regex)
		function colorToHex(color: string): string {
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

		// Helper to adjust color brightness
		function adjustColor(hex: string, amount: number): string {
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

		// Helper to get note color based on period color
		function getNoteColor(periodColor: string | undefined): string {
			if (!periodColor) {
				return Theme.SQUARE_NOTE_COLOR; // Fallback to default green
			}

			const luminance = getLuminance(periodColor);

			// If the period color is dark, make note color lighter
			// If the period color is light, make note color darker
			if (luminance < Theme.LIGHT_COLOR_THRESHOLD) {
				// Dark color: lighten it by 40-60 units
				return adjustColor(periodColor, 50);
			} else {
				// Light color: darken it by 40-60 units
				return adjustColor(periodColor, -50);
			}
		}

		// Tooltip element must be accessible across event handlers
		let tooltipDiv: HTMLDivElement | null = null;
		// Update dayToRect type
		type DayRect = { cx: number; cy: number; radius: number };
		const dayToRect: { [key: string]: DayRect } = {};

		// 1. Build an array of paint instructions (type: 'year' | 'day')
		interface YearPaint {
			type: "year";
			year: number;
		}
		interface DayPaint {
			type: "day";
			date: string; // YYYY-MM-DD
			isToday: boolean;
			hasNote: boolean;
			periodColor?: string;
		}
		const paintArray: Array<YearPaint | DayPaint> = [];

		// Precompute clickable points for performance
		interface ClickableDay {
			date: string;
			cx: number;
			cy: number;
			radius: number;
			color: string;
		}
		const clickableDays: ClickableDay[] = [];

		const totalDays = Math.round(
			(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
		);
		let d = new Date(startDate);
		for (let i = 0; i <= totalDays; i++) {
			const dayStr = getLocalDateString(d);
			const isFirstDay =
				i === 0 || (d.getMonth() === 0 && d.getDate() === 1);
			if (isFirstDay) {
				paintArray.push({ type: "year", year: d.getFullYear() });
			}
			if (!(d.getMonth() === 0 && d.getDate() === 1 && i !== 0)) {
				const isToday = dayStr === getLocalDateString(today);
				const hasNote =
					dailyNoteSet.has(dayStr) && !!dayToFilePath[dayStr];
				// Helper function to check if a date is within a period
				const isDateInPeriod = (
					date: string,
					period: { start: string; end: string }
				) => {
					const periodEnd =
						period.end.trim() === "" ||
						period.end.toLowerCase() === "present"
							? getLocalDateString(today)
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

		// 2. High-performance SVG rendering using single path elements

		// Create spatial index for ultra-fast hit detection
		const GRID_CELL_SIZE = 50; // pixels
		const spatialIndex = new Map<string, ClickableDay[]>();

		function addToSpatialIndex(day: ClickableDay) {
			const gridX = Math.floor(day.cx / GRID_CELL_SIZE);
			const gridY = Math.floor(day.cy / GRID_CELL_SIZE);
			const key = `${gridX},${gridY}`;
			if (!spatialIndex.has(key)) {
				spatialIndex.set(key, []);
			}
			spatialIndex.get(key)!.push(day);
		}

		function getNearbyCells(x: number, y: number): ClickableDay[] {
			const gridX = Math.floor(x / GRID_CELL_SIZE);
			const gridY = Math.floor(y / GRID_CELL_SIZE);
			const nearby: ClickableDay[] = [];

			// Check 3x3 grid around the point
			for (let dx = -1; dx <= 1; dx++) {
				for (let dy = -1; dy <= 1; dy++) {
					const key = `${gridX + dx},${gridY + dy}`;
					const cell = spatialIndex.get(key);
					if (cell) nearby.push(...cell);
				}
			}
			return nearby;
		}

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
				let color = Theme.SQUARE_DEFAULT_COLOR;
				let isEvent = false;
				if (item.periodColor) color = item.periodColor;
				if (item.hasNote) color = getNoteColor(item.periodColor);
				// Use custom color property if present (overrides periodColor and note color)
				if ((item as any).color) {
					color = (item as any).color;
					isEvent = true;
				}

				const cx = x + squareSize / 2;
				const cy = y + squareSize / 2;
				const targetArea = squareSize * squareSize;
				const baseRadius = Math.sqrt(targetArea / Math.PI);
				// Make event (custom color) circles larger, and regular days slightly larger too
				const radius =
					baseRadius *
					(isEvent
						? Theme.CIRCLE_GAP * Theme.EVENT_CIRCLE_MULTIPLIER
						: Theme.CIRCLE_GAP * Theme.REGULAR_CIRCLE_MULTIPLIER);

				// Check for special borders
				let hasEventBorder = false;
				if (isEvent) {
					const fileCache = this.plugin.app.metadataCache.getCache(
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
					color === Theme.SQUARE_DEFAULT_COLOR
						? Theme.SQUARE_BORDER_COLOR
						: "none";
				const strokeWidth =
					color === Theme.SQUARE_DEFAULT_COLOR
						? Theme.SQUARE_BORDER_WIDTH
						: 0;
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
				addToSpatialIndex(clickableDay);
				dayToRect[item.date] = { cx, cy, radius };
				col++;
			}
		}

		// Batch create year elements (minimal DOM operations)
		const yearGroup = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"g"
		);
		yearGroup.setAttribute("class", "year-headers");
		for (const year of yearData) {
			// Add visual distinction for 5-year milestones
			const isFiveYearMilestone = year.year % 5 === 0;
			const headerBgColor = isFiveYearMilestone
				? Theme.MILESTONE_HEADER_BG_COLOR // Yellowish background for milestones
				: Theme.YEAR_HEADER_BG_COLOR; // Default background for regular years
			const textColor = isFiveYearMilestone
				? Theme.MILESTONE_HEADER_TEXT_COLOR // Dark font for milestone years
				: Theme.YEAR_HEADER_TEXT_COLOR; // Default text color for regular years

			// Create a larger background rectangle that can slightly invade surrounding dots' space
			// Since this is painted before dots, dots will appear on top
			const horizontalPadding = Theme.YEAR_HEADER_HORIZONTAL_PADDING; // Smaller horizontal extension to balance spacing
			const heightExtension = Theme.YEAR_HEADER_HEIGHT_EXTENSION; // Extra height to make it more prominent
			const headerRect = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"rect"
			);
			headerRect.setAttribute(
				"x",
				(year.x + horizontalPadding).toString()
			);
			headerRect.setAttribute(
				"y",
				(
					year.y -
					Theme.YEAR_HEADER_VERTICAL_PADDING -
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
					Theme.YEAR_HEADER_VERTICAL_PADDING * 2 +
					heightExtension
				).toString()
			);
			headerRect.setAttribute("fill", headerBgColor);
			headerRect.setAttribute("rx", Theme.YEAR_HEADER_BORDER_RADIUS); // Slightly more rounded corners for larger rectangle

			// No borders for cleaner appearance
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
			yearText.setAttribute("font-family", Theme.YEAR_HEADER_FONT_FAMILY);
			yearText.setAttribute("font-size", Theme.YEAR_HEADER_FONT_SIZE);
			yearText.setAttribute("filter", Theme.YEAR_HEADER_TEXT_SHADOW);
			yearText.textContent = year.year.toString();
			yearGroup.appendChild(yearText);
		}
		fragment.appendChild(yearGroup);

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
				borderPath.setAttribute(
					"stroke",
					Theme.SQUARE_TODAY_BORDER_COLOR
				);
				borderPath.setAttribute(
					"stroke-width",
					Theme.SQUARE_TODAY_BORDER_WIDTH.toString()
				);
				fragment.appendChild(borderPath);
			}
		}

		// Single DOM update for massive performance improvement
		svg.appendChild(fragment);

		// === LAZY TOOLTIP SYSTEM FOR ULTRA-FAST PAINTING ===
		// Instead of creating 34,000+ invisible circles, use single mousemove handler
		// with spatial indexing for real-time tooltip detection

		let currentTooltip: HTMLDivElement | null = null;
		let lastHoveredDay: string | null = null;

		// Helper function to get day information for tooltip
		const getDayInfo = (day: ClickableDay) => {
			const fileCache = this.plugin.app.metadataCache.getCache(
				dayToFilePath[day.date]
			);

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
						? getLocalDateString(today)
						: p.end;
				return day.date >= p.start && day.date <= periodEnd;
			});
			if (period && period.label) {
				periodLabel = period.label;
			}

			// Check if day has a note
			const hasNote =
				dailyNoteSet.has(day.date) && !!dayToFilePath[day.date];

			return { eventName, periodLabel, hasNote };
		};

		// Single efficient mousemove handler for all tooltips
		svg.addEventListener("mousemove", (e: MouseEvent) => {
			const rect = svg.getBoundingClientRect();
			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;

			// Use spatial index for ultra-fast collision detection
			const nearbyCells = getNearbyCells(mx, my);
			let hoveredDay: ClickableDay | null = null;

			// Find the day under cursor
			for (const day of nearbyCells) {
				const dist = Math.sqrt((mx - day.cx) ** 2 + (my - day.cy) ** 2);
				if (dist <= day.radius * 1.2) {
					// Slightly larger hit area
					hoveredDay = day;
					break;
				}
			}

			// Handle tooltip state changes
			if (!hoveredDay) {
				// No day hovered - remove tooltip if present
				if (currentTooltip) {
					currentTooltip.remove();
					currentTooltip = null;
					lastHoveredDay = null;
					svg.style.cursor = "default";
				}
				return;
			}

			// Check if we're still hovering the same day
			if (hoveredDay.date === lastHoveredDay) {
				// Update tooltip position
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
			svg.style.cursor = "pointer";

			// Remove old tooltip
			if (currentTooltip) {
				currentTooltip.remove();
			}

			// Create new tooltip
			const tooltip = document.createElement("div");
			tooltip.style.position = "fixed";
			tooltip.style.pointerEvents = "auto";
			tooltip.style.background = Theme.TOOLTIP_BG_COLOR;
			tooltip.style.padding = Theme.TOOLTIP_PADDING;
			tooltip.style.borderRadius = Theme.TOOLTIP_BORDER_RADIUS;
			tooltip.style.fontSize = Theme.TOOLTIP_FONT_SIZE;
			tooltip.style.fontWeight = "bold";
			tooltip.style.zIndex = "9999";

			// Hide tooltip when hovering over it
			tooltip.addEventListener("mouseenter", () => {
				tooltip.remove();
				currentTooltip = null;
				lastHoveredDay = null;
				svg.style.cursor = "default";
			});

			// Calculate age for this day
			const dayDate = new Date(hoveredDay.date);
			const age = calculateAge(startDate, dayDate);

			// Get day information
			const dayInfo = getDayInfo(hoveredDay);

			// Set tooltip content based on what information is available
			let tooltipText = `${age}yo ${hoveredDay.date}`;
			if (dayInfo.eventName) {
				tooltipText += ` — ${dayInfo.eventName}`;
			} else if (dayInfo.hasNote) {
				// Just show age and date for regular notes
				tooltipText = `${age}yo ${hoveredDay.date}`;
			} else if (dayInfo.periodLabel) {
				tooltipText += ` — ${dayInfo.periodLabel}`;
			}

			tooltip.textContent = tooltipText;

			// Set tooltip color based on day color
			// Ensure local/shadowed versions of getLuminance and colorToHex are removed from this event listener's scope.
			// The calls below should now use the correctly typed functions from the onOpen scope.

			const normalizedColor = colorToHex(hoveredDay.color); // Uses onOpen-scoped colorToHex
			const luminanceValue = getLuminance(normalizedColor); // Uses onOpen-scoped getLuminance

			const isLight = luminanceValue > Theme.LIGHT_COLOR_THRESHOLD;
			const isVeryDark = luminanceValue < Theme.VERY_DARK_COLOR_THRESHOLD;

			if (isVeryDark) {
				tooltip.style.background = Theme.TOOLTIP_BG_COLOR;
				tooltip.style.color = Theme.WHITE_COLOR;
			} else if (isLight) {
				tooltip.style.color = normalizedColor;
				tooltip.style.background = Theme.TOOLTIP_BG_COLOR;
			} else {
				const whiteLuminance = getLuminance(Theme.WHITE_COLOR); // Uses onOpen-scoped getLuminance
				const blackLuminance = getLuminance(Theme.BLACK_COLOR); // Uses onOpen-scoped getLuminance

				const contrastWhite =
					(whiteLuminance + Theme.CONTRAST_OFFSET) /
					(luminanceValue + Theme.CONTRAST_OFFSET);
				const contrastBlack =
					(luminanceValue + Theme.CONTRAST_OFFSET) /
					(blackLuminance + Theme.CONTRAST_OFFSET);
				tooltip.style.background = normalizedColor;
				tooltip.style.color =
					contrastWhite >= contrastBlack
						? Theme.WHITE_COLOR
						: Theme.BLACK_COLOR;
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
		});

		// Clean up tooltip when mouse leaves SVG
		svg.addEventListener("mouseleave", () => {
			if (currentTooltip) {
				currentTooltip.remove();
				currentTooltip = null;
				lastHoveredDay = null;
				svg.style.cursor = "default";
			}
		});

		// Add window resize handler to trigger repaint when window dimensions change
		this.resizeHandler = () => {
			// Debounce resize events to avoid excessive repaints
			clearTimeout((this as any).resizeTimeout);
			(this as any).resizeTimeout = setTimeout(() => {
				this.onOpen();
			}, 150);
		};
		window.addEventListener("resize", this.resizeHandler);

		// After drawing the grid, scroll to today if present
		const todayStr = getLocalDateString(today);
		if (dayToRect[todayStr]) {
			const { cx, cy } = dayToRect[todayStr];
			// Find the scroll wrapper (parent of svg)
			const scrollWrapper = svg.parentElement;
			if (scrollWrapper) {
				// Center today in the scroll area
				const scrollX = cx - scrollWrapper.clientWidth / 2;
				const scrollY = cy - scrollWrapper.clientHeight / 2;
				scrollWrapper.scrollTo({
					top: Math.max(0, scrollY),
					left: Math.max(0, scrollX),
					behavior: "auto",
				});
			}
		}

		// === MINIMAP IMPLEMENTATION ===
		const minimapSvg = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"svg"
		);
		// minimapWidth is already calculated above as proportional width
		const minimapHeight = minimapContainer.clientHeight || 600;
		minimapSvg.setAttribute("width", minimapWidth.toString());
		minimapSvg.setAttribute("height", minimapHeight.toString());
		minimapSvg.style.width = "100%";
		minimapSvg.style.height = "100%";
		minimapSvg.style.display = "block";
		minimapSvg.style.background = Theme.GRID_BG_COLOR;
		minimapContainer.appendChild(minimapSvg);

		// SVG minimap implementation
		if (true) {
			// Always execute SVG rendering
			// Calculate total days for configurable timeline
			const totalLifeDays = (this.plugin.settings.maxAge || 95) * 365.25; // Include leap years
			const usableHeight =
				minimapHeight - Theme.MINIMAP_VERTICAL_PADDING * 2; // Leave margin top and bottom

			// Draw life periods background first
			// const periodLineWidth = 3; // This will now use the 'gap' variable for thickness

			// Store period rectangles for hover detection
			const minimapPeriods: Array<{
				period: {
					start: string;
					end: string;
					color: string;
					label?: string;
				};
				startY: number;
				endY: number;
				height: number;
			}> = [];

			// Draw ghost period background - a subtle grey background covering the entire timeline
			const ghostPeriodRect = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"rect"
			);
			ghostPeriodRect.setAttribute("x", "0");
			ghostPeriodRect.setAttribute("y", "10"); // Match the margin
			ghostPeriodRect.setAttribute("width", gap.toString());
			ghostPeriodRect.setAttribute("height", "100%");
			ghostPeriodRect.setAttribute("fill", Theme.GHOST_PERIOD_COLOR); // Slightly lighter than background
			ghostPeriodRect.setAttribute("opacity", Theme.DECADE_LINE_OPACITY);
			minimapSvg.appendChild(ghostPeriodRect);

			for (const period of periods) {
				// Calculate start position
				const periodStartDate = new Date(period.start);
				const startDaysSinceBirth = Math.round(
					(periodStartDate.getTime() - startDate.getTime()) /
						(1000 * 60 * 60 * 24)
				);
				const startProgress =
					Math.max(0, startDaysSinceBirth) / totalLifeDays;

				// Calculate end position
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
				const endProgress = Math.min(
					1,
					endDaysSinceBirth / totalLifeDays
				);

				// Only draw if the period is within our timeline
				if (startProgress <= 1 && endProgress >= 0) {
					const startY =
						Theme.MINIMAP_VERTICAL_PADDING +
						startProgress * usableHeight;
					const endY =
						Theme.MINIMAP_VERTICAL_PADDING +
						endProgress * usableHeight;
					const height = Math.max(
						Theme.MINIMAP_MIN_HEIGHT,
						endY - startY
					); // Ensure minimum height

					const periodRect = document.createElementNS(
						"http://www.w3.org/2000/svg",
						"rect"
					);
					periodRect.setAttribute("x", "0"); // Position line on the left
					periodRect.setAttribute("y", startY.toString());
					periodRect.setAttribute("width", gap.toString()); // Set line width to the 'gap' value
					periodRect.setAttribute("height", height.toString());
					periodRect.setAttribute("fill", period.color);
					periodRect.setAttribute("opacity", Theme.PERIOD_OPACITY); // Opacity can be adjusted
					minimapSvg.appendChild(periodRect);

					// Store for hover detection
					minimapPeriods.push({
						period: period,
						startY: startY,
						endY: endY,
						height: height,
					});
				}
			}

			// Draw decade markers (subtle background lines) on top of periods
			for (let decade = 0; decade <= 90; decade += 10) {
				const decadeProgress = (decade * 365.25) / totalLifeDays;
				const y = 10 + decadeProgress * usableHeight;
				const line = document.createElementNS(
					"http://www.w3.org/2000/svg",
					"line"
				);
				line.setAttribute("x1", gap.toString()); // Start after the period lines area
				line.setAttribute("y1", y.toString());
				line.setAttribute("x2", minimapWidth.toString());
				line.setAttribute("y2", y.toString());
				line.setAttribute("stroke", Theme.DECADE_LINE_COLOR);
				line.setAttribute(
					"stroke-width",
					Theme.DECADE_LINE_STROKE_WIDTH
				);
				line.setAttribute("opacity", Theme.DECADE_LINE_OPACITY);
				minimapSvg.appendChild(line);
			}

			// Collect events (days with custom colors and eventNames)
			const events: Array<{
				date: string;
				color: string;
				eventName: string;
				daysSinceBirth: number;
			}> = [];

			// Calculate days since birth for each event
			for (const item of paintArray) {
				if (item.type === "day") {
					const fileCache = this.plugin.app.metadataCache.getCache(
						dayToFilePath[item.date]
					);
					if (
						fileCache &&
						fileCache.frontmatter &&
						typeof fileCache.frontmatter["color"] === "string" &&
						typeof fileCache.frontmatter["eventName"] === "string"
					) {
						// Calculate days since birth
						const eventDate = new Date(item.date);
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

			const minimapLineHeight = 3;

			// Draw event lines on minimap
			const minimapEvents: Array<{
				date: string;
				color: string;
				eventName: string;
				y: number;
				height: number;
			}> = [];

			events.forEach((event) => {
				// Calculate proportional position within the configurable timeline
				const lifeProgress = event.daysSinceBirth / totalLifeDays;
				const y =
					Theme.MINIMAP_VERTICAL_PADDING +
					lifeProgress * usableHeight; // Top margin
				const lineWidth = minimapWidth - 10 - gap; // Adjust width to respect period lines area

				// Draw the event line
				const eventRect = document.createElementNS(
					"http://www.w3.org/2000/svg",
					"rect"
				);
				eventRect.setAttribute(
					"x",
					(Theme.EVENT_LINE_MARGIN + gap).toString()
				); // Start after the period lines area + margin
				eventRect.setAttribute("y", y.toString());
				eventRect.setAttribute("width", lineWidth.toString());
				eventRect.setAttribute("height", minimapLineHeight.toString());
				eventRect.setAttribute("fill", event.color);
				minimapSvg.appendChild(eventRect);

				// Store for hover detection
				minimapEvents.push({
					date: event.date,
					color: event.color,
					eventName: event.eventName,
					y: y,
					height: minimapLineHeight,
				});
			});

			// Add hover functionality to minimap
			minimapSvg.addEventListener("mousemove", (e: MouseEvent) => {
				const rect = minimapSvg.getBoundingClientRect();
				const mx = e.clientX - rect.left;
				const my = e.clientY - rect.top;

				// Always create/update tooltip showing age at current position
				if (!tooltipDiv) {
					tooltipDiv = document.createElement("div");
					tooltipDiv.style.position = "fixed";
					tooltipDiv.style.pointerEvents = "auto";
					tooltipDiv.style.background = Theme.TOOLTIP_BG_COLOR;
					tooltipDiv.style.padding = Theme.TOOLTIP_PADDING;
					tooltipDiv.style.borderRadius = Theme.TOOLTIP_BORDER_RADIUS;
					tooltipDiv.style.fontSize = Theme.TOOLTIP_FONT_SIZE;
					tooltipDiv.style.fontWeight = "bold";
					tooltipDiv.style.zIndex = "9999";
					document.body.appendChild(tooltipDiv);

					// Hide tooltip when hovering over it
					const currentTooltipDiv = tooltipDiv;
					tooltipDiv.addEventListener("mouseenter", () => {
						currentTooltipDiv.remove();
						if (tooltipDiv === currentTooltipDiv) {
							tooltipDiv = null;
						}
						minimapSvg.style.cursor = "default";
					});
				}

				// Calculate age based on Y position
				const relativeY = Math.max(0, my - 10); // Subtract top margin
				const progress = Math.min(1, relativeY / usableHeight);
				const daysFromBirth = progress * totalLifeDays;
				const ageAtPosition = daysFromBirth / 365.25;
				const ageString = `${Math.floor(ageAtPosition)}yo`;

				let tooltipText = ageString;
				let isSpecialItem = false;
				let specialColor = Theme.TOOLTIP_TEXT_COLOR;

				// Check for period rectangles (they are on the left side, x=0 to gap)
				if (mx >= 0 && mx <= gap) {
					for (const periodData of minimapPeriods) {
						if (my >= periodData.startY && my <= periodData.endY) {
							minimapSvg.style.cursor = "pointer";
							isSpecialItem = true;

							// Calculate start and end ages for the period
							const periodStartDate = new Date(
								periodData.period.start
							);
							const startAge = calculateAge(
								startDate,
								periodStartDate
							);

							let endAge: string;
							let endDateStr: string;
							if (
								periodData.period.end.trim() === "" ||
								periodData.period.end.toLowerCase() ===
									"present"
							) {
								endAge = calculateAge(startDate, today);
								endDateStr = "present";
							} else {
								const periodEndDate = new Date(
									periodData.period.end
								);
								endAge = calculateAge(startDate, periodEndDate);
								endDateStr = periodData.period.end;
							}

							// Build enhanced tooltip text
							const periodLabel =
								periodData.period.label || "Unnamed Period";
							tooltipText = `${ageString} — ${periodLabel} (${startAge}yo to ${endAge}yo)`;
							specialColor = periodData.period.color;
							break;
						}
					}
				}

				// If not in period area, check for events (they are on the right side)
				if (!isSpecialItem) {
					for (const event of minimapEvents) {
						if (my >= event.y && my <= event.y + event.height) {
							minimapSvg.style.cursor = "pointer";
							isSpecialItem = true;

							// Calculate age for this event
							const eventDate = new Date(event.date);
							const age = calculateAge(startDate, eventDate);

							tooltipText = `${age}yo ${event.date} — ${event.eventName}`;
							specialColor = event.color;
							break;
						}
					}
				}

				// Set default cursor if not hovering over special items
				if (!isSpecialItem) {
					minimapSvg.style.cursor = "default";
				}

				// Update tooltip content
				tooltipDiv.textContent = tooltipText;

				// Apply color styling
				if (
					isSpecialItem &&
					specialColor !== Theme.TOOLTIP_TEXT_COLOR &&
					specialColor !== Theme.SQUARE_DEFAULT_COLOR
				) {
					const normalizedColor = colorToHex(specialColor);
					const isLight =
						getLuminance(normalizedColor) >
						Theme.LIGHT_COLOR_THRESHOLD;
					const isVeryDark =
						getLuminance(normalizedColor) <
						Theme.VERY_DARK_COLOR_THRESHOLD;

					if (isVeryDark) {
						tooltipDiv.style.background = Theme.TOOLTIP_BG_COLOR;
						tooltipDiv.style.color = Theme.WHITE_COLOR;
					} else if (isLight) {
						tooltipDiv.style.color = normalizedColor;
						tooltipDiv.style.background = Theme.TOOLTIP_BG_COLOR;
					} else {
						const contrastWhite =
							(getLuminance(Theme.WHITE_COLOR) +
								Theme.CONTRAST_OFFSET) /
							(getLuminance(normalizedColor) +
								Theme.CONTRAST_OFFSET);
						const contrastBlack =
							(getLuminance(normalizedColor) +
								Theme.CONTRAST_OFFSET) /
							(getLuminance(Theme.BLACK_COLOR) +
								Theme.CONTRAST_OFFSET);
						tooltipDiv.style.background = normalizedColor;
						tooltipDiv.style.color =
							contrastWhite >= contrastBlack
								? Theme.WHITE_COLOR
								: Theme.BLACK_COLOR;
					}
				} else {
					tooltipDiv.style.color = Theme.TOOLTIP_TEXT_COLOR;
					tooltipDiv.style.background = Theme.TOOLTIP_BG_COLOR;
				}

				// Position tooltip to the left of minimap
				tooltipDiv.style.left =
					e.clientX - (tooltipDiv.offsetWidth || 200) - 16 + "px";
				tooltipDiv.style.top = e.clientY + 8 + "px";
			});

			minimapSvg.addEventListener("mouseleave", () => {
				if (tooltipDiv) {
					tooltipDiv.remove();
					tooltipDiv = null;
				}
			});

			// Add click functionality to minimap to scroll to event
			let lastClickedEvent: string | null = null;
			let lastClickTime = 0;
			const DOUBLE_CLICK_THRESHOLD = 500; // milliseconds

			minimapSvg.addEventListener("click", async (e: MouseEvent) => {
				const rect = minimapSvg.getBoundingClientRect();
				const mx = e.clientX - rect.left;
				const my = e.clientY - rect.top;
				const currentTime = Date.now();

				// Check for period clicks first (they are on the left side, x=0 to gap)
				if (mx >= 0 && mx <= gap) {
					for (const periodData of minimapPeriods) {
						if (my >= periodData.startY && my <= periodData.endY) {
							// Clean up any existing tooltips before navigation
							if (tooltipDiv) {
								tooltipDiv.remove();
								tooltipDiv = null;
								minimapSvg.style.cursor = "default";
							}

							// Scroll to the start of the period in the main grid
							const periodStartDate = new Date(
								periodData.period.start
							);
							const startDateString = periodStartDate
								.toISOString()
								.split("T")[0];

							if (dayToRect[startDateString]) {
								const { cx, cy } = dayToRect[startDateString];
								const scrollX =
									cx - scrollWrapper.clientWidth / 2;
								const scrollY =
									cy - scrollWrapper.clientHeight / 2;
								scrollWrapper.scrollTo({
									top: Math.max(0, scrollY),
									left: Math.max(0, scrollX),
									behavior: "smooth",
								});
							}
							return; // Exit early, don't check for events
						}
					}
				}

				// Check for event clicks (they are on the right side)
				for (const event of minimapEvents) {
					if (my >= event.y && my <= event.y + event.height) {
						// Check if this is a second click on the same event within the threshold
						if (
							lastClickedEvent === event.date &&
							currentTime - lastClickTime < DOUBLE_CLICK_THRESHOLD
						) {
							// Clean up any existing tooltips before navigation
							if (tooltipDiv) {
								tooltipDiv.remove();
								tooltipDiv = null;
								minimapSvg.style.cursor = "default";
							}

							// Second click: open the daily note
							const filePath = dayToFilePath[event.date];
							if (filePath) {
								// Open in current Life Grid tab instead of new tab
								const file =
									this.plugin.app.vault.getAbstractFileByPath(
										filePath
									);
								if (file instanceof TFile) {
									await this.leaf.openFile(file);
								}
							} else {
								// Create new file and open in current tab
								const newFile =
									await this.plugin.app.vault.create(
										this.getDailyNoteFilePath(event.date),
										`# ${event.date}\n`
									);
								await this.leaf.openFile(newFile);
							}
							// Reset tracking to prevent triple-click issues
							lastClickedEvent = null;
							lastClickTime = 0;
						} else {
							// First click: scroll to the event in the main grid
							if (dayToRect[event.date]) {
								const { cx, cy } = dayToRect[event.date];
								const scrollX =
									cx - scrollWrapper.clientWidth / 2;
								const scrollY =
									cy - scrollWrapper.clientHeight / 2;
								scrollWrapper.scrollTo({
									top: Math.max(0, scrollY),
									left: Math.max(0, scrollX),
									behavior: "smooth",
								});
							}
							// Track this click for potential second click
							lastClickedEvent = event.date;
							lastClickTime = currentTime;
						}
						break;
					}
				}
			});
		}

		// Handle click events for regular days (non-milestone events)
		svg.addEventListener("mousedown", async (e: MouseEvent) => {
			// Only handle left-click (0) and middle-click (1)
			if (e.button !== 0 && e.button !== 1) {
				return;
			}

			const rect = svg.getBoundingClientRect();
			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;

			// Use spatial index for ultra-fast collision detection
			const nearbyCells = getNearbyCells(mx, my);
			for (const day of nearbyCells) {
				const hitRadius = Math.max(day.radius * 1.1, day.radius + 3);
				const dist = Math.sqrt((mx - day.cx) ** 2 + (my - day.cy) ** 2);
				if (dist <= hitRadius) {
					// Clean up any existing tooltips before navigation
					if (currentTooltip) {
						currentTooltip.remove();
						currentTooltip = null;
						lastHoveredDay = null;
						svg.style.cursor = "default";
					}

					const filePath = dayToFilePath[day.date];
					if (filePath) {
						const file =
							this.plugin.app.vault.getAbstractFileByPath(
								filePath
							);
						if (file instanceof TFile) {
							if (e.button === 1) {
								// Middle-click: open in new tab
								await this.plugin.openFileInNewTab(file);
							} else {
								// Left-click: open in current Life Grid tab
								await this.leaf.openFile(file);
							}
						}
					} else {
						// Create new file
						const newFile = await this.plugin.app.vault.create(
							this.getDailyNoteFilePath(day.date),
							`# ${day.date}\n`
						);
						if (e.button === 1) {
							// Middle-click: open in new tab
							await this.plugin.openFileInNewTab(newFile);
						} else {
							// Left-click: open in current tab
							await this.leaf.openFile(newFile);
						}
					}
					break;
				}
			}
		});
	}

	async onClose() {
		// Clean up resize handler when view is closed
		if (this.resizeHandler) {
			window.removeEventListener("resize", this.resizeHandler);
			this.resizeHandler = undefined;
		}

		// Clean up scroll handler when view is closed
		if (this.scrollHandler) {
			const scrollWrapper = this.containerEl.querySelector(
				'div[style*="overflow: auto"]'
			);
			if (scrollWrapper) {
				scrollWrapper.removeEventListener("scroll", this.scrollHandler);
			}
			this.scrollHandler = undefined;
		}

		// Clear any pending resize timeout
		if ((this as any).resizeTimeout) {
			clearTimeout((this as any).resizeTimeout);
			(this as any).resizeTimeout = undefined;
		}

		// Clean up any remaining tooltips that might be attached to the document
		const tooltips = document.querySelectorAll(
			'div[style*="position: fixed"][style*="z-index: 9999"]'
		);
		tooltips.forEach((tooltip) => tooltip.remove());
	}
}

export default class LifeGridPlugin extends Plugin {
	settings: LifeGridSettings;

	async onload() {
		await this.loadSettings();

		// Add a ribbon icon to open the Life Grid
		const lifeGridRibbonIconEl = this.addRibbonIcon(
			"layout-grid",
			"Open Life Grid",
			(evt: MouseEvent) => {
				// Check for middle-click (button === 1) to open in new tab
				if (evt.button === 1) {
					this.activateLifeGridViewInNewTab();
				} else {
					// Left-click (button === 0) opens in same tab
					this.activateLifeGridView();
				}
			}
		);

		lifeGridRibbonIconEl.addClass("life-grid-ribbon-class");

		// Register the Life Grid view
		this.registerView(
			LIFE_GRID_VIEW_TYPE,
			(leaf) => new LifeGridView(leaf, this)
		);

		// Add a command to open the Life Grid view
		this.addCommand({
			id: "open-life-grid-view",
			name: "Open Life Grid View",
			callback: () => {
				this.activateLifeGridView();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new LifeGridSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateLifeGridView() {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(LIFE_GRID_VIEW_TYPE)[0];
		if (!leaf) {
			// Always get a leaf in the main panel (not sidebar panels)
			// This ensures the Life Grid opens in the main editing area
			const activeLeaf = workspace.activeLeaf;

			// Check if the active leaf is in the main panel and is replaceable
			if (activeLeaf && activeLeaf.parent === workspace.rootSplit) {
				const currentView = activeLeaf.view;
				// Only replace if it's a file view or empty view, not special views
				if (
					currentView &&
					(currentView.getViewType() === "empty" ||
						"file" in currentView)
				) {
					leaf = activeLeaf;
					await leaf.setViewState({
						type: LIFE_GRID_VIEW_TYPE,
						active: true,
					});
				} else {
					// Create a new tab in the main panel
					leaf = workspace.getLeaf("tab");
					await leaf.setViewState({
						type: LIFE_GRID_VIEW_TYPE,
						active: true,
					});
				}
			} else {
				// No active leaf in main panel or active leaf is in sidebar - create new tab
				leaf = workspace.getLeaf("tab");
				await leaf.setViewState({
					type: LIFE_GRID_VIEW_TYPE,
					active: true,
				});
			}
		}
		workspace.revealLeaf(leaf);
	}

	async activateLifeGridViewInNewTab() {
		const { workspace } = this.app;
		const leaf = workspace.getLeaf("tab");
		await leaf.setViewState({
			type: LIFE_GRID_VIEW_TYPE,
			active: true,
		});
		workspace.revealLeaf(leaf);
	}

	async openFileInNewTab(file: TFile) {
		const { workspace } = this.app;
		const leaf = workspace.getLeaf("tab");
		await leaf.openFile(file);
		workspace.revealLeaf(leaf);
	}
}
