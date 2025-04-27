import { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { directLogin } from '@/utils/directAuth';

interface StandaloneLoginModalProps {
  onClose: () => void;
}

// Define the expected response type from directLogin
interface LoginResult {
  success: boolean;
  error?: string;
  data?: any;
}

export default function StandaloneLoginModal({ onClose }: StandaloneLoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  // Add a slight delay before showing the modal for smoother transition
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle outside clicks
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.classList.contains('login-modal-backdrop')) {
        onClose();
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    function handleEscapeKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      console.log(`Login attempt with email: ${email}`);
      const result = await directLogin(email, password) as LoginResult;
      
      if (!result.success) {
        setError(result.error || "Login failed");
        setLoading(false);
      }
      // No need to handle success - directLogin will redirect
      
    } catch (err: any) {
      console.error("Login exception:", err);
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div 
      className={`fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] login-modal-backdrop transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => {
        // Only close if clicking the backdrop itself
        if ((e.target as HTMLElement).classList.contains('login-modal-backdrop')) {
          onClose();
        }
      }}
    >
      <div 
        className={`w-full max-w-[400px] bg-white rounded-xl shadow-xl overflow-hidden transform transition-all duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-8'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
            aria-label="Close login modal"
          >
            <X size={20} />
          </button>
          
          <div className="p-8">
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
        </div>
      </div>
    </div>
  );
} 