import { App, PluginSettingTab, Setting, Plugin } from "obsidian";
import * as Theme from "../../theme";
import type { LifeGridSettings } from "../types/Settings";

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

		containerEl.empty();

		this.renderBasicSettings(containerEl);
		this.renderDailyNotesSettings(containerEl);
		this.renderLifePeriodsSettings(containerEl);
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

	private renderLifePeriodsSettings(containerEl: HTMLElement): void {
		// Life Periods Section
		containerEl.createEl("h3", { text: "Life Periods" });
		containerEl.createEl("p", {
			text: "Define colored periods for your life grid. Each period will color the background of days within that date range.",
		});

		// Container for all periods
		const periodsContainer = containerEl.createEl("div");
		periodsContainer.style.marginBottom =
			Theme.PERIODS_CONTAINER_MARGIN_BOTTOM;

		const renderPeriods = () => {
			periodsContainer.empty();

			const periods = this.plugin.settings.periods || [];

			periods.forEach((period, index) => {
				this.renderPeriodDiv(
					periodsContainer,
					period,
					index,
					renderPeriods
				);
			});

			this.renderAddPeriodButton(periodsContainer, renderPeriods);
			this.renderAdvancedJsonEditor(periodsContainer, renderPeriods);
		};

		// Initial render
		renderPeriods();
	}

	private renderPeriodDiv(
		container: HTMLElement,
		period: any,
		index: number,
		renderPeriods: () => void
	): void {
		const periodDiv = container.createEl("div");
		periodDiv.style.border = Theme.PERIOD_DIV_BORDER;
		periodDiv.style.borderRadius = Theme.PERIOD_DIV_BORDER_RADIUS;
		periodDiv.style.padding = Theme.PERIOD_DIV_PADDING;
		periodDiv.style.marginBottom = Theme.PERIOD_DIV_MARGIN_BOTTOM;
		periodDiv.style.backgroundColor = "var(--background-secondary)";

		// Period header with label and delete button
		this.renderPeriodHeader(periodDiv, period, index, renderPeriods);

		// Period settings
		this.renderPeriodSettings(periodDiv, period, index, renderPeriods);
	}

	private renderPeriodHeader(
		periodDiv: HTMLElement,
		period: any,
		index: number,
		renderPeriods: () => void
	): void {
		const headerDiv = periodDiv.createEl("div");
		headerDiv.style.display = "flex";
		headerDiv.style.justifyContent = "space-between";
		headerDiv.style.alignItems = "center";
		headerDiv.style.marginBottom = Theme.PERIOD_HEADER_MARGIN_BOTTOM;

		const headerLabel = headerDiv.createEl("h4");
		headerLabel.textContent = period.label || `Period ${index + 1}`;
		headerLabel.style.margin = "0";
		headerLabel.style.color = period.color || "var(--text-normal)";

		const deleteButton = headerDiv.createEl("button");
		deleteButton.textContent = "Delete";
		deleteButton.className = "mod-destructive";
		deleteButton.style.padding = Theme.DELETE_BUTTON_PADDING;
		deleteButton.style.fontSize = Theme.DELETE_BUTTON_FONT_SIZE;
		deleteButton.onclick = async () => {
			this.plugin.settings.periods?.splice(index, 1);
			await this.plugin.saveSettings();
			renderPeriods();
		};
	}

	private renderPeriodSettings(
		periodDiv: HTMLElement,
		period: any,
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
		renderPeriods: () => void
	): void {
		const addButton = container.createEl("button");
		addButton.textContent = "+ Add New Period";
		addButton.className = "mod-cta";
		addButton.style.width = "100%";
		addButton.style.padding = Theme.ADD_BUTTON_PADDING;
		addButton.style.marginTop = Theme.ADD_BUTTON_MARGIN_TOP;
		addButton.onclick = async () => {
			if (!this.plugin.settings.periods) {
				this.plugin.settings.periods = [];
			}
			this.plugin.settings.periods.push({
				start: "",
				end: "",
				color: Theme.DEFAULT_PERIOD_COLOR,
				label: "",
			});
			await this.plugin.saveSettings();
			renderPeriods();
		};
	}

	private renderAdvancedJsonEditor(
		container: HTMLElement,
		renderPeriods: () => void
	): void {
		const advancedDiv = container.createEl("div");
		advancedDiv.style.marginTop = Theme.ADVANCED_SECTION_MARGIN_TOP;

		const toggleButton = advancedDiv.createEl("button");
		toggleButton.textContent = "▶ Advanced: Edit as JSON";
		toggleButton.style.background = "none";
		toggleButton.style.border = "none";
		toggleButton.style.color = "var(--text-muted)";
		toggleButton.style.cursor = "pointer";
		toggleButton.style.fontSize = Theme.TOGGLE_BUTTON_FONT_SIZE;

		const jsonContainer = advancedDiv.createEl("div");
		jsonContainer.style.display = "none";
		jsonContainer.style.marginTop = Theme.JSON_CONTAINER_MARGIN_TOP;

		let isJsonVisible = false;

		toggleButton.onclick = () => {
			isJsonVisible = !isJsonVisible;
			jsonContainer.style.display = isJsonVisible ? "block" : "none";
			toggleButton.textContent = isJsonVisible
				? "▼ Advanced: Edit as JSON"
				: "▶ Advanced: Edit as JSON";

			if (isJsonVisible) {
				this.renderJsonEditor(jsonContainer, renderPeriods);
			}
		};
	}

	private renderJsonEditor(
		container: HTMLElement,
		renderPeriods: () => void
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
				text.inputEl.style.fontSize = Theme.JSON_TEXTAREA_FONT_SIZE;
			});
	}
}
