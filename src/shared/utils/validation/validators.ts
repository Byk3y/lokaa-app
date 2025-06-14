/**
 * Validation Utilities
 * 
 * Common validation functions for forms and data.
 */

/**
 * Validate an email address
 * 
 * @param email - The email to validate
 * @returns Whether the email is valid
 * 
 * @example
 * validateEmail('user@example.com') // true
 * validateEmail('invalid-email') // false
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate a password strength
 * 
 * @param password - The password to validate
 * @param options - Validation options
 * @returns Whether the password meets the requirements
 * 
 * @example
 * validatePassword('weakpw') // false
 * validatePassword('StrongPassword123!') // true
 */
export function validatePassword(
  password: string,
  options: {
    minLength?: number;
    requireLowercase?: boolean;
    requireUppercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  } = {}
): boolean {
  const {
    minLength = 8,
    requireLowercase = true,
    requireUppercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
  } = options;

  // Check minimum length
  if (password.length < minLength) {
    return false;
  }

  // Check for lowercase letters
  if (requireLowercase && !/[a-z]/.test(password)) {
    return false;
  }

  // Check for uppercase letters
  if (requireUppercase && !/[A-Z]/.test(password)) {
    return false;
  }

  // Check for numbers
  if (requireNumbers && !/\d/.test(password)) {
    return false;
  }

  // Check for special characters
  if (requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return false;
  }

  return true;
}

/**
 * Validate a URL
 * 
 * @param url - The URL to validate
 * @returns Whether the URL is valid
 * 
 * @example
 * validateUrl('https://example.com') // true
 * validateUrl('invalid-url') // false
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that a value is not empty
 * 
 * @param value - The value to validate
 * @returns Whether the value is not empty
 * 
 * @example
 * validateRequired('hello') // true
 * validateRequired('') // false
 */
export function validateRequired(value: string | null | undefined): boolean {
  return !!value && value.trim().length > 0;
}

/**
 * Validate a file size
 * 
 * @param file - The file to validate
 * @param maxSizeBytes - Maximum allowed size in bytes
 * @returns Whether the file size is valid
 * 
 * @example
 * validateFileSize(file, 5 * 1024 * 1024) // true if file is less than 5MB
 */
export function validateFileSize(file: File, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes;
}

/**
 * Validate a file type
 * 
 * @param file - The file to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns Whether the file type is valid
 * 
 * @example
 * validateFileType(file, ['image/jpeg', 'image/png'])
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
} 