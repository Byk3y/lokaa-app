import { log } from '@/utils/logger';
/**
 * Forgot Password Modal Component
 * 
 * Modern React component replacing legacy DOM manipulation
 * from authModals.ts showDirectForgotPasswordModal function.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useModal } from '@/shared/components/modals/hooks/useModal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/shared/utils/validation/schemas';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

interface ForgotPasswordModalProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function ForgotPasswordModal({ 
  onSuccess, 
  onError 
}: ForgotPasswordModalProps) {
  const { closeForgotPasswordModal, openLoginModal } = useModal();
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ''
    },
    mode: 'onChange'
  });

  // Clear form when modal opens
  useEffect(() => {
    form.reset();
    setIsLoading(false);
    setSuccessMessage('');
  }, [form]);

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setIsLoading(true);
    setSuccessMessage('');

    try {
      // Send OTP for password reset using signInWithOtp
      const { error: resetError } = await getSupabaseClient().auth.signInWithOtp({
        email: values.email,
        options: {
          shouldCreateUser: false, // Don't create user if they don't exist
        },
      });

      if (resetError) {
        log.error('Component', 'Password reset OTP error:', resetError);
        onError?.(resetError.message || 'Failed to send reset code');
        return;
      }

      log.debug('Component', 'Password reset OTP sent');
      setSuccessMessage('Check your email for a 6-digit reset code');
      form.reset();
      
      // Redirect to reset password page with email parameter
      setTimeout(() => {
        window.location.href = `/reset-password?email=${encodeURIComponent(values.email)}`;
      }, 2000);
      
      // Handle success callback
      onSuccess?.();

    } catch (err: any) {
      log.error('Component', 'Password reset OTP exception:', err);
      const errorMessage = err.message || 'An unexpected error occurred';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    closeForgotPasswordModal();
    openLoginModal();
  };

  return (
    <Form methods={form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {successMessage && (
          <div className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg p-3">
            {successMessage}
          </div>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="forgot-password-email">Email</Label>
              <FormControl>
                <Input
                  id="forgot-password-email"
                  type="email"
                  placeholder="Enter your email"
                  autoComplete="email"
                  autoFocus
                  {...field}
                />
              </FormControl>
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
          {isLoading ? 'Sending reset link...' : 'Send reset link'}
        </Button>

        {/* Back to Login */}
        <div className="text-center text-sm">
          <button
            type="button"
            onClick={handleBackToLogin}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Back to login
          </button>
        </div>
      </form>
    </Form>
  );
} 