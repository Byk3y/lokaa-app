import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DiscoverHeroProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onCreateSpace: (e: React.MouseEvent) => void;
}

export default function DiscoverHero({ 
  searchQuery, 
  onSearchChange, 
  onSearchSubmit,
  onCreateSpace 
}: DiscoverHeroProps) {
  return (
    <section className="relative pt-4 sm:pt-10 pb-3 sm:pb-6 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-8 text-center">
          Discover spaces
        </h1>
        
        <div className="relative max-w-2xl mx-auto mb-4 sm:mb-8">
          <form onSubmit={onSearchSubmit}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search for anything"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </form>
        </div>

        <div className="text-center">
          <Button
            onClick={onCreateSpace}
            className="inline-flex items-center px-6 py-2.5 bg-teal-600 text-white font-medium rounded-full hover:bg-teal-700 transition-colors"
          >
            Create a space
          </Button>
        </div>
      </div>
    </section>
  );
}
