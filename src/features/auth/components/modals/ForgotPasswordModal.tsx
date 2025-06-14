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
import type { ForgotPasswordFormData, AuthModalProps } from '@/shared/components/modals/types/modal';

interface ForgotPasswordModalProps extends AuthModalProps {
  // Additional props can be added here
}

export default function ForgotPasswordModal({ 
  onSuccess, 
  onError 
}: ForgotPasswordModalProps) {
  const { closeForgotPasswordModal, openLoginModal } = useModal();
  
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: ''
  });
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Clear form and messages when modal opens
  useEffect(() => {
    setFormData({ email: '' });
    setError('');
    setMessage('');
    setIsLoading(false);
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ email: event.target.value });
    // Clear messages when user starts typing
    if (error) setError('');
    if (message) setMessage('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validate input
    if (!formData.email.trim()) {
      setError('Please enter your email');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const { error: resetError } = await getSupabaseClient().auth.resetPasswordForEmail(
        formData.email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        console.error('Password reset error:', resetError);
        setError(resetError.message || 'Failed to send reset link');
        onError?.(resetError.message || 'Failed to send reset link');
        return;
      }

      console.log('Password reset email sent');
      setMessage('Check your email for a password reset link');
      setFormData({ email: '' });
      
      // Handle success callback
      onSuccess?.();

    } catch (err: any) {
      console.error('Password reset exception:', err);
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Success Message */}
      {message && (
        <div 
          className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg p-3"
          role="status"
        >
          {message}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div 
          className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Instructions */}
      <div className="text-sm text-gray-600 mb-4">
        Enter your email address and we'll send you a link to reset your password.
      </div>

      {/* Email Field */}
      <div>
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="Enter your email"
          required
          autoComplete="email"
          autoFocus
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-full font-medium"
      >
        {isLoading ? 'Sending...' : 'SEND RESET LINK'}
      </Button>

      {/* Back to Login */}
      <div className="text-center pt-4">
        <button
          type="button"
          onClick={handleBackToLogin}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          Back to login
        </button>
      </div>
    </form>
  );
} 