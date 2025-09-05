/**
 * 🔥 PHASE 2: UUID Validation Schemas
 * 
 * Centralized Zod schemas for UUID validation using our enhanced UUID utilities
 * Provides type-safe validation with detailed error messages
 */

import { z } from 'zod';
import { isValidUUID, validateUUIDDetailed, isUUIDVersion } from '@/utils/uuid';

/**
 * Basic UUID schema using centralized validation
 * Replaces inline z.string().uuid() calls for consistency
 */
export const UUIDSchema = z.string().refine(isValidUUID, {
  message: 'Invalid UUID format (must be in format: 123e4567-e89b-12d3-a456-426614174000)',
});

/**
 * Optional UUID schema for nullable/optional fields
 */
export const OptionalUUIDSchema = UUIDSchema.optional();

/**
 * Nullable UUID schema for database fields that can be null
 */
export const NullableUUIDSchema = UUIDSchema.nullable();

/**
 * Optional nullable UUID schema for maximum flexibility
 */
export const OptionalNullableUUIDSchema = UUIDSchema.optional().nullable();

/**
 * Array of UUIDs schema for bulk operations
 */
export const UUIDArraySchema = z.array(UUIDSchema);

/**
 * Non-empty array of UUIDs for required lists
 */
export const NonEmptyUUIDArraySchema = z.array(UUIDSchema).min(1, 'At least one UUID is required');

/**
 * UUID v4 specific validation (most common)
 */
export const UUIDv4Schema = z.string().refine(
  (value) => isUUIDVersion(value, 4),
  {
    message: 'Must be a valid UUID v4 format',
  }
);

/**
 * UUID v1 specific validation (timestamp-based)
 */
export const UUIDv1Schema = z.string().refine(
  (value) => isUUIDVersion(value, 1),
  {
    message: 'Must be a valid UUID v1 format',
  }
);

/**
 * Enhanced UUID schema with detailed validation
 * Provides rich validation results for complex use cases
 */
export const DetailedUUIDSchema = z.string().transform((value, ctx) => {
  const validation = validateUUIDDetailed(value);
  
  if (!validation.isValid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: validation.error || 'Invalid UUID format',
    });
    return z.NEVER;
  }
  
  return {
    uuid: value,
    version: validation.version,
    format: validation.format,
    details: validation.details
  };
});

/**
 * Specific domain UUID schemas with descriptive error messages
 */

// Space-related UUIDs
export const SpaceIdSchema = UUIDSchema.describe('Space ID must be a valid UUID');
export const SpaceOwnerIdSchema = UUIDSchema.describe('Space owner ID must be a valid UUID');

// User-related UUIDs  
export const UserIdSchema = UUIDSchema.describe('User ID must be a valid UUID');
export const ProfileIdSchema = UUIDSchema.describe('Profile ID must be a valid UUID');

// Post-related UUIDs
export const PostIdSchema = UUIDSchema.describe('Post ID must be a valid UUID');
export const CommentIdSchema = UUIDSchema.describe('Comment ID must be a valid UUID');
export const ParentCommentIdSchema = OptionalUUIDSchema.describe('Parent comment ID must be a valid UUID if provided');

// Chat-related UUIDs
export const ConversationIdSchema = UUIDSchema.describe('Conversation ID must be a valid UUID');
export const MessageIdSchema = UUIDSchema.describe('Message ID must be a valid UUID');

// Media-related UUIDs
export const MediaIdSchema = UUIDSchema.describe('Media ID must be a valid UUID');
export const FileIdSchema = UUIDSchema.describe('File ID must be a valid UUID');

/**
 * Composite schemas for complex objects
 */

// User reference object
export const UserReferenceSchema = z.object({
  id: UserIdSchema,
  email: z.string().email().optional(),
  full_name: z.string().optional(),
});

// Space reference object
export const SpaceReferenceSchema = z.object({
  id: SpaceIdSchema,
  name: z.string(),
  subdomain: z.string().optional(),
  owner_id: SpaceOwnerIdSchema,
});

// Post reference object
export const PostReferenceSchema = z.object({
  id: PostIdSchema,
  title: z.string(),
  space_id: SpaceIdSchema,
  author_id: UserIdSchema,
});

/**
 * Utility functions for schema validation
 */

/**
 * Validate multiple UUIDs at once
 */
export function validateUUIDs(uuids: string[]): {
  isValid: boolean;
  errors: string[];
  validUUIDs: string[];
  invalidUUIDs: string[];
} {
  const validUUIDs: string[] = [];
  const invalidUUIDs: string[] = [];
  const errors: string[] = [];

  uuids.forEach((uuid, index) => {
    if (isValidUUID(uuid)) {
      validUUIDs.push(uuid);
    } else {
      invalidUUIDs.push(uuid);
      errors.push(`UUID at index ${index} is invalid: ${uuid}`);
    }
  });

  return {
    isValid: invalidUUIDs.length === 0,
    errors,
    validUUIDs,
    invalidUUIDs
  };
}

/**
 * Create custom UUID schema with field-specific error message
 */
export function createUUIDSchema(fieldName: string, isOptional = false): z.ZodSchema {
  const baseSchema = z.string().refine(isValidUUID, {
    message: `${fieldName} must be a valid UUID format`,
  });

  return isOptional ? baseSchema.optional() : baseSchema;
}

/**
 * Type exports for TypeScript integration
 */
export type UUID = z.infer<typeof UUIDSchema>;
export type OptionalUUID = z.infer<typeof OptionalUUIDSchema>;
export type NullableUUID = z.infer<typeof NullableUUIDSchema>;
export type UUIDArray = z.infer<typeof UUIDArraySchema>;
export type DetailedUUID = z.infer<typeof DetailedUUIDSchema>;

export type UserReference = z.infer<typeof UserReferenceSchema>;
export type SpaceReference = z.infer<typeof SpaceReferenceSchema>;
export type PostReference = z.infer<typeof PostReferenceSchema>; 