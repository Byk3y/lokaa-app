import { log } from '@/utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

// Password reset form schema
const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'otp' | 'password' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // OTP state
  const [otpInput, setOtpInput] = useState<string>('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  
  const otpInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: ''
    },
    mode: 'onChange'
  });

  // Extract email from URL and set up OTP flow
  useEffect(() => {
    const setupOtpFlow = async () => {
      try {
        const emailFromUrl = searchParams.get('email');
        
        log.debug('Component', 'Reset password page loaded:', { email: emailFromUrl });

        if (!emailFromUrl) {
          setErrorMessage('Invalid or missing email. Please request a new password reset.');
          setStatus('error');
          return;
        }

        // Email exists, show OTP input
        setEmail(emailFromUrl);
        setStatus('otp');
        
        // Auto-focus OTP input
        setTimeout(() => {
          otpInputRef.current?.focus();
        }, 100);
      } catch (error) {
        log.error('Component', 'Error setting up OTP flow:', error);
        setErrorMessage('An error occurred while setting up the reset flow. Please try again.');
        setStatus('error');
      }
    };

    setupOtpFlow();
  }, [searchParams]);

  // 🔧 FIX 1: Clear OTP error when we have exactly 6 digits (like EmailVerificationModal)
  useEffect(() => {
    if (otpInput.length === 6 && otpError) {
      setOtpError(null);
    }
  }, [otpInput.length, otpError]);

  // OTP verification logic
  const handleVerifyOtp = async () => {
    setOtpError(null);
    const code = otpInput.replace(/\D/g, '').trim(); // Remove any non-digits
    
    log.debug('Component', 'Verifying OTP:', { email, code, codeLength: code.length });
    
    if (!email) {
      setOtpError('Email is required for verification.');
      return;
    }
    if (!code || code.length !== 6) {
      setOtpError('Please enter the complete 6-digit code.');
      return;
    }
    
    setIsVerifyingOtp(true);
    try {
      const client = getSupabaseClient();
      log.debug('Component', 'Attempting to verify OTP with Supabase...');
      
      const { data, error } = await client.auth.verifyOtp({ 
        type: 'email', 
        email, 
        token: code 
      });
      
      log.debug('Component', 'Supabase OTP response:', { data, error });
      
      if (error) {
        log.error('Component', 'OTP verification error:', error);
        setOtpError(error.message || 'Invalid or expired code.');
        return;
      }
      
      if (data?.user) {
        log.debug('Component', 'OTP verification successful, proceeding to password reset');
        setStatus('password');
      } else {
        setOtpError('Verification failed. Please try again.');
      }
    } catch (e: any) {
      log.error('Component', 'OTP verification exception:', e);
      const errorMessage = e?.message || 'Could not verify the code. Please try again.';
      setOtpError(errorMessage);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // OTP input change handler
  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpInput(value);
    
    // Auto-submit when we have 6 digits
    if (value.length === 6) {
      // Small delay to ensure state is updated
      setTimeout(() => {
        handleVerifyOtp();
      }, 100);
    }
  };

  // Resend OTP functionality
  const handleResendOtp = async () => {
    if (!email) {
      setResendError('Email is required to resend verification.');
      return;
    }

    setIsResending(true);
    setResendError(null);
    setResendMessage(null);

    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        setResendError(error.message || 'Failed to resend email.');
      } else {
        setResendMessage('Reset code sent! Check your inbox.');
        setResendCooldown(60); // 60 second cooldown
      }
    } catch (e: any) {
      setResendError(e?.message || 'Failed to resend email.');
    } finally {
      setIsResending(false);
    }
  };

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const onSubmit = async (values: ResetPasswordFormValues) => {
    try {
      setStatus('loading');

      log.debug('Component', 'Attempting to update password');

      const { error } = await getSupabaseClient().auth.updateUser({
        password: values.password
      });

      if (error) {
        log.error('Component', 'Password update error:', error);
        setErrorMessage(error.message || 'Failed to update password. Please try again.');
        setStatus('error');
        return;
      }

      log.debug('Component', 'Password updated successfully');
      setStatus('success');

      // 🔧 FIX 2: Check if user is logged in after password reset and redirect appropriately
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      
      if (session) {
        // User is logged in, redirect to app
        log.debug('Component', 'User is logged in after password reset, redirecting to app');
        setTimeout(() => {
          navigate('/app', { replace: true });
        }, 3000);
      } else {
        // User is not logged in, redirect to login
        log.debug('Component', 'User is not logged in after password reset, redirecting to login');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }

    } catch (error) {
      log.error('Component', 'Password reset exception:', error);
      setErrorMessage('An unexpected error occurred. Please try again.');
      setStatus('error');
    }
  };

  const handleRequestNewReset = () => {
    navigate('/forgot-password', { replace: true });
  };

  // 🔧 FIX 2: Updated handleGoToLogin to check if user is logged in
  const handleGoToLogin = async () => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    
    if (session) {
      // User is logged in, redirect to app
      navigate('/app', { replace: true });
    } else {
      // User is not logged in, redirect to login
      navigate('/login', { replace: true });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && otpInput.length === 6) {
      handleVerifyOtp();
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Validating Reset Link</h2>
            <p className="text-gray-600">Please wait while we verify your password reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Reset Link Invalid</h2>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            
            <div className="space-y-3">
              <Button 
                onClick={handleRequestNewReset}
                className="w-full"
              >
                Request New Reset Link
              </Button>
              <Button 
                variant="outline"
                onClick={handleGoToLogin}
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Password Updated Successfully!</h2>
            <p className="text-gray-600 mb-6">
              Your password has been updated. You will be redirected shortly.
            </p>
            
            <Button 
              onClick={handleGoToLogin}
              className="w-full"
            >
              Continue to App
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // OTP input state
  if (status === 'otp') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <h1 className="text-4xl font-bold leading-none" style={{ color: '#00A389' }}>Lokaa</h1>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Reset Your Password
          </h2>
          <p className="text-gray-600 text-center mb-6">
            Enter the 6-digit code sent to your email
          </p>

          {/* Email display */}
          <p className="text-gray-900 font-medium mb-6 text-center">
            {email}
          </p>

          {/* OTP input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reset code
            </label>
            <input
              ref={otpInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otpInput}
              onChange={handleOtpChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter 6-digit code"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg text-center font-mono"
            />
            {otpError && (
              <p className="text-red-600 text-sm mt-2">
                {otpError}
              </p>
            )}
          </div>

          {/* Verify button */}
          <button
            onClick={handleVerifyOtp}
            disabled={isVerifyingOtp || otpInput.length !== 6}
            className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
              isVerifyingOtp || otpInput.length !== 6
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isVerifyingOtp ? (
              <>
                <Loader2 className="inline w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </button>

          {/* Resend section */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Didn't get the email?{' '}
              <button
                onClick={handleResendOtp}
                disabled={isResending || resendCooldown > 0}
                className="text-blue-600 hover:underline disabled:text-gray-400"
              >
                {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend it'}
              </button>
            </p>
            
            {resendMessage && (
              <p className="text-sm text-green-600 mt-2">{resendMessage}</p>
            )}
            
            {resendError && (
              <p className="text-sm text-red-600 mt-2">{resendError}</p>
            )}
          </div>

          {/* Back to login */}
          <div className="mt-6 text-center">
            <button
              onClick={handleGoToLogin}
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Password form state
  if (status === 'password') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <h1 className="text-4xl font-bold leading-none" style={{ color: '#00A389' }}>Lokaa</h1>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Set New Password
          </h2>
          <p className="text-gray-600 text-center mb-6">
            Enter your new password below
          </p>

        <Form methods={form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="password">New Password</Label>
                  <FormControl>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <FormControl>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={!form.formState.isValid}
            >
              Update Password
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleGoToLogin}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Back to Login
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
  }
}
