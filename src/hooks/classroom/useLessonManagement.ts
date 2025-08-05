import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { log } from '@/utils/logger';
import type { CourseDetailData, CourseLesson } from '@/types/classroom/courseDetail';

interface LessonUpdates {
  title?: string;
  content_text?: string;
  content_url?: string | null;
  is_published?: boolean;
}

interface UseLessonManagementReturn {
  // Lesson creation state
  isCreatingPage: boolean;
  creatingModuleId: string | null;
  newPageTitle: string;
  newPageContent: string;
  isSaving: boolean;
  
  // Lesson creation handlers
  handleCreateNewPage: (moduleId?: string) => void;
  handleCancelCreate: () => void;
  handleSaveNewPage: (extractedTitle?: string) => Promise<void>;
  
  // Lesson update handlers
  handleUpdateLesson: (lessonId: string, updates: LessonUpdates) => Promise<void>;
  
  // State setters for form management
  setNewPageTitle: (title: string) => void;
  setNewPageContent: (content: string) => void;
}

interface UseLessonManagementProps {
  course: CourseDetailData | null;
  courseId: string | null;
  userId: string | null;
  selectedLesson: CourseLesson | null;
  onLessonCreated?: (lesson: CourseLesson) => void;
  onLessonUpdated?: (lessonId: string, updates: LessonUpdates) => void;
  onRefetch?: () => Promise<CourseDetailData | null>;
  onInvalidateCache?: () => void;
  onSelectedLessonChange?: (lesson: CourseLesson | null) => void;
  
  // Optimistic update functions from useCourseDetail
  applyOptimisticUpdate?: (lessonId: string, updates: {
    title?: string;
    content_text?: string;
    content_url?: string | null;
    is_published?: boolean;
  }) => void;
  clearOptimisticUpdate?: (lessonId: string) => void;
}

