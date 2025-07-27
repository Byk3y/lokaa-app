import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { log } from '@/utils/logger';
import type { CourseDetailData, CourseLesson } from '@/types/classroom/courseDetail';

interface LessonUpdates {
  title?: string;
  content_text?: string;
  is_published?: boolean;
}

interface UseLessonManagementReturn {
  // Lesson creation state
  isCreatingPage: boolean;
  creatingModuleId: string | null;
  newPageTitle: string;
  newPageContent: string;
  isSaving: boolean;
  isMigrating: boolean;
  
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
  onRefetch?: () => Promise<void>;
  onInvalidateCache?: () => void;
  onSelectedLessonChange?: (lesson: CourseLesson | null) => void;
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
    onSelectedLessonChange
  } = props;
  
  // Lesson creation state
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [creatingModuleId, setCreatingModuleId] = useState<string | null>(null);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageContent, setNewPageContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  
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
      log.warn('Hook', '🎓 [useLessonManagement] Missing courseId or userId for page creation');
      return;
    }

    // Ensure user is authenticated
    const supabase = getSupabaseClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      log.error('Hook', '🎓 [useLessonManagement] Authentication error:', sessionError);
      toast({
        title: "Authentication Error",
        description: "Please log in again to save your page",
        variant: "destructive"
      });
      return;
    }

    log.debug('Hook', '🎓 [useLessonManagement] Starting page creation process');
    setIsSaving(true);
    
    try {
      // Use title from the title input field, with simple fallback
      let finalTitle = extractedTitle?.trim() || newPageTitle.trim() || 'Untitled Page';

      log.debug('Hook', '🎓 [useLessonManagement] Creating educational content with title:', finalTitle);

      // Create educational content
      const { data: contentData, error: contentError } = await supabase
        .from('educational_content')
        .insert({
          title: finalTitle,
          content_type: 'rich_text',
          text_content: newPageContent,
          estimated_duration: Math.max(1, Math.ceil(newPageContent.length / 1000)), // Rough estimate: 1 min per 1000 chars
          difficulty_level: 'beginner'
        })
        .select()
        .single();

      if (contentError) {
        log.error('Hook', '🎓 [useLessonManagement] Error creating educational content:', contentError);
        toast({
          title: "Error",
          description: `Failed to create content: ${contentError.message}`,
          variant: "destructive"
        });
        return;
      }

      log.debug('Hook', '🎓 [useLessonManagement] Educational content created successfully');

      // If no module is specified, create a default "Pages" module
      let targetModuleId = creatingModuleId;
      if (!targetModuleId) {
        log.debug('Hook', '🎓 [useLessonManagement] No module specified, checking for existing Pages module');
        
        // Check if a "Pages" module already exists
        const { data: existingModules, error: existingModuleError } = await supabase
          .from('course_modules')
          .select('id')
          .eq('course_id', course?.id)
          .eq('title', 'Pages');
        
        if (existingModuleError) {
          log.warn('Hook', '🎓 [useLessonManagement] Error checking for existing module:', existingModuleError);
        }

        const existingModule = existingModules?.[0];

        if (existingModule) {
          targetModuleId = existingModule.id;
          log.debug('Hook', '🎓 [useLessonManagement] Using existing Pages module:', targetModuleId);
        } else {
          log.debug('Hook', '🎓 [useLessonManagement] Creating new Pages module');
          
          // Create a new "Pages" module
          const { data: newModule, error: moduleError } = await supabase
            .from('course_modules')
            .insert({
              title: 'Pages',
              description: 'Standalone pages for this course',
              course_id: course?.id,
              module_order: 999, // Put it at the end
              module_type: 'folder'
            })
            .select()
            .single();

          if (moduleError) {
            log.error('Hook', '🎓 [useLessonManagement] Error creating module:', moduleError);
            toast({
              title: "Error",
              description: `Failed to create module: ${moduleError.message}`,
              variant: "destructive"
            });
            return;
          }

          targetModuleId = newModule.id;
          log.debug('Hook', '🎓 [useLessonManagement] New Pages module created:', targetModuleId);
        }
      }

      // Get the next lesson order
      const { data: maxOrderData, error: orderError } = await supabase
        .from('course_lessons')
        .select('lesson_order')
        .eq('module_id', targetModuleId)
        .order('lesson_order', { ascending: false })
        .limit(1);

      if (orderError) {
        log.warn('Hook', '🎓 [useLessonManagement] Error getting lesson order:', orderError);
      }

      const nextOrder = (maxOrderData?.[0]?.lesson_order || 0) + 1;

      log.debug('Hook', '🎓 [useLessonManagement] Creating lesson with order:', nextOrder);

      // Create the lesson record linked to educational content
      const { data: lessonData, error: lessonError } = await supabase
        .from('course_lessons')
        .insert({
          title: finalTitle,
          content_type: 'rich_text',
          content_text: newPageContent, // Keep for backward compatibility
          module_id: targetModuleId,
          lesson_order: nextOrder,
          content_id: contentData.id, // Link to educational content
          page_type: 'page',
          is_published: true,
          estimated_duration: contentData.estimated_duration,
          difficulty_level: contentData.difficulty_level
        })
        .select()
        .single();

      if (lessonError) {
        log.error('Hook', '🎓 [useLessonManagement] Error creating lesson:', lessonError);
        toast({
          title: "Error",
          description: `Failed to create lesson: ${lessonError.message}`,
          variant: "destructive"
        });
        return;
      }

      log.debug('Hook', '🎓 [useLessonManagement] Lesson created successfully:', lessonData);

      // Reset form
      setNewPageTitle('');
      setNewPageContent('');
      setIsCreatingPage(false);

      log.debug('Hook', '🎓 [useLessonManagement] Refreshing course data...');

      // Invalidate cache since new lesson was created
      onInvalidateCache?.();
      
      // Refresh course data
      await onRefetch?.();
      
      log.debug('Hook', '🎓 [useLessonManagement] Course data refreshed, looking for new lesson...');
      
      // Use the current course from props
      const updatedCourse = course;
      
      // If course is not available, try a simple fallback
      if (!updatedCourse) {
        log.debug('Hook', '🎓 [useLessonManagement] Course not available, trying fallback...');
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('course_lessons')
            .select('*')
            .eq('content_id', contentData.id)
            .single();
          
          if (fallbackData && !fallbackError) {
            log.debug('Hook', '🎓 [useLessonManagement] Found lesson via fallback:', fallbackData);
            onSelectedLessonChange?.(fallbackData);
            onLessonCreated?.(fallbackData);
          }
        } catch (fallbackErr) {
          log.debug('Hook', '🎓 [useLessonManagement] Fallback also failed:', fallbackErr);
        }
      } else {
        // Find and select the newly created lesson
        log.debug('Hook', '🎓 [useLessonManagement] Updated course has modules:', updatedCourse.modules.length);
        const allLessons = updatedCourse.modules.flatMap(module => module.lessons);
        log.debug('Hook', '🎓 [useLessonManagement] Total lessons found:', allLessons.length);
        
        const newLesson = allLessons.find(lesson => lesson.content_id === contentData.id);
        
        if (newLesson) {
          onSelectedLessonChange?.(newLesson);
          onLessonCreated?.(newLesson);
          log.debug('Hook', '🎓 [useLessonManagement] Selected newly created lesson:', newLesson);
        } else {
          log.debug('Hook', '🎓 [useLessonManagement] Could not find lesson with content_id:', contentData.id);
        }
      }

      toast({
        title: "Success",
        description: `"${finalTitle}" has been created successfully!`,
        variant: "default"
      });
    } catch (error) {
      log.error('Hook', '🎓 [useLessonManagement] Error creating page:', error);
      toast({
        title: "Error",
        description: "Failed to create page",
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
    course,
    onLessonCreated,
    onRefetch,
    onInvalidateCache,
    onSelectedLessonChange
  ]);
  
  const handleUpdateLesson = useCallback(async (lessonId: string, updates: LessonUpdates) => {
    log.debug('Hook', '🎓 [useLessonManagement] Updating lesson:', lessonId, updates);
    
    try {
      const supabase = getSupabaseClient();
      
      // First, get the lesson to find its content_id
      const { data: lessonData, error: lessonError } = await supabase
        .from('course_lessons')
        .select('content_id, title')
        .eq('id', lessonId)
        .single();

      if (lessonError) {
        throw lessonError;
      }

      // Update the lesson title if provided
      if (updates.title) {
        const { error: titleError } = await supabase
          .from('course_lessons')
          .update({ title: updates.title })
          .eq('id', lessonId);

        if (titleError) {
          throw titleError;
        }
      }

      // Update the educational content if content_text is provided and lesson has content_id
      if (updates.content_text && lessonData.content_id) {
        const { error: contentError } = await supabase
          .from('educational_content')
          .update({ text_content: updates.content_text })
          .eq('id', lessonData.content_id);

        if (contentError) {
          throw contentError;
        }
      } else if (updates.content_text && !lessonData.content_id) {
        // If no content_id exists, update the legacy content_text field
        const { error: legacyError } = await supabase
          .from('course_lessons')
          .update({ content_text: updates.content_text })
          .eq('id', lessonId);

        if (legacyError) {
          throw legacyError;
        }
      }

      // Update the is_published field if provided
      if (updates.is_published !== undefined) {
        const { error: publishedError } = await supabase
          .from('course_lessons')
          .update({ is_published: updates.is_published })
          .eq('id', lessonId);

        if (publishedError) {
          throw publishedError;
        }
      }

      // Invalidate cache since lesson data changed
      onInvalidateCache?.();
      
      // Refetch course data to update the UI
      await onRefetch?.();
      
      // Update the selectedLesson with the updated data
      if (course) {
        const updatedLesson = course.modules
          .flatMap(module => module.lessons)
          .find(lesson => lesson.id === lessonId);
        
        if (updatedLesson) {
          onSelectedLessonChange?.(updatedLesson);
          onLessonUpdated?.(lessonId, updates);
          log.debug('Hook', '🎓 [useLessonManagement] Updated selectedLesson with new data:', updatedLesson);
        }
      }
      
      log.debug('Hook', '🎓 [useLessonManagement] Lesson updated successfully');
    } catch (error) {
      log.error('Hook', '🎓 [useLessonManagement] Error updating lesson:', error);
      throw error;
    }
  }, [course, onInvalidateCache, onRefetch, onSelectedLessonChange, onLessonUpdated]);
  
  return {
    // Lesson creation state
    isCreatingPage,
    creatingModuleId,
    newPageTitle,
    newPageContent,
    isSaving,
    isMigrating,
    
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