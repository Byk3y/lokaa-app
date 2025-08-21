import { useEffect, useMemo, useState, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';
import { CheckCircle, XCircle, Loader2, Mail, Key, ArrowRight, RefreshCw } from 'lucide-react';

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
  
  // Refs for auto-focus and input management
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const qs = url.searchParams;
        // Some providers append errors in the hash fragment: #error=...&error_code=...
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

        // If Supabase verify endpoint redirected with tokens in hash and we disable detectSessionInUrl,
        // set the session manually.
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

        // No token_hash: user likely came here after the verify endpoint already confirmed.
        // Try to see if a session exists; otherwise ask to sign in.
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

  // Auto-focus first input when code input is shown
  useEffect(() => {
    if (showCodeInput && codeInputRefs.current[0]) {
      setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
    }
  }, [showCodeInput]);

  const canResend = useMemo(() => !isResending && resendCooldown <= 0, [isResending, resendCooldown]);

  const handleResend = async () => {
    setResendErr(null);
    setResendMsg(null);
    const email = (initialEmail || emailInput || '').trim();
    if (!email) {
      setResendErr('Please enter your email to resend the verification link.');
      return;
    }
    try { localStorage.setItem('pending-signup-email', email); } catch {}
    setIsResending(true);
    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.resend({ type: 'signup', email });
      if (error) {
        setResendErr(error.message || 'Failed to resend verification email.');
      } else {
        setResendMsg('Verification email sent. Please check your inbox.');
        setResendCooldown(60);
      }
    } catch (e: any) {
      setResendErr(e?.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeInput = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste event
      const pastedValue = value.slice(0, 6);
      setOtpInput(pastedValue);
      
      // Auto-submit if we have 6 digits
      if (pastedValue.length === 6) {
        handleVerifyCode();
      }
      return;
    }

    const newOtp = otpInput.split('');
    newOtp[index] = value;
    const newOtpString = newOtp.join('');
    setOtpInput(newOtpString);

    // Auto-advance to next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when we have 6 digits
    if (newOtpString.length === 6) {
      handleVerifyCode();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpInput[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
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

  const getStatusIcon = () => {
    switch (status) {
      case 'verifying':
        return <Loader2 className="w-8 h-8 animate-spin text-teal-600" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'error':
        return <XCircle className="w-8 h-8 text-red-600" />;
      default:
        return <CheckCircle className="w-8 h-8 text-teal-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-teal-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-center">
          <div className="text-3xl font-bold text-white mb-2">Lokaa</div>
          <div className="text-teal-100 text-sm">Connect Spaces</div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Status Section */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <h1 className={`text-xl font-semibold mb-2 ${getStatusColor()}`}>
              {status === 'verifying' && 'Verifying Email...'}
              {status === 'success' && 'Email Verified!'}
              {status === 'needsSignIn' && 'Email Confirmed'}
              {status === 'error' && 'Verification Failed'}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm">{message}</p>
          </div>

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center">
              <div className="animate-pulse">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-green-600 font-medium">Redirecting to your dashboard...</p>
              </div>
            </div>
          )}

          {/* Code Input Section - Primary Focus */}
          {(status === 'error' || status === 'needsSignIn' || showCodeInput) && (
            <div className="space-y-6">
              {/* Code Input */}
              <div className="space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Key className="w-5 h-5 text-teal-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      Enter Verification Code
                    </h2>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enter the 6-digit code from your email
                  </p>
                </div>

                {/* Hidden input for paste functionality */}
                <input
                  ref={hiddenInputRef}
                  type="text"
                  className="sr-only"
                  value={otpInput}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpInput(value);
                    if (value.length === 6) {
                      handleVerifyCode();
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                    setOtpInput(pastedData);
                    if (pastedData.length === 6) {
                      handleVerifyCode();
                    }
                  }}
                />

                {/* 6-Digit Code Input */}
                <div className="flex justify-center space-x-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <input
                      key={index}
                      ref={(el) => (codeInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otpInput[index] || ''}
                      onChange={(e) => handleCodeInput(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onFocus={() => hiddenInputRef.current?.focus()}
                      className="w-12 h-12 text-center text-lg font-semibold border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-teal-400 transition-all duration-200"
                    />
                  ))}
                </div>

                {/* Error Message */}
                {otpErr && (
                  <div className="text-center">
                    <p className="text-red-600 text-sm flex items-center justify-center">
                      <XCircle className="w-4 h-4 mr-1" />
                      {otpErr}
                    </p>
                  </div>
                )}

                {/* Verify Button */}
                <button
                  onClick={handleVerifyCode}
                  disabled={isVerifyingCode || otpInput.length !== 6}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                    isVerifyingCode || otpInput.length !== 6
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  }`}
                >
                  {isVerifyingCode ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Alternative Options */}
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or</span>
                  </div>
                </div>

                {/* Use Link Instead */}
                <button
                  onClick={() => window.location.href = '/login'}
                  className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Use verification link instead</span>
                </button>

                {/* Resend Email */}
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Didn't receive the code?
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Enter your email"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 dark:bg-gray-700 dark:text-white text-sm"
                    />
                    <button
                      onClick={handleResend}
                      disabled={!canResend}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-1 ${
                        canResend
                          ? 'bg-teal-600 hover:bg-teal-700 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isResending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span>
                        {isResending ? 'Sending...' : resendCooldown > 0 ? `${resendCooldown}s` : 'Resend'}
                      </span>
                    </button>
                  </div>
                  
                  {resendMsg && (
                    <p className="text-sm text-green-600 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {resendMsg}
                    </p>
                  )}
                  {resendErr && (
                    <p className="text-sm text-red-600 flex items-center justify-center">
                      <XCircle className="w-4 h-4 mr-1" />
                      {resendErr}
                    </p>
                  )}
                </div>

                {/* Sign In Link */}
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Already verified?{' '}
                    <a
                      href="/login"
                      className="text-teal-600 hover:text-teal-700 font-medium underline"
                    >
                      Sign in to your account
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Continue to Sign In Button */}
          {status === 'needsSignIn' && !showCodeInput && (
            <div className="text-center">
              <a
                href="/login"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span>Continue to sign in</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


