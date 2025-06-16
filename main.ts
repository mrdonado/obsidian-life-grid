import { TFile, Plugin, ItemView, WorkspaceLeaf } from "obsidian";
import {
	formatToRegex,
	isInDailyNotesFolder,
	getFormattedDateString,
} from "./src/utils/dailyNotesUtils";
import {
	createLifeGridSVG,
	createMinimapSVG,
	LifeGridRenderConfig,
	UIInteractionConfig,
	setupUIInteractions,
} from "./src/utils/renderUtils";
import { LifeGridSettingTab } from "./src/LifeGridSettingTab";
import {
	LifeGridSettings,
	DEFAULT_SETTINGS,
	LIFE_GRID_VIEW_TYPE,
} from "./src/types/Settings";

export default class LifeGridPlugin extends Plugin {
	settings: LifeGridSettings;

	async onload() {
		await this.loadSettings();

		// Add a ribbon icon to open the Life Grid
		const lifeGridRibbonIconEl = this.addRibbonIcon(
			"layout-grid",
			"Open Life Grid",
			(evt: MouseEvent) => {
				this.activateLifeGridViewInNewTab();
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
			name: "Open view",
			callback: () => {
				this.activateLifeGridViewInNewTab();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new LifeGridSettingTab(this.app, this));
	}

	onunload() {
		// Plugin cleanup - most cleanup is handled by individual views
		// in their onClose() methods, but we can add any plugin-wide cleanup here
	}

	async loadSettings() {
		try {
			const loadedData = await this.loadData();
			this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
			// Validate critical settings
			this.validateSettings();
		} catch (error) {
			console.error("Life Grid: Failed to load settings:", error);
			this.settings = { ...DEFAULT_SETTINGS };
		}
	}

	async saveSettings() {
		try {
			await this.saveData(this.settings);
		} catch (error) {
			console.error("Life Grid: Failed to save settings:", error);
		}
	}

	private validateSettings() {
		// Validate birthday format
		if (
			this.settings.birthday &&
			!/^\d{4}-\d{2}-\d{2}$/.test(this.settings.birthday)
		) {
			console.warn(
				"Life Grid: Invalid birthday format, resetting to default"
			);
			this.settings.birthday = DEFAULT_SETTINGS.birthday;
		}

		// Validate maxAge
		if (
			typeof this.settings.maxAge !== "number" ||
			this.settings.maxAge < 1 ||
			this.settings.maxAge > 150
		) {
			console.warn("Life Grid: Invalid maxAge, resetting to default");
			this.settings.maxAge = DEFAULT_SETTINGS.maxAge;
		}

		// Validate periods array
		if (!Array.isArray(this.settings.periods)) {
			console.warn(
				"Life Grid: Invalid periods array, resetting to default"
			);
			this.settings.periods = DEFAULT_SETTINGS.periods || [];
		}
	}

	async activateLifeGridViewInNewTab() {
		try {
			const { workspace } = this.app;
			// Use more compatible API for older Obsidian versions
			const leaf = workspace.getLeaf(false);
			await leaf.setViewState({
				type: LIFE_GRID_VIEW_TYPE,
				active: true,
			});
			workspace.revealLeaf(leaf);
		} catch (error) {
			console.error("Life Grid: Failed to activate view:", error);
		}
	}

	async openFileInNewTab(file: TFile) {
		try {
			const { workspace } = this.app;
			// Use more compatible API for older Obsidian versions
			const leaf = workspace.getLeaf(false);
			await leaf.openFile(file);
			workspace.revealLeaf(leaf);
		} catch (error) {
			console.error("Life Grid: Failed to open file in new tab:", error);
		}
	}
}

class LifeGridView extends ItemView {
	plugin: LifeGridPlugin;
	private resizeHandler?: () => void;
	private resizeTimeout?: NodeJS.Timeout;
	private cleanupFunctions: (() => void)[] = [];

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

	async onOpen() {
		try {
			await this.renderLifeGrid();
		} catch (error) {
			console.error("Life Grid: Failed to render life grid:", error);
			this.showError(
				"Failed to render Life Grid. Please check your settings and try again."
			);
		}
	}

	private showError(message: string) {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h2", { text: "Life Grid" });
		container.createEl("div", {
			text: message,
			cls: "mod-warning",
		});
	}

	private async renderLifeGrid() {
		const container = this.containerEl.children[1];
		container.empty();
		const title = container.createEl("h2", { text: "Life Grid" });
		title.addClass("life-grid-title");
		title.addEventListener("click", () => {
			this.onOpen();
		});

		const birthday = this.plugin.settings.birthday;
		if (!birthday) {
			container.createEl("div", {
				text: "Please set your birthday in the plugin settings.",
				cls: "mod-warning",
			});
			return;
		}

		// Validate birthday format and date
		if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
			container.createEl("div", {
				text: "Invalid birthday format. Please use YYYY-MM-DD format in settings.",
				cls: "mod-warning",
			});
			return;
		}

		const startDate = new Date(birthday);
		if (isNaN(startDate.getTime())) {
			container.createEl("div", {
				text: "Invalid birthday date. Please check your settings.",
				cls: "mod-warning",
			});
			return;
		}

		const endDate = new Date(startDate);
		const YEARS = this.plugin.settings.maxAge || 95;
		endDate.setFullYear(startDate.getFullYear() + YEARS);
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Get all daily notes
		const files = this.plugin.app.vault.getFiles();
		const dailyNoteSet = new Set<string>();
		const dailyNoteFormat =
			this.plugin.settings.dailyNoteFormat || "YYYY-MM-DD";
		const dailyNoteFolder = this.plugin.settings.dailyNoteFolder || "";
		const formatRegex = formatToRegex(dailyNoteFormat);

		// Build daily note mappings
		const dayToFilePath: { [key: string]: string } = {};
		const dayToColor: { [key: string]: string } = {};

		for (const file of files) {
			if (isInDailyNotesFolder(file, dailyNoteFolder)) {
				const match = file.basename.match(formatRegex);
				if (match) {
					dailyNoteSet.add(file.basename);
					dayToFilePath[file.basename] = file.path;

					// Extract color from frontmatter
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

		// Get periods and container setup
		const periods = this.plugin.settings.periods || [];
		const containerWidth = container.clientWidth || 800;

		// Create main container layout
		const mainContainer = container.createEl("div");
		mainContainer.addClass("life-grid-main-container");

		const scrollWrapper = mainContainer.createEl("div");
		scrollWrapper.addClass("life-grid-scroll-wrapper");

		const minimapContainer = mainContainer.createEl("div");
		minimapContainer.addClass("life-grid-minimap-container");

		// Create render configuration
		const renderConfig: LifeGridRenderConfig = {
			startDate,
			endDate,
			today,
			years: YEARS,
			dailyNoteSet,
			dayToFilePath,
			dayToColor,
			periods,
			containerWidth,
			dailyNoteFormat,
			metadataCache: this.plugin.app.metadataCache,
			files,
		};

		// Create the main SVG
		const renderResult = createLifeGridSVG(renderConfig);
		scrollWrapper.appendChild(renderResult.svg);

		// Create the minimap
		const minimapHeight = minimapContainer.clientHeight || 600;
		const minimapSvg = createMinimapSVG(
			renderConfig,
			renderResult.paintArray,
			minimapHeight
		);
		minimapContainer.appendChild(minimapSvg);

		// Setup UI interactions
		const uiConfig: UIInteractionConfig = {
			...renderConfig,
			app: this.plugin.app,
			leaf: this.leaf,
			plugin: this.plugin,
			cleanupFunctions: this.cleanupFunctions,
		};

		setupUIInteractions(uiConfig, renderResult, minimapSvg, scrollWrapper);

		// Setup window resize handler
		this.resizeHandler = () => {
			clearTimeout(this.resizeTimeout);
			this.resizeTimeout = setTimeout(() => {
				try {
					this.onOpen();
				} catch (error) {
					console.error(
						"Life Grid: Error during resize repaint:",
						error
					);
				}
			}, 150);
		};
		window.addEventListener("resize", this.resizeHandler);
		this.cleanupFunctions.push(() => {
			if (this.resizeHandler) {
				window.removeEventListener("resize", this.resizeHandler);
			}
			if (this.resizeTimeout) {
				clearTimeout(this.resizeTimeout);
			}
		});

		// Scroll to today if present
		try {
			const todayStr = getFormattedDateString(today, dailyNoteFormat);
			if (renderResult.dayToRect[todayStr]) {
				const { cx, cy } = renderResult.dayToRect[todayStr];
				const scrollX = cx - scrollWrapper.clientWidth / 2;
				const scrollY = cy - scrollWrapper.clientHeight / 2;
				scrollWrapper.scrollTo({
					top: Math.max(0, scrollY),
					left: Math.max(0, scrollX),
					behavior: "auto",
				});
			}
		} catch (error) {
			console.error("Life Grid: Error scrolling to today:", error);
		}
	}

	async onClose() {
		// Execute all collected cleanup functions
		this.cleanupFunctions.forEach((cleanup) => {
			try {
				cleanup();
			} catch (error) {
				console.error("Life Grid: Error during cleanup:", error);
			}
		});
		this.cleanupFunctions = [];

		// Clean up resize handler when view is closed
		if (this.resizeHandler) {
			window.removeEventListener("resize", this.resizeHandler);
			this.resizeHandler = undefined;
		}

		// Clear any pending resize timeout
		if (this.resizeTimeout) {
			clearTimeout(this.resizeTimeout);
			this.resizeTimeout = undefined;
		}

		// Clean up any remaining tooltips that belong to this plugin only
		const tooltips = document.querySelectorAll(
			'div[data-plugin-id="obsidian-life-grid"]'
		);
		tooltips.forEach((tooltip) => tooltip.remove());
	}
}
