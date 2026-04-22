import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkEdgeRateLimit } from './ratelimit.ts';

// Centralized UUID validation for Edge Functions
export const UUIDSchema = z.string().uuid('Invalid UUID format');
export const SpaceIdSchema = UUIDSchema.describe('Space ID must be a valid UUID');
export const UserIdSchema = UUIDSchema.describe('User ID must be a valid UUID');
export const PostIdSchema = UUIDSchema.describe('Post ID must be a valid UUID');

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
   *
   * Backed by the edge_rate_limit_check RPC (see
   * supabase/migrations/20260422030949_edge_function_rate_limits.sql).
   * Fails open if SUPABASE_URL / SERVICE_ROLE_KEY env vars are missing
   * (e.g. local test runs) or if the RPC call errors — a broken
   * limiter shouldn't lock real users out.
   *
   * Defaults: 30 requests per 15-minute window per (endpoint, user).
   * Callers that want different values should call `checkEdgeRateLimit`
   * directly with explicit limits.
   */
  async checkRateLimit(
    endpoint: string,
    userId: string,
    opts: { limit?: number; windowSeconds?: number } = {}
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    const limit = opts.limit ?? 30;
    const windowSeconds = opts.windowSeconds ?? 15 * 60;

    const admin = getRateLimitAdminClient();
    if (!admin) {
      return { allowed: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000 };
    }

    const result = await checkEdgeRateLimit(admin, {
      endpoint,
      bucketKey: `user:${userId}`,
      limit,
      windowSeconds,
    });

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAt: Date.now() + result.retryAfterSeconds * 1000,
    };
  }
}

// Singleton used by edge functions (e.g. `create-post/index.ts` imports
// `apiValidation`). Exported here rather than as a named const on the
// class to keep the class definition tidy.
export const apiValidation = APIValidation.getInstance();

// Lazy-initialized service_role client for rate limiting. Kept at module
// scope so we don't rebuild it on every call. Null if env vars are
// missing (test environments).
let _rateLimitAdmin: SupabaseClient | null | undefined;
function getRateLimitAdminClient(): SupabaseClient | null {
  if (_rateLimitAdmin !== undefined) return _rateLimitAdmin;
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  _rateLimitAdmin = (url && key)
    ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;
  return _rateLimitAdmin;
} 