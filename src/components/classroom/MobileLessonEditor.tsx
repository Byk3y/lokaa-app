import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Save, X, Loader2, Search, MoreHorizontal, ChevronDown } from 'lucide-react';
import { formatAsTitle } from '@/utils/textUtils';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface CourseLesson {
  id: string;
  title: string;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  lesson_order: number;
  module_id?: string;
  content_id?: string | null;
  is_published: boolean;
  page_type?: string;
  estimated_duration?: number | null;
  difficulty_level?: string | null;
  created_at?: string;
  updated_at?: string;
  completed?: boolean;
  educational_content?: {
    id: string;
    title: string;
    content_type: string;
    text_content: string | null;
    media_url: string | null;
    embed_data: any;
    estimated_duration: number | null;
    difficulty_level: string | null;
  } | null;
}

interface Space {
  id: string;
  name: string;
  subdomain: string;
  avatar_url?: string | null;
  icon_image?: string | null;
}

interface MobileLessonEditorProps {
  lesson: CourseLesson;
  space?: Space | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: Partial<CourseLesson>) => Promise<void>;
}

const MobileLessonEditor: React.FC<MobileLessonEditorProps> = ({
  lesson,
  space,
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize form data when component opens
  useEffect(() => {
    if (isOpen) {
      if (lesson) {
        setTitle(lesson.title || '');
        
        // Get content from the appropriate source
        let initialContent = '';
        if (lesson.educational_content?.text_content) {
          initialContent = lesson.educational_content.text_content;
        } else if (lesson.content_text) {
          initialContent = lesson.content_text;
        }
        
        // Ensure we have a clean content string, fallback to empty if null/undefined
        const cleanContent = initialContent || '';
        setContent(cleanContent);
        setIsPublished(lesson.is_published || false);
        setHasUnsavedChanges(false);
        
        // Debug logging to help track content loading
        console.log('MobileLessonEditor - Initializing content:', {
          lessonId: lesson.id,
          hasEducationalContent: !!lesson.educational_content?.text_content,
          hasContentText: !!lesson.content_text,
          contentLength: cleanContent.length,
          contentPreview: cleanContent.substring(0, 100)
        });
      }
    }
  }, [isOpen, lesson]);

  // Track changes
  useEffect(() => {
    if (!isOpen) return;

    const initialTitle = lesson.title || '';
    const initialContent = lesson.educational_content?.text_content || lesson.content_text || '';
    const initialPublished = lesson.is_published || false;

    const titleChanged = title !== initialTitle;
    const contentChanged = content !== initialContent;
    const publishedChanged = isPublished !== initialPublished;
    
    setHasUnsavedChanges(titleChanged || contentChanged || publishedChanged);
  }, [title, content, isPublished, lesson, isOpen]);

  const handleSave = async () => {
    // Extract title from content if not provided
    let finalTitle = title.trim();
    
    if (!finalTitle) {
      // Try to extract title from the first heading in the content
      const headingMatch = content.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
      if (headingMatch) {
        finalTitle = headingMatch[1].replace(/<[^>]*>/g, '').trim();
      } else {
        // Try to extract from the first paragraph
        const paragraphMatch = content.match(/<p[^>]*>(.*?)<\/p>/i);
        if (paragraphMatch) {
          const text = paragraphMatch[1].replace(/<[^>]*>/g, '').trim();
          if (text && text.length <= 100) {
            finalTitle = text;
          } else {
            finalTitle = "Untitled Lesson";
          }
        } else {
          finalTitle = "Untitled Lesson";
        }
      }
    }

    setIsSaving(true);
    try {
      const updatedData: Partial<CourseLesson> = {
        title: finalTitle,
        content_text: content,
        is_published: isPublished,
      };

      // If lesson has educational_content, update that instead
      if (lesson.educational_content) {
        updatedData.educational_content = {
          ...lesson.educational_content,
          title: finalTitle,
          text_content: content,
        };
      }

      await onSave(updatedData);
      
      setHasUnsavedChanges(false);
      toast({
        title: "Lesson Updated",
        description: `"${finalTitle}" has been saved successfully.`,
        variant: "default"
      });
    } catch (error: any) {
      console.error('Error saving lesson:', error);
      toast({
        title: "Error Saving Lesson",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmDiscard = window.confirm(
        "You have unsaved changes. Are you sure you want to cancel?"
      );
      if (!confirmDiscard) return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  const handlePublishedChange = useCallback((newPublished: boolean) => {
    setIsPublished(newPublished);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-white flex flex-col" style={{ 
      height: '100vh', 
      width: '100vw',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)'
    }}>
      {/* Header - Match Space Navigation Style with consistent padding */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-1.5 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSaving}
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          
          {/* Space branding */}
          <div className="flex items-center space-x-2">
            {space?.icon_image ? (
              <img 
                src={space.icon_image} 
                alt={space.name}
                className="w-8 h-8 bg-gray-200 rounded-lg object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {space?.name?.charAt(0).toUpperCase() || 'S'}
                </span>
              </div>
            )}
            <span className="font-bold text-gray-900">
              {space?.name || 'Space'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreHorizontal className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content - Scrollable Layout with proper height calculation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 70px)', paddingBottom: '20px' }}>
        <div className="min-h-full">
          <RichTextEditor
            key={`lesson-editor-${lesson.id}`}
            content={content}
            onChange={handleContentChange}
            placeholder="Start writing your lesson content..."
            className="w-full border-0"
            isSaving={isSaving}
            onSave={(titleFromEditor, contentFromEditor, publishedFromEditor) => {
              if (titleFromEditor && titleFromEditor !== title) {
                setTitle(titleFromEditor);
              }
              // Update published state if provided from editor
              if (publishedFromEditor !== undefined && publishedFromEditor !== isPublished) {
                setIsPublished(publishedFromEditor);
              }
              handleSave();
            }}
            onCancel={() => {
              handleCancel();
            }}
            defaultTitle={title}
            isPublished={isPublished}
            onPublishedChange={handlePublishedChange}
          />
        </div>
      </div>

    </div>
  );
};

export default MobileLessonEditor;