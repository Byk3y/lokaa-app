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
