import React from 'react';
import { ChevronDown } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

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
  toolbarButtonClass?: string; // Made optional as we now have self-contained styling
  activeToolbarButtonClass?: string; // Made optional
  iconComponent?: React.ReactNode;
}

/**
 * Component for selecting a post category
 * 🎉 REFACTORED to use DropdownMenu for proper layering
 */
export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryId,
  onCategoryChange,
  categories,
  loading,
  error,
}) => {
  const selectedCategory = selectedCategoryId 
    ? categories.find(c => c.id === selectedCategoryId) 
    : null;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center text-black dark:text-white font-medium text-sm transition-colors"
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
      </DropdownMenuTrigger>
      
      {/* This content will be portaled outside the modal */}
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>Categories</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
        ) : error ? (
          <DropdownMenuItem disabled className="text-red-500">Error loading</DropdownMenuItem>
        ) : categories.length === 0 ? (
          <DropdownMenuItem disabled>No categories available</DropdownMenuItem>
        ) : (
          categories.map((category) => (
            <DropdownMenuItem 
              key={category.id}
              onSelect={() => onCategoryChange(category.id)}
              className={selectedCategoryId === category.id ? 'bg-gray-100 dark:bg-gray-700' : ''}
            >
              {category.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 