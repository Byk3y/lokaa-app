/**
 * React Hook for Schema Data
 * 
 * Provides React hooks for managing structured data schemas
 * with validation and error handling
 */

import { useState, useCallback, useEffect } from 'react';
import { log } from '@/utils/logger';
import { schemaGenerator, type SchemaData } from '@/utils/schemaGenerator';

interface UseSchemaDataOptions {
  validateOnMount?: boolean;
  autoUpdate?: boolean;
  updateInterval?: number;
}

interface UseSchemaDataReturn {
  schemas: SchemaData[];
  loading: boolean;
  error: string | null;
  validationErrors: string[];
  addSchema: (schema: SchemaData) => void;
  removeSchema: (index: number) => void;
  updateSchema: (index: number, schema: SchemaData) => void;
  validateSchemas: () => { isValid: boolean; errors: string[] };
  clearSchemas: () => void;
}

/**
 * Hook for managing schema data
 */
export function useSchemaData(
  initialSchemas: SchemaData[] = [],
  options: UseSchemaDataOptions = {}
): UseSchemaDataReturn {
  const {
    validateOnMount = true,
    autoUpdate = false,
    updateInterval = 30000 // 30 seconds
  } = options;

  const [schemas, setSchemas] = useState<SchemaData[]>(initialSchemas);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Validate schemas
  const validateSchemas = useCallback(() => {
    const errors: string[] = [];
    
    schemas.forEach((schema, index) => {
      const validation = schemaGenerator.validateSchema(schema);
      if (!validation.isValid) {
        errors.push(`Schema ${index}: ${validation.errors.join(', ')}`);
      }
    });

    setValidationErrors(errors);
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [schemas]);

  // Add schema
  const addSchema = useCallback((schema: SchemaData) => {
    setSchemas(prev => [...prev, schema]);
    log.debug('useSchemaData', 'Added schema:', schema['@type']);
  }, []);

  // Remove schema
  const removeSchema = useCallback((index: number) => {
    setSchemas(prev => {
      const newSchemas = [...prev];
      newSchemas.splice(index, 1);
      return newSchemas;
    });
    log.debug('useSchemaData', `Removed schema at index ${index}`);
  }, []);

  // Update schema
  const updateSchema = useCallback((index: number, schema: SchemaData) => {
    setSchemas(prev => {
      const newSchemas = [...prev];
      newSchemas[index] = schema;
      return newSchemas;
    });
    log.debug('useSchemaData', `Updated schema at index ${index}:`, schema['@type']);
  }, []);

  // Clear all schemas
  const clearSchemas = useCallback(() => {
    setSchemas([]);
    setValidationErrors([]);
    log.debug('useSchemaData', 'Cleared all schemas');
  }, []);

  // Validate on mount
  useEffect(() => {
    if (validateOnMount && schemas.length > 0) {
      validateSchemas();
    }
  }, [validateOnMount, schemas.length, validateSchemas]);

  // Auto-update validation
  useEffect(() => {
    if (!autoUpdate || updateInterval <= 0) {
      return;
    }

    const interval = setInterval(() => {
      validateSchemas();
    }, updateInterval);

    return () => clearInterval(interval);
  }, [autoUpdate, updateInterval, validateSchemas]);

  return {
    schemas,
    loading,
    error,
    validationErrors,
    addSchema,
    removeSchema,
    updateSchema,
    validateSchemas,
    clearSchemas
  };
}

/**
 * Hook for page-specific schema generation
 */
export function usePageSchema(
  pageType: 'landing' | 'space' | 'post' | 'course' | 'profile',
  data: any,
  options: UseSchemaDataOptions = {}
) {
  const [schemas, setSchemas] = useState<SchemaData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSchemas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      log.debug('usePageSchema', `Generating schemas for ${pageType} page`);

      const generatedSchemas = schemaGenerator.generatePageSchemas(pageType, data);
      setSchemas(generatedSchemas);

      log.debug('usePageSchema', `Generated ${generatedSchemas.length} schemas`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      log.error('usePageSchema', 'Failed to generate schemas:', err);
    } finally {
      setLoading(false);
    }
  }, [pageType, data]);

  // Generate schemas when pageType or data changes
  useEffect(() => {
    if (data) {
      generateSchemas();
    }
  }, [pageType, data, generateSchemas]);

  return {
    schemas,
    loading,
    error,
    regenerate: generateSchemas
  };
}

/**
 * Hook for organization schema
 */
export function useOrganizationSchema(overrides: Partial<{
  name: string;
  url: string;
  logo: string;
  description: string;
}> = {}) {
  const [schema, setSchema] = useState<SchemaData | null>(null);

  useEffect(() => {
    const orgSchema = schemaGenerator.generateOrganizationSchema();
    
    // Apply overrides
    if (overrides.name) orgSchema.name = overrides.name;
    if (overrides.url) orgSchema.url = overrides.url;
    if (overrides.logo) orgSchema.logo = overrides.logo;
    if (overrides.description) orgSchema.description = overrides.description;

    setSchema(orgSchema);
  }, [overrides]);

  return schema;
}

/**
 * Hook for website schema
 */
export function useWebSiteSchema(overrides: Partial<{
  name: string;
  url: string;
  description: string;
  searchUrl: string;
}> = {}) {
  const [schema, setSchema] = useState<SchemaData | null>(null);

  useEffect(() => {
    const websiteSchema = schemaGenerator.generateWebSiteSchema();
    
    // Apply overrides
    if (overrides.name) websiteSchema.name = overrides.name;
    if (overrides.url) websiteSchema.url = overrides.url;
    if (overrides.description) websiteSchema.description = overrides.description;
    if (overrides.searchUrl) {
      websiteSchema.potentialAction = {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: overrides.searchUrl
        },
        'query-input': 'required name=search_term_string'
      };
    }

    setSchema(websiteSchema);
  }, [overrides]);

  return schema;
}

/**
 * Hook for breadcrumb schema
 */
export function useBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>) {
  const [schema, setSchema] = useState<SchemaData | null>(null);

  useEffect(() => {
    if (breadcrumbs.length > 0) {
      const breadcrumbSchema = schemaGenerator.generateBreadcrumbSchema(breadcrumbs);
      setSchema(breadcrumbSchema);
    } else {
      setSchema(null);
    }
  }, [breadcrumbs]);

  return schema;
}

/**
 * Hook for FAQ schema
 */
export function useFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  const [schema, setSchema] = useState<SchemaData | null>(null);

  useEffect(() => {
    if (faqs.length > 0) {
      const faqSchema = schemaGenerator.generateFAQPageSchema(faqs);
      setSchema(faqSchema);
    } else {
      setSchema(null);
    }
  }, [faqs]);

  return schema;
}
