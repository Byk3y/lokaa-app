import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowLeft, Clock, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchAPI } from '../api';

interface MobileSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  onSearch: (query: string) => void;
  initialQuery?: string;
}

export function MobileSearchOverlay({
  isOpen,
  onClose,
  spaceId,
  onSearch,
  initialQuery = ''
}: MobileSearchOverlayProps) {
  const [query, setQuery] = useState(initialQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus input when overlay opens
      setTimeout(() => inputRef.current?.focus(), 100);
      
      // Load recent searches from localStorage
      try {
        const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
        setRecentSearches(recent.slice(0, 5));
      } catch (e) {
        console.warn('Failed to load recent searches:', e);
      }

      // Load popular searches
      loadPopularSearches();
    }
  }, [isOpen]);

  const loadPopularSearches = async () => {
    try {
      const popular = await searchAPI.getPopularSearchTerms('posts', 5);
      setPopularSearches(popular);
    } catch (error) {
      console.warn('Failed to load popular searches:', error);
    }
  };

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    // Save to recent searches
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const updatedRecent = [searchQuery, ...recent.filter((s: string) => s !== searchQuery)].slice(0, 10);
    localStorage.setItem('recentSearches', JSON.stringify(updatedRecent));

    // Perform search
    onSearch(searchQuery);
    onClose();
  };

  const handleInputSubmit = () => {
    handleSearch(query);
  };

  const clearRecentSearches = () => {
    localStorage.removeItem('recentSearches');
    setRecentSearches([]);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-white z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center p-4 border-b bg-white">
          <button
            onClick={onClose}
            className="mr-3 p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          
          <div className="flex-1 relative">
            <Search 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
              size={18} 
            />
            <Input
              ref={inputRef}
              placeholder="Search posts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleInputSubmit();
                }
              }}
              className="pl-10 pr-4 py-3 text-base"
            />
          </div>

          {query && (
            <button
              onClick={() => setQuery('')}
              className="ml-2 p-2 hover:bg-gray-100 rounded-full"
            >
              <X size={18} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                  <Clock size={16} className="mr-2" />
                  Recent Searches
                </h3>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(search)}
                    className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center"
                  >
                    <Search size={16} className="text-gray-400 mr-3" />
                    <span className="text-gray-700">{search}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Searches */}
          {popularSearches.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <TrendingUp size={16} className="mr-2" />
                Popular Searches
              </h3>
              <div className="space-y-2">
                {popularSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(search)}
                    className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center"
                  >
                    <TrendingUp size={16} className="text-gray-400 mr-3" />
                    <span className="text-gray-700">{search}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Tips */}
          <div className="text-center text-gray-500 text-sm">
            <p>Search for posts, topics, or keywords</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}