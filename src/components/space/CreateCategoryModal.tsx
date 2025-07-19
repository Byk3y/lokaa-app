import { log } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';
import { getSupabaseClient } from '@/integrations/supabase/client';

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  userId: string;
  onCategoryCreated: () => void;
}

export default function CreateCategoryModal({ 
  isOpen, 
  onClose, 
  spaceId, 
  userId, 
  onCategoryCreated 
}: CreateCategoryModalProps) {
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('💬');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  
  const icons = ['💬', '📢', '❓', '💡', '📚', '🔧', '🎯', '🎓', '🎨', '🎮', '💼', '🏆'];

  useEffect(() => {
    if (!isOpen) {
      setCategoryName('');
      setCategoryIcon('💬');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const { data, error: insertError } = await getSupabaseClient()
        .from('space_categories')
        .insert({
          name: categoryName.trim(),
          space_id: spaceId,
          created_by: userId,
          is_archived: false,
          icon: categoryIcon
        })
        .select()
        .single();

      if (insertError) {
        log.error('Component', 'Error creating category:', insertError);
        setError(insertError.message);
      } else {
        log.debug('Component', 'Category created successfully:', data);
        onCategoryCreated();
        onClose();
      }
    } catch (e) {
      log.error('Component', 'Unexpected error during category creation:', e);
      setError('An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50" />
        <Dialog.Content className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
          <Dialog.Title className="text-lg font-semibold">Create New Category</Dialog.Title>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-1">
                Category Name
              </label>
              <input
                type="text"
                id="categoryName"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Enter category name"
                disabled={isCreating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Icon
              </label>
              <div className="grid grid-cols-6 gap-2">
                {icons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setCategoryIcon(icon)}
                    className={`p-2 text-lg border rounded-md hover:bg-gray-50 ${
                      categoryIcon === icon
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-300'
                    }`}
                    disabled={isCreating}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50"
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </form>

          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <Cross2Icon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
} 