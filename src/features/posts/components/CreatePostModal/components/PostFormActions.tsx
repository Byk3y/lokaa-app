import React from 'react';
import { CategorySelector } from '../../CategorySelector';
import type { PostFormActionsProps } from '../types';

/**
 * Actions — category selector + cancel + submit, compact inline layout
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
  const submitLabel = isSubmitting
    ? (editMode ? 'Saving…' : 'Posting…')
    : uploadingFiles.size > 0
      ? 'Uploading…'
      : (editMode ? 'Save' : 'Post');

  const isDisabled = !hasContent || isSubmitting || uploadingFiles.size > 0;

  return (
    <div className="flex items-center gap-2">
      <CategorySelector
        selectedCategoryId={categoryId}
        onCategoryChange={setCategoryId}
        categories={categories || []}
        loading={categoriesLoading}
        error={categoriesError}
        toolbarButtonClass={toolbarButtonClass}
        activeToolbarButtonClass={activeToolbarButtonClass}
      />

      <button
        type="button"
        onClick={onCancel}
        className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        Cancel
      </button>

      <button
        onClick={onSubmit}
        disabled={isDisabled}
        className={`px-5 py-1.5 text-sm font-semibold rounded-lg text-white shadow-sm transition-all duration-150 ${isDisabled
            ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
            : 'bg-teal-600 hover:bg-teal-700 hover:shadow-md active:scale-[0.98]'
          }`}
      >
        {submitLabel}
      </button>
    </div>
  );
};