import { useEffect, useMemo, useState, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

export default function AuthConfirmPage() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'needsSignIn' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('Verifying your email...');
  const [initialEmail, setInitialEmail] = useState<string | undefined>(undefined);
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

  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const qs = url.searchParams;
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const errorFromHash = hashParams.get('error');
        const errorCodeFromHash = hashParams.get('error_code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (errorFromHash) {
          setStatus('error');
          setMessage(errorCodeFromHash === 'otp_expired' ? 'Verification link expired. Please resend verification.' : 'Verification failed. Please resend verification.');
          setShowCodeInput(true);
          return;
        }

        if (accessToken && refreshToken) {
          const client = getSupabaseClient();
          const { error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) {
            log.error('Auth', 'Failed to set session from hash:', error.message);
            setStatus('error');
            setMessage('Could not complete verification. Please try again.');
            setShowCodeInput(true);
            return;
          }
          setStatus('success');
          setMessage('Email verified! Redirecting...');
          setTimeout(() => window.location.replace('/discover'), 500);
          return;
        }

        const tokenHash = qs.get('token_hash');
        const type = (qs.get('type') || 'signup') as any;
        const email = qs.get('email') || localStorage.getItem('pending-signup-email') || undefined;
        if (email) {
          setInitialEmail(email);
          if (!emailInput) setEmailInput(email);
        }

        const client = getSupabaseClient();

        if (tokenHash) {
          const { data, error } = await client.auth.verifyOtp({ type, token_hash: tokenHash, email });
          if (error) {
            log.error('Auth', 'Email verification error:', error.message);
            setStatus('error');
            setMessage(error.message || 'Verification failed.');
            setShowCodeInput(true);
            return;
          }

          if (data?.session) {
            setStatus('success');
            setMessage('Email verified! Redirecting...');
            setTimeout(() => window.location.replace('/discover'), 800);
            return;
          }
          setStatus('needsSignIn');
          setMessage('Email verified! Please sign in.');
          return;
        }

        const { data } = await client.auth.getSession();
        if (data.session) {
          window.location.replace('/discover');
          return;
        }
        setStatus('needsSignIn');
        setMessage('Email confirmed. Please sign in to continue.');
        setShowCodeInput(true);
      } catch (e: any) {
        log.error('Auth', 'Unexpected verification error:', e);
        setStatus('error');
        setMessage(e?.message || 'Verification failed.');
        setShowCodeInput(true);
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (showCodeInput && codeInputRef.current) {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [showCodeInput]);

  const canResend = useMemo(() => !isResending && resendCooldown <= 0, [isResending, resendCooldown]);

  const handleResend = async () => {
    setResendErr(null);
    setResendMsg(null);
    const email = (initialEmail || emailInput || '').trim();
    if (!email) {
      setResendErr('Please enter your email to resend the verification code.');
      return;
    }
    try { localStorage.setItem('pending-signup-email', email); } catch {}
    setIsResending(true);
    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.resend({ type: 'signup', email });
      if (error) {
        setResendErr(error.message || 'Failed to resend verification code.');
      } else {
        setResendMsg('Verification code sent. Please check your inbox.');
        setResendCooldown(60);
      }
    } catch (e: any) {
      setResendErr(e?.message || 'Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyCode = async () => {
    setOtpErr(null);
    const email = (initialEmail || emailInput || '').trim();
    const code = otpInput.trim();
    if (!email) {
      setOtpErr('Enter your email first.');
      return;
    }
    if (!code || code.length !== 6) {
      setOtpErr('Please enter the complete 6-digit code.');
      return;
    }
    setIsVerifyingCode(true);
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.verifyOtp({ type: 'signup', email, token: code });
      if (error) {
        setOtpErr(error.message || 'Invalid or expired code.');
        return;
      }
      if (data?.session) {
        setStatus('success');
        setMessage('Email verified! Redirecting...');
        setTimeout(() => window.location.replace('/discover'), 600);
      } else {
        setStatus('needsSignIn');
        setMessage('Email verified! Please sign in.');
      }
    } catch (e: any) {
      setOtpErr(e?.message || 'Could not verify the code.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpInput(value);
    
    // Auto-submit when we have 6 digits
    if (value.length === 6) {
      handleVerifyCode();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && otpInput.length === 6) {
      handleVerifyCode();
    }
  };

  // Success state - redirect immediately
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-green-600 font-medium">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // Main verification interface
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
        {/* Close button */}
        <button 
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 text-gray-500 hover:text-gray-700"
        >
          <XCircle className="w-6 h-6" />
        </button>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold mb-2">
            <span className="text-blue-600">Lo</span>
            <span className="text-orange-500">kaa</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
          Create your Lokaa account
        </h1>

        {/* Verification Modal */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            We sent you a code
          </h2>
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
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isVerifyingCode || otpInput.length !== 6
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isVerifyingCode ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Verifying...
              </div>
            ) : (
              'NEXT'
            )}
          </button>

          {/* Resend options */}
          <div className="text-center mt-6">
            <p className="text-gray-600 text-sm">
              Didn't get the email?{' '}
              <button
                onClick={handleResend}
                disabled={!canResend}
                className={`text-blue-600 hover:text-blue-700 ${
                  !canResend ? 'text-gray-400 cursor-not-allowed' : ''
                }`}
              >
                Resend it
              </button>
              {' '}or{' '}
              <button
                onClick={() => window.location.href = '/signup'}
                className="text-blue-600 hover:text-blue-700"
              >
                Use a different email
              </button>
            </p>
            {resendMsg && (
              <p className="text-green-600 text-sm mt-2">{resendMsg}</p>
            )}
            {resendErr && (
              <p className="text-red-600 text-sm mt-2">{resendErr}</p>
            )}
            {resendCooldown > 0 && (
              <p className="text-gray-500 text-sm mt-2">
                Resend available in {resendCooldown}s
              </p>
            )}
          </div>
        </div>

        {/* Sign in link */}
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Log in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}


