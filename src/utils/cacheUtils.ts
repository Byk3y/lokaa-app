/**
 * Minimal stub for cacheUtils
 * 
 * The complex cache utility system was removed in Phase 3A.
 * This stub provides backward compatibility for existing imports.
 */

// No-op functions for backward compatibility
export const warmSpaceCache = () => {};
export const warmUserCache = () => {};
export const invalidateSpaceCache = () => {};
export const invalidateUserCache = () => {};
export const clearAllCaches = () => {};
export const getCacheStats = () => ({ total: 0, spaces: 0, users: 0 });

// Simple cache operations stub
export const cacheGet = () => null;
export const cacheSet = () => {};
export const cacheDelete = () => {};
export const cacheClear = () => {};
export const cacheDebug = () => ({ enabled: false, log: () => {} });
export const optimisticUpdates = { enabled: false, apply: () => {}, rollback: () => {} };
export const cacheInvalidation = { invalidate: () => {}, invalidatePattern: () => {} };
export const prefetchStrategies = { aggressive: () => {}, conservative: () => {} };