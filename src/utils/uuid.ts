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