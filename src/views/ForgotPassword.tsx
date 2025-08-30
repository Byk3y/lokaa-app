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

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const { resetPassword } = useOptimizedAuth();
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const background = location.state?.background;
  
  // Handle close modal
  const handleClose = () => {
    // Go back if we came from a page, otherwise go to login
    if (background) {
      navigate(-1);
    } else {
      navigate('/login');
    }
  };
  
  // Animate modal appearance
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsModalVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setLoading(true);
    try {
      const { error } = await resetPassword(data.email);
      
      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to send reset email. Please try again.",
          variant: "destructive",
        });
      } else {
        setResetSent(true);
        toast({
          title: "Success",
          description: "Password reset instructions have been sent to your email.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = !!form.watch("email");
  
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
            aria-label="Close forgot password modal"
          >
            <X size={20} />
          </button>
          
          <div className="p-8">
            {/* Lokaa Logo */}
            <div className="flex justify-center mb-6">
              <h1 className="text-3xl font-bold text-teal-600">Lokaa</h1>
            </div>
            
            {/* Title */}
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-3">
              Reset your password
            </h2>
            
            {/* Description */}
            <p className="text-center text-gray-600 mb-8">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
            
            {resetSent ? (
              <div className="text-center space-y-6">
                <div className="bg-teal-50 text-teal-700 p-4 rounded-lg">
                  Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder.
                </div>
                
                <Link 
                  to="/login" 
                  className="block text-[#0B65F5] hover:underline mt-4"
                >
                  Return to login
                </Link>
              </div>
            ) : (
              <Form methods={form}>
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
                        Sending...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                  
                  {/* Back to Login Link */}
                  <div className="text-center mt-6">
                    <Link 
                      to="/login" 
                      className="text-[#0B65F5] hover:underline text-sm font-medium"
                    >
                      Back to login
                    </Link>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 