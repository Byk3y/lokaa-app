import { log } from '@/utils/logger';
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
import { useToast } from "@/components/ui/use-toast";
import { getSupabaseClient } from "@/integrations/supabase/client"; // Direct import for checking response
import { signInWithGoogle } from '@/integrations/supabase/auth';

const signupSchema = z.object({
  firstName: z.string().min(2, { message: "First name is required" }),
  lastName: z.string().min(2, { message: "Last name is required" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function Signup() {
  const { signUp, user } = useOptimizedAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const background = location.state?.background;
  const [isModalVisible, setIsModalVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Handle close modal
  const handleClose = () => {
    if (background) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };
  
  // Only redirect if user is already logged in
  useEffect(() => {
    if (user) {
      // Honor a pending post-auth redirect (e.g. resuming a space join) so the
      // shared redirect_after_login mechanism can return the user to the about
      // page instead of forcing /discover.
      if (sessionStorage.getItem('redirect_after_login')) {
        return;
      }
      navigate("/discover", { replace: true });
    }
  }, [user, navigate]);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSignupError(null);
    
    // Get form values
    const formData = {
      firstName: form.getValues("firstName"),
      lastName: form.getValues("lastName"),
      email: form.getValues("email"),
      password: form.getValues("password")
    };
    
    // Validate form data
    const validation = signupSchema.safeParse(formData);
    if (!validation.success) {
      log.error('Page', "Form validation failed:", validation.error);
      return;
    }
    
    // Set loading state
    setIsLoading(true);
    
    try {
      log.debug('Page', "Attempting to sign up user:", formData.email);
      
      // Call signUp with metadata
      const { error, data: userData } = await signUp(
        formData.email, 
        formData.password,
        {
          firstName: formData.firstName,
          lastName: formData.lastName
        }
      );
      
      log.debug('Page', "Signup result:", { error, userData });
      
      if (error) {
        setSignupError(error.message || "Failed to create account");
        toast({
          title: "Error creating account",
          description: error.message || "There was an error creating your account. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
      } else {
        // Check if we got the expected user data back
        if (userData?.user) {
          toast({
            title: "Account created!",
            description: "Your account has been created successfully.",
          });

          // If resuming a pending action (e.g. a space join), defer to the
          // shared redirect_after_login mechanism instead of forcing /discover.
          if (sessionStorage.getItem('redirect_after_login')) {
            setIsLoading(false);
            return;
          }

          // Redirect to discover page
          navigate('/discover', { replace: true });
        } else {
          // Show confirmation message with instruction to check email
          toast({
            title: "Check your email",
            description: "We've sent a confirmation link to your email. Please check your inbox to complete signup.",
          });
          
          // Wait a moment before redirecting
          setTimeout(() => {
            navigate('/discover', { replace: true });
          }, 2000);
        }
      }
    } catch (error: unknown) {
      log.error('Page', "Signup exception:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setSignupError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        console.error('Google sign in error:', error.message);
        setSignupError(error.message);
        toast({
          title: "Google sign-in failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Google sign in exception:', err);
      const errorMessage = 'Google sign-in failed. Please try again.';
      setSignupError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={handleClose}>
      <div 
        className={`w-full max-w-[400px] transform transition-all duration-300 ease-out
          ${isModalVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-xl shadow-xl overflow-hidden relative">
          {/* Close button */}
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            aria-label="Close signup modal"
          >
            <X size={20} />
          </button>
          
          <div className="p-8">
            {/* Lokaa Logo */}
            <div className="flex justify-center mb-6">
              <h1 className="text-3xl font-bold text-teal-600">Lokaa</h1>
            </div>
            
            {/* Title */}
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
              Create your Lokaa account
            </h2>
            
            {/* Error message */}
            {signupError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {signupError}
              </div>
            )}
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input 
                  placeholder="First name" 
                  className="h-12 px-4 text-base rounded-lg border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  {...form.register("firstName")}
                  disabled={isLoading}
                />
                {form.formState.errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              
              <div>
                <Input 
                  placeholder="Last name" 
                  className="h-12 px-4 text-base rounded-lg border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  {...form.register("lastName")}
                  disabled={isLoading}
                />
                {form.formState.errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.lastName.message}</p>
                )}
              </div>
              
              <div>
                <Input 
                  placeholder="Email" 
                  type="email" 
                  className="h-12 px-4 text-base rounded-lg border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  {...form.register("email")}
                  disabled={isLoading}
                />
                {form.formState.errors.email && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>
              
              <div>
                <Input 
                  placeholder="Password" 
                  type="password" 
                  className="h-12 px-4 text-base rounded-lg border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  {...form.register("password")}
                  disabled={isLoading}
                />
                {form.formState.errors.password && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.password.message}</p>
                )}
              </div>
              
              {/* Submit Button */}
              <button 
                type="submit"
                className={`w-full h-12 text-white font-medium rounded-lg text-sm uppercase tracking-wide mt-4 transition-colors
                  ${!isLoading && form.formState.isValid
                    ? 'bg-teal-600 hover:bg-teal-700 cursor-pointer' 
                    : 'bg-gray-300 cursor-not-allowed'}`}
                disabled={isLoading || !form.formState.isValid}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                    Creating account...
                  </div>
                ) : (
                  "SIGN UP"
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
                    disabled={isLoading}
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
              
              {/* Terms and Privacy */}
              <div className="text-center text-sm text-gray-500 mt-4">
                By signing up, you accept our{" "}
                <Link to="/terms" className="text-[#0B65F5] hover:underline">
                  terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-[#0B65F5] hover:underline">
                  privacy policy
                </Link>
                .
              </div>
              
              {/* Login Link */}
              <div className="text-center text-base mt-6">
                Already have an account?{" "}
                <Link 
                  to="/login" 
                  state={{ background }}
                  className="text-[#0B65F5] hover:underline font-medium"
                >
                  Log in
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
