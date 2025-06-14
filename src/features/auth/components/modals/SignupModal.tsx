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

interface SignupModalProps extends AuthModalProps {
  // Additional props can be added here
}

export default function SignupModal({ 
  onSuccess, 
  onError, 
  redirectTo 
}: SignupModalProps) {
  const { closeSignupModal, openLoginModal } = useModal();
  
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: '',
    lastName: '', 
    email: '',
    password: ''
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Clear form and error when modal opens
  useEffect(() => {
    setFormData({ firstName: '', lastName: '', email: '', password: '' });
    setError('');
    setIsLoading(false);
  }, []);

  const handleInputChange = (field: keyof SignupFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validate inputs
    const { firstName, lastName, email, password } = formData;
    
    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }
    
    if (!lastName.trim()) {
      setError('Last name is required');
      return;
    }
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    if (!password) {
      setError('Password is required');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data, error: authError } = await getSupabaseClient().auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`
          }
        }
      });

      if (authError) {
        console.error('Signup error:', authError);
        setError(authError.message || 'Signup failed');
        onError?.(authError.message || 'Signup failed');
        return;
      }

      console.log('Signup successful', data);

      // Close modal first
      closeSignupModal();

      // Handle success callback
      onSuccess?.(data);

      // Handle redirect - check if email confirmation is required
      if (data.user && !data.user.email_confirmed_at) {
        // Show success message for email confirmation
        alert('Please check your email and click the confirmation link to complete your account setup.');
      } else {
        // User is immediately logged in, redirect
        const finalRedirectPath = redirectTo || '/app';
        window.location.replace(finalRedirectPath + (finalRedirectPath.includes('?') ? '&' : '?') + 't=' + Date.now());
      }

    } catch (err: any) {
      console.error('Signup exception:', err);
      const errorMessage = err.message || 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Display */}
      {error && (
        <div 
          className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="signup-firstName">First name</Label>
          <Input
            id="signup-firstName"
            type="text"
            value={formData.firstName}
            onChange={handleInputChange('firstName')}
            placeholder="First name"
            required
            autoComplete="given-name"
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="signup-lastName">Last name</Label>
          <Input
            id="signup-lastName"
            type="text"
            value={formData.lastName}
            onChange={handleInputChange('lastName')}
            placeholder="Last name"
            required
            autoComplete="family-name"
          />
        </div>
      </div>

      {/* Email Field */}
      <div>
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          value={formData.email}
          onChange={handleInputChange('email')}
          placeholder="Enter your email"
          required
          autoComplete="email"
        />
      </div>

      {/* Password Field */}
      <div>
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          value={formData.password}
          onChange={handleInputChange('password')}
          placeholder="Create a password (min. 6 characters)"
          required
          autoComplete="new-password"
          minLength={6}
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-full font-medium"
      >
        {isLoading ? 'Creating account...' : 'SIGN UP'}
      </Button>

      {/* Terms and Privacy */}
      <div className="text-center text-xs text-gray-500">
        By signing up, you accept our{' '}
        <a href="/terms" className="text-teal-600 hover:text-teal-700">
          terms
        </a>{' '}
        and{' '}
        <a href="/privacy" className="text-teal-600 hover:text-teal-700">
          privacy policy
        </a>
        .
      </div>

      {/* Switch to Login */}
      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <button
            type="button"
            onClick={handleSwitchToLogin}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Log in
          </button>
        </p>
      </div>
    </form>
  );
} 