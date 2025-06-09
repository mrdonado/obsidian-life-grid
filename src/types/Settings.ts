/**
 * Life Grid Settings Types
 *
 * This file contains all type definitions and interfaces related to plugin settings.
 */

export interface LifeGridSettings {
	birthday?: string; // ISO date string
	maxAge?: number; // Maximum age to display in years (default: 95)
	dailyNoteFormat?: string; // Date format for daily notes (default: YYYY-MM-DD)
	dailyNoteFolder?: string; // Folder path for daily notes (default: "" - root)
	periods?: Array<LifePeriod>;
}

export interface LifePeriod {
	start: string;
	end: string;
	color: string;
	label?: string;
}

export const DEFAULT_SETTINGS: LifeGridSettings = {
	birthday: "",
	maxAge: 95,
	dailyNoteFormat: "YYYY-MM-DD", // Obsidian's default format
	dailyNoteFolder: "", // Obsidian's default (root of vault)
	periods: [],
};

export const LIFE_GRID_VIEW_TYPE = "life-grid-view";
