import { useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { directLogin } from '@/utils/directAuth';
import { AuthResponse } from '@supabase/supabase-js';

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
        console.log('🔒 [LoginModalContent] Login successful');
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