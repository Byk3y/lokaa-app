import { z } from 'zod';

/**
 * Base email schema with consistent validation and error messages
 */
export const emailSchema = z.string()
  .trim()
  .email({ message: "Please enter a valid email address" });

/**
 * Base password schema with consistent validation and error messages
 */
export const passwordSchema = z.string()
  .min(6, { message: "Password must be at least 6 characters" })
  .max(100, { message: "Password is too long" });

/**
 * Login form schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/**
 * Signup form schema
 */
export const signupSchema = z.object({
  firstName: z.string()
    .trim()
    .min(2, { message: "First name must be at least 2 characters" })
    .max(50, { message: "First name is too long" }),
  lastName: z.string()
    .trim()
    .min(2, { message: "Last name must be at least 2 characters" })
    .max(50, { message: "Last name is too long" }),
  email: emailSchema,
  password: passwordSchema,
});

/**
 * Forgot password form schema
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// Export types
export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>; 