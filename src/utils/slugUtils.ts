import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';

/**
 * Utility functions for generating and working with URL slugs
 * 
 * Phase 3.1: Updated for new URL structure
 * - Post URLs: /:subdomain/posts/:slug (removed /space)
 * - Course URLs: /:subdomain/courses/:slug (removed /space/classroom)
 * - Lesson URLs: /:subdomain/courses/:course-slug/lessons/:lesson-slug
 * - Backward compatibility maintained for legacy patterns
 */

/**
 * Convert a string to a URL-friendly slug
 * 
 * This function:
 * - Converts to lowercase
 * - Removes special characters
 * - Replaces spaces with hyphens
 * - Truncates to 100 characters
 * 
 * @param text The input text to convert to a slug
 * @returns A URL-friendly slug
 */
export function generateSlug(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove all non-word chars
    .replace(/[\s_]+/g, '-')  // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '')  // Remove leading and trailing hyphens
    .substring(0, 100);       // Truncate to 100 chars
}

/**
 * Check if a slug exists in a specific space and generate a unique one if needed
 * 
 * @param baseSlug The initial slug to check
 * @param spaceId The space ID to check uniqueness within
 * @returns A unique slug for the space (may append -1, -2, etc.)
 */
export async function getUniqueSlug(baseSlug: string, spaceId: string): Promise<string> {
  if (!baseSlug || !spaceId) return '';
  
  let slug = baseSlug;
  let counter = 0;
  
  try {
    // Check if the current slug exists in the space
    while (counter <= 100) {
      const { data, error } = await getSupabaseClient()
        .from('posts')
        .select('id')
        .eq('space_id', spaceId)
        .eq('slug', slug)
        .maybeSingle();
      
      if (error) {
        log.error('Utils', 'Error checking slug uniqueness:', error);
        // If there's an error, just return the original slug and hope for the best
        return baseSlug;
      }
      
      // If no post found with this slug, it's unique
      if (!data) break;
      
      // Otherwise, increment counter and try again
      counter++;
      slug = `${baseSlug}-${counter}`;
    }
    
    return slug;
  } catch (error) {
    log.error('Utils', 'Unexpected error in getUniqueSlug:', error);
    return baseSlug;
  }
}

/**
 * Generate a post URL based on the slug or ID
 * 
 * @param spaceSlug The slug of the space
 * @param postSlug The slug of the post (or ID as fallback)
 * @returns The URL for the post
 */
export function getPostUrl(spaceSlug: string, postSlug: string): string;
export function getPostUrl(post: { slug?: string | null; id: string }, space: { subdomain?: string | null }): string;
export function getPostUrl(
  spaceSlugOrPost: string | { slug?: string | null; id: string },
  postSlugOrSpace: string | { subdomain?: string | null }
): string {
  // Log input parameters for debugging
  log.debug('Utils', 'getPostUrl called with params:', { 
    param1: spaceSlugOrPost, 
    param2: postSlugOrSpace 
  });
  
  // If the first parameter is an object (post), handle object form
  if (typeof spaceSlugOrPost !== 'string' && typeof postSlugOrSpace !== 'string') {
    const post = spaceSlugOrPost;
    const space = postSlugOrSpace;
    
    if (!space || !space.subdomain) {
      log.error('Utils', 'Invalid space or missing subdomain:', space);
      return '/'; // Return to home as fallback
    }
    
    if (!post || !post.id) {
      log.error('Utils', 'Invalid post or missing ID:', post);
      return `/${space.subdomain}/space`; // Return to space as fallback
    }
    
    // Debug object post parameters
    log.debug('Utils', 'Building URL from objects with:', {
      subdomain: space.subdomain,
      postId: post.id,
      slug: post.slug
    });
    
    // Verify the slug is actually present and not empty
    if (!post.slug) {
      log.warn('Utils', "Post slug is missing, falling back to ID:", post.id);
    }
    
    // Phase 3.1: New URL structure - /:subdomain/posts/:slug
    const result = `/${space.subdomain}/posts/${post.slug || post.id}`;
    log.debug('Utils', 'Generated URL:', result);
    return result;
  } 
  // Handle string form
  else if (typeof spaceSlugOrPost === 'string' && typeof postSlugOrSpace === 'string') {
    // Debug string parameters
    log.debug('Utils', 'Building URL from strings with:', {
      spaceSlug: spaceSlugOrPost,
      postSlug: postSlugOrSpace
    });
    
    // Phase 3.1: New URL structure - /:subdomain/posts/:slug
    const result = `/${spaceSlugOrPost}/posts/${postSlugOrSpace}`;
    log.debug('Utils', 'Generated URL:', result);
    return result;
  }
  
  // Fallback for invalid parameter types
  log.error('Utils', 'Invalid parameter types for getPostUrl:', { 
    spaceSlugOrPost, 
    postSlugOrSpace 
  });
  return '/';
}

