/**
 * Date utility functions for formatting and manipulating dates consistently across the application
 */

/**
 * Format a date string to the "Joined Month Day, Year" format
 * @param dateString ISO date string
 * @returns Formatted date string (e.g., "Apr 29, 2025")
 */
export function formatJoinedDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn("Invalid date in formatJoinedDate:", dateString);
      return 'Unknown date';
    }
    
    // Return formatted date: "Apr 29, 2025"
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Unknown date';
  }
}

/**
 * Format a date string or Date object to a readable string
 * @param dateString ISO date string or Date object
 * @param format The desired format (short, medium, full, or relative)
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string | Date, 
  format: 'short' | 'medium' | 'full' | 'relative' = 'medium'
): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn("Invalid date in formatDate:", dateString);
      return 'Invalid date';
    }
    
    switch (format) {
      case 'short':
        // Apr 12
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      
      case 'medium':
        // Apr 12, 2023
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      
      case 'full':
        // April 12, 2023 at 10:30 AM
        return date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true
        });
      
      case 'relative':
        // 2 days ago, Just now, etc.
        return getRelativeTimeString(date);
      
      default:
        return date.toLocaleDateString();
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Get a relative time string (e.g., "2 days ago", "Just now")
 * @param date The date to compare against now
 * @returns Relative time string
 */
function getRelativeTimeString(date: Date): string {
  try {
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn("Invalid date in getRelativeTimeString:", date);
      return 'Unknown time';
    }
    
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInSecs = Math.floor(diffInMs / 1000);
    const diffInMins = Math.floor(diffInSecs / 60);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInSecs < 60) {
      return 'Just now';
    } else if (diffInMins < 60) {
      return `${diffInMins} minute${diffInMins > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else {
      // For older dates, return the formatted date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined
      });
    }
  } catch (error) {
    console.error('Error in getRelativeTimeString:', error);
    return 'Unknown time';
  }
} 