import { log } from '@/utils/logger';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';

/**
 * Supabase Auth Module - Lazy loaded for auth-specific features
 * This module is only loaded when authentication features are needed
 */

export interface AuthResult {
  data: any;
  error: AuthError | null;
}

export interface SessionResult {
  data: { session: Session | null };
  error: AuthError | null;
}

/**
 * Sign in with email and password
 */
export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  return getSupabaseClient().auth.signInWithPassword({ email, password });
}

/**
 * Sign up with email and password
 */
export async function signUp(
  email: string, 
  password: string, 
  options?: { data?: any; emailRedirectTo?: string }
): Promise<AuthResult> {
  return getSupabaseClient().auth.signUp({ email, password, options });
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  return getSupabaseClient().auth.signOut();
}

/**
 * Get the current session
 */
export async function getSession(): Promise<SessionResult> {
  return getSupabaseClient().auth.getSession();
}

/**
 * Get the current user
 */
export async function getUser(): Promise<{ data: { user: User | null }; error: AuthError | null }> {
  return getSupabaseClient().auth.getUser();
}

/**
 * Update user data
 */
export async function updateUser(attributes: { data?: any; email?: string; password?: string }): Promise<AuthResult> {
  return getSupabaseClient().auth.updateUser(attributes);
}

/**
 * Send password reset email
 */
export async function resetPasswordForEmail(email: string, options?: { redirectTo?: string }): Promise<{ error: AuthError | null }> {
  return getSupabaseClient().auth.resetPasswordForEmail(email, options);
}

/**
 * Verify OTP
 */
export async function verifyOtp(params: { type: 'signup' | 'recovery'; email: string; token: string }): Promise<AuthResult> {
  return getSupabaseClient().auth.verifyOtp(params);
}

/**
 * Exchange code for session
 */
export async function exchangeCodeForSession(code: string): Promise<SessionResult> {
  return getSupabaseClient().auth.exchangeCodeForSession(code);
}

/**
 * Resend verification email
 */
export async function resend(params: { type: 'signup'; email: string }): Promise<{ error: AuthError | null }> {
  return getSupabaseClient().auth.resend(params);
}

/**
 * Set up auth state change listener
 */
export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  return getSupabaseClient().auth.onAuthStateChange(callback);
}

/**
 * Refresh the current session
 */
export async function refreshSession(): Promise<SessionResult> {
  return getSupabaseClient().auth.refreshSession();
}

log.debug('Supabase', '🔐 Auth module loaded');
