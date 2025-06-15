import { TFile, moment } from "obsidian";
import { DEFAULT_SETTINGS } from "../types/Settings";

/**
 * Convert a date format string (e.g., "YYYY-MM-DD") to a regex pattern
 * Safely escapes user input to prevent ReDoS attacks
 */
export function formatToRegex(format: string): RegExp {
	if (!format || typeof format !== "string") {
		throw new Error("Invalid format string provided");
	}

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

	try {
		return new RegExp(`^${pattern}$`);
	} catch (error) {
		console.error("Life Grid: Invalid regex pattern generated:", pattern);
		throw new Error("Failed to create date format regex");
	}
}

/**
 * Check if a file is in the configured daily notes folder
 * Uses recursive search: empty folder setting searches entire vault,
 * specific folder setting searches within that folder and all subfolders
 */
export function isInDailyNotesFolder(
	file: TFile,
	dailyNoteFolder: string
): boolean {
	if (!file?.path) return false;

	// Handle root folder cases: empty string or just "/"
	if (!dailyNoteFolder || dailyNoteFolder === "/") {
		// Root of vault - search recursively throughout entire vault
		return true;
	}

	// Sanitize folder path to prevent path traversal
	const sanitizedFolder = dailyNoteFolder
		.replace(/\.\./g, "")
		.replace(/\/+/g, "/");

	// For specific folder, search recursively within that folder and its subfolders
	// Ensure folder path ends with '/' for proper prefix matching
	const folderPath = sanitizedFolder.endsWith("/")
		? sanitizedFolder
		: sanitizedFolder + "/";
	return file.path.startsWith(folderPath);
}

/**
 * Generate the full file path for a daily note based on configured format and folder
 */
export function getDailyNoteFilePath(
	dateString: string,
	dailyNoteFolder: string
): string {
	// Sanitize dateString to prevent path injection
	const sanitizedDate = dateString.replace(/[^a-zA-Z0-9\-_]/g, "");

	// Handle root folder cases: empty string or just "/"
	if (!dailyNoteFolder || dailyNoteFolder === "/") {
		// Root of vault
		return `${sanitizedDate}.md`;
	}

	// Sanitize folder path to prevent path traversal
	const sanitizedFolder = dailyNoteFolder
		.replace(/\.\./g, "")
		.replace(/\/+/g, "/");

	// Ensure folder path ends with '/' for proper path construction
	const folderPath = sanitizedFolder.endsWith("/")
		? sanitizedFolder
		: sanitizedFolder + "/";
	return `${folderPath}${sanitizedDate}.md`;
}

/**
 * Format a date using the configured daily note format
 */
export function getFormattedDateString(
	date: Date,
	dailyNoteFormat?: string
): string {
	if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
		throw new Error("Invalid date provided to getFormattedDateString");
	}

	const format = dailyNoteFormat || DEFAULT_SETTINGS.dailyNoteFormat;

	try {
		return moment(date).format(format);
	} catch (error) {
		console.error("Life Grid: Failed to format date:", error);
		// Fallback to ISO format
		return moment(date).format("YYYY-MM-DD");
	}
}
