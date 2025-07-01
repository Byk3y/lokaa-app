import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Base request metadata schema
const requestMetadataSchema = z.object({
  timestamp: z.number(),
  version: z.string(),
  deviceId: z.string().optional(),
  source: z.enum(['web', 'mobile', 'api']).default('web')
});

// Base error response schema
const errorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  timestamp: z.number()
});

export class APIValidation {
  private static instance: APIValidation;
  private customSchemas: Map<string, z.ZodType>;

  private constructor() {
    this.customSchemas = new Map();
  }

  static getInstance(): APIValidation {
    if (!APIValidation.instance) {
      APIValidation.instance = new APIValidation();
    }
    return APIValidation.instance;
  }

  /**
   * Register a custom schema for an endpoint
   */
  registerEndpointSchema(endpoint: string, schema: z.ZodType): void {
    this.customSchemas.set(endpoint, schema);
  }

  /**
   * Validate API request
   */
  async validateRequest<T extends z.ZodType>(
    endpoint: string,
    payload: unknown,
    schema?: T
  ): Promise<{
    isValid: boolean;
    errors: string[];
    sanitizedData?: z.infer<T>;
  }> {
    try {
      // Get endpoint schema
      const endpointSchema = schema || this.customSchemas.get(endpoint);
      if (!endpointSchema) {
        return {
          isValid: false,
          errors: [`No schema registered for endpoint: ${endpoint}`]
        };
      }

      // Create full request schema with metadata
      const fullSchema = z.object({
        metadata: requestMetadataSchema,
        data: endpointSchema
      });

      // Validate payload
      const validationResult = await fullSchema.safeParseAsync(payload);
      if (!validationResult.success) {
        return {
          isValid: false,
          errors: validationResult.error.errors.map(e => e.message)
        };
      }

      return {
        isValid: true,
        errors: [],
        sanitizedData: validationResult.data.data
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed']
      };
    }
  }

  /**
   * Validate API response
   */
  async validateResponse<T extends z.ZodType>(
    endpoint: string,
    response: unknown,
    schema?: T
  ): Promise<{
    isValid: boolean;
    errors: string[];
    sanitizedData?: z.infer<T>;
  }> {
    try {
      // Get endpoint schema
      const endpointSchema = schema || this.customSchemas.get(endpoint);
      if (!endpointSchema) {
        return {
          isValid: false,
          errors: [`No schema registered for endpoint: ${endpoint}`]
        };
      }

      // Handle error responses
      if ((response as any)?.error) {
        const errorValidation = await errorResponseSchema.safeParseAsync(response);
        if (!errorValidation.success) {
          return {
            isValid: false,
            errors: ['Invalid error response format']
          };
        }
        return {
          isValid: true,
          errors: [],
          sanitizedData: response as z.infer<T>
        };
      }

      // Validate response data
      const validationResult = await endpointSchema.safeParseAsync(response);
      if (!validationResult.success) {
        return {
          isValid: false,
          errors: validationResult.error.errors.map(e => e.message)
        };
      }

      return {
        isValid: true,
        errors: [],
        sanitizedData: validationResult.data
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed']
      };
    }
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(
    endpoint: string,
    userId: string
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    // TODO: Implement rate limiting with Redis or similar
    // For now, return basic allowance
    return {
      allowed: true,
      remaining: 100,
      resetAt: Date.now() + 3600000
    };
  }
} 