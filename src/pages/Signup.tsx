
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "@/components/auth/AuthForm";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (data: any) => {
    setIsLoading(true);
    
    // Simulate signup process
    try {
      // Here you would normally connect to Firebase Auth
      // For now, we'll just simulate a successful signup
      console.log("Signup attempt with:", data);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success message and redirect
      toast({
        title: "Account created successfully",
        description: "Welcome to Lokaa! Redirecting to your dashboard...",
        variant: "default",
      });
      
      // Redirect to dashboard after successful signup
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
      
    } catch (error) {
      console.error("Signup error:", error);
      toast({
        title: "Signup failed",
        description: "Unable to create your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Image/Brand Area */}
      <div className="hidden md:block md:w-1/2 bg-hero-gradient">
        <div className="h-full flex flex-col items-center justify-center p-10 text-white text-center">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-8">
            <div className="w-10 h-10 rounded-full bg-lokaa-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">L</span>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4">Join Lokaa Today</h2>
          <p className="text-xl text-white/80 max-w-sm">
            Create your community, share knowledge, and monetize your passion.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-6 w-full max-w-lg">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg">
              <h3 className="font-semibold text-xl mb-2">Create Spaces</h3>
              <p className="text-white/80">Build dedicated communities with custom branding</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg">
              <h3 className="font-semibold text-xl mb-2">Sell Courses</h3>
              <p className="text-white/80">Create and monetize your knowledge</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg">
              <h3 className="font-semibold text-xl mb-2">Host Events</h3>
              <p className="text-white/80">Schedule virtual and in-person gatherings</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg">
              <h3 className="font-semibold text-xl mb-2">Get Paid</h3>
              <p className="text-white/80">Accept payments in your local currency</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side - Auth Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <AuthForm type="signup" onSubmit={handleSignup} />
        </div>
      </div>
    </div>
  );
}
