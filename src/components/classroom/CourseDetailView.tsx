import { log } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, X } from 'lucide-react';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { toast } from '@/hooks/use-toast';
import CourseSidebar from './CourseSidebar';
import LessonContent from './LessonContent';
import { getSupabaseClient } from '@/integrations/supabase/client';

interface CourseModule {
  id: string;
  title: string;
  description: string | null;
  module_order: number;
  release_delay_days?: number;
  lessons: CourseLesson[];
}

interface CourseLesson {
  id: string;
  title: string;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  lesson_order: number;
  module_id?: string;
}

interface CourseDetailData {
  id: string;
  title: string;
  description: string | null;
  creator_id: string;
  modules: CourseModule[];
}

interface CourseDetailViewProps {
  courseId: string;
  onBack: () => void;
  moduleId?: string; // Optional module ID for direct module navigation
}

const CourseDetailView: React.FC<CourseDetailViewProps> = ({
  courseId,
  onBack,
  moduleId,
}) => {
  const [course, setCourse] = useState<CourseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<CourseLesson | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Inline creation states (Skool-style)
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [creatingModuleId, setCreatingModuleId] = useState<string | null>(null);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageContent, setNewPageContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  log.debug('Component', '🎓 [CourseDetailView] Component rendered with courseId:', courseId);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const supabase = getSupabaseClient();
      
      log.debug('Component', '🎓 [CourseDetailView] Fetching course details for ID/slug:', courseId);
      
      // Fetch course data - try by slug first, then by ID
      let courseQuery = supabase
        .from('courses')
        .select('*');
      
      // Try to determine if courseId is a UUID or a slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);
      
      if (isUUID) {
        // It's a UUID, query by ID
        courseQuery = courseQuery.eq('id', courseId);
      } else {
        // It's likely a slug, query by slug
        courseQuery = courseQuery.eq('slug', courseId);
      }
      
      let { data: courseData, error: courseError } = await courseQuery.single();

      if (courseError) {
        // If slug lookup failed, try ID lookup as fallback
        if (!isUUID) {
          log.debug('Component', '🎓 [CourseDetailView] Slug lookup failed, trying ID lookup');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .single();
          
          if (fallbackError) throw fallbackError;
          courseData = fallbackData;
        } else {
          throw courseError;
        }
      }

      if (!courseData) {
        throw new Error('Course not found');
      }

      log.debug('Component', '🎓 [CourseDetailView] Course data fetched:', courseData);

      // Fetch modules and lessons using the actual course ID from courseData
      const { data: modulesData, error: modulesError } = await supabase
        .from('course_modules')
        .select(`
          *,
          course_lessons (*)
        `)
        .eq('course_id', courseData.id) // Use the actual course ID, not the slug
        .order('module_order');

      if (modulesError) throw modulesError;

      log.debug('Component', '🎓 [CourseDetailView] Modules data fetched:', modulesData);

      // Transform data
      const moduleIds = modulesData?.map(m => m.id) || [];
      log.debug('Component', '🎓 [CourseDetailView] Module IDs:', moduleIds);

      const transformedCourse: CourseDetailData = {
        ...courseData,
        modules: (modulesData || []).map(module => ({
          ...module,
          lessons: (module.course_lessons || []).sort((a, b) => a.lesson_order - b.lesson_order)
        }))
      };

      log.debug('Component', '🎓 [CourseDetailView] Transformed course data:', transformedCourse);
      log.debug('Component', '🎓 [CourseDetailView] Number of modules:', transformedCourse.modules.length);

      setCourse(transformedCourse);
      
      // If moduleId is provided, find and select the first lesson of that module
      if (moduleId && transformedCourse.modules.length > 0) {
        log.debug('Component', '🎓 [CourseDetailView] Looking for module with ID:', moduleId);
        const targetModule = transformedCourse.modules.find(m => m.id === moduleId);
        if (targetModule && targetModule.lessons.length > 0) {
          log.debug('Component', '🎓 [CourseDetailView] Found target module, selecting first lesson:', targetModule.lessons[0]);
          setSelectedLesson(targetModule.lessons[0]);
        }
      }
    } catch (error: any) {
      log.error('Component', 'Error fetching course details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId, moduleId]);

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

        log.debug('Component', '🎓 [CourseDetailView] Ownership check:', {
          hasUser: !!user,
          hasSpace: !!user,
          hasCourse: !!course,
          userId: user.id,
          spaceOwnerId: undefined,
          courseCreatorId: course.creator_id,
          isOwner: user.id === course.creator_id
        });

        setIsOwner(user.id === course.creator_id);
      } catch (error) {
        log.error('Component', 'Error checking ownership:', error);
        setIsOwner(false);
      }
    };

    if (course) {
      checkOwnership();
    }
  }, [course]);

  // Auto-select first lesson if none selected
  useEffect(() => {
    if (!selectedLesson && course && course.modules && course.modules.length > 0) {
      const firstModule = course.modules[0];
      if (firstModule.lessons && firstModule.lessons.length > 0) {
        const firstLesson = firstModule.lessons[0];
        setSelectedLesson(firstLesson);
      }
    }
  }, [course, selectedLesson]);

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

  const handleSaveNewPage = async () => {
    if (!newPageTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for this page.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const supabase = getSupabaseClient();

      if (creatingModuleId) {
        // Creating a lesson
        const { data: lessons } = await supabase
          .from('course_lessons')
          .select('lesson_order')
          .eq('module_id', creatingModuleId)
          .order('lesson_order', { ascending: false })
          .limit(1);

        const nextOrder = lessons && lessons.length > 0 ? lessons[0].lesson_order + 1 : 1;

        const { error: lessonError } = await supabase
          .from('course_lessons')
          .insert({
            module_id: creatingModuleId,
            title: newPageTitle.trim(),
            content_type: 'text',
            content_text: newPageContent,
            lesson_order: nextOrder,
            is_published: true
          });

        if (lessonError) throw lessonError;
      } else {
        // Creating a module
        const { data: modules } = await supabase
          .from('course_modules')
          .select('module_order')
          .eq('course_id', courseId)
          .order('module_order', { ascending: false })
          .limit(1);

        const nextOrder = modules && modules.length > 0 ? modules[0].module_order + 1 : 1;

        const { error: moduleError } = await supabase
          .from('course_modules')
          .insert({
            course_id: courseId,
            title: newPageTitle.trim(),
            description: newPageContent || null,
            module_order: nextOrder
          });

        if (moduleError) throw moduleError;
      }

      // Refresh course data
      await fetchCourseDetails();
      
      // Reset creation state
      setIsCreatingPage(false);
      setCreatingModuleId(null);
      setNewPageTitle('');
      setNewPageContent('');

      toast({
        title: "Page Created",
        description: `"${newPageTitle}" has been created successfully.`,
        variant: "default"
      });
    } catch (error: any) {
      log.error('Component', 'Error creating page:', error);
      toast({
        title: "Error Creating Page",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateLesson = async (lessonId: string, updates: { title?: string; content_text?: string }) => {
    try {
      const supabase = getSupabaseClient();
      
      log.debug('Component', '🎓 [CourseDetailView] Updating lesson:', lessonId, updates);
      
      const { error } = await supabase
        .from('course_lessons')
        .update(updates)
        .eq('id', lessonId);

      if (error) {
        throw error;
      }

      // Refetch course data to update the UI
      await fetchCourseDetails();
      
      log.debug('Component', '🎓 [CourseDetailView] Lesson updated successfully');
    } catch (error) {
      log.error('Component', 'Error updating lesson:', error);
      throw error;
    }
  };

  const handleMarkAsDone = () => {
    log.debug('Component', '✅ [CourseDetailView] Marking lesson as done');
    // TODO: Implement mark as done functionality
    // This could update user progress, show completion status, etc.
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

  // Skool-style inline page creation view
  if (isCreatingPage) {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Creation Header */}
        <div className="border-b border-gray-200 p-6 bg-white">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {creatingModuleId ? 'New Lesson' : 'New Module'}
              </h2>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancelCreate}
                  disabled={isSaving}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSaveNewPage}
                  disabled={isSaving || !newPageTitle.trim()}
                  className="bg-gray-900 hover:bg-gray-800"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-1" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </div>
            
            <div>
              <Input
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                placeholder={creatingModuleId ? "Enter lesson title..." : "Enter module title..."}
                className="text-xl font-semibold"
                maxLength={100}
              />
            </div>
          </div>
        </div>

        {/* Rich Text Editor */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="h-full">
            <RichTextEditor
              content={newPageContent}
              onChange={setNewPageContent}
              placeholder={creatingModuleId ? "Start writing your lesson content..." : "Add module description..."}
              className="h-full"
            />
          </div>
        </div>
      </div>
    );
  }

  // Regular course view with Skool-style "New page" button
  return (
    <div className="flex h-full bg-white">
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Courses</span>
          </Button>
        </div>

        <CourseSidebar
          course={course}
          selectedLesson={selectedLesson}
          onLessonSelect={setSelectedLesson}
          isOwner={isOwner}
          onAddLesson={(moduleId) => handleCreateNewPage(moduleId)}
          onEditLesson={() => {}} // Handled by LessonContent now
          onAddModule={() => handleCreateNewPage()}
        />
      </div>

      <div className="flex-1">
        <LessonContent
          lesson={selectedLesson}
          courseName={course.title}
          isOwner={isOwner}
          onUpdateLesson={handleUpdateLesson}
          onCreateNewPage={() => handleCreateNewPage()}
          onMarkAsDone={handleMarkAsDone}
        />
      </div>
    </div>
  );
};

export default CourseDetailView; 