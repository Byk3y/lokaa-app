import { log } from '@/utils/logger';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { VideoContentExtractor } from '@/utils/videoContentExtractor';
import { getContentSource, extractTitleFromContent } from '@/utils/lessonContentUtils';
import EmptyLessonState from './components/EmptyLessonState';
import LessonEditor from './components/LessonEditor';
import LessonViewer from './components/LessonViewer';
import { EducationalContentService } from '@/services/EducationalContentService';
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
  const [isHydratingContent, setIsHydratingContent] = useState(false);
  const [hydratedTextContent, setHydratedTextContent] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Reset edit state when lesson changes
  useEffect(() => {
    setIsEditing(false);
    setEditingContent('');
  }, [lesson?.id]);

  // Lazy hydrate educational content for the selected lesson when needed
  useEffect(() => {
    const hydrate = async () => {
      if (!lesson) return;
      // Only hydrate if the lesson references educational_content but it isn't loaded
      if (lesson.content_id && !lesson.educational_content) {
        try {
          setIsHydratingContent(true);
          const svc = new EducationalContentService();
          const withContent = await svc.getLessonWithContent(lesson.id, { textOnly: true });
          if (withContent?.educational_content?.text_content) {
            setHydratedTextContent(withContent.educational_content.text_content);
          }
        } catch (e) {
          // Non-fatal: viewer will fallback to legacy content_text if present
        } finally {
          setIsHydratingContent(false);
        }
      }
    };
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id, lesson?.content_id]);

  // Merge hydrated text into a display lesson without mutating or saving
  const displayLesson = React.useMemo(() => {
    if (!lesson) return lesson;
    if (hydratedTextContent) {
      return {
        ...lesson,
        educational_content: {
          ...(lesson.educational_content || {} as any),
          text_content: hydratedTextContent
        }
      } as typeof lesson;
    }
    return lesson;
  }, [lesson, hydratedTextContent]);
  
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
      setIsSaving(false); // Reset saving state if early return
      return;
    }

    // Prevent concurrent saves
    if (isSaving) {
      return;
    }

    // isSaving is already set to true in handleSave, so we don't need to set it again

    try {
      const finalContent = content || editingContent;
      
      // Extract video URL from HTML content if available (but skip if removing video)
      let finalVideoUrl: string | null = null;
      let cleanedContent = finalContent;
      
      if (finalContent && !removeVideo) {
        // Only extract video if we're NOT removing it
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
      // But only if we found a video and we're not removing it
      if (finalContent && finalVideoUrl && !removeVideo) {
        cleanedContent = VideoContentExtractor.cleanHTMLContent(finalContent);
      } else if (removeVideo && finalContent) {
        // If removing video, clean any video content from HTML
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
    
    // Add debug logging for video removal detection
    if (removeVideo) {
      log.debug('Component', '🎓 [LessonContent] Video removal detected - will skip video extraction from editor HTML');
    }
    
    // Set saving state immediately when save is triggered
    setIsSaving(true);
    log.debug('Component', '🎓 [LessonContent] Set isSaving to true immediately');
    
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
      setIsSaving(false); // Reset saving state if duplicate
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
            />
    );
  }

  // --- Skool-style: title left, actions right inside content card ---
  return (
    <LessonViewer
      lesson={displayLesson}
      isOwner={isOwner}
      isAdmin={isAdmin}  
      completed={completed}
      onEdit={handleEdit}
      onMarkAsDone={onMarkAsDone}
      isSaving={isSaving}
    />
  );
};

export default LessonContent; 