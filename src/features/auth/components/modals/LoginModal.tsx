/**
 * Login Modal Component
 * 
 * Modern React component replacing legacy DOM manipulation
 * from authModals.ts showDirectLoginModal function.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useModal } from '@/shared/components/modals/hooks/useModal';
import type { LoginFormData, AuthModalProps } from '@/shared/components/modals/types/modal';

interface LoginModalProps extends AuthModalProps {
  // Additional props can be added here
}

export default function LoginModal({ 
  onSuccess, 
  onError, 
  redirectTo 
}: LoginModalProps) {
  const { closeLoginModal, openSignupModal, openForgotPasswordModal } = useModal();
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Clear form and error when modal opens
  useEffect(() => {
    setFormData({ email: '', password: '' });
    setError('');
    setIsLoading(false);
  }, []);

  const handleInputChange = (field: keyof LoginFormData) => (
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
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Safari-specific: Clear any existing tokens to prevent state conflicts
      try {
        Object.keys(localStorage)
          .filter(key => key.startsWith('sb-'))
          .forEach(key => {
            console.log(`Preparing login - clearing key: ${key}`);
            localStorage.removeItem(key);
          });
      } catch (e) {
        console.warn('Failed to clear existing tokens:', e);
        // Continue despite this error
      }

      const { data, error: authError } = await getSupabaseClient().auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (authError) {
        console.error('Login error:', authError);
        setError(authError.message || 'Login failed');
        onError?.(authError.message || 'Login failed');
        return;
      }

      console.log('Login successful', data);

      // Store session data for immediate use  
      try {
        localStorage.setItem('getSupabaseClient().auth.token', JSON.stringify(data.session));
      } catch (storageError) {
        console.warn('Could not store session token:', storageError);
        // Continue despite this error
      }

      // Close modal first
      closeLoginModal();

      // Handle success callback
      onSuccess?.(data);

      // Handle redirect
      const finalRedirectPath = redirectTo || sessionStorage.getItem('redirect_after_login') || '/app';
      
      if (redirectTo || sessionStorage.getItem('redirect_after_login')) {
        sessionStorage.removeItem('redirect_after_login');
      }

      // Safari-specific fix: use window.location.replace with timestamp to prevent caching
      window.location.replace(finalRedirectPath + (finalRedirectPath.includes('?') ? '&' : '?') + 't=' + Date.now());

    } catch (err: any) {
      console.error('Login exception:', err);
      const errorMessage = err.message || 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToSignup = () => {
    closeLoginModal();
    openSignupModal();
  };

  const handleSwitchToForgot = () => {
    closeLoginModal(); 
    openForgotPasswordModal();
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

      {/* Email Field */}
      <div>
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          value={formData.email}
          onChange={handleInputChange('email')}
          placeholder="Enter your email"
          required
          autoComplete="email"
          autoFocus
        />
      </div>

      {/* Password Field */}
      <div>
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          value={formData.password}
          onChange={handleInputChange('password')}
          placeholder="Enter your password"
          required
          autoComplete="current-password"
        />
      </div>

      {/* Forgot Password Link */}
      <div className="text-right">
        <button
          type="button"
          onClick={handleSwitchToForgot}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          Forgot password?
        </button>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-full font-medium"
      >
        {isLoading ? 'Logging in...' : 'LOG IN'}
      </Button>

      {/* Switch to Signup */}
      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={handleSwitchToSignup}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Sign up for free
          </button>
        </p>
      </div>
    </form>
  );
} 