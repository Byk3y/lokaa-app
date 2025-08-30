import { log } from '@/utils/logger';
/**
 * Signup Modal Component
 * 
 * Modern React component replacing legacy DOM manipulation
 * from authModals.ts showDirectSignupModal function.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useModal } from '@/shared/components/modals/hooks/useModal';
import { useAuth } from '@/contexts/AuthContext';
import type { SignupFormData, AuthModalProps } from '@/shared/components/modals/types/modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupFormValues } from '@/shared/utils/validation/schemas';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Eye, EyeOff } from 'lucide-react';

interface SignupModalProps extends AuthModalProps {
  // Additional props can be added here
}

export default function SignupModal({ 
  onSuccess, 
  onError, 
  redirectTo 
}: SignupModalProps) {
  const { closeSignupModal, openLoginModal, openVerificationModal } = useModal();
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: ''
    },
    mode: 'onChange'
  });

  // Clear form when modal opens
  useEffect(() => {
    form.reset();
    setIsLoading(false);
  }, [form]);

  // Countdown timer for rate-limit cooldown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => setCooldownSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);
    setSubmitError(null);

    try {


      // Persist email so confirm page can verify if Supabase doesn't include it
      try { localStorage.setItem('pending-signup-email', values.email); } catch {}
      const result = await signUp(values.email, values.password, {
        username: `${values.firstName.toLowerCase()}-${values.lastName.toLowerCase()}`,
        firstName: values.firstName,
        lastName: values.lastName
      });

      // Debug logging to help identify the issue
      log.debug('Component', 'Signup result:', {
        hasError: !!result.error,
        errorMessage: result.error?.message,
        hasData: !!result.data,
        hasUser: !!result.data?.user,
        hasSession: !!result.data?.session,
        userEmailConfirmed: (result.data?.user as any)?.email_confirmed_at
      });

      // Enhanced debugging for user object
      if (result.data?.user) {
        const user = result.data.user as any;
        log.debug('Component', 'User object details:', {
          id: user.id,
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          created_at: user.created_at,
          updated_at: user.updated_at,
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata,
          allKeys: Object.keys(user)
        });
      }

      // Check for errors FIRST before any other logic
      if (result.error) {
        log.error('Component', 'Signup error:', result.error);
        const rawMsg = result.error.message || 'Signup failed';
        const normalized = rawMsg.toLowerCase();

        // Handle rate limit explicitly with a visible cooldown
        if (normalized.includes('rate limit')) {
          // Default to 60s if Supabase throttles; users often retry immediately
          setCooldownSeconds((prev) => (prev > 0 ? prev : 60));
          setSubmitError('Too many attempts. Please wait a moment and try again.');
          onError?.(rawMsg);
          return;
        }

        // Handle existing account UX explicitly
        if (normalized.includes('already') || normalized.includes('registered') || normalized.includes('exists')) {
          setSubmitError('Account already exists. You can sign in or reset your password.');
          onError?.(rawMsg);
          return;
        }

        // Default fallback
        setSubmitError(rawMsg);
        onError?.(rawMsg);
        return;
      }

      // Additional safety check: if no error but also no data, something went wrong
      if (!result.data) {
        log.error('Component', 'Signup returned no error but also no data');
        setSubmitError('Signup failed. Please try again.');
        onError?.('Signup failed - no data returned');
        return;
      }

      log.debug('Component', 'Signup successful', result);

      // Check if this is an existing user (Supabase doesn't return error for existing emails)
      if (result.data?.user && !result.data.session) {
        const user = result.data.user as any;
        
        // Check if user already exists by looking for email_confirmed_at
        if (user.email_confirmed_at) {
          log.debug('Component', 'Detected existing confirmed user during signup:', {
            email: user.email,
            emailConfirmed: user.email_confirmed_at
          });
          setSubmitError('Account already exists. You can sign in or reset your password.');
          onError?.('Account already exists');
          return;
        }
        
        // Check if user was created more than 1 minute ago (likely an existing user)
        if (user.created_at) {
          const createdAt = new Date(user.created_at);
          const oneMinuteAgo = new Date(Date.now() - 60 * 1000); // 1 minute ago
          
          log.debug('Component', 'Checking user creation time:', {
            email: user.email,
            createdAt: user.created_at,
            createdAtDate: createdAt,
            oneMinuteAgo: oneMinuteAgo,
            isOlderThanOneMinute: createdAt < oneMinuteAgo
          });
          
          if (createdAt < oneMinuteAgo) {
            log.debug('Component', 'Detected existing user (created more than 1 minute ago):', {
              email: user.email,
              createdAt: user.created_at
            });
            setSubmitError('Account already exists. You can sign in or reset your password.');
            onError?.('Account already exists');
            return;
          }
        }
        
        // Additional check: if user has app_metadata or user_metadata that suggests it's an existing user
        if (user.app_metadata && Object.keys(user.app_metadata).length > 0) {
          log.debug('Component', 'Detected existing user (has app_metadata):', {
            email: user.email,
            appMetadata: user.app_metadata
          });
          setSubmitError('Account already exists. You can sign in or reset your password.');
          onError?.('Account already exists');
          return;
        }
      }

      // Handle redirect - check if email confirmation is required
      if (result.data?.user && !result.data.session) {
        // Email confirmation required - open verification modal with email
        closeSignupModal();
        openVerificationModal(values.email);
        return;
      } else if (result.data?.session) {
        // Close modal and notify success when user is logged in
        closeSignupModal();
        onSuccess?.();
        // User is immediately logged in, redirect
        if (redirectTo) {
          window.location.replace(redirectTo);
        }
      }

    } catch (err: any) {
      log.error('Component', 'Signup exception:', err);
      const errorMessage = err.message || 'An unexpected error occurred. Please try again.';
      setSubmitError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToLogin = () => {
    closeSignupModal();
    openLoginModal();
  };

  return (
    <Form methods={form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {infoMessage && (
          <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">
            {infoMessage}
            <div className="mt-2">
              <button
                type="button"
                className="text-teal-700 underline"
                onClick={async () => {
                  try {
                    const { getSupabaseClient } = await import('@/integrations/supabase/client');
                    await getSupabaseClient().auth.resend({ type: 'signup', email: form.getValues('email') });
                    setInfoMessage('Verification email resent. Please check your inbox (and spam folder).');
                  } catch (e) {
                    setSubmitError('Unable to resend verification email. Please try again in a minute.');
                  }
                }}
              >
                Resend verification email
              </button>
            </div>
          </div>
        )}
        {submitError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {submitError}
            {cooldownSeconds > 0 && (
              <div className="mt-1 text-red-600">
                Try again in {cooldownSeconds}s
              </div>
            )}
            {submitError.toLowerCase().includes('already') && (
              <>
                {' '}– <button type="button" onClick={handleSwitchToLogin} className="underline">Sign in</button>
                {' '}or{' '}
                <a href="/forgot-password" className="underline">Reset password</a>
              </>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="signup-firstName">First name</Label>
                <FormControl>
                  <Input
                    id="signup-firstName"
                    type="text"
                    placeholder="First name"
                    autoComplete="given-name"
                    autoFocus
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="signup-lastName">Last name</Label>
                <FormControl>
                  <Input
                    id="signup-lastName"
                    type="text"
                    placeholder="Last name"
                    autoComplete="family-name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="signup-email">Email</Label>
              <FormControl>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="signup-password">Password</Label>
              <div className="relative flex items-center">
                <FormControl>
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    className="pr-10"
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-md z-10"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !form.formState.isValid || cooldownSeconds > 0}
        >
          {isLoading ? 'Creating account...' : cooldownSeconds > 0 ? `Try again in ${cooldownSeconds}s` : 'Create account'}
        </Button>

        {/* Terms and Privacy */}
        <div className="text-center text-sm text-gray-500">
          By signing up, you accept our{" "}
          <a href="/terms" className="text-teal-600 hover:text-teal-700">
            terms
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-teal-600 hover:text-teal-700">
            privacy policy
          </a>
          .
        </div>

        {/* Login Link */}
        <div className="text-center text-sm">
          <span className="text-gray-600">Already have an account?</span>{' '}
          <button
            type="button"
            onClick={handleSwitchToLogin}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Sign in
          </button>
        </div>
      </form>
    </Form>
  );
} 