import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { generateSlug, getUniqueCourseSlug } from './slugUtils';

/**
 * Utility function to generate slugs for existing courses
 * This can be run once after adding the slug column to the database
 */
export async function generateSlugsForExistingCourses() {
  try {
    const supabase = getSupabaseClient();
    
    // Get all courses without slugs
    const { data: coursesWithoutSlugs, error: fetchError } = await supabase
      .from('courses')
      .select('id, title, space_id')
      .is('slug', null);
    
    if (fetchError) {
      log.error('Utils', 'Error fetching courses without slugs:', fetchError);
      return { success: false, error: fetchError.message };
    }
    
    if (!coursesWithoutSlugs || coursesWithoutSlugs.length === 0) {
      log.debug('Utils', 'No courses found without slugs');
      return { success: true, updated: 0 };
    }
    
    log.debug('Utils', `Found ${coursesWithoutSlugs.length} courses without slugs`);
    
    let updatedCount = 0;
    const errors: string[] = [];
    
    // Process each course
    for (const course of coursesWithoutSlugs) {
      try {
        // Generate unique slug
        const baseSlug = generateSlug(course.title);
        const uniqueSlug = await getUniqueCourseSlug(baseSlug, course.space_id);
        
        // Update course with slug
        const { error: updateError } = await supabase
          .from('courses')
          .update({ slug: uniqueSlug })
          .eq('id', course.id);
        
        if (updateError) {
          errors.push(`Course ${course.title} (${course.id}): ${updateError.message}`);
          continue;
        }
        
        log.debug('Utils', `✅ Generated slug for "${course.title}": ${uniqueSlug}`);
        updatedCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Course ${course.title} (${course.id}): ${errorMessage}`);
      }
    }
    
    log.debug('Utils', `Slug generation complete. Updated ${updatedCount} courses.`);
    
    if (errors.length > 0) {
      log.error('Utils', 'Errors encountered:', errors);
      return { success: false, updated: updatedCount, errors };
    }
    
    return { success: true, updated: updatedCount };
    
  } catch (error) {
    log.error('Utils', 'Failed to generate slugs for existing courses:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Debug function to check the current state of course slugs
 */
export async function checkCourseSlugStatus() {
  try {
    const supabase = getSupabaseClient();
    
    const { data: courses, error } = await supabase
      .from('courses')
      .select('id, title, slug, space_id, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      log.error('Utils', 'Error fetching courses:', error);
      return;
    }
    
    const totalCourses = courses?.length || 0;
    const coursesWithSlugs = courses?.filter(c => c.slug).length || 0;
    const coursesWithoutSlugs = totalCourses - coursesWithSlugs;
    
    log.debug('Utils', '📊 Course Slug Status:');
    log.debug('Utils', `Total courses: ${totalCourses}`);
    log.debug('Utils', `With slugs: ${coursesWithSlugs}`);
    log.debug('Utils', `Without slugs: ${coursesWithoutSlugs}`);
    
    if (coursesWithoutSlugs > 0) {
      log.debug('Utils', '\n🔍 Courses without slugs:');
      courses?.filter(c => !c.slug).forEach(course => {
        log.debug('Utils', `- "${course.title}" (${course.id})`);
      });
    }
    
    if (coursesWithSlugs > 0) {
      log.debug('Utils', '\n✅ Courses with slugs:');
      courses?.filter(c => c.slug).forEach(course => {
        log.debug('Utils', `- "${course.title}" → ${course.slug}`);
      });
    }
    
  } catch (error) {
    log.error('Utils', 'Failed to check course slug status:', error);
  }
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).generateSlugsForExistingCourses = generateSlugsForExistingCourses;
  (window as any).checkCourseSlugStatus = checkCourseSlugStatus;
}