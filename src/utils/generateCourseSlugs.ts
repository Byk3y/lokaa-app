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
      console.error('Error fetching courses without slugs:', fetchError);
      return { success: false, error: fetchError.message };
    }
    
    if (!coursesWithoutSlugs || coursesWithoutSlugs.length === 0) {
      console.log('No courses found without slugs');
      return { success: true, updated: 0 };
    }
    
    console.log(`Found ${coursesWithoutSlugs.length} courses without slugs`);
    
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
        
        console.log(`✅ Generated slug for "${course.title}": ${uniqueSlug}`);
        updatedCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Course ${course.title} (${course.id}): ${errorMessage}`);
      }
    }
    
    console.log(`Slug generation complete. Updated ${updatedCount} courses.`);
    
    if (errors.length > 0) {
      console.error('Errors encountered:', errors);
      return { success: false, updated: updatedCount, errors };
    }
    
    return { success: true, updated: updatedCount };
    
  } catch (error) {
    console.error('Failed to generate slugs for existing courses:', error);
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
      console.error('Error fetching courses:', error);
      return;
    }
    
    const totalCourses = courses?.length || 0;
    const coursesWithSlugs = courses?.filter(c => c.slug).length || 0;
    const coursesWithoutSlugs = totalCourses - coursesWithSlugs;
    
    console.log('📊 Course Slug Status:');
    console.log(`Total courses: ${totalCourses}`);
    console.log(`With slugs: ${coursesWithSlugs}`);
    console.log(`Without slugs: ${coursesWithoutSlugs}`);
    
    if (coursesWithoutSlugs > 0) {
      console.log('\n🔍 Courses without slugs:');
      courses?.filter(c => !c.slug).forEach(course => {
        console.log(`- "${course.title}" (${course.id})`);
      });
    }
    
    if (coursesWithSlugs > 0) {
      console.log('\n✅ Courses with slugs:');
      courses?.filter(c => c.slug).forEach(course => {
        console.log(`- "${course.title}" → ${course.slug}`);
      });
    }
    
  } catch (error) {
    console.error('Failed to check course slug status:', error);
  }
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).generateSlugsForExistingCourses = generateSlugsForExistingCourses;
  (window as any).checkCourseSlugStatus = checkCourseSlugStatus;
}