
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function HeroSection() {
  const { user } = useOptimizedAuth();

  return (
    <div className="bg-lokaa-50 px-6 lg:px-8 py-24 md:py-32">
      <div className="mx-auto max-w-7xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Build thriving communities
          <span className="block text-lokaa-600">monetize your expertise</span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
          The all-in-one platform for creators and communities in emerging markets.
          Create spaces, share knowledge, host events, and build a sustainable business.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          {user ? (
            <Button className="bg-lokaa-600 hover:bg-lokaa-700 py-6 px-8 text-lg" asChild>
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button className="bg-lokaa-600 hover:bg-lokaa-700 py-6 px-8 text-lg" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
              <Button variant="outline" className="py-6 px-8 text-lg border-lokaa-200 text-lokaa-700 hover:bg-lokaa-100" asChild>
                <Link to="/login">Log In</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
