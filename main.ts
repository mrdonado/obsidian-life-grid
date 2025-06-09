import {
	App,
	TFile,
	Plugin,
	PluginSettingTab,
	Setting,
	ItemView,
	WorkspaceLeaf,
} from "obsidian";

interface LifeGridSettings {
	birthday?: string; // ISO date string
	maxAge?: number; // Maximum age to display in years (default: 95)
	dailyNoteFormat?: string; // Date format for daily notes (default: YYYY-MM-DD)
	dailyNoteFolder?: string; // Folder path for daily notes (default: "" - root)
	periods?: Array<{
		start: string;
		end: string;
		color: string;
		label?: string;
	}>;
}

const DEFAULT_SETTINGS: LifeGridSettings = {
	birthday: "",
	maxAge: 95,
	dailyNoteFormat: "YYYY-MM-DD", // Obsidian's default format
	dailyNoteFolder: "", // Obsidian's default (root of vault)
	periods: [],
};

const LIFE_GRID_VIEW_TYPE = "life-grid-view";

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
		const headerSquares = 4; // number of squares to use for year label
		const years = YEARS;
		const gap = 10; // Consistent gap between grid and minimap
		const containerWidth = container.clientWidth || 800;
		// Fixed day dot size - no longer responsive to screen size
		const squareSize = 7.5; // Constant size for all day dots
		// Make minimap width fixed to match 5 dots of the grid
		const minimapDots = 5; // Number of dots to match for minimap width
		const minimapWidth = minimapDots * (squareSize + gap) - gap; // Width of 5 dots: 5 * (7.5 + 10) - 10 = 77.5px
		const minimapSpaceReserved = minimapWidth + gap;
		// Add extra margin to ensure all dots fit comfortably
		const gridMargin = 20; // Extra margin for safety
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
		// Use GRID_BG_COLOR for SVG background
		const GRID_BG_COLOR = "#181a1b";
		svg.style.background = GRID_BG_COLOR;
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
		minimapContainer.style.backgroundColor = GRID_BG_COLOR;
		minimapContainer.style.borderRadius = "4px";
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

		// === Life Grid Style Variables ===
		const SQUARE_DEFAULT_COLOR = "#23272e"; // Very dark, just above background
		const SQUARE_BORDER_COLOR = "#23272e"; // Subtle dark border
		const SQUARE_BORDER_WIDTH = 1;
		const SQUARE_NOTE_COLOR = "#6fcf97"; // Natural green for notes (fallback)
		const SQUARE_TODAY_BORDER_COLOR = "#ffe082"; // Warm yellow highlight for today
		const SQUARE_TODAY_BORDER_WIDTH = 2;
		const CIRCLE_GAP = 0.9; // Fill most of the square space
		const YEAR_HEADER_BG_COLOR = "#23272e"; // Slightly lighter than background
		const YEAR_HEADER_TEXT_COLOR = "#e0e0e0"; // Soft off-white
		const TOOLTIP_BG_COLOR = "#23272e";
		const TOOLTIP_TEXT_COLOR = "#ffe082"; // Warm yellow for tooltip text
		const TOOLTIP_FONT_SIZE = "16px";
		const TOOLTIP_PADDING = "6px 14px";
		const TOOLTIP_BORDER_RADIUS = "8px";

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
				ageInMilliseconds / (1000 * 60 * 60 * 24 * 365.25);
			// Floor to whole years, then add decimal part
			const wholeYears = Math.floor(ageInYears);
			const decimalPart = ageInYears - wholeYears;
			return (wholeYears + Math.floor(decimalPart * 10) / 10).toFixed(1);
		}

		// Helper to get luminance of a color
		function getLuminance(hex: string): number {
			hex = hex.replace("#", "");
			if (hex.length === 3) {
				hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
			}
			const r = parseInt(hex.substr(0, 2), 16) / 255;
			const g = parseInt(hex.substr(2, 2), 16) / 255;
			const b = parseInt(hex.substr(4, 2), 16) / 255;
			const a = [r, g, b].map((v) =>
				v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
			);
			return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
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
				return SQUARE_NOTE_COLOR; // Fallback to default green
			}

			const luminance = getLuminance(periodColor);

			// If the period color is dark, make note color lighter
			// If the period color is light, make note color darker
			if (luminance < 0.5) {
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
				let color = SQUARE_DEFAULT_COLOR;
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
					(isEvent ? CIRCLE_GAP * 1.25 : CIRCLE_GAP * 1.225);

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
					color === SQUARE_DEFAULT_COLOR
						? SQUARE_BORDER_COLOR
						: "none";
				const strokeWidth =
					color === SQUARE_DEFAULT_COLOR ? SQUARE_BORDER_WIDTH : 0;
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
				? "#ffe082" // Yellowish background for milestones
				: YEAR_HEADER_BG_COLOR; // Default background for regular years
			const textColor = isFiveYearMilestone
				? "#1a1a1a" // Dark font for milestone years
				: YEAR_HEADER_TEXT_COLOR; // Default text color for regular years

			// Create a larger background rectangle that can slightly invade surrounding dots' space
			// Since this is painted before dots, dots will appear on top
			const horizontalPadding = -1; // Smaller horizontal extension to balance spacing
			const heightExtension = 4; // Extra height to make it more prominent
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
				(year.y - 3 - heightExtension / 2).toString()
			);
			headerRect.setAttribute(
				"width",
				(year.width - horizontalPadding * 2).toString()
			);
			headerRect.setAttribute(
				"height",
				(year.height + 6 + heightExtension).toString()
			);
			headerRect.setAttribute("fill", headerBgColor);
			headerRect.setAttribute("rx", "4"); // Slightly more rounded corners for larger rectangle

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
			yearText.setAttribute("font-family", "sans-serif");
			yearText.setAttribute("font-size", "12px");
			yearText.setAttribute(
				"filter",
				"drop-shadow(0 0 2px rgba(0,0,0,1))"
			);
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
				borderPath.setAttribute("stroke", SQUARE_TODAY_BORDER_COLOR);
				borderPath.setAttribute(
					"stroke-width",
					SQUARE_TODAY_BORDER_WIDTH.toString()
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
			tooltip.style.background = TOOLTIP_BG_COLOR;
			tooltip.style.padding = TOOLTIP_PADDING;
			tooltip.style.borderRadius = TOOLTIP_BORDER_RADIUS;
			tooltip.style.fontSize = TOOLTIP_FONT_SIZE;
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

			const isLight = luminanceValue > 0.5;
			const isVeryDark = luminanceValue < 0.08;

			if (isVeryDark) {
				tooltip.style.background = TOOLTIP_BG_COLOR;
				tooltip.style.color = "#fff";
			} else if (isLight) {
				tooltip.style.color = normalizedColor;
				tooltip.style.background = TOOLTIP_BG_COLOR;
			} else {
				const whiteLuminance = getLuminance("#fff"); // Uses onOpen-scoped getLuminance
				const blackLuminance = getLuminance("#000"); // Uses onOpen-scoped getLuminance

				const contrastWhite =
					(whiteLuminance + 0.05) / (luminanceValue + 0.05);
				const contrastBlack =
					(luminanceValue + 0.05) / (blackLuminance + 0.05);
				tooltip.style.background = normalizedColor;
				tooltip.style.color =
					contrastWhite >= contrastBlack ? "#fff" : "#000";
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
		minimapSvg.style.background = GRID_BG_COLOR;
		minimapContainer.appendChild(minimapSvg);

		// SVG minimap implementation
		if (true) {
			// Always execute SVG rendering
			// Calculate total days for configurable timeline
			const totalLifeDays = (this.plugin.settings.maxAge || 95) * 365.25; // Include leap years
			const usableHeight = minimapHeight - 20; // Leave 10px margin top and bottom

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
			ghostPeriodRect.setAttribute("fill", "#555"); // Slightly lighter than background
			ghostPeriodRect.setAttribute("opacity", "0.3");
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
					const startY = 10 + startProgress * usableHeight;
					const endY = 10 + endProgress * usableHeight;
					const height = Math.max(1, endY - startY); // Ensure minimum height of 1px

					const periodRect = document.createElementNS(
						"http://www.w3.org/2000/svg",
						"rect"
					);
					periodRect.setAttribute("x", "0"); // Position line on the left
					periodRect.setAttribute("y", startY.toString());
					periodRect.setAttribute("width", gap.toString()); // Set line width to the 'gap' value
					periodRect.setAttribute("height", height.toString());
					periodRect.setAttribute("fill", period.color);
					periodRect.setAttribute("opacity", "0.8"); // Opacity can be adjusted
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
				line.setAttribute("stroke", "#333");
				line.setAttribute("stroke-width", "1");
				line.setAttribute("opacity", "0.3");
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
				const y = 10 + lifeProgress * usableHeight; // 10px top margin
				const lineWidth = minimapWidth - 10 - gap; // Adjust width to respect period lines area

				// Draw the event line
				const eventRect = document.createElementNS(
					"http://www.w3.org/2000/svg",
					"rect"
				);
				eventRect.setAttribute("x", (5 + gap).toString()); // Start after the period lines area + 5px margin
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
					tooltipDiv.style.background = TOOLTIP_BG_COLOR;
					tooltipDiv.style.padding = TOOLTIP_PADDING;
					tooltipDiv.style.borderRadius = TOOLTIP_BORDER_RADIUS;
					tooltipDiv.style.fontSize = TOOLTIP_FONT_SIZE;
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
				let specialColor = TOOLTIP_TEXT_COLOR;

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
					specialColor !== TOOLTIP_TEXT_COLOR &&
					specialColor !== SQUARE_DEFAULT_COLOR
				) {
					const normalizedColor = colorToHex(specialColor);
					const isLight = getLuminance(normalizedColor) > 0.5;
					const isVeryDark = getLuminance(normalizedColor) < 0.08;

					if (isVeryDark) {
						tooltipDiv.style.background = TOOLTIP_BG_COLOR;
						tooltipDiv.style.color = "#fff";
					} else if (isLight) {
						tooltipDiv.style.color = normalizedColor;
						tooltipDiv.style.background = TOOLTIP_BG_COLOR;
					} else {
						const contrastWhite =
							(getLuminance("#fff") + 0.05) /
							(getLuminance(normalizedColor) + 0.05);
						const contrastBlack =
							(getLuminance(normalizedColor) + 0.05) /
							(getLuminance("#000") + 0.05);
						tooltipDiv.style.background = normalizedColor;
						tooltipDiv.style.color =
							contrastWhite >= contrastBlack ? "#fff" : "#000";
					}
				} else {
					tooltipDiv.style.color = TOOLTIP_TEXT_COLOR;
					tooltipDiv.style.background = TOOLTIP_BG_COLOR;
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
				if (currentView && (currentView.getViewType() === "empty" || "file" in currentView)) {
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

class LifeGridSettingTab extends PluginSettingTab {
	plugin: LifeGridPlugin;

	constructor(app: App, plugin: LifeGridPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// Add a setting for the user's birthday
		new Setting(containerEl)
			.setName("Birthday")
			.setDesc("Your birthday (YYYY-MM-DD) to start the life grid.")
			.addText((text) => {
				text.setPlaceholder("YYYY-MM-DD")
					.setValue(this.plugin.settings.birthday || "")
					.onChange(async (value) => {
						this.plugin.settings.birthday = value;
						await this.plugin.saveSettings();
					});
			});

		// Add a setting for maximum age
		new Setting(containerEl)
			.setName("Maximum Age")
			.setDesc("Maximum age to display in the life grid (in years).")
			.addText((text) => {
				text.setPlaceholder("95")
					.setValue((this.plugin.settings.maxAge || 95).toString())
					.onChange(async (value) => {
						const maxAge = parseInt(value);
						if (!isNaN(maxAge) && maxAge > 0 && maxAge <= 150) {
							this.plugin.settings.maxAge = maxAge;
							await this.plugin.saveSettings();
						}
					});
			});

		// Daily Notes Section
		containerEl.createEl("h3", { text: "Daily Notes Configuration" });
		containerEl.createEl("p", {
			text: "Configure how daily notes are detected and created. These settings should match your Obsidian daily notes plugin configuration.",
		});

		// Daily notes format setting
		new Setting(containerEl)
			.setName("Daily Note Format")
			.setDesc(
				"Date format pattern for daily note filenames (e.g., YYYY-MM-DD, YYYY_MM_DD, DD-MM-YYYY)"
			)
			.addText((text) => {
				text.setPlaceholder("YYYY-MM-DD")
					.setValue(
						this.plugin.settings.dailyNoteFormat || "YYYY-MM-DD"
					)
					.onChange(async (value) => {
						this.plugin.settings.dailyNoteFormat =
							value || "YYYY-MM-DD";
						await this.plugin.saveSettings();
					});
			});

		// Daily notes folder setting
		new Setting(containerEl)
			.setName("Daily Notes Folder")
			.setDesc(
				"Folder path where daily notes are stored. Leave empty for vault root, or specify folder like 'Daily Notes' or 'Journal/Daily'. The plugin will search this folder and all subfolders for daily notes."
			)
			.addText((text) => {
				text.setPlaceholder("e.g., Daily Notes")
					.setValue(this.plugin.settings.dailyNoteFolder || "")
					.onChange(async (value) => {
						this.plugin.settings.dailyNoteFolder = value || "";
						await this.plugin.saveSettings();
					});
			});

		// Life Periods Section
		containerEl.createEl("h3", { text: "Life Periods" });
		containerEl.createEl("p", {
			text: "Define colored periods for your life grid. Each period will color the background of days within that date range.",
		});

		// Container for all periods
		const periodsContainer = containerEl.createEl("div");
		periodsContainer.style.marginBottom = "20px";

		const renderPeriods = () => {
			periodsContainer.empty();

			const periods = this.plugin.settings.periods || [];

			periods.forEach((period, index) => {
				const periodDiv = periodsContainer.createEl("div");
				periodDiv.style.border =
					"1px solid var(--background-modifier-border)";
				periodDiv.style.borderRadius = "8px";
				periodDiv.style.padding = "16px";
				periodDiv.style.marginBottom = "12px";
				periodDiv.style.backgroundColor = "var(--background-secondary)";

				// Period header with label and delete button
				const headerDiv = periodDiv.createEl("div");
				headerDiv.style.display = "flex";
				headerDiv.style.justifyContent = "space-between";
				headerDiv.style.alignItems = "center";
				headerDiv.style.marginBottom = "12px";

				const headerLabel = headerDiv.createEl("h4");
				headerLabel.textContent = period.label || `Period ${index + 1}`;
				headerLabel.style.margin = "0";
				headerLabel.style.color = period.color || "var(--text-normal)";

				const deleteButton = headerDiv.createEl("button");
				deleteButton.textContent = "Delete";
				deleteButton.className = "mod-destructive";
				deleteButton.style.padding = "4px 8px";
				deleteButton.style.fontSize = "12px";
				deleteButton.onclick = async () => {
					this.plugin.settings.periods?.splice(index, 1);
					await this.plugin.saveSettings();
					renderPeriods();
				};

				// Label setting
				new Setting(periodDiv)
					.setName("Label")
					.setDesc("A descriptive name for this period")
					.addText((text) => {
						text.setPlaceholder(
							"e.g., Childhood, University, Career"
						)
							.setValue(period.label || "")
							.onChange(async (value) => {
								if (this.plugin.settings.periods) {
									this.plugin.settings.periods[index].label =
										value;
									await this.plugin.saveSettings();
									renderPeriods();
								}
							});
					});

				// Start date setting
				new Setting(periodDiv)
					.setName("Start Date")
					.setDesc("When this period begins (YYYY-MM-DD)")
					.addText((text) => {
						text.setPlaceholder("YYYY-MM-DD")
							.setValue(period.start)
							.onChange(async (value) => {
								if (this.plugin.settings.periods) {
									this.plugin.settings.periods[index].start =
										value;
									await this.plugin.saveSettings();
								}
							});
					});

				// End date setting
				new Setting(periodDiv)
					.setName("End Date")
					.setDesc(
						"When this period ends (YYYY-MM-DD). Leave empty or use 'present' for ongoing periods."
					)
					.addText((text) => {
						text.setPlaceholder("YYYY-MM-DD or 'present'")
							.setValue(period.end)
							.onChange(async (value) => {
								if (this.plugin.settings.periods) {
									this.plugin.settings.periods[index].end =
										value;
									await this.plugin.saveSettings();
								}
							});
					});

				// Color setting
				new Setting(periodDiv)
					.setName("Color")
					.setDesc("Background color for this period")
					.addColorPicker((color) => {
						color.setValue(period.color).onChange(async (value) => {
							if (this.plugin.settings.periods) {
								this.plugin.settings.periods[index].color =
									value;
								await this.plugin.saveSettings();
								renderPeriods();
							}
						});
					});
			});

			// Add new period button
			const addButton = periodsContainer.createEl("button");
			addButton.textContent = "+ Add New Period";
			addButton.className = "mod-cta";
			addButton.style.width = "100%";
			addButton.style.padding = "12px";
			addButton.style.marginTop = "8px";
			addButton.onclick = async () => {
				if (!this.plugin.settings.periods) {
					this.plugin.settings.periods = [];
				}
				this.plugin.settings.periods.push({
					start: "",
					end: "",
					color: "#4E8C8C",
					label: "",
				});
				await this.plugin.saveSettings();
				renderPeriods();
			};

			// Advanced JSON editor (collapsible)
			const advancedDiv = periodsContainer.createEl("div");
			advancedDiv.style.marginTop = "20px";

			const toggleButton = advancedDiv.createEl("button");
			toggleButton.textContent = "▶ Advanced: Edit as JSON";
			toggleButton.style.background = "none";
			toggleButton.style.border = "none";
			toggleButton.style.color = "var(--text-muted)";
			toggleButton.style.cursor = "pointer";
			toggleButton.style.fontSize = "14px";

			const jsonContainer = advancedDiv.createEl("div");
			jsonContainer.style.display = "none";
			jsonContainer.style.marginTop = "8px";

			let isJsonVisible = false;

			toggleButton.onclick = () => {
				isJsonVisible = !isJsonVisible;
				jsonContainer.style.display = isJsonVisible ? "block" : "none";
				toggleButton.textContent = isJsonVisible
					? "▼ Advanced: Edit as JSON"
					: "▶ Advanced: Edit as JSON";

				if (isJsonVisible) {
					// Render JSON editor
					jsonContainer.empty();

					new Setting(jsonContainer)
						.setName("JSON Configuration")
						.setDesc("Edit periods as JSON (for advanced users)")
						.addTextArea((text) => {
							text.setPlaceholder("[]")
								.setValue(
									JSON.stringify(
										this.plugin.settings.periods || [],
										null,
										2
									)
								)
								.onChange(async (value) => {
									try {
										const parsed = JSON.parse(value);
										this.plugin.settings.periods = parsed;
										await this.plugin.saveSettings();
										renderPeriods();
									} catch (e) {
										// Show error in a subtle way
										text.inputEl.style.borderColor =
											"var(--text-error)";
										setTimeout(() => {
											text.inputEl.style.borderColor = "";
										}, 2000);
									}
								});
							text.inputEl.rows = 8;
							text.inputEl.style.width = "100%";
							text.inputEl.style.fontFamily = "monospace";
							text.inputEl.style.fontSize = "12px";
						});
				}
			};
		};

		// Initial render
		renderPeriods();
	}
}
