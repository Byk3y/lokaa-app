import { errorHandlingSystem } from './errorHandlingSystem';

/**
 * Error Message Sanitizer
 * 
 * Converts technical error messages into user-friendly messages.
 * Prevents exposing technical details like "TypeError: Load failed" to production users.
 */

interface SanitizeOptions {
  includeOriginal?: boolean; // Include original error in development
  fallbackMessage?: string; // Custom fallback message
}

/**
 * Sanitize an error message for user display
 * 
 * @param error - The error object, string, or any error-like value
 * @param isProduction - Whether the app is running in production mode
 * @param options - Optional configuration
 * @returns User-friendly error message
 */
export function sanitizeErrorMessage(
  error: any,
  isProduction: boolean = import.meta.env.PROD,
  options: SanitizeOptions = {}
): string {
  const { includeOriginal = false, fallbackMessage = 'Something went wrong. Please try again.' } = options;
  
  // Handle null/undefined errors
  if (!error) {
    return fallbackMessage;
  }
  
  // Use ErrorHandlingSystem to classify and get user-friendly message
  try {
    const appError = errorHandlingSystem.classifyError(error, {
      component: 'ErrorSanitizer',
      sanitizing: true
    });
    
    // In production, always return the sanitized user message
    if (isProduction) {
      return appError.userMessage || fallbackMessage;
    }
    
    // In development, optionally include original error for debugging
    if (includeOriginal && error?.message) {
      return `${appError.userMessage}\n\nTechnical details: ${error.message}`;
    }
    
    return appError.userMessage || fallbackMessage;
  } catch (classificationError) {
    // Fallback if classification fails
    return isProduction ? fallbackMessage : `${fallbackMessage}\n\nClassification error: ${classificationError}`;
  }
}

/**
 * Get a short user-friendly error title based on error type
 * 
 * @param error - The error object
 * @param isProduction - Whether the app is running in production mode
 * @returns User-friendly error title
 */
export function sanitizeErrorTitle(
  error: any,
  isProduction: boolean = import.meta.env.PROD
): string {
  if (!error) {
    return 'Error';
  }
  
  try {
    const appError = errorHandlingSystem.classifyError(error, {
      component: 'ErrorSanitizer',
      sanitizing: true
    });
    
    // Map error types to user-friendly titles
    switch (appError.type) {
      case 'NETWORK':
        return 'Connection Error';
      case 'AUTHENTICATION':
        return 'Authentication Error';
      case 'AUTHORIZATION':
        return 'Access Denied';
      case 'VALIDATION':
        return 'Invalid Input';
      case 'TIMEOUT':
        return 'Request Timeout';
      case 'DATABASE':
        return 'Data Error';
      case 'SPACE_ACCESS':
        return 'Space Access Error';
      default:
        return isProduction ? 'Error' : `Error (${appError.type})`;
    }
  } catch {
    return 'Error';
  }
}

/**
 * Check if an error is a specific type that should be handled specially
 * 
 * @param error - The error to check
 * @returns Object with boolean flags for special error types
 */
export function getErrorType(error: any): {
  isNetworkError: boolean;
  isAuthError: boolean;
  isPermissionError: boolean;
  isSupabaseLoadError: boolean;
  isTimeoutError: boolean;
} {
  const errorText = (error?.message || error?.toString?.() || '').toLowerCase();
  
  return {
    isNetworkError: errorText.includes('network') || 
                    errorText.includes('fetch') || 
                    errorText.includes('connection'),
    isAuthError: errorText.includes('auth') || 
                 errorText.includes('session') || 
                 errorText.includes('token'),
    isPermissionError: errorText.includes('permission') || 
                       errorText.includes('unauthorized') || 
                       errorText.includes('forbidden'),
    isSupabaseLoadError: errorText.includes('typeerror: load failed') ||
                         errorText === 'load failed',
    isTimeoutError: errorText.includes('timeout') || 
                    errorText.includes('aborted')
  };
}

/**
 * Sanitize error for toast notifications
 * Returns a shorter, more concise message suitable for toasts
 * 
 * @param error - The error object
 * @param isProduction - Whether the app is running in production mode
 * @returns Short user-friendly error message for toasts
 */
export function sanitizeErrorForToast(
  error: any,
  isProduction: boolean = import.meta.env.PROD
): { title: string; description: string } {
  const title = sanitizeErrorTitle(error, isProduction);
  const description = sanitizeErrorMessage(error, isProduction);
  
  // Shorten description for toasts (max 100 chars)
  const shortDescription = description.length > 100 
    ? description.substring(0, 97) + '...' 
    : description;
  
  return { title, description: shortDescription };
}






