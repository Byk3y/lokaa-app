/**
 * Mobile-specific constants for app behavior
 */

// Minimum time to wait before allowing network recovery actions after backgrounding
export const MOBILE_SAFE_RELOAD_DELAY_MS = 120_000; // 2 minutes

// Maximum number of consecutive refresh retry attempts before giving up
export const MAX_REFRESH_RETRIES = 5; 