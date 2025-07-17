import { getSupabaseClient } from '@/integrations/supabase/client';

/**
 * Utility functions for generating and working with URL slugs
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
        console.error('Error checking slug uniqueness:', error);
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
    console.error('Unexpected error in getUniqueSlug:', error);
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
  console.log('getPostUrl called with params:', { 
    param1: spaceSlugOrPost, 
    param2: postSlugOrSpace 
  });
  
  // If the first parameter is an object (post), handle object form
  if (typeof spaceSlugOrPost !== 'string' && typeof postSlugOrSpace !== 'string') {
    const post = spaceSlugOrPost;
    const space = postSlugOrSpace;
    
    if (!space || !space.subdomain) {
      console.error('Invalid space or missing subdomain:', space);
      return '/'; // Return to home as fallback
    }
    
    if (!post || !post.id) {
      console.error('Invalid post or missing ID:', post);
      return `/${space.subdomain}/space`; // Return to space as fallback
    }
    
    // Debug object post parameters
    console.log('Building URL from objects with:', {
      subdomain: space.subdomain,
      postId: post.id,
      slug: post.slug
    });
    
    // Verify the slug is actually present and not empty
    if (!post.slug) {
      console.warn("Post slug is missing, falling back to ID:", post.id);
    }
    
    // Use post slug if available, otherwise fall back to ID
    const result = `/${space.subdomain}/space/${post.slug || post.id}`;
    console.log('Generated URL:', result);
    return result;
  } 
  // Handle string form
  else if (typeof spaceSlugOrPost === 'string' && typeof postSlugOrSpace === 'string') {
    // Debug string parameters
    console.log('Building URL from strings with:', {
      spaceSlug: spaceSlugOrPost,
      postSlug: postSlugOrSpace
    });
    
    const result = `/${spaceSlugOrPost}/space/${postSlugOrSpace}`;
    console.log('Generated URL:', result);
    return result;
  }
  
  // Fallback for invalid parameter types
  console.error('Invalid parameter types for getPostUrl:', { 
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
  return `${window.location.origin}/${spaceSlug}/space/${postSlug}`;
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
        console.error('Error checking course slug uniqueness:', error);
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
    console.error('Unexpected error in getUniqueCourseSlug:', error);
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
  console.log('getCourseUrl called with params:', { 
    param1: spaceSlugOrCourse, 
    param2: courseSlugOrSpace,
    moduleId
  });
  
  // If the first parameter is an object (course), handle object form
  if (typeof spaceSlugOrCourse !== 'string' && typeof courseSlugOrSpace !== 'string') {
    const course = spaceSlugOrCourse;
    const space = courseSlugOrSpace;
    
    if (!space || !space.subdomain) {
      console.error('Invalid space or missing subdomain:', space);
      return '/'; // Return to home as fallback
    }
    
    if (!course || !course.id) {
      console.error('Invalid course or missing ID:', course);
      return `/${space.subdomain}/space/classroom`; // Return to classroom as fallback
    }
    
    // Debug object course parameters
    console.log('Building course URL from objects with:', {
      subdomain: space.subdomain,
      courseId: course.id,
      slug: course.slug,
      moduleId
    });
    
    // Verify the slug is actually present and not empty
    if (!course.slug) {
      console.warn("Course slug is missing, falling back to ID:", course.id);
    }
    
    // Use course slug if available, otherwise fall back to ID
    const baseUrl = `/${space.subdomain}/space/classroom/${course.slug || course.id}`;
    const result = moduleId ? `${baseUrl}?md=${moduleId}` : baseUrl;
    console.log('Generated course URL:', result);
    return result;
  } 
  // Handle string form
  else if (typeof spaceSlugOrCourse === 'string' && typeof courseSlugOrSpace === 'string') {
    // Debug string parameters
    console.log('Building course URL from strings with:', {
      spaceSlug: spaceSlugOrCourse,
      courseSlug: courseSlugOrSpace,
      moduleId
    });
    
    const baseUrl = `/${spaceSlugOrCourse}/space/classroom/${courseSlugOrSpace}`;
    const result = moduleId ? `${baseUrl}?md=${moduleId}` : baseUrl;
    console.log('Generated course URL:', result);
    return result;
  }
  
  // Fallback for invalid parameter types
  console.error('Invalid parameter types for getCourseUrl:', { 
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
  const baseUrl = `${window.location.origin}/${spaceSlug}/space/classroom/${courseSlug}`;
  return moduleId ? `${baseUrl}?md=${moduleId}` : baseUrl;
}
