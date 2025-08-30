import { log } from '@/utils/logger';
import { useEffect, useState, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useModal } from '@/shared/components/modals/hooks/useModal';

interface EmailVerificationModalProps {
  email?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function EmailVerificationModal({ 
  email: propEmail, 
  onSuccess, 
  onError 
}: EmailVerificationModalProps) {
  const [status, setStatus] = useState<'verifying' | 'success' | 'needsSignIn' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('Verifying your email...');
  const [initialEmail, setInitialEmail] = useState<string | undefined>(propEmail);
  const [emailInput, setEmailInput] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendErr, setResendErr] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [otpInput, setOtpInput] = useState<string>('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [otpErr, setOtpErr] = useState<string | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  
  const codeInputRef = useRef<HTMLInputElement>(null);
  const { closeModal } = useModal();

  // Set initial email from prop
  useEffect(() => {
    if (propEmail) {
      setInitialEmail(propEmail);
    }
  }, [propEmail]);

  // Extract email from URL if not provided as prop
  useEffect(() => {
    if (!initialEmail) {
      const urlParams = new URLSearchParams(window.location.search);
      const emailFromUrl = urlParams.get('email');
      if (emailFromUrl) {
        setInitialEmail(decodeURIComponent(emailFromUrl));
      }
    }
  }, [initialEmail]);

  // Set showCodeInput to true when modal opens
  useEffect(() => {
    setShowCodeInput(true);
  }, []);

  // Auto-focus code input when modal opens
  useEffect(() => {
    if (showCodeInput && codeInputRef.current) {
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 100);
    }
  }, [showCodeInput]);

  // Clear error when we have exactly 6 digits
  useEffect(() => {
    if (otpInput.length === 6 && otpErr) {
      setOtpErr(null);
    }
  }, [otpInput.length, otpErr]);

  const handleVerifyCode = async () => {
    setOtpErr(null);
    const email = (initialEmail || emailInput || '').trim();
    const code = otpInput.replace(/\D/g, '').trim(); // Remove any non-digits
    
    console.log('Verifying code:', { email, code, codeLength: code.length, originalOtpInput: otpInput });
    
    if (!email) {
      setOtpErr('Email is required for verification.');
      return;
    }
    if (!code || code.length !== 6) {
      setOtpErr('Please enter the complete 6-digit code.');
      return;
    }
    
    setIsVerifyingCode(true);
    try {
      const client = getSupabaseClient();
      console.log('Attempting to verify OTP with Supabase...');
      
      const { data, error } = await client.auth.verifyOtp({ 
        type: 'signup', 
        email, 
        token: code 
      });
      
      console.log('Supabase response:', { data, error });
      
      if (error) {
        console.error('Supabase verification error:', error);
        setOtpErr(error.message || 'Invalid or expired code.');
        onError?.(error.message || 'Invalid or expired code.');
        return;
      }
      
      if (data?.session) {
        console.log('Verification successful, session created');
        setStatus('success');
        setMessage('Email verified! Redirecting...');
        onSuccess?.();
        // Close modal and redirect
        setTimeout(() => {
          closeModal('auth-verification');
          window.location.replace('/discover');
        }, 1000);
      } else {
        console.log('Verification successful, no session');
        setStatus('needsSignIn');
        setMessage('Email verified! Please sign in.');
        onSuccess?.();
        // Close modal and redirect to login
        setTimeout(() => {
          closeModal('auth-verification');
          window.location.replace('/login');
        }, 1000);
      }
    } catch (e: any) {
      console.error('Verification exception:', e);
      const errorMessage = e?.message || 'Could not verify the code. Please try again.';
      setOtpErr(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpInput(value);
    
    // Clear error when user starts typing or when we have 6 digits
    if (otpErr && (value.length > 0 || value.length === 6)) {
      setOtpErr(null);
    }
    
    // Auto-submit when we have 6 digits
    if (value.length === 6) {
      // Small delay to ensure state is updated
      setTimeout(() => {
        handleVerifyCode();
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && otpInput.length === 6) {
      handleVerifyCode();
    }
  };

  const handleResend = async () => {
    const email = (initialEmail || emailInput || '').trim();
    if (!email) {
      setResendErr('Email is required to resend verification.');
      return;
    }

    setIsResending(true);
    setResendErr(null);
    setResendMsg(null);

    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        setResendErr(error.message || 'Failed to resend email.');
      } else {
        setResendMsg('Verification email sent! Check your inbox.');
        setResendCooldown(60); // 60 second cooldown
      }
    } catch (e: any) {
      setResendErr(e?.message || 'Failed to resend email.');
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

  // Success state
  if (status === 'success') {
    return (
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <p className="text-green-600 font-medium">{message}</p>
      </div>
    );
  }

  // Needs sign in state
  if (status === 'needsSignIn') {
    return (
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <p className="text-green-600 font-medium">{message}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <h1 className="text-4xl font-bold leading-none" style={{ color: '#00A389' }}>Lokaa</h1>
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
        Create your Lokaa account
      </h2>

      {/* Verification Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          We sent you a code
        </h3>
        <p className="text-gray-600 mb-4">
          Enter it below to verify
        </p>
        
        {/* Email display */}
        <p className="text-gray-900 font-medium mb-6">
          {initialEmail || emailInput || 'your@email.com'}
        </p>

        {/* Code input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Verification code
          </label>
          <input
            ref={codeInputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={otpInput}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter 6-digit code"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg text-center font-mono"
          />
          {otpErr && (
            <p className="text-red-600 text-sm mt-2">
              {otpErr}
              {otpErr.includes('500') && (
                <span className="block text-xs text-gray-500 mt-1">
                  Server error detected. Please try again in a moment.
                </span>
              )}
            </p>
          )}
        </div>

        {/* Verify button */}
        <button
          onClick={handleVerifyCode}
          disabled={isVerifyingCode || otpInput.length !== 6}
          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
            isVerifyingCode || otpInput.length !== 6
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isVerifyingCode ? (
            <>
              <Loader2 className="inline w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'NEXT'
          )}
        </button>

        {/* Resend section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Didn't get the email?{' '}
            <button
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
              className="text-blue-600 hover:underline disabled:text-gray-400"
            >
              {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend it'}
            </button>
            {' '}or{' '}
            <button
              onClick={() => {
                closeModal('auth-verification');
                window.location.href = '/signup';
              }}
              className="text-blue-600 hover:underline"
            >
              Use a different email
            </button>
          </p>
          
          {resendMsg && (
            <p className="text-sm text-green-600 mt-2">{resendMsg}</p>
          )}
          
          {resendErr && (
            <p className="text-sm text-red-600 mt-2">{resendErr}</p>
          )}
        </div>

        {/* Login link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => {
                closeModal('auth-verification');
                window.location.href = '/login';
              }}
              className="text-blue-600 hover:underline"
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
