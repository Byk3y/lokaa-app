/**
 * This file is deprecated and will be removed. 
 * The app no longer uses space types as part of the schema.
 */

// Empty exports to prevent import errors in case there are still references
export const SPACE_TYPES = {} as const;
export type SpaceType = 'general';
export function isValidSpaceType() { return true; }
export function getSpaceTypeDisplay() { return 'General'; }
export const SPACE_TYPE_METADATA = {} as const; 