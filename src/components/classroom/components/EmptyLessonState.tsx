import React, { useState } from 'react';
import { CheckCircle2, Edit, FileText } from 'lucide-react';
import { log } from '@/utils/logger';
import RichTextEditor from '@/components/ui/rich-text-editor';
import LessonEditor from '@/components/classroom/components/LessonEditor';
import type { CourseLesson } from '@/types/classroom/courseDetail';
import { extractTitleFromContent } from '@/utils/lessonContentUtils';

export interface EmptyLessonStateProps {
  isOwner: boolean;
  isAdmin: boolean;
  isSaving: boolean;
  onMarkAsDone?: () => void;
  onCreateNewPage?: () => void;
  onSaveInlineCreation: (title: string, content: string) => Promise<void>;
}

/**
 * EmptyLessonState component handles the UI when no lesson is selected
 * Supports inline page creation for owners/admins
 * Extracted from LessonContent.tsx for better modularity
 */
const EmptyLessonState: React.FC<EmptyLessonStateProps> = ({
  isOwner,
  isAdmin,
  isSaving,
  onMarkAsDone,
  onCreateNewPage,
  onSaveInlineCreation
}) => {
  const [isInlineCreating, setIsInlineCreating] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageContent, setNewPageContent] = useState('');

  const handleStartInlineCreation = () => {
    setIsInlineCreating(true);
    setNewPageTitle('');
    setNewPageContent('');
  };

  const handleCancelInlineCreation = () => {
    setIsInlineCreating(false);
    setNewPageTitle('');
    setNewPageContent('');
  };

  const handleSaveInlineCreation = async () => {
    // Extract title from content if not provided
    const finalTitle = extractTitleFromContent(newPageContent, newPageTitle);
    
    try {
      await onSaveInlineCreation(finalTitle, newPageContent);
      
      // Reset state after successful creation
      setIsInlineCreating(false);
      setNewPageTitle('');
      setNewPageContent('');
      
      // Trigger the onCreateNewPage callback if provided
      if (onCreateNewPage) {
        onCreateNewPage();
      }
    } catch (error) {
      // Error handling is done in the parent component
      log.error('Component', 'EmptyLessonState: Error saving inline creation:', error);
    }
  };

  return (
    <div className="h-full bg-gray-50 p-6">
      <div className="w-full">
        {(isOwner || isAdmin) && onCreateNewPage ? (
          <>
            {!isInlineCreating ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 flex items-center w-full">
                <span className="text-lg font-medium text-gray-900">New page</span>
                <div className="ml-auto flex items-center gap-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsDone?.();
                    }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Mark as done"
                  >
                    <CheckCircle2 className="w-6 h-6 text-gray-400 hover:text-green-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartInlineCreation();
                    }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Start writing"
                  >
                    <Edit className="w-6 h-6 text-gray-400 hover:text-blue-600" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full">
                {/* Use the same editor as existing pages to ensure identical video behavior */}
                <LessonEditor
                  lesson={{
                    id: 'temp-new-page',
                    title: newPageTitle || 'Title',
                    content_type: 'rich_text',
                    content_text: newPageContent,
                    content_url: null,
                    lesson_order: 0,
                    is_published: true,
                    educational_content: { id: 'temp-content', title: newPageTitle || 'Title', content_type: 'rich_text', text_content: newPageContent, media_url: null, embed_data: null, estimated_duration: null, difficulty_level: null },
                  } as CourseLesson}
                  editingContent={newPageContent}
                  isSaving={isSaving}
                  onContentChange={setNewPageContent}
                  onSave={(title, content) => {
                    setNewPageTitle(title);
                    setNewPageContent(content);
                    handleSaveInlineCreation();
                  }}
                  onCancel={handleCancelInlineCreation}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4" />
              <p>This course doesn't have any lessons yet.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyLessonState;