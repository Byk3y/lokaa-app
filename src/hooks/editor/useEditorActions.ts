import { useState, useEffect, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { formatAsTitle } from '@/utils/textUtils';

export interface EditorActionsProps {
  defaultTitle?: string;
  isPublished?: boolean;
  onSave: (title: string, content: string, published?: boolean) => void;
  onCancel: () => void;
  onPublishedChange?: (published: boolean) => void;
  editor: Editor | null;
}

/**
 * Custom hook for managing editor actions and state
 * Handles title editing, published state, validation, and keyboard shortcuts
 */
export const useEditorActions = ({
  defaultTitle = '',
  isPublished = false,
  onSave,
  onCancel,
  onPublishedChange,
  editor
}: EditorActionsProps) => {
  const [title, setTitle] = useState(defaultTitle);
  const [published, setPublished] = useState(isPublished);
  const [showTitleError, setShowTitleError] = useState(false);

  // Update title when defaultTitle prop changes
  useEffect(() => {
    if (defaultTitle && defaultTitle !== title) {
      setTitle(defaultTitle);
    }
  }, [defaultTitle, title]);

  // Update published state when prop changes
  useEffect(() => {
    setPublished(isPublished);
  }, [isPublished]);

  // Handle title change with formatting and validation
  const handleTitleChange = useCallback((value: string) => {
    const newTitle = formatAsTitle(value);
    setTitle(newTitle);
    if (newTitle.trim()) {
      setShowTitleError(false);
    }
  }, []);

  // Handle published state change
  const handlePublishedChange = useCallback((newPublished: boolean) => {
    setPublished(newPublished);
    if (onPublishedChange) {
      onPublishedChange(newPublished);
    }
  }, [onPublishedChange]);

  // Handle save action with validation
  const handleSave = useCallback(() => {
    // Only save if there's a title
    if (title.trim()) {
      onSave(title.trim(), editor?.getHTML() || '', published);
    } else {
      setShowTitleError(true);
    }
  }, [title, editor, published, onSave]);

  // Handle save with validation check
  const handleSaveWithValidation = useCallback(() => {
    if (!title.trim()) {
      setShowTitleError(true);
      return;
    }
    handleSave();
  }, [title, handleSave]);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  return {
    title,
    published,
    showTitleError,
    handleTitleChange,
    handlePublishedChange,
    handleSave,
    handleSaveWithValidation,
    setShowTitleError
  };
};

export default useEditorActions;
