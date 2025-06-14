/**
 * Truncates a string to a specified length with an ellipsis
 * 
 * @param text The text to truncate
 * @param maxLength Maximum allowed length before truncating
 * @returns Truncated string
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Gets a contrasting text color (black or white) based on background color
 * 
 * @param hexColor Hex color code (with or without #)
 * @returns 'black' or 'white' depending on which would be more readable
 */
export function getContrastingTextColor(hexColor: string): 'black' | 'white' {
  // If no color or invalid, default to black text
  if (!hexColor) return 'black';
  
  // Remove # if present
  const color = hexColor.startsWith('#') ? hexColor.substring(1) : hexColor;
  
  // Convert to RGB
  let r: number, g: number, b: number;
  
  if (color.length === 3) {
    // #RGB format
    r = parseInt(color.charAt(0) + color.charAt(0), 16);
    g = parseInt(color.charAt(1) + color.charAt(1), 16);
    b = parseInt(color.charAt(2) + color.charAt(2), 16);
  } else if (color.length === 6) {
    // #RRGGBB format
    r = parseInt(color.substring(0, 2), 16);
    g = parseInt(color.substring(2, 4), 16);
    b = parseInt(color.substring(4, 6), 16);
  } else {
    // Invalid color format, default to black text
    return 'black';
  }
  
  // Calculate relative luminance using the formula for sRGB
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  
  // Use white text on dark backgrounds, black text on light backgrounds
  return luminance < 128 ? 'white' : 'black';
}

/**
 * Formats a date in a human-readable format
 * 
 * @param date Date string or Date object
 * @param options Formatting options
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date,
  options: {
    includeTime?: boolean;
    relative?: boolean;
  } = {}
): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // For invalid dates
  if (isNaN(dateObj.getTime())) return '';
  
  // Format as relative time if requested (e.g., "2 hours ago")
  if (options.relative) {
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  }
  
  // Format as absolute date
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(options.includeTime && {
      hour: '2-digit',
      minute: '2-digit',
    }),
  });
  
  return formatter.format(dateObj);
} 