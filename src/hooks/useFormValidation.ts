/**
 * Form Validation Hook
 * 
 * Provides form validation with schema support and mobile optimization
 */

import { useState, useCallback } from 'react';
import { z } from 'zod';
import { MobileValidationService } from '../services/MobileValidationService';
import { LocalStorageSanitizer } from '../utils/storage/sanitization';

interface ValidationState {
  isValid: boolean;
  errors: Record<string, string[]>;
  isValidating: boolean;
  lastValidated: number;
}

interface ValidationOptions {
  persistErrors?: boolean;
  validateOnChange?: boolean;
  debounceMs?: number;
}

export function useFormValidation<T extends z.ZodType>(
  schema: T,
  options: ValidationOptions = {}
) {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: false,
    errors: {},
    isValidating: false,
    lastValidated: 0
  });

  const {
    persistErrors = true,
    validateOnChange = true,
    debounceMs = 300
  } = options;

  // Get service instances
  const mobileValidation = MobileValidationService.getInstance();
  const storageSanitizer = LocalStorageSanitizer.getInstance();

  // Debounced validation timer
  let validationTimer: NodeJS.Timeout;

  /**
   * Validate form data
   */
  const validateData = useCallback(async (data: unknown) => {
    setValidationState(prev => ({ ...prev, isValidating: true }));

    try {
      // First validate with schema
      const validationResult = await schema.safeParseAsync(data);

      if (!validationResult.success) {
        const errors: Record<string, string[]> = {};
        validationResult.error.errors.forEach(error => {
          const path = error.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(error.message);
        });

        setValidationState({
          isValid: false,
          errors,
          isValidating: false,
          lastValidated: Date.now()
        });

        // Persist errors if enabled
        if (persistErrors) {
          storageSanitizer.safeSetItem('form_validation_errors', errors);
        }

        return { isValid: false, errors };
      }

      // Check mobile context if on mobile
      const mobileContext = mobileValidation.validateNetworkConditions();
      if (!mobileContext.isValid) {
        setValidationState({
          isValid: false,
          errors: {
            _mobile: mobileContext.errors
          },
          isValidating: false,
          lastValidated: Date.now()
        });
        return { isValid: false, errors: { _mobile: mobileContext.errors } };
      }

      setValidationState({
        isValid: true,
        errors: {},
        isValidating: false,
        lastValidated: Date.now()
      });

      return { isValid: true, data: validationResult.data };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      setValidationState({
        isValid: false,
        errors: { _error: [errorMessage] },
        isValidating: false,
        lastValidated: Date.now()
      });
      return { isValid: false, errors: { _error: [errorMessage] } };
    }
  }, [schema, persistErrors]);

  /**
   * Handle field change
   */
  const handleChange = useCallback((
    field: string,
    value: unknown,
    formData: Record<string, unknown>
  ) => {
    if (!validateOnChange) return;

    // Clear existing timer
    if (validationTimer) {
      clearTimeout(validationTimer);
    }

    // Set new timer
    validationTimer = setTimeout(() => {
      validateData({ ...formData, [field]: value });
    }, debounceMs);
  }, [validateOnChange, debounceMs, validateData]);

  /**
   * Clear validation state
   */
  const clearValidation = useCallback(() => {
    setValidationState({
      isValid: false,
      errors: {},
      isValidating: false,
      lastValidated: 0
    });

    if (persistErrors) {
      storageSanitizer.safeSetItem('form_validation_errors', {});
    }
  }, [persistErrors]);

  return {
    validateData,
    handleChange,
    clearValidation,
    ...validationState
  };
} 