/**
 * Test Helpers
 * 
 * Utilities to help with testing
 */

import { 
  generalSchema,
  aboutSchema,
  rulesSchema,
  categoriesSchema,
  pricingSchema,
  tabsSchema
} from '../schemas/validation/spaceSettings';

// Expose validation functions for testing
export function exposeValidationForTesting() {
  if (process.env.NODE_ENV === 'development') {
    // Create a validateData function that uses the schemas directly
    const validateData = async (type: string, data: any) => {
      try {
        let schema;
        switch (type) {
          case 'general':
            schema = generalSchema;
            break;
          case 'about':
            schema = aboutSchema;
            break;
          case 'rules':
            schema = rulesSchema;
            break;
          case 'categories':
            schema = categoriesSchema;
            break;
          case 'pricing':
            schema = pricingSchema;
            break;
          case 'tabs':
            schema = tabsSchema;
            break;
          default:
            throw new Error(`Unknown validation type: ${type}`);
        }

        // Parse data through schema
        schema.parse(data);
        return { isValid: true, errors: {} };
      } catch (error) {
        if (error instanceof Error) {
          const errors: Record<string, string[]> = {};
          if ('errors' in error) {
            (error as any).errors.forEach((err: any) => {
              const field = err.path.join('.') || '_form';
              if (!errors[field]) errors[field] = [];
              errors[field].push(err.message);
            });
          } else {
            errors._form = [error.message];
          }
          return { isValid: false, errors };
        }
        return { isValid: false, errors: { _form: ['Unknown validation error'] } };
      }
    };
    
    // Make validation functions available globally
    window.__lokaa_validation_hooks = {
      validateData
    };
  }
} 