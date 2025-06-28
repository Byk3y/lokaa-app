import React, { useEffect } from 'react';
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
 * 🔧 FIXED: Mobile z-index issues and default category handling
 * 📱 ENHANCED: Better mobile touch handling
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
  
  // Auto-select "General Discussion" when categories load if no category is selected
  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0 && !loading) {
      const generalDiscussionCategory = categories.find(
        cat => cat.name.toLowerCase() === 'general discussion'
      );
      if (generalDiscussionCategory) {
        console.log('🏷️ [CategorySelector] Auto-selecting General Discussion:', generalDiscussionCategory);
        onCategoryChange(generalDiscussionCategory.id);
      }
    }
  }, [categories, selectedCategoryId, loading, onCategoryChange]);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center text-black dark:text-white font-medium text-sm transition-colors touch-manipulation active:scale-95"
          style={{ 
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <span className={`px-3 py-2 rounded-md text-sm font-semibold flex items-center min-h-[44px] min-w-[44px] justify-center ${
            selectedCategory 
              ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' 
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {selectedCategory ? selectedCategory.name : 'General Discussion'}
            <ChevronDown className="h-3.5 w-3.5 ml-1.5 text-gray-500 dark:text-gray-400" />
          </span>
        </button>
      </DropdownMenuTrigger>
      
      {/* Enhanced for mobile: Higher z-index and better positioning */}
      <DropdownMenuContent 
        className="w-56 z-[10000] shadow-lg" 
        align="end"
        sideOffset={8}
        style={{ zIndex: 10000 }}
      >
        <DropdownMenuLabel>Categories</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <DropdownMenuItem disabled>Loading categories...</DropdownMenuItem>
        ) : error ? (
          <DropdownMenuItem disabled className="text-red-500">Error loading categories</DropdownMenuItem>
        ) : categories.length === 0 ? (
          <DropdownMenuItem disabled>No categories available</DropdownMenuItem>
        ) : (
          categories.map((category) => (
            <DropdownMenuItem 
              key={category.id}
              onSelect={() => {
                console.log('🏷️ [CategorySelector] Category selected:', category);
                onCategoryChange(category.id);
              }}
              className={`cursor-pointer touch-manipulation ${
                selectedCategoryId === category.id ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              {category.icon && <span className="mr-2">{category.icon}</span>}
              {category.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 