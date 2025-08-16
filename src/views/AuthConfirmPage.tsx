import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';

export default function AuthConfirmPage() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'needsSignIn' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('Verifying your email...');
  const [initialEmail, setInitialEmail] = useState<string | undefined>(undefined);
  const [emailInput, setEmailInput] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendErr, setResendErr] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

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
      } catch (e: any) {
        log.error('Auth', 'Unexpected verification error:', e);
        setStatus('error');
        setMessage(e?.message || 'Verification failed.');
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <h1 className="text-xl font-semibold text-gray-800 mb-2">
          {status === 'verifying' && 'Verifying...'}
          {status === 'success' && 'Success'}
          {status === 'needsSignIn' && 'Email Verified'}
          {status === 'error' && 'Verification Error'}
        </h1>
        <p className="text-gray-600 mb-4">{message}</p>
        {status === 'needsSignIn' && (
          <a href="/login" className="inline-block px-4 py-2 rounded-md bg-teal-600 text-white">Continue to sign in</a>
        )}

        {(status === 'error' || status === 'needsSignIn') && (
          <div className="mt-6 text-left">
            <div className="text-sm text-gray-700 mb-2">Did the link expire or not work? Resend the verification email.</div>
            <div className="flex gap-2 items-center mb-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={initialEmail ? initialEmail : 'you@example.com'}
                className="flex-1 border rounded px-3 py-2"
              />
              <button
                onClick={handleResend}
                disabled={!canResend}
                className={`px-4 py-2 rounded-md text-white ${canResend ? 'bg-teal-600 hover:bg-teal-700' : 'bg-gray-400 cursor-not-allowed'}`}
              >
                {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend email'}
              </button>
            </div>
            {resendMsg && <div className="text-sm text-green-700">{resendMsg}</div>}
            {resendErr && <div className="text-sm text-red-600">{resendErr}</div>}
            <div className="text-sm text-gray-500 mt-2">Already verified? <a href="/login" className="text-teal-700 underline">Sign in</a></div>
          </div>
        )}
      </div>
    </div>
  );
}


