import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { redirectToSpace } from '../utils/spaceRedirect';

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { signIn, loading, user, session } = useOptimizedAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from?.pathname || "/discover";
  const background = location.state?.background;
  const [isModalVisible, setIsModalVisible] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  console.log("Login component rendering with:", { 
    background: !!background, 
    from, 
    pathname: location.pathname,
    state: location.state
  });
  
  // Handle close modal
  const handleClose = () => {
    // Go back if we came from a page, otherwise go to home
    if (background) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };
  
  const hideModal = () => {
    setIsModalVisible(false);
  };
  
  // Redirect if user is already logged in
  useEffect(() => {
    if (session) {
      console.log('Login: User already logged in, redirect handled by AuthContext')
      // No additional logic needed - redirect handled in AuthContext
    }
  }, [session])

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange", // Validate on change for better UX
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setLoginError(null);
    setIsLoggingIn(true);
    
    try {
      const { error } = await signIn(values.email, values.password);
      
      if (error) {
        console.error('Login error:', error);
        setLoginError(
          typeof error === 'string' 
            ? error 
            : error.message || 'Sign in failed. Please check your credentials and try again.'
        );
      } else {
        console.log('Login: Sign-in successful, attempting direct space redirection');
        
        // First try direct redirection to any user spaces
        // This can bypass potential React state issues
        try {
          // Using the streamlined, reliable redirection utility
          const redirected = await redirectToSpace();
          if (redirected) {
            console.log('Login: Direct redirection to space successful');
            return; // Skip React Router navigation if direct redirection worked
          }
        } catch (redirectErr) {
          console.error('Login: Error during direct space redirection:', redirectErr);
          // Continue with normal flow if direct redirection fails
        }
        
        console.log('Login: Sign-in successful, redirecting handled by AuthContext');
        // No additional logic needed here - redirect managed in AuthContext
      }
    } catch (err) {
      console.error('Login exception:', err);
      setLoginError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Check if both fields are filled to enable/disable the button
  const isFormValid = form.watch("email") && form.watch("password");
  
  return (
    <div className={`${background ? 'fixed inset-0 bg-black/30' : 'min-h-screen bg-gray-50'} flex items-center justify-center p-4 z-50`}
         onClick={background ? handleClose : undefined}>
      <div 
        className={`w-full max-w-[400px] transform transition-all duration-300 ease-out
          ${isModalVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-xl shadow-xl overflow-hidden relative">
          {/* Close button - only show in modal mode */}
          {background && (
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Close login modal"
            >
              <X size={20} />
            </button>
          )}
          
          <div className="p-8">
            {/* Lokaa Logo */}
            <div className="flex justify-center mb-6">
              <h1 className="text-3xl font-bold text-teal-600">Lokaa</h1>
            </div>
            
            {/* Title */}
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
              Log in to Lokaa
            </h2>
            
            {/* Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          placeholder="Email" 
                          type="email" 
                          className="h-12 px-4 text-base rounded-lg border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-sm mt-1" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          placeholder="Password" 
                          type="password" 
                          className="h-12 px-4 text-base rounded-lg border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-sm mt-1" />
                    </FormItem>
                  )}
                />
                
                {/* Forgot Password Link */}
                <div className="text-left">
                  <Link 
                    to="/forgot-password" 
                    state={{ background }}
                    className="text-[#0B65F5] hover:underline text-sm font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                
                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className={`w-full h-12 text-white font-medium rounded-full text-sm uppercase tracking-wide mt-4 transition-colors
                    ${isFormValid 
                      ? 'bg-teal-600 hover:bg-teal-700' 
                      : 'bg-gray-300 cursor-not-allowed'}`}
                  disabled={loading || !isFormValid}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                      Logging in...
                    </>
                  ) : (
                    "LOG IN"
                  )}
                </Button>
                
                {/* Sign Up Link */}
                <div className="text-center text-base mt-8">
                  Don't have an account?{" "}
                  <Link 
                    to="/signup" 
                    state={{ background }}
                    className="text-[#0B65F5] hover:underline font-medium"
                  >
                    Sign up for free
                  </Link>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
      
      {/* Wait Modal for Test Account - Removed to prevent interference with redirects */}
    </div>
  );
}
