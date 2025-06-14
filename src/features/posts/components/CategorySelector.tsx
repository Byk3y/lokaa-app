import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface SpaceCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface CategorySelectorProps {
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  categories: SpaceCategory[];
  loading: boolean;
  error: boolean;
  toolbarButtonClass: string;
  activeToolbarButtonClass?: string;
  iconComponent?: React.ReactNode;
}

/**
 * Component for selecting a post category
 */
export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryId,
  onCategoryChange,
  categories,
  loading,
  error,
  toolbarButtonClass,
  activeToolbarButtonClass,
  iconComponent,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  const handleCategorySelect = (categoryId: string) => {
    onCategoryChange(categoryId);
    setIsOpen(false);
  };
  
  const handleClearCategory = () => {
    onCategoryChange(null);
    setIsOpen(false);
  };
  
  // Get the selected category name to display
  const selectedCategory = selectedCategoryId 
    ? categories.find(c => c.id === selectedCategoryId) 
    : null;
  
  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center text-black dark:text-white font-medium text-sm transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center ${
          selectedCategory 
            ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' 
            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
        }`}>
          {selectedCategory ? selectedCategory.name : 'General Discussion'}
          <ChevronDown className="h-3.5 w-3.5 ml-1.5 text-gray-500 dark:text-gray-400" />
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 z-50">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
            Categories
          </div>
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Loading...</div>
          ) : error ? (
            <div className="px-3 py-2 text-sm text-red-500">Error loading categories</div>
          ) : categories.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No categories available</div>
          ) : (
            <div className="py-1">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                    selectedCategoryId === category.id
                      ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-medium'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => handleCategorySelect(category.id)}
                >
                  {category.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 