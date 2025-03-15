/**
 * @typedef {Intl.DateTimeFormatOptions['dateStyle']} DateStyle
 */

/**
 * Formats a date according to the provided style and locale.
 *
 * @param {string} date - The date to format, expected to be a string (e.g., '2024-11-22').
 * @param {DateStyle} [dateStyle='medium'] - The style of the date formatting (e.g., 'short', 'medium', 'long', 'full').
 * @param {string} [locales='en'] - The locales to use for formatting (default is 'en').
 * @returns {string} The formatted date as a string.
 */
export function formatDate(date, dateStyle = 'medium', locales = 'en') {
	// Safari is mad about dashes in the date
	const dateToFormat = new Date(date.replaceAll('-', '/'));
	const dateFormatter = new Intl.DateTimeFormat(locales, { dateStyle });
	return dateFormatter.format(dateToFormat);
}
