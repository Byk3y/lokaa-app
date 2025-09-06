import { log } from '@/utils/logger';
import { formatDistanceToNow, format, isToday, isYesterday, isSameYear } from 'date-fns';

export const capitalizeFirstLetter = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Short version (for post times, etc.)
export const formatRelativeTimeShort = (dateInput: string | Date): string => {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    // Validate the date is valid before using getTime
    if (isNaN(date.getTime())) {
      log.warn('Utils', "Invalid date in formatRelativeTimeShort:", dateInput);
      return "now";
    }
    
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) {
      return "now";
    } else if (minutes < 60) {
      return `${minutes}m`;
    } else if (hours < 24) {
      return `${hours}h`;
    } else {
      return `${days}d`;
    }
  } catch (error) {
    log.error('Utils', "Error in formatRelativeTimeShort:", error);
    return "now";
  }
};

// Comment-specific date formatter (e.g., "23d ago", "2h ago", "5m ago", "now")
export const formatCommentTime = (dateInput: string | Date): string => {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    // Validate the date is valid before using getTime
    if (isNaN(date.getTime())) {
      log.warn('Utils', "Invalid date in formatCommentTime:", dateInput);
      return "now";
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) {
      return "now";
    } else if (diffMin < 60) {
      return `${diffMin}m ago`;
    } else if (diffHour < 24) {
      return `${diffHour}h ago`;
    } else if (diffDay < 7) {
      return `${diffDay}d ago`;
    } else if (diffWeek < 4) {
      return `${diffWeek}w ago`;
    } else if (diffMonth < 12) {
      return `${diffMonth}mo ago`;
    } else {
      return `${diffYear}y ago`;
    }
  } catch (error) {
    log.error('Utils', "Error in formatCommentTime:", error);
    return "now";
  }
};

// Detailed version (for chat messages, etc.)
export function formatRelativeTime(date: Date): string {
  try {
    // Validate the date is valid before using getTime
    if (isNaN(date.getTime())) {
      log.warn('Utils', "Invalid date in formatRelativeTime:", date);
      return "Invalid date";
    }
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else if (isSameYear(date, now)) {
      return format(date, 'MMM d');
    } else {
      return format(date, 'MMM d, yyyy');
    }
  } catch (error) {
    log.error('Utils', "Error in formatRelativeTime:", error);
    return "Invalid date";
  }
}

// Format a number with appropriate suffixes (1st, 2nd, 3rd, etc.)
export function formatNumberWithSuffix(num: number): string {
  if (num >= 11 && num <= 13) {
    return num + 'th';
  }
  
  switch (num % 10) {
    case 1:
      return num + 'st';
    case 2:
      return num + 'nd';
    case 3:
      return num + 'rd';
    default:
      return num + 'th';
  }
}

// Format a number with commas
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format a number as compact (e.g., 1.2k, 5.7M)
export function formatCompactNumber(num: number): string {
  if (num < 1000) {
    return num.toString();
  } else if (num < 1000000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  } else {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
}

// Function to format active time with timezone
export function formatActiveTime(lastSeenDate: Date | string | null, userTimezone = 'UTC'): string {
  if (!lastSeenDate) return 'Last seen recently';
  
  try {
    const date = new Date(lastSeenDate);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Last seen recently';
    }
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    // Format the time based on how recent it is
    if (diffInMinutes < 1) {
      return 'Online now';
    } else if (diffInMinutes < 60) {
      return `active ${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) { // Less than 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      
      // Format the time in user timezone
      const timeString = formatInTimezone(date, {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }, userTimezone);
      
      return `active ${hours}h ago (${timeString})`;
    } else {
      // If more than a day, just return the formatted date/time
      return `last seen ${formatInTimezone(date, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }, userTimezone)}`;
    }
  } catch (error) {
    log.error('Utils', "Error formatting active time:", error);
    return 'Last seen recently';
  }
}

// Helper function to format dates in a specific timezone
export function formatInTimezone(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {},
  timezone = 'UTC'
): string {
  try {
    const dateObj = new Date(date);
    return new Intl.DateTimeFormat('default', {
      ...options,
      timeZone: timezone
    }).format(dateObj);
  } catch (error) {
    log.error('Utils', "Error formatting in timezone:", error);
    return new Intl.DateTimeFormat('default', options).format(new Date(date));
  }
} 