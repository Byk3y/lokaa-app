/**
 * IndexedDB Validation Wrapper
 * 
 * Provides validation and sanitization for IndexedDB operations
 */

import { z } from 'zod';
import { StoreConfig } from './types';
import { STORE_CONFIGS } from './core/IndexedDBManager';
import { MobileValidationService } from '../../services/MobileValidationService';

// Base schema for all stored objects
const baseStoredObjectSchema = z.object({
  key: z.string(),
  timestamp: z.number(),
  metadata: z.object({
    userId: z.string().optional(),
    spaceId: z.string().optional(),
    version: z.number().default(1),
    lastModified: z.number(),
    storeName: z.string()
  })
});

// Create store-specific schemas
const storeSchemas = new Map<string, z.ZodType>();

// Initialize schemas for each store
STORE_CONFIGS.forEach(config => {
  storeSchemas.set(config.name, baseStoredObjectSchema.extend({
    metadata: z.object({
      userId: z.string().optional(),
      spaceId: z.string().optional(),
      version: z.number().default(1),
      lastModified: z.number(),
      storeName: z.literal(config.name)
    })
  }));
});

export class IndexedDBValidation {
  private static instance: IndexedDBValidation;
  private mobileValidation: MobileValidationService;

  private constructor() {
    this.mobileValidation = MobileValidationService.getInstance();
  }

  static getInstance(): IndexedDBValidation {
    if (!IndexedDBValidation.instance) {
      IndexedDBValidation.instance = new IndexedDBValidation();
    }
    return IndexedDBValidation.instance;
  }

  /**
   * Validate store operation
   */
  validateStoreOperation(storeName: string, operation: 'add' | 'put' | 'delete' | 'get', data?: unknown): {
    isValid: boolean;
    errors: string[];
    sanitizedData?: unknown;
  } {
    // Validate store exists
    if (!STORE_CONFIGS.find(config => config.name === storeName)) {
      return {
        isValid: false,
        errors: [`Invalid store name: ${storeName}`]
      };
    }

    // For write operations, validate data
    if ((operation === 'add' || operation === 'put') && data) {
      const schema = storeSchemas.get(storeName);
      if (!schema) {
        return {
          isValid: false,
          errors: [`No schema found for store: ${storeName}`]
        };
      }

      try {
        const sanitizedData = schema.parse(data);
        return {
          isValid: true,
          errors: [],
          sanitizedData
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

    // For delete/get operations, just validate the operation is allowed
    return {
      isValid: true,
      errors: []
    };
  }

  /**
   * Validate mobile context for IndexedDB operation
   */
  validateMobileContext(operation: 'read' | 'write' | 'delete'): {
    isSafe: boolean;
    recommendations: string[];
  } {
    const mobileOp = {
      type: operation,
      source: 'cache',
      priority: 'medium'
    } as const;

    const { isSafe, recommendations } = this.mobileValidation.validateCacheAccess(mobileOp);
    
    return {
      isSafe,
      recommendations
    };
  }

  /**
   * Validate and sanitize data for a specific store
   */
  validateStoreData(storeName: string, data: unknown): {
    isValid: boolean;
    errors: string[];
    sanitizedData?: unknown;
  } {
    const schema = storeSchemas.get(storeName);
    if (!schema) {
      return {
        isValid: false,
        errors: [`No schema found for store: ${storeName}`]
      };
    }

    try {
      const sanitizedData = schema.parse(data);
      return {
        isValid: true,
        errors: [],
        sanitizedData
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
   * Validate store configuration
   */
  validateStoreConfig(config: StoreConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const storeConfigSchema = z.object({
      name: z.string(),
      keyPath: z.string(),
      indexes: z.array(z.object({
        name: z.string(),
        keyPath: z.string().or(z.array(z.string())),
        options: z.object({
          unique: z.boolean(),
          multiEntry: z.boolean()
        }).optional()
      })).optional()
    });

    try {
      storeConfigSchema.parse(config);
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
        errors: ['Invalid store configuration']
      };
    }
  }

  /**
   * Get validation report for a store
   */
  getStoreValidationReport(storeName: string): {
    storeExists: boolean;
    hasSchema: boolean;
    mobileContext: ReturnType<typeof this.validateMobileContext>;
    timestamp: number;
  } {
    return {
      storeExists: STORE_CONFIGS.some(config => config.name === storeName),
      hasSchema: storeSchemas.has(storeName),
      mobileContext: this.validateMobileContext('read'),
      timestamp: Date.now()
    };
  }
} 