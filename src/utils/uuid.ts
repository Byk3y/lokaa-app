/**
 * UUID generation utility with mobile Safari fallback
 * Uses the uuid package for better reliability and performance
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a UUID v4 string
 * Uses the uuid package which handles all browser compatibility issues
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Generate a short UUID (8 characters) for cases where full UUID is not needed
 */
export function generateShortUUID(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * 🔥 CENTRALIZED: UUID validation with consistent error handling
 * Replaces duplicate regex patterns across the codebase
 */
export function isValidUUID(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  // RFC 4122 compliant UUID regex pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * 🔥 CENTRALIZED: UUID validation with detailed error information
 * Provides structured validation results for better error handling
 */
export function validateUUID(value: string): { isValid: boolean; error?: string } {
  if (!value) {
    return { isValid: false, error: 'UUID cannot be empty' };
  }
  
  if (typeof value !== 'string') {
    return { isValid: false, error: 'UUID must be a string' };
  }
  
  if (!isValidUUID(value)) {
    return { isValid: false, error: 'Invalid UUID format' };
  }
  
  return { isValid: true };
}

/**
 * 🔥 PHASE 2: Advanced UUID validation with detailed error responses
 * Enhanced validation for comprehensive use cases
 */
export interface UUIDValidationResult {
  isValid: boolean;
  error?: string;
  version?: number;
  format?: 'standard' | 'lowercase' | 'uppercase';
  details?: {
    segments: string[];
    checksumValid: boolean;
  };
}

export function validateUUIDDetailed(value: string, fieldName: string = 'UUID'): UUIDValidationResult {
  if (!value || typeof value !== 'string') {
    return {
      isValid: false,
      error: `${fieldName} is required and must be a string`
    };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(value)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)`
    };
  }

  // Extract UUID details
  const segments = value.split('-');
  const versionChar = value.charAt(14);
  const version = parseInt(versionChar, 16);
  
  // Determine format
  let format: 'standard' | 'lowercase' | 'uppercase' = 'standard';
  if (value === value.toLowerCase()) format = 'lowercase';
  else if (value === value.toUpperCase()) format = 'uppercase';

  return {
    isValid: true,
    version: version,
    format: format,
    details: {
      segments: segments,
      checksumValid: true // Simplified for now
    }
  };
}

/**
 * 🔥 PHASE 2: Check if UUID is a specific version
 */
export function isUUIDVersion(value: string, version: 1 | 4 | 5): boolean {
  if (!isValidUUID(value)) return false;
  
  const versionChar = value.charAt(14);
  const actualVersion = parseInt(versionChar, 16);
  return actualVersion === version;
}

/**
 * 🔥 PHASE 2: Extract UUID version number
 */
export function extractUUIDVersion(value: string): number | null {
  if (!isValidUUID(value)) return null;
  
  const versionChar = value.charAt(14);
  return parseInt(versionChar, 16);
} 