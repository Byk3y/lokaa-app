/**
 * Date Formatting Utilities
 * 
 * Functions for formatting dates in a consistent way across the application.
 */

import { DATETIME } from '../../../core/config/constants';

/**
 * Format options for date formatting
 */
type DateFormatOptions = {
  /** Include the time in the formatted date */
  includeTime?: boolean;
  /** Use relative time format for recent dates (e.g., "2 hours ago") */
  useRelative?: boolean;
};

/**
 * Format a date with the application's standard format
 * 
 * @param date - The date to format
 * @param format - Optional custom format string
 * @param options - Formatting options
 * @returns Formatted date string
 * 
 * @example
 * // Returns "Jan 01, 2023"
 * formatDate(new Date(2023, 0, 1))
 * 
 * @example
 * // Returns "Jan 01, 2023 2:30 PM"
 * formatDate(new Date(2023, 0, 1, 14, 30), undefined, { includeTime: true })
 */
export function formatDate(
  date: Date | string | number,
  format?: string,
  options: DateFormatOptions = {}
): string {
  // Convert input to Date if it's not already
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Handle invalid dates
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  // Use relative time format for recent dates if requested
  if (options.useRelative) {
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    
    // If the date is within the recent threshold, use relative format
    if (diffMs < DATETIME.RELATIVE_TIME.RECENT_THRESHOLD) {
      return formatRelativeTime(diffMs);
    }
  }
  
  // Determine the format to use
  let dateFormat = format;
  if (!dateFormat) {
    dateFormat = options.includeTime 
      ? DATETIME.DATETIME_FORMAT 
      : DATETIME.DATE_FORMAT;
  }
  
  // For now, just use a simple implementation
  // In a real application, you would use a library like date-fns or Intl.DateTimeFormat
  return formatDateWithPattern(dateObj, dateFormat);
}

/**
 * Format a time difference as a relative time string
 * 
 * @param diffMs - Time difference in milliseconds
 * @returns Formatted relative time string
 * 
 * @private
 */
function formatRelativeTime(diffMs: number): string {
  const seconds = Math.floor(diffMs / 1000);
  
  if (seconds < 60) {
    return 'just now';
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * Format a date according to a pattern string
 * 
 * @param date - The date to format
 * @param pattern - The format pattern
 * @returns Formatted date string
 * 
 * @private
 */
function formatDateWithPattern(date: Date, pattern: string): string {
  // In a real implementation, this would use a proper date formatting library
  // This is a simplified version for demonstration purposes
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const monthName = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ][date.getMonth()];
  const year = date.getFullYear();
  
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours24 < 12 ? 'am' : 'pm';
  
  // Replace patterns in the format string
  return pattern
    .replace('MMM', monthName)
    .replace('MM', month)
    .replace('dd', day)
    .replace('yyyy', year.toString())
    .replace('hh', hours12.toString().padStart(2, '0'))
    .replace('mm', minutes)
    .replace('a', ampm);
} 