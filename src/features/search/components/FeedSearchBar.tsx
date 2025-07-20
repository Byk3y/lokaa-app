import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Filter, Clock, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { SearchFilters } from '../types';
import { MobileSearchOverlay } from './MobileSearchOverlay';
import { SearchFilters as SearchFiltersComponent } from './SearchFilters';

interface FeedSearchBarProps {
  spaceId: string;
  query: string;
  onQueryChange: (query: string) => void;
  onFiltersChange?: (filters: SearchFilters) => void;
  isLoading?: boolean;
  className?: string;
}

export function FeedSearchBar({ 
  spaceId, 
  query,
  onQueryChange,
  onFiltersChange,
  isLoading = false,
  className = '' 
}: FeedSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleClear = () => {
    onQueryChange('');
    inputRef.current?.focus();
  };

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange?.(updatedFilters);
  };

  if (isMobile) {
    return (
      <MobileFeedSearchBar
        spaceId={spaceId}
        query={query}
        onQueryChange={onQueryChange}
        onClear={handleClear}
        isLoading={isLoading}
        className={className}
      />
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
            size={18} 
          />
          <Input
            ref={inputRef}
            placeholder="Search posts..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleClear();
              }
            }}
            className="pl-10 pr-10"
          />
          {query && !isLoading && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="animate-spin h-4 w-4 text-lokaa-600" />
            </div>
          )}
        </div>

        {/* Filter Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? 'bg-lokaa-50 border-lokaa-200' : ''}
        >
          <Filter size={16} />
        </Button>
      </div>

      {/* Search Filters */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 z-10">
          <SearchFiltersComponent
            filters={filters}
            onChange={handleFilterChange}
            spaceId={spaceId}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

      {/* Search Suggestions */}
      {isFocused && query.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-10">
          <SearchSuggestions spaceId={spaceId} onSelect={onQueryChange} />
        </div>
      )}
    </div>
  );
}

function MobileFeedSearchBar({
  spaceId,
  query,
  onQueryChange,
  onClear,
  isLoading,
  className
}: {
  spaceId: string;
  query: string;
  onQueryChange: (query: string) => void;
  onClear: () => void;
  isLoading: boolean;
  className?: string;
}) {
  const [showOverlay, setShowOverlay] = useState(false);

  const handleSearch = (searchQuery: string) => {
    onQueryChange(searchQuery);
  };

  return (
    <>
      <div className={`${className}`}>
        <button
          onClick={() => setShowOverlay(true)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Search size={18} />
          <span className="flex-1 text-left">
            {query || 'Search posts...'}
          </span>
          {isLoading && (
            <Loader2 className="animate-spin h-4 w-4 text-lokaa-600" />
          )}
        </button>
      </div>

      <MobileSearchOverlay
        isOpen={showOverlay}
        onClose={() => setShowOverlay(false)}
        spaceId={spaceId}
        onSearch={handleSearch}
        initialQuery={query}
      />
    </>
  );
}

// Additional components
function SearchSuggestions({ spaceId, onSelect }: any) {
  return (
    <div className="p-3">
      <div className="text-sm text-gray-500 mb-2">Recent searches will appear here</div>
    </div>
  );
}