/**
 * Generate a canonical URL for SEO purposes
 * 
 * @param spaceSlug The slug of the space
 * @param postSlug The slug of the post
 * @returns The canonical URL including domain
 */
export function getCanonicalPostUrl(spaceSlug: string, postSlug: string): string {
  // Phase 3.1: New URL structure - /:subdomain/posts/:slug
  return `${window.location.origin}/${spaceSlug}/posts/${postSlug}`;
}

/**
 * Check if a course slug exists in a specific space and generate a unique one if needed
 * 
 * @param baseSlug The initial slug to check
 * @param spaceId The space ID to check uniqueness within
 * @returns A unique slug for the space (may append -1, -2, etc.)
 */
export async function getUniqueCourseSlug(baseSlug: string, spaceId: string): Promise<string> {
  if (!baseSlug || !spaceId) return '';
  
  let slug = baseSlug;
  let counter = 0;
  
  try {
    // Check if the current slug exists in the space
    while (counter <= 100) {
      const { data, error } = await getSupabaseClient()
        .from('courses')
        .select('id')
        .eq('space_id', spaceId)
        .eq('slug', slug)
        .maybeSingle();
      
      if (error) {
        log.error('Utils', 'Error checking course slug uniqueness:', error);
        // If there's an error, just return the original slug and hope for the best
        return baseSlug;
      }
      
      // If no course found with this slug, it's unique
      if (!data) break;
      
      // Otherwise, increment counter and try again
      counter++;
      slug = `${baseSlug}-${counter}`;
    }
    
    return slug;
  } catch (error) {
    log.error('Utils', 'Unexpected error in getUniqueCourseSlug:', error);
    return baseSlug;
  }
}

/**
 * Generate a course URL based on the slug or ID
 * 
 * @param spaceSlug The slug of the space
 * @param courseSlug The slug of the course (or ID as fallback)
 * @param moduleId Optional module ID for direct module access
 * @returns The URL for the course
 */
export function getCourseUrl(spaceSlug: string, courseSlug: string, moduleId?: string): string;
export function getCourseUrl(course: { slug?: string | null; id: string }, space: { subdomain?: string | null }, moduleId?: string): string;
export function getCourseUrl(
  spaceSlugOrCourse: string | { slug?: string | null; id: string },
  courseSlugOrSpace: string | { subdomain?: string | null },
  moduleId?: string
): string {
  // Log input parameters for debugging
  log.debug('Utils', 'getCourseUrl called with params:', { 
    param1: spaceSlugOrCourse, 
    param2: courseSlugOrSpace,
    moduleId
  });
  
  // If the first parameter is an object (course), handle object form
  if (typeof spaceSlugOrCourse !== 'string' && typeof courseSlugOrSpace !== 'string') {
    const course = spaceSlugOrCourse;
    const space = courseSlugOrSpace;
    
    if (!space || !space.subdomain) {
      log.error('Utils', 'Invalid space or missing subdomain:', space);
      return '/'; // Return to home as fallback
    }
    
    if (!course || !course.id) {
      log.error('Utils', 'Invalid course or missing ID:', course);
      return `/${space.subdomain}/courses`; // Return to courses as fallback
    }
    
    // Debug object course parameters
    log.debug('Utils', 'Building course URL from objects with:', {
      subdomain: space.subdomain,
      courseId: course.id,
      slug: course.slug,
      moduleId
    });
    
    // Verify the slug is actually present and not empty
    if (!course.slug) {
      log.warn('Utils', "Course slug is missing, falling back to ID:", course.id);
    }
    
    // Phase 3.1: New URL structure - /:subdomain/courses/:slug
    const baseUrl = `/${space.subdomain}/courses/${course.slug || course.id}`;
    const result = moduleId ? `${baseUrl}?md=${moduleId}` : baseUrl;
    log.debug('Utils', 'Generated course URL:', result);
    return result;
  } 
  // Handle string form
  else if (typeof spaceSlugOrCourse === 'string' && typeof courseSlugOrSpace === 'string') {
    // Debug string parameters
    log.debug('Utils', 'Building course URL from strings with:', {
      spaceSlug: spaceSlugOrCourse,
      courseSlug: courseSlugOrSpace,
      moduleId
    });
    
    // Phase 3.1: New URL structure - /:subdomain/courses/:slug
    const baseUrl = `/${spaceSlugOrCourse}/courses/${courseSlugOrSpace}`;
    const result = moduleId ? `${baseUrl}?md=${moduleId}` : baseUrl;
    log.debug('Utils', 'Generated course URL:', result);
    return result;
  }
  
  // Fallback for invalid parameter types
  log.error('Utils', 'Invalid parameter types for getCourseUrl:', { 
    spaceSlugOrCourse, 
    courseSlugOrSpace 
  });
  return '/';
}

