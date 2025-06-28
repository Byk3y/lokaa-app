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
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useModal } from '@/shared/components/modals/hooks/useModal';
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
  const { closeSignupModal, openLoginModal } = useModal();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);

    try {
      const { data, error: authError } = await getSupabaseClient().auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            firstName: values.firstName,
            lastName: values.lastName,
            full_name: `${values.firstName} ${values.lastName}`
          }
        }
      });

      if (authError) {
        console.error('Signup error:', authError);
        onError?.(authError.message || 'Signup failed');
        return;
      }

      console.log('Signup successful', data);

      // Close modal first
      closeSignupModal();

      // Handle success callback
      onSuccess?.();

      // Handle redirect - check if email confirmation is required
      if (data.user && !data.user.email_confirmed_at) {
        // Show success message for email confirmation
        alert('Please check your email and click the confirmation link to complete your account setup.');
      } else {
        // User is immediately logged in, redirect
        if (redirectTo) {
          window.location.replace(redirectTo);
        }
      }

    } catch (err: any) {
      console.error('Signup exception:', err);
      const errorMessage = err.message || 'An unexpected error occurred. Please try again.';
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
          disabled={isLoading || !form.formState.isValid}
        >
          {isLoading ? 'Creating account...' : 'Create account'}
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