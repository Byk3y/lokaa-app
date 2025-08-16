import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';

export default function AuthConfirmPage() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'needsSignIn' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('Verifying your email...');

  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const tokenHash = url.searchParams.get('token_hash');
        const type = url.searchParams.get('type') || 'signup';
        const email = url.searchParams.get('email') || localStorage.getItem('pending-signup-email') || undefined;

        if (!tokenHash) {
          setStatus('error');
          setMessage('Invalid confirmation link.');
          return;
        }

        const client = getSupabaseClient();
        const { data, error } = await client.auth.verifyOtp({
          type: type as any,
          token_hash: tokenHash,
          email,
        });

        if (error) {
          log.error('Auth', 'Email verification error:', error.message);
          setStatus('error');
          setMessage(error.message || 'Verification failed.');
          return;
        }

        if (data?.session) {
          setStatus('success');
          setMessage('Email verified! Redirecting...');
          setTimeout(() => {
            window.location.replace('/discover');
          }, 800);
        } else {
          setStatus('needsSignIn');
          setMessage('Email verified! Please sign in.');
        }
      } catch (e: any) {
        log.error('Auth', 'Unexpected verification error:', e);
        setStatus('error');
        setMessage(e?.message || 'Verification failed.');
      }
    };
    run();
  }, []);

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
          <a href="/login" className="inline-block px-4 py-2 rounded-md bg-teal-600 text-white">Sign in</a>
        )}
        {status === 'error' && (
          <a href="/signup" className="inline-block px-4 py-2 rounded-md bg-teal-600 text-white">Resend verification</a>
        )}
      </div>
    </div>
  );
}


