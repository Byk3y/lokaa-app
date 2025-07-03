/**
 * Space Settings Validation Schemas
 * 
 * Central validation schemas for space settings
 * 🔥 PHASE 2: Updated to use centralized UUID validation
 */

import { z } from 'zod';
import { FileValidationService } from '../../services/FileValidationService';
import { SpaceOwnerIdSchema, UUIDSchema } from './uuid';

// Base space settings schema
const baseSpaceSettingsSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(30, 'Name must be less than 30 characters')
    .regex(/^[\w\s\-.,!?'"()]+$/, 'Name contains invalid characters'),
  description: z.string()
    .max(150, 'Description must be less than 150 characters')
    .optional(),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63, 'Subdomain must be less than 63 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  is_private: z.boolean().default(false),
  support_email: z.string()
    .email('Invalid email address')
    .optional()
    .nullable(),
  owner_id: SpaceOwnerIdSchema
});

// About page settings schema
export const aboutSchema = z.object({
  about_description: z.string()
    .max(50000, 'About description must be less than 50,000 characters')
    .optional(),
  short_description: z.string()
    .max(200, 'Short description must be less than 200 characters')
    .optional(),
  intro_media_type: z.enum(['none', 'image', 'video']).default('none'),
  intro_media_url: z.string().url('Invalid media URL').optional().nullable(),
  icon_image: z.string().url('Invalid icon URL').optional().nullable(),
  cover_image: z.string().url('Invalid cover URL').optional().nullable()
});

// Rules settings schema
export const rulesSchema = z.object({
  rules_list: z.array(z.object({
    id: UUIDSchema.describe('Rule ID must be a valid UUID'),
    text: z.string()
      .min(1, 'Rule text is required')
      .max(500, 'Rule text must be less than 500 characters')
  })).default([])
});

// Categories settings schema
export const categoriesSchema = z.object({
  categories: z.array(z.object({
    id: UUIDSchema.describe('Category ID must be a valid UUID'),
    name: z.string()
      .min(2, 'Category name must be at least 2 characters')
      .max(50, 'Category name must be less than 50 characters'),
    icon: z.string()
      .min(1, 'Category icon is required')
      .max(2, 'Category icon must be a single emoji')
  })).default([])
});

// Pricing settings schema
export const pricingSchema = z.object({
  pricing_type: z.enum(['free', 'paid']).default('free'),
  price_per_month: z.number()
    .min(1, 'Price must be at least 1')
    .max(999, 'Price must be less than 999')
    .optional()
    .nullable(),
  feature_7_day_trial_enabled: z.boolean().default(false)
});

// Tabs settings schema
export const tabsSchema = z.object({
  feature_classroom_enabled: z.boolean().default(false),
  feature_calendar_enabled: z.boolean().default(false),
  feature_map_enabled: z.boolean().default(false)
});

// General settings schema
export const generalSchema = baseSpaceSettingsSchema.extend({
  icon_image: z.string().url('Invalid icon URL').optional().nullable(),
  cover_image: z.string().url('Invalid cover URL').optional().nullable()
});

// Combined settings schema
export const spaceSettingsSchema = baseSpaceSettingsSchema
  .extend({
    about: aboutSchema,
    rules: rulesSchema,
    categories: categoriesSchema,
    pricing: pricingSchema,
    tabs: tabsSchema
  });

// File validation functions
export const validateSpaceIcon = async (file: File) => {
  const fileValidation = FileValidationService.getInstance();
  return fileValidation.validateFile(file, 'image');
};

export const validateSpaceCover = async (file: File) => {
  const fileValidation = FileValidationService.getInstance();
  return fileValidation.validateFile(file, 'image');
}; 