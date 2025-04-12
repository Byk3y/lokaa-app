
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <div className="relative overflow-hidden bg-hero-gradient min-h-[calc(100vh-80px)] flex items-center">
      <div className="absolute inset-0 bg-gradient-to-br from-lokaa-600/90 to-lokaa-900/90"></div>
      
      <div className="container relative z-10 px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-6">
              <span className="block">The complete</span>
              <span className="block">community platform</span>
            </h1>
            
            <p className="mt-6 text-xl text-white/80 max-w-2xl mx-auto lg:mx-0">
              Build a home for your community, events, and courses — all under your own brand. Designed for creators in emerging markets.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <div className="w-full sm:w-96">
                <div className="flex">
                  <input 
                    type="email" 
                    placeholder="Enter your email address" 
                    className="rounded-l-full px-6 py-4 flex-1 outline-none border-0 shadow-lg text-gray-800"
                  />
                  <Link to="/signup">
                    <Button className="rounded-r-full px-8 py-6 h-full bg-lokaa-800 hover:bg-lokaa-900 text-white font-medium">
                      Get started
                    </Button>
                  </Link>
                </div>
                <p className="text-white/70 text-sm mt-2 ml-4">No credit card required</p>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:block">
            <img 
              src="/lovable-uploads/58bfbc3c-fdaf-41e1-b234-fb1edf891d95.png" 
              alt="Community platform dashboard" 
              className="w-full rounded-lg shadow-2xl transform translate-x-6 translate-y-6"
            />
            <div className="absolute -bottom-4 -left-4 w-64 h-64 bg-lokaa-200 rounded-full opacity-20 filter blur-3xl"></div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
    </div>
  );
}
