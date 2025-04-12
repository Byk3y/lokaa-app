
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function CTASection() {
  return (
    <section className="py-20 bg-lokaa-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-lokaa-600 rounded-full"></div>
        <div className="absolute top-60 -left-20 w-60 h-60 bg-lokaa-500 rounded-full"></div>
        <div className="absolute -bottom-40 right-20 w-72 h-72 bg-lokaa-700 rounded-full"></div>
      </div>
      
      <div className="container relative z-10 mx-auto px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to build your community?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Join thousands of creators who are connecting with their audience and growing their business on Lokaa.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="bg-white text-lokaa-800 hover:bg-gray-100">
                Get started for free
              </Button>
            </Link>
            <Link to="/demo">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Request a demo
              </Button>
            </Link>
          </div>
          
          <p className="mt-6 text-white/60 text-sm">
            No credit card required. 14-day free trial.
          </p>
        </div>
      </div>
    </section>
  );
}
