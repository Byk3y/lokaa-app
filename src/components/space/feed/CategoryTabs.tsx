import React from 'react';
import { Tag } from "lucide-react";
import type { EffectivePermissions } from "@/types/feedTypes";

interface Category {
  id: string;
  name: string;
  icon?: string | null;
}

interface CategoryTabsProps {
  selectedTab: string;
  spaceCategories: Category[];
  categoriesLoading: boolean;
  effectivePermissions: EffectivePermissions;
  handleTabSelect: (tab: string) => void;
  openCategoryModal: () => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  selectedTab,
  spaceCategories,
  categoriesLoading,
  effectivePermissions,
  handleTabSelect,
  openCategoryModal,
}) => {
  return (
    <div className="mt-6">
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 px-4 sm:px-0" role="tablist">
        {/* All Tab */}
        <button 
          role="tab"
          aria-selected={selectedTab === "all"}
          onClick={() => handleTabSelect("all")}
          className={`flex-shrink-0 px-3 py-3 rounded-full text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-1 whitespace-nowrap ${selectedTab === "all" 
              ? 'bg-primary text-white' 
              : 'bg-gray-200 text-primary hover:bg-primary/10 hover:text-primary-dark dark:bg-gray-700 dark:text-primary dark:hover:bg-primary/20'
          }`}
        >
          All
        </button>
        
        {/* Category Tabs */}
        {spaceCategories.map((category) => (
          <button 
            key={category.id}
            role="tab"
            aria-selected={selectedTab === category.id}
            onClick={() => handleTabSelect(category.id)}
            className={`flex-shrink-0 px-3 py-3 rounded-full text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-1 whitespace-nowrap ${selectedTab === category.id
              ? 'bg-primary text-white' 
              : 'bg-gray-200 text-primary hover:bg-primary/10 hover:text-primary-dark dark:bg-gray-700 dark:text-primary dark:hover:bg-primary/20'
          }`}
            disabled={categoriesLoading && spaceCategories.length === 0}
            style={{ 
              opacity: (categoriesLoading && spaceCategories.length === 0) ? 0.7 : 1 
            }}
          >
            {category.icon && <span className="mr-1 sm:mr-1.5">{category.icon}</span>}
            {category.name}
          </button>
        ))}
        
        {/* Edit Categories Button - Only for admins/owners */}
        {(effectivePermissions.effectiveIsOwner || effectivePermissions.effectiveIsAdmin) && (
          <button 
            className="flex-shrink-0 flex items-center justify-center px-3 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 whitespace-nowrap"
            onClick={openCategoryModal}
          >
            <Tag className="h-4 w-4 mr-1 sm:mr-1.5" />
            Edit
          </button>
        )}
      </div>
    </div>
  );
};

export default CategoryTabs;
