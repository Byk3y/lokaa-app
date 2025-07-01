/**
 * Offline Data Validation Service
 * 
 * Provides validation for offline data operations with:
 * - Offline operation validation
 * - Sync state validation
 * - Conflict detection
 */

import { z } from 'zod';
import { MobileValidationService } from './MobileValidationService';
import { IndexedDBValidation } from '../utils/indexeddb/validation';
import { LocalStorageSanitizer } from '../utils/storage/sanitization';

// Offline operation schema
const offlineOperationSchema = z.object({
  id: z.string(),
  type: z.enum(['create', 'update', 'delete']),
  entity: z.enum(['post', 'comment', 'like', 'profile']),
  data: z.unknown(),
  timestamp: z.number(),
  userId: z.string(),
  retryCount: z.number().default(0),
  status: z.enum(['pending', 'processing', 'failed', 'completed'])
});

export class OfflineValidationService {
  private static instance: OfflineValidationService;
  private mobileValidation: MobileValidationService;
  private indexedDBValidation: IndexedDBValidation;
  private localStorageSanitizer: LocalStorageSanitizer;

  private constructor() {
    this.mobileValidation = MobileValidationService.getInstance();
    this.indexedDBValidation = IndexedDBValidation.getInstance();
    this.localStorageSanitizer = LocalStorageSanitizer.getInstance();
  }

  static getInstance(): OfflineValidationService {
    if (!OfflineValidationService.instance) {
      OfflineValidationService.instance = new OfflineValidationService();
    }
    return OfflineValidationService.instance;
  }

  /**
   * Validate offline operation
   */
  validateOperation(operation: unknown): {
    isValid: boolean;
    errors: string[];
    sanitizedOperation?: z.infer<typeof offlineOperationSchema>;
  } {
    try {
      const validated = offlineOperationSchema.parse(operation);
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
   * Validate offline storage state
   */
  validateStorageState(): {
    isValid: boolean;
    errors: string[];
    recommendations: string[];
  } {
    const errors: string[] = [];
    const recommendations: string[] = [];

    // Check IndexedDB stores
    const indexedDBReport = this.indexedDBValidation.getStoreValidationReport('offline_operations');
    if (!indexedDBReport.storeExists) {
      errors.push('Offline operations store not found');
      recommendations.push('Initialize offline operations store');
    }

    // Check localStorage
    const storageReport = this.localStorageSanitizer.getStorageReport();
    if (storageReport.invalidItems > 0) {
      errors.push(`Found ${storageReport.invalidItems} invalid storage items`);
      recommendations.push('Clean up invalid storage items');
    }

    // Check mobile context
    const mobileContext = this.mobileValidation.validateNetworkConditions();
    if (!mobileContext.isValid) {
      recommendations.push(...mobileContext.errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      recommendations
    };
  }

  /**
   * Validate sync safety
   */
  validateSyncSafety(): {
    isSafe: boolean;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    
    // Check network conditions
    const networkConditions = this.mobileValidation.validateNetworkConditions();
    if (!networkConditions.isValid) {
      recommendations.push('Delay sync until network is reliable');
      return {
        isSafe: false,
        recommendations
      };
    }

    // Check storage state
    const storageState = this.validateStorageState();
    if (!storageState.isValid) {
      recommendations.push(...storageState.recommendations);
      return {
        isSafe: false,
        recommendations
      };
    }

    return {
      isSafe: true,
      recommendations: ['Safe to proceed with sync']
    };
  }

  /**
   * Detect potential conflicts
   */
  detectConflicts(localData: unknown, serverData: unknown): {
    hasConflicts: boolean;
    conflicts: Array<{
      field: string;
      localValue: unknown;
      serverValue: unknown;
    }>;
    recommendations: string[];
  } {
    const conflicts: Array<{
      field: string;
      localValue: unknown;
      serverValue: unknown;
    }> = [];
    
    const recommendations: string[] = [];

    // Simple equality check for now
    if (JSON.stringify(localData) !== JSON.stringify(serverData)) {
      // Find specific field conflicts
      const localFields = Object.entries(localData as Record<string, unknown>);
      const serverFields = Object.entries(serverData as Record<string, unknown>);

      localFields.forEach(([field, localValue]) => {
        const serverValue = (serverData as Record<string, unknown>)[field];
        if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
          conflicts.push({
            field,
            localValue,
            serverValue
          });
        }
      });

      // Add recommendations based on conflict type
      if (conflicts.length > 0) {
        recommendations.push('Review conflicts before sync');
        recommendations.push('Consider manual merge for complex conflicts');
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      recommendations
    };
  }

  /**
   * Get offline validation report
   */
  getValidationReport(): {
    storageState: ReturnType<typeof this.validateStorageState>;
    syncSafety: ReturnType<typeof this.validateSyncSafety>;
    networkConditions: ReturnType<typeof this.mobileValidation.validateNetworkConditions>;
    timestamp: number;
  } {
    return {
      storageState: this.validateStorageState(),
      syncSafety: this.validateSyncSafety(),
      networkConditions: this.mobileValidation.validateNetworkConditions(),
      timestamp: Date.now()
    };
  }
} 