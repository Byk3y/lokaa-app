import { log } from '@/utils/logger';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { VideoContentExtractor } from '@/utils/videoContentExtractor';
import { getContentSource, extractTitleFromContent } from '@/utils/lessonContentUtils';
import EmptyLessonState from './components/EmptyLessonState';
import LessonEditor from './components/LessonEditor';
import LessonViewer from './components/LessonViewer';
import type { CourseLesson, LessonContentProps } from '@/types/classroom/courseDetail';

const LessonContent: React.FC<LessonContentProps> = ({ 
  lesson, 
  courseName, 
  isOwner = false,
  isAdmin = false,
  completed = false,
  onUpdateLesson,
  onCreateNewPage,
  onMarkAsDone
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  // Reset edit state when lesson changes
  useEffect(() => {
    setIsEditing(false);
    setEditingContent('');
  }, [lesson?.id]);
  
  // Debouncing refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<{title?: string, content?: string, removeVideo?: boolean} | null>(null);


  // Inline creation handlers
  const handleSaveInlineCreation = async (title: string, content: string) => {
    const finalTitle = extractTitleFromContent(content, title);

    setIsSaving(true);
    try {
      // Create the page with the extracted title
      if (onCreateNewPage) {
        onCreateNewPage();
      }
      
      toast({
        title: "Page Created",
        description: `"${finalTitle}" has been created successfully.`,
        variant: "default"
      });
    } catch (error: unknown) {
      log.error('Component', 'Error creating page:', error instanceof Error ? error : new Error('Unknown error'));
      toast({
        title: "Error Creating Page",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
      throw error instanceof Error ? error : new Error('An unexpected error occurred'); // Re-throw to let EmptyLessonState handle it
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    const contentSource = getContentSource(lesson);
    setEditingContent(contentSource.content);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingContent('');
  };

  const handleContentChange = (content: string) => {
    setEditingContent(content);
  };

  const debouncedSave = useCallback(async (title?: string, content?: string, removeVideo?: boolean) => {
    
    if (!lesson || !onUpdateLesson) {
      setIsEditing(false);
      return;
    }

    // Prevent concurrent saves
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const finalContent = content || editingContent;
      
      // Extract video URL from HTML content if available
      let finalVideoUrl: string | null = null;
      let cleanedContent = finalContent;
      
      if (finalContent) {
        // Extract video URL from HTML content
        const iframeMatch = finalContent.match(/src=["']([^"']*youtube\.com\/embed\/[^"']*)["']/) ||
                            finalContent.match(/src=([^\s>]*youtube\.com\/embed\/[^\s>]*)/);
        
        if (iframeMatch && iframeMatch[1]) {
          finalVideoUrl = iframeMatch[1];
        } else {
          // Look for direct YouTube URLs in the content
          const youtubeMatch = finalContent.match(/(https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[^\s"']+)/);
          if (youtubeMatch) {
            finalVideoUrl = youtubeMatch[1];
          }
        }
      }

      // Clean the content by removing embedded video iframes (since we store video URL separately)
      if (finalContent && finalVideoUrl) {
        cleanedContent = VideoContentExtractor.cleanHTMLContent(finalContent);
      }


      // Prepare update object - only include content_url if we found a video
      const updateData: { title: string; content_text: string; content_url?: string | null } = {
        title: title || lesson.title,
        content_text: cleanedContent
      };
      
      // Handle video removal or addition
      if (removeVideo) {
        // Explicitly remove video by setting content_url to null
        updateData.content_url = null;
      } else if (finalVideoUrl) {
        // Add video if found in content
        updateData.content_url = finalVideoUrl;
      }
      // If neither removeVideo nor finalVideoUrl, don't update content_url (keep existing)

      // Update the lesson
      await onUpdateLesson(lesson.id, updateData);
      
      
      setIsEditing(false);
      setEditingContent('');
      
      toast({
        title: "Lesson Updated",
        description: "Your changes have been saved successfully.",
        variant: "default"
      });
    } catch (error) {
      log.error('Component', '🎓 [LessonContent] Error in debouncedSave:', error);
      log.error('Component', 'Error saving lesson:', error);
      // Note: Error toast is now handled by the handleUpdateLesson function
      // to avoid duplicate error messages
    } finally {
      setIsSaving(false);
    }
  }, [lesson, onUpdateLesson, editingContent, isSaving, toast]);

  const handleSave = useCallback((title?: string, content?: string, published?: boolean, removeVideo?: boolean) => {
    log.debug('Component', '🎓 [LessonContent] handleSave called with:', { title, contentLength: content?.length, removeVideo });
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Store the save data for comparison
    const currentSaveData = { title, content, removeVideo };
    
    // Check if this is the same data as the last save attempt
    if (lastSaveDataRef.current && 
        lastSaveDataRef.current.title === title && 
        lastSaveDataRef.current.content === content &&
        lastSaveDataRef.current.removeVideo === removeVideo) {
      log.debug('Component', '🎓 [LessonContent] Duplicate save detected, ignoring');
      return;
    }
    
    lastSaveDataRef.current = currentSaveData;
    
    // Debounce the save operation
    saveTimeoutRef.current = setTimeout(() => {
      log.debug('Component', '🎓 [LessonContent] Executing debounced save');
      debouncedSave(title, content, removeVideo);
    }, 500); // 500ms debounce
  }, [debouncedSave]);


  // --- Main render block ---
  if (!lesson) {
    return (
      <EmptyLessonState
        isOwner={isOwner}
        isAdmin={isAdmin}
        isSaving={isSaving}
        onMarkAsDone={onMarkAsDone}
        onCreateNewPage={onCreateNewPage}
        onSaveInlineCreation={handleSaveInlineCreation}
      />
    );
  }

  if (isEditing && (lesson.content_type === 'text' || lesson.content_type === 'rich_text')) {
    return (
              <LessonEditor
          lesson={lesson}
          editingContent={editingContent}
          isSaving={isSaving}
          onContentChange={handleContentChange}
          onSave={handleSave}
          onCancel={handleCancel}
          onSaveComplete={() => {
            // Reset any video-related states if needed
          }}
        />
    );
  }

  // --- Skool-style: title left, actions right inside content card ---
  return (
    <LessonViewer
      lesson={lesson}
      isOwner={isOwner}
      isAdmin={isAdmin}  
      completed={completed}
      onEdit={handleEdit}
      onMarkAsDone={onMarkAsDone}
    />
  );
};

export default LessonContent; 