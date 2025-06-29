/**
 * Local Storage Sanitization
 * 
 * Provides sanitization and validation for localStorage data
 */

import { z } from 'zod';

// Common data schemas
const commonSchemas = {
  // User preferences
  userPreferences: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    fontSize: z.number().min(12).max(24),
    notifications: z.boolean(),
    lastUpdated: z.number()
  }),

  // Session data
  sessionData: z.object({
    lastActive: z.number(),
    deviceId: z.string(),
    version: z.number()
  }),

  // Cache metadata
  cacheMetadata: z.object({
    key: z.string(),
    timestamp: z.number(),
    ttl: z.number().optional(),
    version: z.number()
  })
};

export class LocalStorageSanitizer {
  private static instance: LocalStorageSanitizer;
  private customSchemas: Map<string, z.ZodType>;

  private constructor() {
    this.customSchemas = new Map();
    this.initializeSchemas();
  }

  static getInstance(): LocalStorageSanitizer {
    if (!LocalStorageSanitizer.instance) {
      LocalStorageSanitizer.instance = new LocalStorageSanitizer();
    }
    return LocalStorageSanitizer.instance;
  }

  /**
   * Initialize built-in schemas
   */
  private initializeSchemas(): void {
    // Add common schemas
    Object.entries(commonSchemas).forEach(([key, schema]) => {
      this.customSchemas.set(key, schema);
    });
  }

  /**
   * Register a custom schema for a storage key
   */
  registerSchema(key: string, schema: z.ZodType): void {
    this.customSchemas.set(key, schema);
  }

  /**
   * Sanitize data for storage
   */
  sanitizeForStorage(key: string, data: unknown): {
    isValid: boolean;
    sanitized?: unknown;
    errors: string[];
  } {
    // Get schema for key
    const schema = this.customSchemas.get(key);
    
    if (!schema) {
      // If no schema, treat as JSON-safe data
      try {
        // Ensure data is JSON-safe
        const jsonSafe = JSON.parse(JSON.stringify(data));
        return {
          isValid: true,
          sanitized: jsonSafe,
          errors: []
        };
      } catch (error) {
        return {
          isValid: false,
          errors: ['Data is not JSON-safe']
        };
      }
    }

    // Validate against schema
    try {
      const sanitized = schema.parse(data);
      return {
        isValid: true,
        sanitized,
        errors: []
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map(e => e.message)
        };
      }
      return {
        isValid: false,
        errors: ['Invalid data format']
      };
    }
  }

  /**
   * Validate stored data
   */
  validateStoredData(key: string, data: unknown): {
    isValid: boolean;
    errors: string[];
  } {
    const schema = this.customSchemas.get(key);
    
    if (!schema) {
      // If no schema, just verify JSON-safe
      try {
        JSON.parse(JSON.stringify(data));
        return {
          isValid: true,
          errors: []
        };
      } catch (error) {
        return {
          isValid: false,
          errors: ['Data is not JSON-safe']
        };
      }
    }

    // Validate against schema
    try {
      schema.parse(data);
      return {
        isValid: true,
        errors: []
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map(e => e.message)
        };
      }
      return {
        isValid: false,
        errors: ['Invalid data format']
      };
    }
  }

  /**
   * Safe storage operation
   */
  safeSetItem(key: string, data: unknown): {
    success: boolean;
    errors: string[];
  } {
    // First sanitize
    const sanitizeResult = this.sanitizeForStorage(key, data);
    if (!sanitizeResult.isValid) {
      return {
        success: false,
        errors: sanitizeResult.errors
      };
    }

    try {
      // Store sanitized data
      localStorage.setItem(key, JSON.stringify(sanitizeResult.sanitized));
      return {
        success: true,
        errors: []
      };
    } catch (error) {
      return {
        success: false,
        errors: ['Storage operation failed']
      };
    }
  }

  /**
   * Safe retrieval operation
   */
  safeGetItem(key: string): {
    success: boolean;
    data?: unknown;
    errors: string[];
  } {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        return {
          success: false,
          errors: ['Key not found']
        };
      }

      const data = JSON.parse(stored);
      
      // Validate if schema exists
      const validation = this.validateStoredData(key, data);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      return {
        success: true,
        data,
        errors: []
      };
    } catch (error) {
      return {
        success: false,
        errors: ['Failed to retrieve or parse data']
      };
    }
  }

  /**
   * Get storage health report
   */
  getStorageReport(): {
    totalItems: number;
    validItems: number;
    invalidItems: number;
    errors: Array<{ key: string; errors: string[] }>;
  } {
    const report = {
      totalItems: 0,
      validItems: 0,
      invalidItems: 0,
      errors: [] as Array<{ key: string; errors: string[] }>
    };

    // Check all items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      report.totalItems++;

      const validation = this.safeGetItem(key);
      if (validation.success) {
        report.validItems++;
      } else {
        report.invalidItems++;
        report.errors.push({
          key,
          errors: validation.errors
        });
      }
    }

    return report;
  }
} 