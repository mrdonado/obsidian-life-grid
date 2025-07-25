import { App, PluginSettingTab, Setting, Plugin } from "obsidian";
import {
	getLifeGridCSSProperties,
	LifeGridCSSProperties,
} from "./utils/cssUtils";
import type { LifeGridSettings, LifePeriod } from "./types/Settings";

interface LifeGridPlugin extends Plugin {
	settings: LifeGridSettings;
	saveSettings(): Promise<void>;
}

export class LifeGridSettingTab extends PluginSettingTab {
	plugin: LifeGridPlugin;

	constructor(app: App, plugin: LifeGridPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		const css = getLifeGridCSSProperties();

		containerEl.empty();

		this.renderBasicSettings(containerEl);
		this.renderDailyNotesSettings(containerEl);
		this.renderLifePeriodsSettings(containerEl, css);
	}

	private renderBasicSettings(containerEl: HTMLElement): void {
		// Add a setting for the user's birthday
		new Setting(containerEl)
			.setName("Birthday")
			.setDesc("Your birthday (YYYY-MM-DD) to start the life grid.")
			.addText((text) => {
				text.setPlaceholder("YYYY-MM-DD")
					.setValue(this.plugin.settings.birthday || "")
					.onChange(async (value) => {
						if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
							console.error(
								"Invalid date format. Please use YYYY-MM-DD."
							);
							return;
						}
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
	}

	private renderDailyNotesSettings(containerEl: HTMLElement): void {
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
	}

	private renderLifePeriodsSettings(
		containerEl: HTMLElement,
		css: LifeGridCSSProperties
	): void {
		// Life Periods Section
		containerEl.createEl("h3", { text: "Life Periods" });
		containerEl.createEl("p", {
			text: "Define colored periods for your life grid. Each period will color the background of days within that date range.",
		});

		// Container for all periods
		const periodsContainer = containerEl.createEl("div");
		periodsContainer.addClass("life-grid-periods-container");

		const renderPeriods = () => {
			periodsContainer.empty();
			const periods = this.plugin.settings.periods || [];
			periods.forEach((period, index) => {
				this.renderPeriodDiv(
					periodsContainer,
					period,
					index,
					renderPeriods,
					css
				);
			});
			this.renderAddPeriodButton(periodsContainer, renderPeriods, css);
			this.renderAdvancedJsonEditor(periodsContainer, renderPeriods, css);
		};

		// Initial render
		renderPeriods();
	}

	private renderPeriodDiv(
		container: HTMLElement,
		period: LifePeriod,
		index: number,
		renderPeriods: () => void,
		css: LifeGridCSSProperties
	): void {
		const periodDiv = container.createEl("div");
		periodDiv.addClass("life-grid-period-div");
		if (period.color) {
			periodDiv.style.setProperty("--period-color", period.color);
		}

		// Period header with label and delete button
		this.renderPeriodHeader(periodDiv, period, index, renderPeriods, css);

		// Period settings
		this.renderPeriodSettings(periodDiv, period, index, renderPeriods);
	}

	private renderPeriodHeader(
		periodDiv: HTMLElement,
		period: LifePeriod,
		index: number,
		renderPeriods: () => void,
		css: LifeGridCSSProperties
	): void {
		const headerDiv = periodDiv.createEl("div");
		headerDiv.addClass("life-grid-period-header");

		const headerLabel = headerDiv.createEl("h4");
		headerLabel.textContent = period.label || `Period ${index + 1}`;
		headerLabel.addClass("life-grid-period-header-label");

		const deleteButton = headerDiv.createEl("button");
		deleteButton.textContent = "Delete";
		deleteButton.className = "mod-destructive";
		deleteButton.addClass("life-grid-delete-button");
		deleteButton.onclick = async () => {
			this.plugin.settings.periods?.splice(index, 1);
			await this.plugin.saveSettings();
			renderPeriods();
		};
	}

	private renderPeriodSettings(
		periodDiv: HTMLElement,
		period: LifePeriod,
		index: number,
		renderPeriods: () => void
	): void {
		// Label setting
		new Setting(periodDiv)
			.setName("Label")
			.setDesc("A descriptive name for this period")
			.addText((text) => {
				text.setPlaceholder("e.g., Childhood, University, Career")
					.setValue(period.label || "")
					.onChange(async (value) => {
						if (this.plugin.settings.periods) {
							this.plugin.settings.periods[index].label = value;
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
							this.plugin.settings.periods[index].start = value;
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
							this.plugin.settings.periods[index].end = value;
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
						this.plugin.settings.periods[index].color = value;
						await this.plugin.saveSettings();
						renderPeriods();
					}
				});
			});
	}

	private renderAddPeriodButton(
		container: HTMLElement,
		renderPeriods: () => void,
		css: LifeGridCSSProperties
	): void {
		const addButton = container.createEl("button");
		addButton.textContent = "+ Add New Period";
		addButton.className = "mod-cta";
		addButton.addClass("life-grid-add-button");
		addButton.onclick = async () => {
			if (!this.plugin.settings.periods) {
				this.plugin.settings.periods = [];
			}
			this.plugin.settings.periods.push({
				start: "",
				end: "",
				color: css.defaultPeriodColor,
				label: "",
			});
			await this.plugin.saveSettings();
			renderPeriods();
		};
	}

	private renderAdvancedJsonEditor(
		container: HTMLElement,
		renderPeriods: () => void,
		css: LifeGridCSSProperties
	): void {
		const advancedDiv = container.createEl("div");
		advancedDiv.addClass("life-grid-advanced-section");

		const toggleButton = advancedDiv.createEl("button");
		toggleButton.textContent = "▶ Advanced: Edit as JSON";
		toggleButton.addClass("life-grid-toggle-button");

		const jsonContainer = advancedDiv.createEl("div");
		jsonContainer.addClass("life-grid-json-container");
		jsonContainer.addClass("life-grid-json-container--hidden");

		let isJsonVisible = false;

		toggleButton.onclick = () => {
			isJsonVisible = !isJsonVisible;
			if (isJsonVisible) {
				jsonContainer.removeClass("life-grid-json-container--hidden");
				jsonContainer.addClass("life-grid-json-container--visible");
			} else {
				jsonContainer.removeClass("life-grid-json-container--visible");
				jsonContainer.addClass("life-grid-json-container--hidden");
			}
			toggleButton.textContent = isJsonVisible
				? "▼ Advanced: Edit as JSON"
				: "▶ Advanced: Edit as JSON";

			if (isJsonVisible) {
				this.renderJsonEditor(jsonContainer, renderPeriods, css);
			}
		};
	}

	private renderJsonEditor(
		container: HTMLElement,
		renderPeriods: () => void,
		css: LifeGridCSSProperties
	): void {
		container.empty();

		new Setting(container)
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
							// Remove error class on successful parse
							text.inputEl.removeClass(
								"life-grid-json-textarea--error"
							);
						} catch (e) {
							// Show error in a subtle way
							text.inputEl.addClass(
								"life-grid-json-textarea--error"
							);
							setTimeout(() => {
								text.inputEl.removeClass(
									"life-grid-json-textarea--error"
								);
							}, 2000);
						}
					});
				text.inputEl.rows = 8;
				text.inputEl.addClass("life-grid-json-textarea");
			});
	}
}
