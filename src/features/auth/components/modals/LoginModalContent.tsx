import { useState } from 'react';
import { Loader2 } from 'lucide-react';
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
      
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
        Log in to Lokaa
      </h2>
      
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
        
        <div>
          <input 
            type="password" 
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 px-4 text-base rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
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