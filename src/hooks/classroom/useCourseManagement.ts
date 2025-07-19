import { log } from '@/utils/logger';
import { useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useCachedClassroom } from '@/hooks/useCachedClassroom';
import { useClassroomAuth } from './useClassroomAuth';
import type { CourseDisplayData } from '@/hooks/useClassroomCache';

interface UseCourseManagementReturn {
  courses: CourseDisplayData[];
  loading: boolean;
  error: string | null;
  createCourse: (data: CreateCourseFormData) => Promise<void>;
  updateCourse: (id: string, data: Partial<CreateCourseFormData>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  enrollInCourse: (courseId: string) => Promise<void>;
  unenrollFromCourse: (courseId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export interface CreateCourseFormData {
  title: string;
  description: string;
  accessType: 'open' | 'paid';
  price?: number;
  currency?: string;
  isPublished: boolean;
  imageUrl?: string;
  coverImageUrl?: string; // Add support for the new field name
}

export interface ClassroomTabProps {
  space?: {
    id?: string;
    owner_id?: string;
    name?: string;
    primary_color?: string;
  };
}

export function useCourseManagement(space: ClassroomTabProps['space']): UseCourseManagementReturn {
  const { user, permissions } = useClassroomAuth(space);
  const { 
    courses, 
    loading, 
    error, 
    refetch,
    updateCourse: updateCourseInCache,
    removeCourse: removeCourseFromCache,
    addCourse: addCourseToCache,
    handleEnrollment
  } = useCachedClassroom(space?.id, user?.id, space?.owner_id);

  const createCourse = useCallback(async (data: CreateCourseFormData) => {
    if (!permissions.canCreateCourse || !user || !space?.id) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to create courses",
        variant: "destructive"
      });
      return;
    }

    try {
      const supabase = getSupabaseClient();
      
      const courseData = {
        title: data.title,
        description: data.description,
        space_id: space.id,
        creator_id: user.id,
        access_type: data.accessType,
        price: data.accessType === 'paid' ? data.price : null,
        currency: data.accessType === 'paid' ? (data.currency || 'USD') : null,
        is_published: data.isPublished,
        image_url: data.imageUrl || null,
        cover_image_url: data.coverImageUrl || null,
      };

      const { data: newCourse, error: createError } = await supabase
        .from('courses')
        .insert([courseData])
        .select()
        .single();

      if (createError) throw createError;

      // Optimistically add to cache
      const displayCourse: CourseDisplayData = {
        ...newCourse,
        students: 0,
        enrolled: false,
        weeks: 0,
        progress: 0,
      };
      
      addCourseToCache(displayCourse);

      toast({
        title: "Course Created",
        description: `"${data.title}" has been created successfully`,
      });

    } catch (error) {
      log.error('Hook', 'Error creating course:', error);
      toast({
        title: "Error",
        description: "Failed to create course. Please try again.",
        variant: "destructive"
      });
    }
  }, [permissions.canCreateCourse, user, space?.id, addCourseToCache]);

  const updateCourse = useCallback(async (id: string, data: Partial<CreateCourseFormData>) => {
    if (!permissions.canEditCourse || !user) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit courses",
        variant: "destructive"
      });
      return;
    }

    try {
      const supabase = getSupabaseClient();
      
      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.accessType !== undefined) updateData.access_type = data.accessType;
      if (data.price !== undefined) updateData.price = data.accessType === 'paid' ? data.price : null;
      if (data.currency !== undefined) updateData.currency = data.accessType === 'paid' ? data.currency : null;
      if (data.isPublished !== undefined) updateData.is_published = data.isPublished;
      if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl;
      if (data.coverImageUrl !== undefined) updateData.cover_image_url = data.coverImageUrl;

      const { error: updateError } = await supabase
        .from('courses')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      // Optimistically update cache
      updateCourseInCache(id, {
        title: data.title,
        description: data.description,
        access_type: data.accessType,
        price: data.accessType === 'paid' ? data.price : null,
        currency: data.accessType === 'paid' ? data.currency : null,
        is_published: data.isPublished,
        image_url: data.imageUrl,
        cover_image_url: data.coverImageUrl,
      });

      toast({
        title: "Course Updated",
        description: "Course has been updated successfully",
      });

    } catch (error) {
      log.error('Hook', 'Error updating course:', error);
      toast({
        title: "Error",
        description: "Failed to update course. Please try again.",
        variant: "destructive"
      });
    }
  }, [permissions.canEditCourse, user, updateCourseInCache]);

  const deleteCourse = useCallback(async (id: string) => {
    if (!permissions.canDeleteCourse || !user) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete courses",
        variant: "destructive"
      });
      return;
    }

    try {
      const supabase = getSupabaseClient();
      
      const { error: deleteError } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Optimistically remove from cache
      removeCourseFromCache(id);

      toast({
        title: "Course Deleted",
        description: "Course has been deleted successfully",
      });

    } catch (error) {
      log.error('Hook', 'Error deleting course:', error);
      toast({
        title: "Error",
        description: "Failed to delete course. Please try again.",
        variant: "destructive"
      });
    }
  }, [permissions.canDeleteCourse, user, removeCourseFromCache]);

  const enrollInCourse = useCallback(async (courseId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to enroll in courses",
        variant: "destructive"
      });
      return;
    }

    try {
      const supabase = getSupabaseClient();
      
      // CRITICAL FIX: Check if user is already enrolled
      const { data: existingEnrollment, error: checkError } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw checkError;
      }

      if (existingEnrollment) {
        toast({
          title: "Already Enrolled",
          description: "You are already enrolled in this course",
          variant: "default"
        });
        // Update cache to reflect enrollment status
        handleEnrollment(courseId, true);
        return;
      }
      
      const { error: enrollError } = await supabase
        .from('course_enrollments')
        .insert([{
          user_id: user.id,
          course_id: courseId,
          enrolled_at: new Date().toISOString(),
        }]);

      if (enrollError) throw enrollError;

      // Optimistically update cache
      handleEnrollment(courseId, true);

      toast({
        title: "Enrolled Successfully",
        description: "You have been enrolled in the course",
      });

    } catch (error) {
      log.error('Hook', 'Error enrolling in course:', error);
      toast({
        title: "Error",
        description: "Failed to enroll in course. Please try again.",
        variant: "destructive"
      });
    }
  }, [user, handleEnrollment]);

  const unenrollFromCourse = useCallback(async (courseId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to manage enrollment",
        variant: "destructive"
      });
      return;
    }

    try {
      const supabase = getSupabaseClient();
      
      const { error: unenrollError } = await supabase
        .from('course_enrollments')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', courseId);

      if (unenrollError) throw unenrollError;

      // Optimistically update cache
      handleEnrollment(courseId, false);

      toast({
        title: "Unenrolled Successfully",
        description: "You have been unenrolled from the course",
      });

    } catch (error) {
      log.error('Hook', 'Error unenrolling from course:', error);
      toast({
        title: "Error",
        description: "Failed to unenroll from course. Please try again.",
        variant: "destructive"
      });
    }
  }, [user, handleEnrollment]);

  return {
    courses,
    loading,
    error,
    createCourse,
    updateCourse,
    deleteCourse,
    enrollInCourse,
    unenrollFromCourse,
    refetch,
  };
} 