import { log } from '@/utils/logger';
import { getLessonUrl } from '@/utils/slugUtils';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, X } from 'lucide-react';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { toast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import CourseSidebar from './CourseSidebar';
import LessonContent from './LessonContent';
import MobileCourseOverview from './MobileCourseOverview';
import MobileLessonView from './MobileLessonView';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSpace } from '@/contexts/SpaceContext';
import { EducationalContentService } from '@/services/EducationalContentService';
import { useClassroomStore, useClassroomCourses } from '@/stores/classroom/classroomStore';
import type { CourseDisplayData } from '@/hooks/useClassroomCache';
import { ClassroomDialogManager } from './ClassroomDialogManager';
import { DeleteCourseDialog } from './dialogs/DeleteCourseDialog';
import DeletePageDialog from './dialogs/DeletePageDialog';
import RevertToDraftDialog from './dialogs/RevertToDraftDialog';
import ChangeFolderDialog from './dialogs/ChangeFolderDialog';
import { useCourseDetail } from '@/hooks/classroom';
import type { 
  CourseModule, 
  CourseLesson, 
  CourseDetailData, 
  CourseDetailViewProps 
} from '@/types/classroom';

const CourseDetailView: React.FC<CourseDetailViewProps> = ({
  courseId,
  onBack,
  moduleId,
  lessonId,
}) => {
  const navigate = useNavigate();
  const { subdomain } = useParams<{ subdomain: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Mobile detection and view state
  const isMobile = useMediaQuery("(max-width: 768px)");
  const mdParam = searchParams.get('md');
  
  // Mobile view states
  const showCourseOverview = isMobile && (!mdParam || mdParam === 'menu');
  const showLessonView = isMobile && mdParam && mdParam !== 'menu';
  
  const { user } = useAuth();
  const { space } = useSpace();
  const supabase = getSupabaseClient();
  
  // Get classroom store for dialog management
  const openCourseDialog = useClassroomStore(state => state.openCourseDialog);
  const closeCourseDialog = useClassroomStore(state => state.closeCourseDialog);
  const openFolderDialog = useClassroomStore(state => state.openFolderDialog);
  
  // Listen to store changes to update local course state
  const storeCourses = useClassroomCourses();
  
  // Use the new course detail hook
  const {
    course,
    loading,
    error,
    fetchCourseDetails,
    refetch,
    invalidateCache,
    retryCount,
    isOffline
  } = useCourseDetail({
    enableMobileOptimizations: true,
    enableOfflineSupport: true,
    retryOnError: true
  });
  const [selectedLesson, setSelectedLesson] = useState<CourseLesson | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [ownershipLoading, setOwnershipLoading] = useState<boolean>(true);

  // Inline creation states (Skool-style)
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [creatingModuleId, setCreatingModuleId] = useState<string | null>(null);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageContent, setNewPageContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<{ id: string; title: string } | null>(null);
  const [pageToRevert, setPageToRevert] = useState<{ id: string; title: string; isPublished: boolean } | null>(null);
  const [pageToChangeFolder, setPageToChangeFolder] = useState<{ id: string; title: string; currentFolderId: string | null } | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  const [isChangingFolder, setIsChangingFolder] = useState(false);

  log.debug('Component', '🎓 [CourseDetailView] Component rendered with courseId:', courseId);



  // Fetch course data when courseId changes
  useEffect(() => {
    if (courseId) {
      fetchCourseDetails(courseId, moduleId);
    }
  }, [courseId, moduleId, fetchCourseDetails]); // Refetch when courseId or moduleId changes

  // Handle lesson selection separately to avoid refetching course data
  useEffect(() => {
    if (lessonId && course) {
      // Find and select the lesson by ID without refetching course data
      const targetLesson = course.modules
        .flatMap(m => m.lessons)
        .find(lesson => lesson.id === lessonId);
      
      if (targetLesson) {
        log.debug('Component', '🎓 [CourseDetailView] Found target lesson by ID:', targetLesson);
        setSelectedLesson(targetLesson);
      } else {
        log.warn('Component', '🎓 [CourseDetailView] Lesson not found with ID:', lessonId);
      }
    }
  }, [lessonId, course]);

  // Listen to store changes and update local course state
  useEffect(() => {
    if (course && storeCourses && storeCourses.length > 0) {
      const updatedCourse = storeCourses.find(c => c.id === course.id);
      if (updatedCourse && (updatedCourse.title !== course.title || updatedCourse.description !== course.description)) {
        log.debug('Component', '🎓 [CourseDetailView] Updating local course state from store:', updatedCourse);
        // Note: Course state is now managed by the hook, so we don't need to update it here
      }
    }
  }, [storeCourses, course]);

  // Check ownership
  useEffect(() => {
    const checkOwnership = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user || !course) {
          setIsOwner(false);
          return;
        }

        // Check if user is the course creator
        const isCourseCreator = user.id === course.creator_id;
        
        // Check if user is a general admin
        const { data: userProfile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        const isGeneralAdmin = userProfile?.role === 'admin';
        
        // Check if user is a space admin (for the space this course belongs to)
        // Use the space_id from the course data directly
        let isSpaceAdmin = false;
        if (course.space_id) {
          const { data: spaceMembership, error: membershipError } = await supabase
            .from('space_members')
            .select('role, status')
            .eq('space_id', course.space_id)
            .eq('user_id', user.id)
            .single();
          
          if (membershipError && membershipError.code !== 'PGRST116') {
            log.error('Component', 'Error checking space membership:', membershipError);
          }
          
          isSpaceAdmin = spaceMembership?.role === 'admin' && spaceMembership?.status === 'active';
          
          // Space membership debug info removed for production
        }

        // Check if user is the space owner
        const isSpaceOwner = space?.owner_id === user.id;
        
        // User can edit if they're the creator OR a general admin OR a space admin OR the space owner
        const canEdit = isCourseCreator || isGeneralAdmin || isSpaceAdmin || isSpaceOwner;

        log.debug('Component', '�� [CourseDetailView] Ownership check:', {
          hasUser: !!user,
          hasCourse: !!course,
          userId: user.id,
          courseCreatorId: course.creator_id,
          isCourseCreator,
          userRole: userProfile?.role,
          isGeneralAdmin,
          spaceId: course.space_id,
          spaceOwnerId: space?.owner_id,
          isSpaceAdmin,
          isSpaceOwner,
          canEdit,
          courseTitle: course.title
        });

        // Ownership debug info removed for production

        // Set ownership based on creator OR admin status
        setIsOwner(canEdit);
      } catch (error) {
        log.error('Component', 'Error checking ownership:', error);
        setIsOwner(false);
      } finally {
        setOwnershipLoading(false);
      }
    };

    if (course) {
      checkOwnership();
    }
  }, [course]);

  // Auto-select first lesson if none selected (Desktop only)
  useEffect(() => {
    // Skip auto-selection on mobile - let mobile views handle their own logic
    if (isMobile) return;

    if (!selectedLesson && course && course.modules && course.modules.length > 0) {
      // Check for last viewed lesson in localStorage
      const lastViewedLessonId = localStorage.getItem(`lastViewedLesson_${course.id}`);
      
      if (lastViewedLessonId) {
        // Try to find the last viewed lesson
        const lastViewedLesson = course.modules
          .flatMap(module => module.lessons)
          .find(lesson => lesson.id === lastViewedLessonId);
        
        if (lastViewedLesson) {
          log.debug('Component', '🎓 [CourseDetailView] Found last viewed lesson:', lastViewedLesson.title);
          setSelectedLesson(lastViewedLesson);
          
          // Update URL to reflect the last viewed lesson
          if (subdomain && course.slug) {
            const lessonUrl = `/${subdomain}/course/${course.slug}?md=${lastViewedLesson.id}`;
            navigate(lessonUrl, { replace: true });
          }
          return;
        }
      }
      
      // Fallback to first lesson if no last viewed lesson found
      const firstModule = course.modules[0];
      if (firstModule.lessons && firstModule.lessons.length > 0) {
        const firstLesson = firstModule.lessons[0];
        setSelectedLesson(firstLesson);
        
        // Update URL to reflect the selected lesson
        if (subdomain && course.slug) {
          const lessonUrl = `/${subdomain}/course/${course.slug}?md=${firstLesson.id}`;
          navigate(lessonUrl, { replace: true });
        }
      }
    }
  }, [course, selectedLesson, navigate, subdomain, isMobile]);

  // Mobile entry point handling - redirect to menu view if no md parameter
  useEffect(() => {
    if (isMobile && course && subdomain && course.slug && !mdParam) {
      const menuUrl = `/${subdomain}/course/${course.slug}?md=menu`;
      navigate(menuUrl, { replace: true });
    }
  }, [isMobile, course, subdomain, mdParam, navigate]);

  // Save last viewed lesson to localStorage when lesson changes
  useEffect(() => {
    if (selectedLesson && course?.id) {
      localStorage.setItem(`lastViewedLesson_${course.id}`, selectedLesson.id);
      log.debug('Component', '🎓 [CourseDetailView] Saved last viewed lesson:', selectedLesson.title);
    }
  }, [selectedLesson, course?.id]);

  // Update URL when selectedLesson changes (for manual lesson selection)
  useEffect(() => {
    if (selectedLesson && subdomain && course?.slug) {
      const lessonUrl = `/${subdomain}/course/${course.slug}?md=${selectedLesson.id}`;
      const currentUrl = window.location.pathname + window.location.search;
      
      // Only update if URL is different to avoid unnecessary navigation
      if (currentUrl !== lessonUrl) {
        navigate(lessonUrl, { replace: true });
      }
    }
  }, [selectedLesson, subdomain, course?.slug, navigate]);

  // Skool-style inline page creation handlers
  const handleCreateNewPage = (moduleId?: string) => {
    setIsCreatingPage(true);
    setCreatingModuleId(moduleId || null);
    setNewPageTitle('');
    setNewPageContent('');
  };

  const handleCancelCreate = () => {
    setIsCreatingPage(false);
    setCreatingModuleId(null);
    setNewPageTitle('');
    setNewPageContent('');
  };

  const handleSaveNewPage = async (extractedTitle?: string) => {
    if (!courseId || !user?.id) {
      // Missing courseId or user error removed for production
      return;
    }

    // Ensure user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      // Authentication error removed for production
      toast({
        title: "Authentication Error",
        description: "Please log in again to save your page",
        variant: "destructive"
      });
      return;
    }

    // User authenticated for save - debug removed for production

    setIsSaving(true);
    try {
      // ✅ Use title from the title input field, with simple fallback
      let finalTitle = extractedTitle?.trim() || newPageTitle.trim() || 'Untitled Page';

      // Creating educational content - debug removed for production

      // ✅ NEW: Create educational content instead of post
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
        console.error('❌ Error creating educational content:', contentError);
        // Content error details removed for production
        toast({
          title: "Error",
          description: `Failed to create content: ${contentError.message}`,
          variant: "destructive"
        });
        return;
      }

      // Educational content created successfully - debug removed for production

      // If no module is specified, create a default "Pages" module
      let targetModuleId = creatingModuleId;
      // Target module ID - debug removed for production
      if (!targetModuleId) {
        // Checking for existing "Pages" module - debug removed for production
        // Check if a "Pages" module already exists
        const { data: existingModules, error: existingModuleError } = await supabase
          .from('course_modules')
          .select('id')
          .eq('course_id', course.id)
          .eq('title', 'Pages');
        
        if (existingModuleError) {
          // Error checking for existing module - debug removed for production
        }

        const existingModule = existingModules?.[0];

        if (existingModule) {
          targetModuleId = existingModule.id;
        } else {
          // Create a new "Pages" module
          const { data: newModule, error: moduleError } = await supabase
            .from('course_modules')
            .insert({
              title: 'Pages',
              description: 'Standalone pages for this course',
              course_id: course.id,
              module_order: 999, // Put it at the end
              module_type: 'folder'
            })
            .select()
            .single();

          if (moduleError) {
            console.error('❌ Error creating module:', moduleError);
            // Module error details removed for production
            toast({
              title: "Error",
              description: `Failed to create module: ${moduleError.message}`,
              variant: "destructive"
            });
            return;
          }

          targetModuleId = newModule.id;
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
        // Error getting lesson order - debug removed for production
      }

      const nextOrder = (maxOrderData?.[0]?.lesson_order || 0) + 1;

      // ✅ NEW: Create the lesson record linked to educational content (NOT post)
      const { data: lessonData, error: lessonError } = await supabase
          .from('course_lessons')
          .insert({
          title: finalTitle,
          content_type: 'rich_text',
          content_text: newPageContent, // Keep for backward compatibility
          module_id: targetModuleId,
            lesson_order: nextOrder,
          content_id: contentData.id, // ✅ Link to educational content instead of post
          page_type: 'page',
          is_published: true,
          estimated_duration: contentData.estimated_duration,
          difficulty_level: contentData.difficulty_level
        })
        .select()
        .single();

      if (lessonError) {
        console.error('❌ Error creating lesson:', lessonError);
        // Lesson error details removed for production
        // Full lesson error object removed for production
        toast({
          title: "Error",
          description: `Failed to create lesson: ${lessonError.message}`,
          variant: "destructive"
        });
        return;
      }

      // Lesson created successfully - debug removed for production

      // Reset form
      setNewPageTitle('');
      setNewPageContent('');
      setIsCreatingPage(false);

      log.debug('Component', '🎓 [CourseDetailView] About to refresh course data...');

      // Invalidate cache since new lesson was created
      invalidateCache();
      
      // Refresh course data
      await refetch();
      
      log.debug('Component', '🎓 [CourseDetailView] Course data refreshed, looking for new lesson...');
      
      // Use the current course from the hook
      const updatedCourse = course;
      
      // If course is not available, try a simple fallback
      if (!updatedCourse) {
        log.debug('Component', '🎓 [CourseDetailView] fetchCourseDetails failed, trying fallback...');
        try {
          const supabase = getSupabaseClient();
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('course_lessons')
            .select('*')
            .eq('content_id', contentData.id)
            .single();
          
          if (fallbackData && !fallbackError) {
            log.debug('Component', '🎓 [CourseDetailView] Found lesson via fallback:', fallbackData);
            setSelectedLesson(fallbackData);
          }
        } catch (fallbackErr) {
          log.debug('Component', '🎓 [CourseDetailView] Fallback also failed:', fallbackErr);
        }
      } else {
        // Find and select the newly created lesson
        log.debug('Component', '🎓 [CourseDetailView] Updated course has modules:', updatedCourse.modules.length);
        const allLessons = updatedCourse.modules.flatMap(module => module.lessons);
        log.debug('Component', '🎓 [CourseDetailView] Total lessons found:', allLessons.length);
        
        const newLesson = allLessons.find(lesson => lesson.content_id === contentData.id);
        
        if (newLesson) {
          setSelectedLesson(newLesson);
          log.debug('Component', '🎓 [CourseDetailView] Selected newly created lesson:', newLesson);
        } else {
          log.debug('Component', '🎓 [CourseDetailView] Could not find lesson with content_id:', contentData.id);
        }
      }

      toast({
        title: "Success",
        description: `"${finalTitle}" has been created successfully!`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error creating page:', error);
      toast({
        title: "Error",
        description: "Failed to create page",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateLesson = async (lessonId: string, updates: { title?: string; content_text?: string; is_published?: boolean }) => {
    try {
      const supabase = getSupabaseClient();
      
      log.debug('Component', '🎓 [CourseDetailView] Updating lesson:', lessonId, updates);
      
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
      invalidateCourseCache();
      
      // Refetch course data to update the UI
      const updatedCourse = await fetchCourseDetails();
      
      // Update the selectedLesson with the updated data
      if (updatedCourse) {
        const updatedLesson = updatedCourse.modules
          .flatMap(module => module.lessons)
          .find(lesson => lesson.id === lessonId);
        
        if (updatedLesson) {
          setSelectedLesson(updatedLesson);
          log.debug('Component', '🎓 [CourseDetailView] Updated selectedLesson with new data:', updatedLesson);
        }
      }
      
      log.debug('Component', '🎓 [CourseDetailView] Lesson updated successfully');
    } catch (error) {
      log.error('Component', 'Error updating lesson:', error);
      throw error;
    }
  };

  // Mobile navigation handlers
  const handleBackToMenu = () => {
    if (subdomain && course?.slug) {
      const menuUrl = `/${subdomain}/course/${course.slug}?md=menu`;
      navigate(menuUrl, { replace: true });
    }
  };

  const handleMobileLessonSelect = (lesson: CourseLesson) => {
    if (subdomain && course?.slug) {
      const lessonUrl = `/${subdomain}/course/${course.slug}?md=${lesson.id}`;
      navigate(lessonUrl, { replace: true });
    }
    // Also update local state for immediate UI feedback
    setSelectedLesson(lesson);
  };

  const handleNextLesson = () => {
    if (!selectedLesson || !course) return;
    
    // Find next lesson in sequence
    const allLessons = course.modules.flatMap(m => m.lessons);
    const currentIndex = allLessons.findIndex(l => l.id === selectedLesson.id);
    const nextLesson = allLessons[currentIndex + 1];
    
    if (nextLesson) {
      handleMobileLessonSelect(nextLesson);
    }
  };

  const handleMarkAsDone = async () => {
    if (!selectedLesson || !user?.id) {
      toast({
        title: "Error",
        description: "No lesson selected or user not authenticated.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if lesson is already completed
      const { data: existingCompletion, error: checkError } = await supabase
        .from('lesson_completions')
        .select('*')
        .eq('user_id', user.id)
        .eq('lesson_id', selectedLesson.id)
        .eq('course_id', course.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw checkError;
      }

      if (existingCompletion) {
        // Lesson is already completed, toggle to incomplete
        const { error: deleteError } = await supabase
          .from('lesson_completions')
          .delete()
          .eq('user_id', user.id)
          .eq('lesson_id', selectedLesson.id)
          .eq('course_id', course.id);

        if (deleteError) throw deleteError;

        toast({
          title: "Lesson Unmarked",
          description: "Lesson marked as incomplete.",
          variant: "default"
        });
      } else {
        // Mark lesson as completed
        const { error: insertError } = await supabase
          .from('lesson_completions')
          .insert({
            user_id: user.id,
            lesson_id: selectedLesson.id,
            course_id: course.id,
            module_id: selectedLesson.module_id || course.modules[0]?.id,
            completed_at: new Date().toISOString()
          });

        if (insertError) throw insertError;

        toast({
          title: "Lesson Completed!",
          description: "Great job! This lesson has been marked as complete.",
          variant: "default"
        });
      }

      // Optimistically update the local state instead of full refresh
      if (course) {
        const updatedCourse = { ...course };
        
        if (existingCompletion) {
          // Remove completion
          updatedCourse.modules = updatedCourse.modules.map(module => ({
            ...module,
            lessons: module.lessons.map(lesson => ({
              ...lesson,
              completed: lesson.id === selectedLesson.id ? false : lesson.completed
            }))
          }));
          log.debug('Component', '🎓 [CourseDetailView] Removed completion for lesson:', selectedLesson.title);
        } else {
          // Add completion
          updatedCourse.modules = updatedCourse.modules.map(module => ({
            ...module,
            lessons: module.lessons.map(lesson => ({
              ...lesson,
              completed: lesson.id === selectedLesson.id ? true : lesson.completed
            }))
          }));
          log.debug('Component', '🎓 [CourseDetailView] Added completion for lesson:', selectedLesson.title);
        }
        
        // Recalculate progress
        const allLessons = updatedCourse.modules.flatMap(module => module.lessons);
        const completedCount = allLessons.filter(lesson => lesson.completed).length;
        const totalLessons = allLessons.length;
        updatedCourse.progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
        
        log.debug('Component', '🎓 [CourseDetailView] Updated progress:', {
          completedCount,
          totalLessons,
          progressPercentage: updatedCourse.progress
        });
        
        // Update cache with new progress data
        const completedLessonIds = new Set(
          updatedCourse.modules
            .flatMap(module => module.lessons)
            .filter(lesson => lesson.completed)
            .map(lesson => lesson.id as string)
        );
        setCachedProgress(completedLessonIds, updatedCourse.progress);
        
        setCourse(updatedCourse);
      }
      
    } catch (error) {
      console.error('Error marking lesson as done:', error);
      toast({
        title: "Error",
        description: "Failed to update lesson completion status.",
        variant: "destructive"
      });
    }
  };

  // Course management handlers
  const handleEditCourse = () => {
    log.debug('Component', '📝 [CourseDetailView] Edit course clicked');
    
    if (!course) {
      toast({
        title: "Error",
        description: "Course data not available for editing.",
        variant: "destructive"
      });
      return;
    }

    // Convert CourseDetailData to CourseDisplayData format
    const courseDisplayData: CourseDisplayData = {
      id: course.id,
      title: course.title,
      description: course.description || '',
      creator_id: course.creator_id,
      space_id: course.space_id,
      access_type: 'open', // Default to open, will be fetched from database
      price: null,
      currency: 'USD',
      is_published: true, // Default to published, will be fetched from database
      image_url: null,
      slug: courseId, // Use the current courseId as slug
      students: 0,
      enrolled: false,
      progress: 0,
      weeks: 0
    };

    // Open the edit course dialog using the store
    openCourseDialog('edit', courseDisplayData);
  };



  const handleAddFolder = () => {
    log.debug('Component', '📁 [CourseDetailView] Add folder clicked');
    openFolderDialog('create');
  };

  const handleDeleteCourse = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!course?.id) return;

    setIsDeleting(true);
    try {
      const supabase = getSupabaseClient();

      // Delete course lessons
      const { error: lessonsError } = await supabase
        .from('course_lessons')
        .delete()
        .in('module_id', course.modules.map(m => m.id));

      if (lessonsError) throw lessonsError;

      // Delete course modules
      const { error: modulesError } = await supabase
        .from('course_modules')
        .delete()
        .eq('course_id', course.id);

      if (modulesError) throw modulesError;

      // Delete the course itself
      const { error: courseError } = await supabase
        .from('courses')
        .delete()
        .eq('id', course.id);

      if (courseError) throw courseError;

      // Invalidate course cache since course was deleted
      invalidateCourseCache();
      
      // Update the store
      const store = useClassroomStore.getState();
      store.removeCourse(course.id);
      store.invalidateCache(); // This will trigger a refresh of the courses list

      // Show success message and redirect
      toast({
        title: "Course Deleted",
        description: "The course has been permanently deleted.",
        variant: "default"
      });

      // Close dialog and redirect
      setIsDeleteDialogOpen(false);
      onBack();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: "Error",
        description: "Failed to delete course. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Course</h3>
        <p className="text-gray-600 mb-4">{error || 'Course not found'}</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Courses
        </Button>
      </div>
    );
  }

  // Mobile course overview view (first screen)
  if (showCourseOverview) {
    return (
      <MobileCourseOverview
        course={course}
        space={space}
        onBack={onBack}
        onLessonSelect={handleMobileLessonSelect}
        isOwner={isOwner}
        onEditCourse={handleEditCourse}
        onAddFolder={handleAddFolder}
        onAddPage={() => handleCreateNewPage()}
        onDeleteCourse={handleDeleteCourse}
        onEditLesson={(lessonId, title) => {
          // TODO: Implement edit lesson for mobile
          console.log('Edit lesson:', lessonId, title);
        }}
        onDeleteLesson={(lessonId, title) => setPageToDelete({ id: lessonId, title })}
        onRevertToDraft={(lessonId, title, isPublished) => setPageToRevert({ id: lessonId, title, isPublished })}
        onChangeFolder={(lessonId, title, currentFolderId) => setPageToChangeFolder({ id: lessonId, title, currentFolderId })}
      />
    );
  }

  // Mobile lesson view (second screen)
  if (showLessonView && selectedLesson) {
    const allLessons = course.modules.flatMap(m => m.lessons);
    const currentIndex = allLessons.findIndex(l => l.id === selectedLesson.id);
    const hasNextLesson = currentIndex < allLessons.length - 1;

    return (
      <MobileLessonView
        lesson={selectedLesson}
        course={course}
        space={space}
        onBackToMenu={handleBackToMenu}
        onNextLesson={handleNextLesson}
        onMarkAsDone={handleMarkAsDone}
        isOwner={isOwner}
        hasNextLesson={hasNextLesson}
        onEditLesson={async (updatedData) => {
          try {
            const updates: { title?: string; content_text?: string; is_published?: boolean } = {};
            
            if (updatedData.title) {
              updates.title = updatedData.title;
            }
            
            if (updatedData.content_text || updatedData.educational_content?.text_content) {
              const newContent = updatedData.educational_content?.text_content || updatedData.content_text;
              updates.content_text = newContent;
            }
            
            if (updatedData.is_published !== undefined) {
              updates.is_published = updatedData.is_published;
            }
            
            await handleUpdateLesson(selectedLesson.id, updates);
            
            // Refresh course data
            invalidateCache();
            await fetchCourseDetails();
          } catch (error) {
            console.error('Error updating lesson:', error);
            throw error;
          }
        }}
      />
    );
  }

  // Regular course view with Skool-style "New page" button (Desktop)
  return (
    <>
      <div className="flex bg-white">
          <CourseSidebar
            course={course}
            selectedLesson={selectedLesson}
            onLessonSelect={setSelectedLesson}
            isOwner={isOwner}
            ownershipLoading={ownershipLoading}
            isCreatingPage={isCreatingPage}
            onAddLesson={(moduleId) => handleCreateNewPage(moduleId)}
            onEditLesson={() => {}} // Handled by LessonContent now
            onAddModule={() => handleCreateNewPage()}
            onEditCourse={handleEditCourse}
            onDeleteCourse={handleDeleteCourse}
            onAddFolder={handleAddFolder}
            spaceId={course.space_id}
            onDeletePage={(pageId, title) => setPageToDelete({ id: pageId, title })}
            onRevertToDraft={(pageId, title, isPublished) => setPageToRevert({ id: pageId, title, isPublished })}
            onChangeFolder={(pageId, title, currentFolderId) => setPageToChangeFolder({ id: pageId, title, currentFolderId })}
            onDuplicatePage={(pageId) => {
              // Handle duplicate page
            }}
          />

        <div className="flex-1">
          {/* Show inline page creation in right panel - Direct to editor without title field */}
          {isCreatingPage ? (
            <div className="flex-1 p-6 pl-12 overflow-hidden bg-gray-50">
              <RichTextEditor
                content={newPageContent}
                onChange={setNewPageContent}
                placeholder="Write your lesson content here...

You can use headings, bold text, links, and other formatting to structure your content."
                className="h-full"
                onSave={(title, content) => {
                  setNewPageTitle(title);
                  setNewPageContent(content);
                  handleSaveNewPage(title);
                }}
                onCancel={handleCancelCreate}
                hideTitle={false}
                isSaving={isSaving}
                spaceId={course?.space_id}
                courseId={course?.id}
                lessonId={undefined}
              />
            </div>
          ) : (
          <LessonContent
            lesson={selectedLesson}
            courseName={course.title}
            isOwner={isOwner}
            completed={selectedLesson?.completed || false}
            onUpdateLesson={handleUpdateLesson}
            onCreateNewPage={() => handleCreateNewPage()}
            onMarkAsDone={handleMarkAsDone}
          />
          )}
        </div>
      </div>
      
      {/* Dialog Manager for Edit Course Dialog */}
      <ClassroomDialogManager 
        space={{
          id: course.space_id,
          owner_id: course.creator_id,
          primary_color: '#26A69A', // Default color
          pricing_type: 'free' // Default to free
        }}
        onDeletePage={async (pageId: string) => {
          try {
            const supabase = getSupabaseClient();
            
            // Get the lesson to find its content_id
            const { data: lesson, error: lessonError } = await supabase
              .from('course_lessons')
              .select('content_id')
              .eq('id', pageId)
              .single();

            if (lessonError) throw lessonError;

            // Delete the educational content if it exists
            if (lesson.content_id) {
              const { error: contentError } = await supabase
                .from('educational_content')
                .delete()
                .eq('id', lesson.content_id);

              if (contentError) throw contentError;
            }

            // Delete the lesson
            const { error: deleteError } = await supabase
              .from('course_lessons')
              .delete()
              .eq('id', pageId);

            if (deleteError) throw deleteError;

            // Refresh course data
            await fetchCourseDetails();

            // If the deleted lesson was selected, clear the selection
            if (selectedLesson?.id === pageId) {
              setSelectedLesson(null);
            }

            // Clear the pageToDelete state
            setPageToDelete(null);

          } catch (error) {
            console.error('Error deleting page:', error);
            throw error;
          }
        }}
        onRevertToDraft={async (pageId: string) => {
          try {
            const supabase = getSupabaseClient();
            const { error } = await supabase
              .from('course_lessons')
              .update({ is_published: false })
              .eq('id', pageId);

            if (error) throw error;
            await fetchCourseDetails();
          } catch (error) {
            console.error('Error reverting page to draft:', error);
            throw error;
          }
        }}
        onDuplicatePage={async (pageId: string) => {
          try {
            const supabase = getSupabaseClient();
            
            // Get the original lesson and its content
            const { data: originalLesson, error: lessonError } = await supabase
              .from('course_lessons')
              .select(`
                *,
                educational_content (*)
              `)
              .eq('id', pageId)
              .single();

            if (lessonError) throw lessonError;

            // Create new educational content if it exists
            let newContentId = null;
            if (originalLesson.educational_content) {
              const { data: newContent, error: contentError } = await supabase
                .from('educational_content')
                .insert({
                  ...originalLesson.educational_content,
                  id: undefined,
                  title: `${originalLesson.educational_content.title} (Copy)`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single();

              if (contentError) throw contentError;
              newContentId = newContent.id;
            }

            // Create the duplicate lesson
            const { error: duplicateError } = await supabase
              .from('course_lessons')
              .insert({
                ...originalLesson,
                id: undefined,
                title: `${originalLesson.title} (Copy)`,
                content_id: newContentId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (duplicateError) throw duplicateError;
            await fetchCourseDetails();
          } catch (error) {
            console.error('Error duplicating page:', error);
            throw error;
          }
        }}
        onChangeFolder={async (pageId: string, folderId: string | null) => {
          try {
            const supabase = getSupabaseClient();
            const { error } = await supabase
              .from('course_lessons')
              .update({ module_id: folderId })
              .eq('id', pageId);

            if (error) throw error;
            await fetchCourseDetails();
          } catch (error) {
            console.error('Error changing folder:', error);
            throw error;
          }
        }}
      />

      {/* Delete Course Dialog */}
      <DeleteCourseDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        courseName={course.title}
        isDeleting={isDeleting}
      />

      {/* Delete Page Dialog */}
      {pageToDelete && (
        <DeletePageDialog
          isOpen={!!pageToDelete}
          onOpenChange={(isOpen) => !isOpen && setPageToDelete(null)}
          onConfirmDelete={async () => {
            if (!pageToDelete) return;
            setIsDeleting(true);
            try {
              const supabase = getSupabaseClient();
              
              // Get the lesson to find its content_id
              const { data: lesson, error: lessonError } = await supabase
                .from('course_lessons')
                .select('content_id')
                .eq('id', pageToDelete.id)
                .single();

              if (lessonError) throw lessonError;

              // Delete the educational content if it exists
              if (lesson.content_id) {
                const { error: contentError } = await supabase
                  .from('educational_content')
                  .delete()
                  .eq('id', lesson.content_id);

                if (contentError) throw contentError;
              }

              // Delete the lesson
              const { error: deleteError } = await supabase
                .from('course_lessons')
                .delete()
                .eq('id', pageToDelete.id);

              if (deleteError) throw deleteError;

              // Refresh course data
              await fetchCourseDetails();

              // If the deleted lesson was selected, clear the selection
              if (selectedLesson?.id === pageToDelete.id) {
                setSelectedLesson(null);
              }

              // Clear the pageToDelete state
              setPageToDelete(null);

              toast({
                title: "Success",
                description: `Page "${pageToDelete.title}" has been deleted.`,
                variant: "default"
              });
            } catch (error) {
              console.error('Error deleting page:', error);
              toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to delete page",
                variant: "destructive"
              });
            } finally {
              setIsDeleting(false);
            }
          }}
          isDeleting={isDeleting}
          pageTitle={pageToDelete.title}
        />
      )}

      {/* Revert to Draft Dialog */}
      {pageToRevert && (
        <RevertToDraftDialog
          isOpen={!!pageToRevert}
          onOpenChange={(isOpen) => !isOpen && setPageToRevert(null)}
          onConfirmRevert={async () => {
            if (!pageToRevert) return;
            setIsReverting(true);
            try {
              const supabase = getSupabaseClient();

              // Toggle the publish status
              const newStatus = !pageToRevert.isPublished;
              const { error: updateError } = await supabase
                .from('course_lessons')
                .update({ is_published: newStatus })
                .eq('id', pageToRevert.id);

              if (updateError) throw updateError;
              
              // Refresh course data
              await fetchCourseDetails();

              // Clear the pageToRevert state
              setPageToRevert(null);

              toast({
                title: "Success",
                description: `"${pageToRevert.title}" has been ${newStatus ? 'published' : 'reverted to draft'}.`,
                variant: "default"
              });
            } catch (error) {
              console.error('Error updating page status:', error);
              toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update page status",
                variant: "destructive"
              });
            } finally {
              setIsReverting(false);
            }
          }}
          isReverting={isReverting}
          pageTitle={pageToRevert.title}
          isPublished={pageToRevert.isPublished}
        />
      )}

      {/* Change Folder Dialog */}
      {pageToChangeFolder && (
        <ChangeFolderDialog
          isOpen={!!pageToChangeFolder}
          onOpenChange={(isOpen) => !isOpen && setPageToChangeFolder(null)}
          onConfirmChange={async (folderId: string | null) => {
            if (!pageToChangeFolder) return;
            setIsChangingFolder(true);
            try {
              const supabase = getSupabaseClient();
              const { error } = await supabase
                .from('course_lessons')
                .update({ module_id: folderId })
                .eq('id', pageToChangeFolder.id);

              if (error) throw error;
              
              // Refresh course data
              await fetchCourseDetails();

              // Clear the pageToChangeFolder state
              setPageToChangeFolder(null);

              toast({
                title: "Success",
                description: `"${pageToChangeFolder.title}" has been moved to ${folderId ? 'the selected folder' : 'root level'}.`,
                variant: "default"
              });
            } catch (error) {
              console.error('Error changing folder:', error);
              toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to change folder",
                variant: "destructive"
              });
            } finally {
              setIsChangingFolder(false);
            }
          }}
          isChanging={isChangingFolder}
          pageTitle={pageToChangeFolder.title}
          courseId={course.id}
          currentFolderId={pageToChangeFolder.currentFolderId}
        />
      )}
    </>
  );
};

export default CourseDetailView; 