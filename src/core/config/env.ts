/**
 * Environment Variables
 * 
 * This file provides type-safe access to environment variables.
 * All environment variables used in the application should be accessed through this file.
 */

/**
 * Environment variables with defaults and runtime validation
 */
export const env = {
  /**
   * Node environment
   */
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  /**
   * Whether the app is running in production
   */
  isProduction: process.env.NODE_ENV === 'production',
  
  /**
   * Whether the app is running in development
   */
  isDevelopment: process.env.NODE_ENV === 'development',
  
  /**
   * Whether the app is running in test mode
   */
  isTest: process.env.NODE_ENV === 'test',
  
  /**
   * API URL
   */
  apiUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
  
  /**
   * Supabase URL
   */
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  
  /**
   * Supabase anonymous key
   */
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  
  /**
   * Analytics tracking ID
   */
  analyticsId: process.env.NEXT_PUBLIC_ANALYTICS_ID || '',
};

/**
 * Validate required environment variables
 * 
 * This function should be called early in the application bootstrap process
 * to ensure all required environment variables are present.
 */
export function validateEnv(): void {
  const requiredEnvVars = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', value: env.supabaseUrl },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: env.supabaseAnonKey },
  ];
  
  const missingEnvVars = requiredEnvVars
    .filter(({ value }) => !value)
    .map(({ key }) => key);
  
  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(', ')}`
    );
  }
} 