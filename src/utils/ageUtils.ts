/**
 * Age calculation utilities for the Life Grid plugin.
 *
 * Provides functions for calculating precise age with proper birthday handling.
 */

/**
 * Calculate age in years with 1 decimal place precision.
 *
 * This function ensures that:
 * - Age only increments on the exact birthday, not before
 * - Decimal progress is calculated within the actual age year (birthday to birthday)
 * - No floating-point rounding errors around birthdays
 *
 * @param birthDate The birth date
 * @param targetDate The date to calculate age for
 * @returns Age as a string with 1 decimal place (e.g., "25.3")
 */
export function calculateAge(birthDate: Date, targetDate: Date): string {
	// Calculate completed years first
	let age = targetDate.getFullYear() - birthDate.getFullYear();

	// Check if birthday has occurred this year
	const thisYearBirthday = new Date(
		targetDate.getFullYear(),
		birthDate.getMonth(),
		birthDate.getDate()
	);

	// If birthday hasn't occurred yet this year, subtract 1 from age
	if (targetDate < thisYearBirthday) {
		age = age - 1;
	}

	// Calculate the decimal part based on progress through the current age year
	let startOfAgeYear, endOfAgeYear;

	if (targetDate >= thisYearBirthday) {
		// After birthday this year - measure from this year's birthday
		startOfAgeYear = thisYearBirthday;
		endOfAgeYear = new Date(
			targetDate.getFullYear() + 1,
			birthDate.getMonth(),
			birthDate.getDate()
		);
	} else {
		// Before birthday this year - measure from last year's birthday
		startOfAgeYear = new Date(
			targetDate.getFullYear() - 1,
			birthDate.getMonth(),
			birthDate.getDate()
		);
		endOfAgeYear = thisYearBirthday;
	}

	// Calculate decimal progress through the current age year
	const totalYearMs = endOfAgeYear.getTime() - startOfAgeYear.getTime();
	const progressMs = targetDate.getTime() - startOfAgeYear.getTime();
	const decimalPart = progressMs / totalYearMs;

	const finalAge = age + decimalPart;
	return Math.max(0, finalAge).toFixed(1);
}
