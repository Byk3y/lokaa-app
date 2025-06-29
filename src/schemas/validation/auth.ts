/**
 * Auth Validation Schemas
 * 
 * Central validation schemas for authentication forms
 */

import { z } from 'zod';

// Base user schema
export const baseUserSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .min(5, 'Email must be at least 5 characters')
    .max(255, 'Email must be less than 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be less than 72 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
});

// Login schema
export const loginSchema = baseUserSchema;

// Signup schema
export const signupSchema = baseUserSchema.extend({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Password reset schema
export const passwordResetSchema = z.object({
  email: baseUserSchema.shape.email
});

// Password update schema
export const passwordUpdateSchema = z.object({
  currentPassword: baseUserSchema.shape.password,
  newPassword: baseUserSchema.shape.password,
  confirmNewPassword: z.string()
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match",
  path: ["confirmNewPassword"]
}); 