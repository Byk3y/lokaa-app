/**
 * API Validation Utility
 * 
 * Provides validation for API requests and responses
 */

import { z } from 'zod';
import { MobileValidationService } from '../../services/MobileValidationService';

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
  private mobileValidation: MobileValidationService;
  private customSchemas: Map<string, z.ZodType>;

  private constructor() {
    this.mobileValidation = MobileValidationService.getInstance();
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

      // Check mobile context if needed
      if (validationResult.data.metadata.source === 'mobile') {
        const mobileContext = this.mobileValidation.validateNetworkConditions();
        if (!mobileContext.isValid) {
          return {
            isValid: false,
            errors: mobileContext.errors
          };
        }
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
   * Create middleware for Edge Functions
   */
  createValidationMiddleware<T extends z.ZodType>(schema: T) {
    return async (req: Request): Promise<Response> => {
      try {
        const payload = await req.json();
        
        // Validate request
        const validation = await this.validateRequest(
          new URL(req.url).pathname,
          payload,
          schema
        );

        if (!validation.isValid) {
          return new Response(
            JSON.stringify({
              code: 'VALIDATION_ERROR',
              message: 'Invalid request payload',
              details: { errors: validation.errors },
              timestamp: Date.now()
            }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
        }

        // Attach validated data to request
        (req as any).validatedData = validation.sanitizedData;
        
        return new Response(JSON.stringify({ success: true }), {
          headers: {
            'Content-Type': 'application/json'
          }
        });

      } catch (error) {
        return new Response(
          JSON.stringify({
            code: 'INTERNAL_ERROR',
            message: 'Failed to process request',
            timestamp: Date.now()
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }
    };
  }

  /**
   * Rate limiting check
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