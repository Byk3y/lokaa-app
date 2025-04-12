
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
}

export default function SearchBar({ onSearch, isSearching }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  return (
    <div className="relative">
      <Input
        placeholder="Search for spaces..."
        className="pl-10 pr-4 py-2"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
      />
      <Search 
        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
        size={18} 
      />
      <Button 
        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 px-3 bg-lokaa-600 hover:bg-lokaa-700"
        onClick={handleSearch}
        disabled={isSearching || !searchQuery.trim()}
      >
        {isSearching ? "Searching..." : "Search"}
      </Button>
    </div>
  );
}
