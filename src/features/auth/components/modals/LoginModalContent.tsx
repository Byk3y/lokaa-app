import { log } from '@/utils/logger';
import { useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { directLogin } from '@/utils/directAuth';
import { AuthResponse } from '@supabase/supabase-js';
import { signInWithGoogle } from '@/integrations/supabase/auth';

interface LoginModalContentProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// Define the expected response type from directLogin
interface LoginResult {
  success: boolean;
  error?: string;
  data?: AuthResponse['data'];
  redirectPath?: string;
}

export default function LoginModalContent({ onSuccess, onError }: LoginModalContentProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const result = await directLogin(email, password) as LoginResult;
      
      if (!result.success) {
        const errorMessage = result.error || "Login failed";
        setError(errorMessage);
        onError?.(errorMessage);
        setLoading(false);
      } else {
        log.debug('Component', '🔒 [LoginModalContent] Login successful');
        setLoading(false);
        onSuccess?.();
      }
      
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      onError?.(errorMessage);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        console.error('Google sign in error:', error.message);
        setError(error.message);
        onError?.(error.message);
      }
    } catch (err) {
      console.error('Google sign in exception:', err);
      const errorMessage = 'Google sign-in failed. Please try again.';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  return (
    <div className="w-full">
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <h1 className="text-3xl font-bold text-teal-600">Lokaa</h1>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <input 
            type="email" 
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 px-4 text-base rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            autoFocus
          />
        </div>
        
        <div className="relative">
          <input 
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 px-4 pr-12 text-base rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-md z-10"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
        
        <div className="text-left">
          <a 
            href="/forgot-password"
            className="text-blue-600 hover:underline text-sm font-medium"
          >
            Forgot password?
          </a>
        </div>
        
        <button 
          type="submit" 
          className={`w-full h-12 text-white font-medium rounded-full text-sm uppercase tracking-wide mt-4 transition-colors
            ${email && password 
              ? 'bg-teal-600 hover:bg-teal-700' 
              : 'bg-gray-300 cursor-not-allowed'}`}
          disabled={loading || !email || !password}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
              Logging in...
            </span>
          ) : (
            "LOG IN"
          )}
        </button>

        {/* Social Sign-in Section */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or continue with</span>
            </div>
          </div>
          
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-12 border border-gray-300 rounded-lg text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              Google
            </button>
          </div>
        </div>
        
        <div className="text-center text-base mt-8">
          Don't have an account?{" "}
          <a 
            href="/signup"
            className="text-blue-600 hover:underline font-medium"
          >
            Sign up for free
          </a>
        </div>
      </form>
    </div>
  );
} 