
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "@/components/auth/AuthForm";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (data: any) => {
    setIsLoading(true);
    
    // Simulate login process
    try {
      // Here you would normally connect to Firebase Auth
      // For now, we'll just simulate a successful login
      console.log("Login attempt with:", data);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success message and redirect
      toast({
        title: "Login successful",
        description: "Welcome back to Lokaa! Redirecting to dashboard...",
        variant: "default",
      });
      
      // Redirect to dashboard after successful login
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
      
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Auth Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <AuthForm type="login" onSubmit={handleLogin} />
        </div>
      </div>
      
      {/* Right Side - Image/Brand Area */}
      <div className="hidden md:block md:w-1/2 bg-hero-gradient">
        <div className="h-full flex flex-col items-center justify-center p-10 text-white text-center">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-8">
            <div className="w-10 h-10 rounded-full bg-lokaa-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">L</span>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4">Welcome back to Lokaa</h2>
          <p className="text-xl text-white/80 max-w-sm">
            The complete platform for creators in emerging markets to build, grow, and monetize their communities.
          </p>
          <img 
            src="/lovable-uploads/476dc072-85b6-4ca9-8439-46df4879562e.png" 
            alt="Lokaa dashboard preview" 
            className="mt-12 w-full max-w-lg rounded-lg shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}