/**
 * Generate a canonical course URL for SEO purposes
 * 
 * @param spaceSlug The slug of the space
 * @param courseSlug The slug of the course
 * @param moduleId Optional module ID for direct module access
 * @returns The canonical URL including domain
 */
export function getCanonicalCourseUrl(spaceSlug: string, courseSlug: string, moduleId?: string): string {
  // Phase 3.1: New URL structure - /:subdomain/courses/:slug
  const baseUrl = `${window.location.origin}/${spaceSlug}/courses/${courseSlug}`;
  return moduleId ? `${baseUrl}?md=${moduleId}` : baseUrl;
}

/**
 * Generate a lesson URL with lesson ID (Skool-style) - LEGACY
 * 
 * @param spaceSlug The slug of the space
 * @param courseShortId The short ID of the course (8 characters)
 * @param lessonId The UUID of the lesson
 * @returns The URL for the specific lesson
 */
export function getLessonUrl(spaceSlug: string, courseShortId: string, lessonId: string): string {
  return `/${spaceSlug}/space/classroom/${courseShortId}?md=${lessonId}`;
}

/**
 * Generate a canonical lesson URL for SEO purposes (Skool-style) - LEGACY
 * 
 * @param spaceSlug The slug of the space
 * @param courseShortId The short ID of the course (8 characters)
 * @param lessonId The UUID of the lesson
 * @returns The canonical URL including domain
 */
export function getCanonicalLessonUrl(spaceSlug: string, courseShortId: string, lessonId: string): string {
  return `${window.location.origin}/${spaceSlug}/space/classroom/${courseShortId}?md=${lessonId}`;
}

/**
 * Generate a lesson URL with hierarchical structure (Phase 3.1)
 * 
 * @param spaceSlug The slug of the space
 * @param courseSlug The slug of the course
 * @param lessonSlug The slug of the lesson
 * @returns The URL for the specific lesson
 */
export function getLessonUrlNew(spaceSlug: string, courseSlug: string, lessonSlug: string): string {
  return `/${spaceSlug}/courses/${courseSlug}/lessons/${lessonSlug}`;
}

/**
 * Generate a canonical lesson URL for SEO purposes (Phase 3.1)
 * 
 * @param spaceSlug The slug of the space
 * @param courseSlug The slug of the course
 * @param lessonSlug The slug of the lesson
 * @returns The canonical URL including domain
 */
export function getCanonicalLessonUrlNew(spaceSlug: string, courseSlug: string, lessonSlug: string): string {
  return `${window.location.origin}/${spaceSlug}/courses/${courseSlug}/lessons/${lessonSlug}`;
}

/**
 * Generate a user profile URL (Phase 3.1)
 * 
 * @param userSlug The slug of the user
 * @returns The URL for the user profile
 */
export function getUserProfileUrl(userSlug: string): string {
  return `/@${userSlug}`;
}

/**
 * Generate a canonical user profile URL for SEO purposes (Phase 3.1)
 * 
 * @param userSlug The slug of the user
 * @returns The canonical URL including domain
 */
export function getCanonicalUserProfileUrl(userSlug: string): string {
  return `${window.location.origin}/@${userSlug}`;
}


