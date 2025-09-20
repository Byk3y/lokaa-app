import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        log.debug('Auth', 'Processing OAuth callback...');
        
        // Get the session from the URL hash
        const { data, error } = await getSupabaseClient().auth.getSession();
        
        if (error) {
          log.error('Auth', 'OAuth callback error:', error.message);
          setError(error.message);
          setIsProcessing(false);
          return;
        }

        if (data.session) {
          log.debug('Auth', 'OAuth callback successful, redirecting...');
          // Redirect to discover page or saved redirect
          const redirectPath = sessionStorage.getItem('redirect_after_login') || '/discover';
          sessionStorage.removeItem('redirect_after_login');
          navigate(redirectPath, { replace: true });
        } else {
          log.warn('Auth', 'No session found in OAuth callback');
          setError('Authentication failed. Please try again.');
          setIsProcessing(false);
        }
      } catch (err) {
        log.error('Auth', 'OAuth callback exception:', err);
        setError('An unexpected error occurred. Please try again.');
        setIsProcessing(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-lokaa-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Completing sign in...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in failed</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-lokaa-600 text-white rounded-lg hover:bg-lokaa-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return null;
}
