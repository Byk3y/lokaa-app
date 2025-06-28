import React from 'react';
import { CategorySelector } from '../../CategorySelector';
import type { PostFormActionsProps } from '../types';

/**
 * Actions component with category selector and submit/cancel buttons
 */
export const PostFormActions: React.FC<PostFormActionsProps> = ({
  categoryId,
  setCategoryId,
  categories,
  categoriesLoading,
  categoriesError,
  toolbarButtonClass,
  activeToolbarButtonClass,
  onCancel,
  onSubmit,
  isSubmitting,
  uploadingFiles,
  hasContent,
  editMode = false
}) => {
  const submitButtonText = isSubmitting 
    ? (editMode ? "Updating..." : "Posting...") 
    : uploadingFiles.size > 0
    ? "Uploading files..."
    : (editMode ? "Update Post" : "Post");

  const isSubmitDisabled = !hasContent || isSubmitting || uploadingFiles.size > 0;

  return (
    <div className="flex items-center space-x-3">
      <CategorySelector
        selectedCategoryId={categoryId}
        onCategoryChange={setCategoryId}
        categories={categories || []}
        loading={categoriesLoading}
        error={categoriesError}
        toolbarButtonClass={toolbarButtonClass}
        activeToolbarButtonClass={activeToolbarButtonClass}
      />
      
      <div className="ml-auto flex items-center space-x-3">
        <button
          type="button" 
          onClick={onCancel} 
          className="rounded-md px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitDisabled}
          className={`rounded-md px-4 py-2.5 text-sm font-medium text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 transition-colors ${
            isSubmitDisabled
            ? 'bg-teal-400 cursor-not-allowed opacity-70' 
            : 'bg-teal-600 hover:bg-teal-700'
          }`}
        >
          {submitButtonText}
        </button>
      </div>
    </div>
  );
}; 