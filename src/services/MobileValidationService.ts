/**
 * Mobile Validation Service
 * 
 * Provides specialized validation for mobile data operations with:
 * - Mobile-specific data validation
 * - Background state validation
 * - Network state validation
 * - Cache validation
 */

import { mobileBrowserService } from '../utils/indexeddb/core/MobileBrowserService';
import { z } from 'zod';

// Mobile-specific validation schemas
const mobileDataSchema = z.object({
  timestamp: z.number(),
  networkState: z.enum(['online', 'offline']),
  backgroundState: z.boolean(),
  connectionType: z.string().optional(),
  lastSync: z.number().optional()
});

const mobileOperationSchema = z.object({
  type: z.enum(['read', 'write', 'delete']),
  source: z.enum(['cache', 'network', 'both']),
  priority: z.enum(['high', 'medium', 'low']),
  retryCount: z.number().default(0)
});

export class MobileValidationService {
  private static instance: MobileValidationService;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): MobileValidationService {
    if (!MobileValidationService.instance) {
      MobileValidationService.instance = new MobileValidationService();
    }
    return MobileValidationService.instance;
  }

  /**
   * Validate mobile operation context
   */
  validateOperationContext(operation: unknown): {
    isValid: boolean;
    errors: string[];
    sanitizedOperation?: z.infer<typeof mobileOperationSchema>;
  } {
    try {
      const validated = mobileOperationSchema.parse(operation);
      return {
        isValid: true,
        errors: [],
        sanitizedOperation: validated
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
        errors: ['Invalid operation format']
      };
    }
  }

  /**
   * Validate mobile state data
   */
  validateMobileState(state: unknown): {
    isValid: boolean;
    errors: string[];
    sanitizedState?: z.infer<typeof mobileDataSchema>;
  } {
    try {
      const validated = mobileDataSchema.parse(state);
      return {
        isValid: true,
        errors: [],
        sanitizedState: validated
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
        errors: ['Invalid state format']
      };
    }
  }

  /**
   * Validate mobile network conditions
   */
  validateNetworkConditions(): {
    isValid: boolean;
    errors: string[];
    networkInfo?: {
      isOnline: boolean;
      connectionType?: string;
      isReliable: boolean;
    };
  } {
    const capabilities = mobileBrowserService.getMobileBrowserCapabilities();
    const env = mobileBrowserService.detectEnvironment();

    // Get connection information
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    const networkInfo = {
      isOnline: capabilities.isOnline,
      connectionType: connection?.effectiveType || connection?.type || 'unknown',
      isReliable: !env.mobileBackgroundDetected && capabilities.isOnline
    };

    const errors: string[] = [];
    
    if (!capabilities.isOnline) {
      errors.push('Device is offline');
    }
    
    if (env.mobileBackgroundDetected) {
      errors.push('Mobile browser may be blocking network requests');
    }

    return {
      isValid: errors.length === 0,
      errors,
      networkInfo
    };
  }

  /**
   * Validate cache access safety
   */
  validateCacheAccess(operation: z.infer<typeof mobileOperationSchema>): {
    isSafe: boolean;
    shouldUseFallback: boolean;
    recommendations: string[];
  } {
    const env = mobileBrowserService.detectEnvironment();
    const networkConditions = this.validateNetworkConditions();
    
    const recommendations: string[] = [];
    
    // Determine if cache access is safe
    const isSafe = !env.mobileBackgroundDetected || operation.source === 'cache';
    
    // Determine if we should use fallback
    const shouldUseFallback = !networkConditions.isValid || 
                            (operation.type === 'write' && !networkConditions.networkInfo?.isReliable);

    if (shouldUseFallback) {
      recommendations.push('Use cache-first strategy');
      if (operation.type === 'write') {
        recommendations.push('Queue operation for sync');
      }
    }

    if (env.mobileBackgroundDetected) {
      recommendations.push('Delay non-critical operations');
    }

    return {
      isSafe,
      shouldUseFallback,
      recommendations
    };
  }

  /**
   * Get comprehensive validation report
   */
  getValidationReport(): {
    mobileState: ReturnType<typeof this.validateMobileState>;
    networkConditions: ReturnType<typeof this.validateNetworkConditions>;
    timestamp: number;
  } {
    const state = {
      timestamp: Date.now(),
      networkState: navigator.onLine ? 'online' : 'offline' as const,
      backgroundState: mobileBrowserService.detectEnvironment().mobileBackgroundDetected,
      lastSync: Date.now()
    };

    return {
      mobileState: this.validateMobileState(state),
      networkConditions: this.validateNetworkConditions(),
      timestamp: Date.now()
    };
  }
} 