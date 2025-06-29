/**
 * Settings Validation Hook
 * 
 * Provides validation for space settings with:
 * - Schema validation
 * - File validation
 * - Mobile optimization
 */

import { useState, useCallback } from 'react';
import { z } from 'zod';
import { MobileValidationService } from '../services/MobileValidationService';
import { FileValidationService } from '../services/FileValidationService';
import { 
  generalSchema,
  aboutSchema,
  rulesSchema,
  categoriesSchema,
  pricingSchema,
  tabsSchema,
  validateSpaceIcon,
  validateSpaceCover
} from '../schemas/validation/spaceSettings';

type SettingsType = 
  | 'general'
  | 'about'
  | 'rules'
  | 'categories'
  | 'pricing'
  | 'tabs';

interface ValidationState {
  isValid: boolean;
  errors: Record<string, string[]>;
  isValidating: boolean;
  lastValidated: number;
}

interface ValidationOptions {
  validateOnChange?: boolean;
  validateFiles?: boolean;
}

export function useSettingsValidation(type: SettingsType, options: ValidationOptions = {}) {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: true,
    errors: {},
    isValidating: false,
    lastValidated: 0
  });

  // Get the appropriate schema based on type
  const getSchema = useCallback((type: SettingsType) => {
    switch (type) {
      case 'general':
        return generalSchema;
      case 'about':
        return aboutSchema;
      case 'rules':
        return rulesSchema;
      case 'categories':
        return categoriesSchema;
      case 'pricing':
        return pricingSchema;
      case 'tabs':
        return tabsSchema;
      default:
        return generalSchema;
    }
  }, []);

  // Validate data against schema
  const validateData = useCallback(async (data: any) => {
    setValidationState(prev => ({ ...prev, isValidating: true }));
    const schema = getSchema(type);
    
    try {
      // Parse data through schema
      schema.parse(data);

      // Check for mobile-specific validation
      const mobileValidation = MobileValidationService.getInstance();
      const mobileErrors = await mobileValidation.validateNetworkConditions();

      setValidationState({
        isValid: mobileErrors.isValid,
        errors: mobileErrors.isValid ? {} : { _mobile: mobileErrors.errors },
        isValidating: false,
        lastValidated: Date.now()
      });

      return mobileErrors.isValid;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string[]> = {};
        error.errors.forEach(err => {
          const field = err.path.join('.') || '_form';
          if (!errors[field]) errors[field] = [];
          errors[field].push(err.message);
        });

        setValidationState({
          isValid: false,
          errors,
          isValidating: false,
          lastValidated: Date.now()
        });
        return false;
      }
      throw error;
    }
  }, [type, getSchema]);

  // Validate a single field
  const validateField = useCallback(async (field: string, value: any, allData: any) => {
    if (!options.validateOnChange) return true;

    const schema = getSchema(type);
    try {
      // Create a partial schema for the field
      const fieldSchema = z.object({ [field]: schema.shape[field] });
      fieldSchema.parse({ [field]: value });

      // Update validation state to remove field errors
      setValidationState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [field]: []
        },
        isValid: Object.values(prev.errors).every(errs => errs.length === 0)
      }));

      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.map(err => err.message);
        setValidationState(prev => ({
          ...prev,
          errors: {
            ...prev.errors,
            [field]: fieldErrors
          },
          isValid: false
        }));
        return false;
      }
      throw error;
    }
  }, [type, options.validateOnChange, getSchema]);

  // Validate file uploads
  const validateFile = useCallback(async (file: File, type: 'icon' | 'cover' | 'image' | 'video' | 'document') => {
    if (!options.validateFiles) return true;

    try {
      switch (type) {
        case 'icon':
          await validateSpaceIcon(file);
          break;
        case 'cover':
          await validateSpaceCover(file);
          break;
        default: {
          const fileValidation = FileValidationService.getInstance();
          await fileValidation.validateFile(file, type);
          break;
        }
      }

      // Clear any previous file errors
      setValidationState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [type]: []
        },
        isValid: Object.values(prev.errors).every(errs => errs.length === 0)
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid file';
      setValidationState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [type]: [errorMessage]
        },
        isValid: false
      }));
      return false;
    }
  }, [options.validateFiles]);

  return {
    validateData,
    validateField,
    validateFile,
    errors: validationState.errors,
    isValid: validationState.isValid,
    isValidating: validationState.isValidating,
    lastValidated: validationState.lastValidated
  };
} 