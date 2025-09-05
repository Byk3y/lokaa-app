/**
 * Migration utility to fix duplicate video content in existing lessons
 * This helps clean up lessons that have video content stored in both:
 * - course_lessons.content_text (legacy)
 * - educational_content.text_content (new system)
 * - course_lessons.content_url (video URL)
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { VideoContentExtractor } from '@/utils/videoContentExtractor';
import { log } from '@/utils/logger';

interface LessonWithDuplicateContent {
  id: string;
  title: string;
  content_text: string | null;
  content_url: string | null;
  content_id: string | null;
  educational_content?: {
    id: string;
    text_content: string | null;
  } | null;
}

/**
 * Identifies lessons that have duplicate video content
 */
export async function identifyLessonsWithDuplicateVideos(): Promise<LessonWithDuplicateContent[]> {
  const supabase = getSupabaseClient();
  
  const { data: lessons, error } = await supabase
    .from('course_lessons')
    .select(`
      id, title, content_text, content_url, content_id,
      educational_content (
        id, text_content
      )
    `)
    .not('content_url', 'is', null); // Only lessons with video URLs
  
  if (error) {
    log.error('Migration', 'Error fetching lessons with videos:', error);
    throw error;
  }

  // Filter lessons that have content in both places
  const duplicateContentLessons = (lessons || []).filter(lesson => {
    const hasContentUrl = !!lesson.content_url;
    const hasLegacyContent = !!lesson.content_text;
    const hasEducationalContent = !!lesson.educational_content?.text_content;
    
    // Look for lessons where content exists in multiple places
    const contentSources = [hasLegacyContent, hasEducationalContent].filter(Boolean).length;
    
    return hasContentUrl && contentSources > 0;
  });

  log.info('Migration', `Found ${duplicateContentLessons.length} lessons with potential duplicate video content`);
  return duplicateContentLessons;
}

/**
 * Cleans video content from HTML in educational_content for lessons that have content_url
 */
export async function cleanDuplicateVideoContent(dryRun = true): Promise<{
  processed: number;
  cleaned: number;
  errors: number;
}> {
  const supabase = getSupabaseClient();
  let processed = 0;
  let cleaned = 0;
  let errors = 0;

  try {
    const lessonsWithDuplicates = await identifyLessonsWithDuplicateVideos();
    
    for (const lesson of lessonsWithDuplicates) {
      try {
        processed++;
        
        // Determine which content to clean
        let contentToClean = '';
        let updateTarget: 'educational_content' | 'legacy_content_text' | null = null;
        
        if (lesson.educational_content?.text_content) {
          contentToClean = lesson.educational_content.text_content;
          updateTarget = 'educational_content';
        } else if (lesson.content_text) {
          contentToClean = lesson.content_text;
          updateTarget = 'legacy_content_text';
        }
        
        if (!contentToClean || !updateTarget) {
          continue;
        }

        // Check if content contains video embeds
        const hasVideoEmbeds = contentToClean.includes('iframe') || 
                              contentToClean.includes('youtube') || 
                              contentToClean.includes('data-youtube-video');
        
        if (!hasVideoEmbeds) {
          continue; // No video content to clean
        }

        // Clean the video content
        const cleanedContent = VideoContentExtractor.cleanHTMLContent(contentToClean);
        
        if (cleanedContent === contentToClean) {
          continue; // No changes needed
        }

        if (!dryRun) {
          // Update the appropriate table
          if (updateTarget === 'educational_content' && lesson.educational_content) {
            const { error } = await supabase
              .from('educational_content')
              .update({ text_content: cleanedContent })
              .eq('id', lesson.educational_content.id);
            
            if (error) {
              log.error('Migration', `Error updating educational_content for lesson ${lesson.id}:`, error);
              errors++;
              continue;
            }
          } else if (updateTarget === 'legacy_content_text') {
            const { error } = await supabase
              .from('course_lessons')
              .update({ content_text: cleanedContent })
              .eq('id', lesson.id);
            
            if (error) {
              log.error('Migration', `Error updating legacy content for lesson ${lesson.id}:`, error);
              errors++;
              continue;
            }
          }
        }

        cleaned++;
        log.info('Migration', `${dryRun ? '[DRY RUN]' : ''} Cleaned video content for lesson "${lesson.title}" (${lesson.id})`);
        
      } catch (lessonError) {
        log.error('Migration', `Error processing lesson ${lesson.id}:`, lessonError);
        errors++;
      }
    }

    const summary = { processed, cleaned, errors };
    log.info('Migration', `Migration summary:`, summary);
    
    if (dryRun) {
      log.info('Migration', 'This was a dry run. Run with dryRun=false to apply changes.');
    }
    
    return summary;
    
  } catch (error) {
    log.error('Migration', 'Migration failed:', error);
    throw error;
  }
}

/**
 * Convenience function to run the migration from the browser console
 * Usage: window.migrateLessonContent()
 */
export function exposeMigrationToBrowser() {
  if (typeof window !== 'undefined') {
    (window as any).migrateLessonContent = {
      identifyDuplicates: identifyLessonsWithDuplicateVideos,
      cleanDuplicates: cleanDuplicateVideoContent,
      runDryRun: () => cleanDuplicateVideoContent(true),
      runMigration: () => cleanDuplicateVideoContent(false),
    };
    
    log.info('Migration', 'Migration tools exposed to window.migrateLessonContent');
    log.info('Migration', 'Available commands:');
    log.info('Migration', '- window.migrateLessonContent.runDryRun() - Preview changes');
    log.info('Migration', '- window.migrateLessonContent.runMigration() - Apply changes');
  }
}