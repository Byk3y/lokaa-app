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