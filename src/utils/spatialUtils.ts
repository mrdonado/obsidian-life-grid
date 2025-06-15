/**
 * Spatial indexing utilities for the Life Grid plugin.
 * 
 * Provides efficient spatial lookup for interactive elements using a grid-based index.
 */

import * as Theme from "../theme";

/**
 * Represents a clickable day in the life grid with spatial coordinates.
 */
export interface ClickableDay {
	date: string;
	cx: number;
	cy: number;
	radius: number;
	color: string;
}

/**
 * A spatial index for fast proximity queries.
 * Uses a grid-based approach to efficiently find nearby elements.
 */
export class SpatialIndex {
	private index = new Map<string, ClickableDay[]>();
	private cellSize: number;

	constructor(cellSize: number = Theme.GRID_CELL_SIZE) {
		this.cellSize = cellSize;
	}

	/**
	 * Add a clickable day to the spatial index.
	 * 
	 * @param day The clickable day to add
	 */
	add(day: ClickableDay): void {
		const gridX = Math.floor(day.cx / this.cellSize);
		const gridY = Math.floor(day.cy / this.cellSize);
		const key = `${gridX},${gridY}`;
		
		if (!this.index.has(key)) {
			this.index.set(key, []);
		}
		this.index.get(key)!.push(day);
	}

	/**
	 * Get all clickable days near the specified coordinates.
	 * Searches in a 3x3 grid around the point for efficiency.
	 * 
	 * @param x X coordinate
	 * @param y Y coordinate
	 * @returns Array of nearby clickable days
	 */
	getNearbyCells(x: number, y: number): ClickableDay[] {
		const gridX = Math.floor(x / this.cellSize);
		const gridY = Math.floor(y / this.cellSize);
		const nearby: ClickableDay[] = [];

		// Check 3x3 grid around the point
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				const key = `${gridX + dx},${gridY + dy}`;
				const cell = this.index.get(key);
				if (cell) nearby.push(...cell);
			}
		}
		return nearby;
	}

	/**
	 * Clear all entries from the spatial index.
	 */
	clear(): void {
		this.index.clear();
	}

	/**
	 * Get the total number of indexed elements.
	 */
	size(): number {
		let total = 0;
		for (const cell of this.index.values()) {
			total += cell.length;
		}
		return total;
	}
}