export const useLessonManagement = (props: UseLessonManagementProps): UseLessonManagementReturn => {
  const {
    course,
    courseId,
    userId,
    selectedLesson,
    onLessonCreated,
    onLessonUpdated,
    onRefetch,
    onInvalidateCache,
    onSelectedLessonChange,
    applyOptimisticUpdate,
    clearOptimisticUpdate
  } = props;
  
  // Lesson creation state
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [creatingModuleId, setCreatingModuleId] = useState<string | null>(null);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageContent, setNewPageContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Lesson creation handlers
  const handleCreateNewPage = useCallback((moduleId?: string) => {
    log.debug('Hook', '🎓 [useLessonManagement] Creating new page for module:', moduleId);
    setIsCreatingPage(true);
    setCreatingModuleId(moduleId || null);
    setNewPageTitle('');
    setNewPageContent('');
  }, []);
  
  const handleCancelCreate = useCallback(() => {
    log.debug('Hook', '🎓 [useLessonManagement] Canceling page creation');
    setIsCreatingPage(false);
    setCreatingModuleId(null);
    setNewPageTitle('');
    setNewPageContent('');
  }, []);
  
  const handleSaveNewPage = useCallback(async (extractedTitle?: string) => {
    if (!courseId || !userId) {
      log.warn('Hook', '🎓 [useLessonManagement] Missing courseId or userId');
      return;
    }

    setIsSaving(true);
    const supabase = getSupabaseClient();
    
    try {
      const finalTitle = extractedTitle?.trim() || newPageTitle.trim() || 'Untitled Page';

      // Create educational content
      const { data: contentData, error: contentError } = await supabase
        .from('educational_content')
        .insert({
          title: finalTitle,
          content_type: 'rich_text',
          text_content: newPageContent,
          estimated_duration: Math.max(1, Math.ceil(newPageContent.length / 1000)),
          difficulty_level: 'beginner'
        })
        .select()
        .single();

      if (contentError) throw contentError;

      // Get or create target module
      let targetModuleId = creatingModuleId;
      if (!targetModuleId) {
        // Check for existing "Pages" module
        const { data: existingModules } = await supabase
          .from('course_modules')
          .select('id')
          .eq('course_id', course?.id)
          .eq('title', 'Pages');

        if (existingModules?.[0]) {
          targetModuleId = existingModules[0].id;
        } else {
          // Create new "Pages" module
          const { data: newModule, error: moduleError } = await supabase
            .from('course_modules')
            .insert({
              title: 'Pages',
              description: 'Standalone pages for this course',
              course_id: course?.id,
              module_order: 999,
              module_type: 'folder'
            })
            .select()
            .single();

          if (moduleError) throw moduleError;
          targetModuleId = newModule.id;
        }
      }

      // Get next lesson order
      const { data: maxOrderData } = await supabase
        .from('course_lessons')
        .select('lesson_order')
        .eq('module_id', targetModuleId)
        .order('lesson_order', { ascending: false })
        .limit(1);

      const nextOrder = (maxOrderData?.[0]?.lesson_order || 0) + 1;

      // Create lesson
      const { data: lessonData, error: lessonError } = await supabase
        .from('course_lessons')
        .insert({
          title: finalTitle,
          content_type: 'rich_text',
          content_text: newPageContent,
          module_id: targetModuleId,
          lesson_order: nextOrder,
          content_id: contentData.id,
          page_type: 'page',
          is_published: true,
          estimated_duration: contentData.estimated_duration,
          difficulty_level: contentData.difficulty_level
        })
        .select()
        .single();

      if (lessonError) throw lessonError;

      // Reset form
      setNewPageTitle('');
      setNewPageContent('');
      setIsCreatingPage(false);

      // Refresh data and get fresh course data
      onInvalidateCache?.();
      const freshCourseData = await onRefetch?.();
      
      // Find and select new lesson using fresh data
      if (freshCourseData) {
        const allLessons = freshCourseData.modules.flatMap(module => module.lessons);
        const newLesson = allLessons.find(lesson => lesson.content_id === contentData.id);
        
        if (newLesson) {
          onSelectedLessonChange?.(newLesson);
          onLessonCreated?.(newLesson);
        }
      } else {
        log.warn('Hook', '🎓 [useLessonManagement] No fresh course data available for new lesson selection');
      }

      toast({
        title: "Success",
        description: `"${finalTitle}" has been created successfully!`,
        variant: "default"
      });
      
    } catch (error: any) {
      log.error('Hook', '🎓 [useLessonManagement] Error creating page:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create page",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    courseId,
    userId,
    newPageTitle,
    newPageContent,
    creatingModuleId,
    onLessonCreated,
    onRefetch,
    onInvalidateCache,
    onSelectedLessonChange
  ]);
  
  const handleUpdateLesson = useCallback(async (lessonId: string, updates: LessonUpdates) => {
    log.debug('Hook', '🎓 [useLessonManagement] Updating lesson:', lessonId);
    
    // Apply optimistic update first for immediate UI feedback
    if (applyOptimisticUpdate) {
      applyOptimisticUpdate(lessonId, updates);
    }
    
    try {
      const supabase = getSupabaseClient();
      // Get lesson's content_id
      const { data: lessonData, error: lessonError } = await supabase
        .from('course_lessons')
        .select('content_id')
        .eq('id', lessonId)
        .single();

      if (lessonError) {
        log.error('Hook', '🎓 [useLessonManagement] Error getting lesson data:', lessonError);
        throw lessonError;
      }

      // Update lesson title if provided
      if (updates.title) {
        const { error } = await supabase
          .from('course_lessons')
          .update({ title: updates.title })
          .eq('id', lessonId);
        if (error) {
          log.error('Hook', '🎓 [useLessonManagement] Error updating lesson title:', error);
          throw error;
        }
      }

      // Update content
      if (updates.content_text) {
        if (lessonData.content_id) {
          // Update educational content with timeout handling
          try {
            const { error } = await supabase
              .from('educational_content')
              .update({ text_content: updates.content_text })
              .eq('id', lessonData.content_id);
            
            if (error) {
              log.error('Hook', '🎓 [useLessonManagement] Error updating educational content:', error);
              throw error;
            }
          } catch (error: any) {
            log.error('Hook', '🎓 [useLessonManagement] Error updating educational content:', error);
            if (error.message?.includes('timeout') || error.message?.includes('504') || error.message?.includes('upstream request timeout')) {
              throw new Error('Database update timed out. The server is taking too long to respond. Please try again in a moment.');
            }
            throw error;
          }
        } else {
          // Update legacy content_text field
          const { error } = await supabase
            .from('course_lessons')
            .update({ content_text: updates.content_text })
            .eq('id', lessonId);
          if (error) {
            log.error('Hook', '🎓 [useLessonManagement] Error updating legacy content:', error);
            throw error;
          }
        }
      }

      // Update content_url if provided
      if (updates.content_url !== undefined) {
        const { error } = await supabase
          .from('course_lessons')
          .update({ content_url: updates.content_url })
          .eq('id', lessonId);
        
        if (error) {
          log.error('Hook', '🎓 [useLessonManagement] Error updating content_url:', error);
          throw error;
        }
      }

      // Update publish status if provided
      if (updates.is_published !== undefined) {
        const { error } = await supabase
          .from('course_lessons')
          .update({ is_published: updates.is_published })
          .eq('id', lessonId);
        if (error) {
          log.error('Hook', '🎓 [useLessonManagement] Error updating publish status:', error);
          throw error;
        }
      }

      // For video operations, we need to refresh data to ensure database state is reflected
      // Video operations are critical and need immediate consistency
      if (updates.content_url !== undefined) {
        try {
          onInvalidateCache?.();
          await onRefetch?.();
          
          // Clear optimistic updates after successful refetch for video operations
          if (clearOptimisticUpdate) {
            clearOptimisticUpdate(lessonId);
          }
        } catch (refetchError) {
          log.warn('Hook', '🎓 [useLessonManagement] Refetch failed after video operation, but database update succeeded:', refetchError);
          // Keep optimistic updates if refetch fails - they ensure UI shows correct state
        }
      }
      
      // Note: Removed unnecessary refetch - optimistic updates already handle UI consistency
      // This was causing timeout errors (57014) on the course_modules query after successful lesson updates
      
      // Notify parent of successful update
      onLessonUpdated?.(lessonId, updates);
      
    } catch (error: any) {
      log.error('Hook', '🎓 [useLessonManagement] Error updating lesson:', error);
      
      // Clear optimistic update on error to revert UI
      if (clearOptimisticUpdate) {
        clearOptimisticUpdate(lessonId);
      }
      
      // Provide specific error feedback to the user
      let errorMessage = 'Failed to save your changes. Please try again.';
      
      if (error?.message) {
        if (error.message.includes('educational_content')) {
          errorMessage = 'Failed to update lesson content. Please check your permissions and try again.';
        } else if (error.message.includes('course_lessons')) {
          errorMessage = 'Failed to update lesson information. Please check your permissions and try again.';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'You do not have permission to edit this lesson.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw error;
    }
  }, [onInvalidateCache, onRefetch, onLessonUpdated, applyOptimisticUpdate, clearOptimisticUpdate]);
  
  return {
    // Lesson creation state
    isCreatingPage,
    creatingModuleId,
    newPageTitle,
    newPageContent,
    isSaving,
    
    // Lesson creation handlers
    handleCreateNewPage,
    handleCancelCreate,
    handleSaveNewPage,
    
    // Lesson update handlers
    handleUpdateLesson,
    
    // State setters for form management
    setNewPageTitle,
    setNewPageContent,
  };
}; 