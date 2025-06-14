/**
 * Application Constants
 * 
 * This file contains constants used throughout the application.
 * Group related constants in namespaces to avoid name collisions.
 */

/**
 * API configuration
 */
export const API = {
  /** Base API URL */
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  
  /** Default request timeout in milliseconds */
  TIMEOUT: 10000,
  
  /** Maximum retries for failed requests */
  MAX_RETRIES: 3,
};

/**
 * Authentication constants
 */
export const AUTH = {
  /** Local storage key for auth token */
  TOKEN_KEY: 'lokaa_auth_token',
  
  /** Token expiration time in milliseconds */
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  
  /** Refresh token threshold in milliseconds */
  REFRESH_THRESHOLD: 30 * 60 * 1000, // 30 minutes
};

/**
 * UI constants
 */
export const UI = {
  /** Animation durations in milliseconds */
  ANIMATION: {
    FAST: 150,
    MEDIUM: 300,
    SLOW: 500,
  },
  
  /** Breakpoints for responsive design */
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    XXL: 1536,
  },
  
  /** Z-index values */
  Z_INDEX: {
    MODAL: 100,
    DROPDOWN: 50,
    HEADER: 40,
    TOOLTIP: 30,
  },
};

/**
 * Feature flags
 */
export const FEATURES = {
  /** Enable/disable new features */
  ENABLE_ADVANCED_EDITOR: process.env.NEXT_PUBLIC_ENABLE_ADVANCED_EDITOR === 'true',
  ENABLE_NOTIFICATIONS: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS === 'true',
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
};

/**
 * Limits and thresholds
 */
export const LIMITS = {
  /** Maximum file upload size in bytes */
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  
  /** Maximum number of items per page */
  PAGINATION: {
    DEFAULT: 10,
    MAX: 100,
  },
  
  /** Rate limiting */
  RATE_LIMITS: {
    POSTS_PER_MINUTE: 5,
    COMMENTS_PER_MINUTE: 10,
  },
};

/**
 * Date and time formats
 */
export const DATETIME = {
  /** Date format for display */
  DATE_FORMAT: 'MMM dd, yyyy',
  
  /** Time format for display */
  TIME_FORMAT: 'hh:mm a',
  
  /** Date and time format for display */
  DATETIME_FORMAT: 'MMM dd, yyyy hh:mm a',
  
  /** Relative time thresholds */
  RELATIVE_TIME: {
    RECENT_THRESHOLD: 24 * 60 * 60 * 1000, // 24 hours
  },
}; 