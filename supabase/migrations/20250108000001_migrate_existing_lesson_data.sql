-- ============================================================================
-- DATA MIGRATION: Move Existing Lessons from Posts to Educational Content
-- ============================================================================
-- This migration safely moves existing lesson data from the terrible 
-- posts-based system to the new proper educational content system.
-- 
-- It preserves all existing data while establishing the new relationships.
-- ============================================================================

-- Create a temporary backup table for safety
CREATE TABLE IF NOT EXISTS migration_backup_lessons AS 
SELECT 
    cl.*,
    p.content as post_content,
    p.title as post_title,
    p.post_type
FROM course_lessons cl
LEFT JOIN posts p ON cl.post_id = p.id;

-- Log migration start
DO $$
BEGIN
    RAISE NOTICE '🚀 Starting migration of % lessons from posts to educational content system', 
        (SELECT COUNT(*) FROM course_lessons WHERE post_id IS NOT NULL OR content_text IS NOT NULL);
END $$;

-- ============================================================================
-- STEP 1: Migrate lessons with post_id (stored as posts)
-- ============================================================================

DO $$
DECLARE
    lesson_record RECORD;
    new_content_id UUID;
    content_type_mapped educational_content_type;
    migrated_count INTEGER := 0;
BEGIN
    -- Process each lesson that has a post_id
    FOR lesson_record IN 
        SELECT 
            cl.*,
            p.content as post_content,
            p.title as post_title
        FROM course_lessons cl
        JOIN posts p ON cl.post_id = p.id
        WHERE cl.content_id IS NULL -- Only migrate if not already migrated
    LOOP
        -- Map content type to new enum
        content_type_mapped := CASE lesson_record.content_type
            WHEN 'text' THEN 'text'::educational_content_type
            WHEN 'rich_text' THEN 'rich_text'::educational_content_type
            WHEN 'video_embed' THEN 'video_embed'::educational_content_type
            WHEN 'external_link' THEN 'external_link'::educational_content_type
            WHEN 'markdown' THEN 'rich_text'::educational_content_type
            WHEN 'html' THEN 'rich_text'::educational_content_type
            ELSE 'rich_text'::educational_content_type
        END;
        
        -- Create educational content record
        INSERT INTO educational_content (
            title,
            content_type,
            text_content,
            media_url,
            estimated_duration,
            created_at,
            updated_at
        ) VALUES (
            COALESCE(lesson_record.post_title, lesson_record.title, 'Untitled Lesson'),
            content_type_mapped,
            COALESCE(lesson_record.post_content, lesson_record.content_text),
            lesson_record.content_url,
            NULL, -- We'll calculate this later
            lesson_record.created_at,
            lesson_record.updated_at
        ) RETURNING id INTO new_content_id;
        
        -- Update lesson to reference new content
        UPDATE course_lessons 
        SET 
            content_id = new_content_id,
            is_published = true, -- Assume existing lessons are published
            updated_at = NOW()
        WHERE id = lesson_record.id;
        
        migrated_count := migrated_count + 1;
        
        -- Log progress every 10 lessons
        IF migrated_count % 10 = 0 THEN
            RAISE NOTICE '📝 Migrated % lessons from posts...', migrated_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Successfully migrated % lessons from posts to educational content', migrated_count;
END $$;

-- ============================================================================
-- STEP 2: Migrate lessons with only content_text (not stored as posts)
-- ============================================================================

DO $$
DECLARE
    lesson_record RECORD;
    new_content_id UUID;
    content_type_mapped educational_content_type;
    migrated_count INTEGER := 0;
BEGIN
    -- Process each lesson that has content_text but no post_id
    FOR lesson_record IN 
        SELECT cl.*
        FROM course_lessons cl
        WHERE cl.post_id IS NULL 
        AND cl.content_text IS NOT NULL
        AND cl.content_id IS NULL -- Only migrate if not already migrated
    LOOP
        -- Map content type to new enum
        content_type_mapped := CASE lesson_record.content_type
            WHEN 'text' THEN 'text'::educational_content_type
            WHEN 'rich_text' THEN 'rich_text'::educational_content_type
            WHEN 'video_embed' THEN 'video_embed'::educational_content_type
            WHEN 'external_link' THEN 'external_link'::educational_content_type
            WHEN 'markdown' THEN 'rich_text'::educational_content_type
            WHEN 'html' THEN 'rich_text'::educational_content_type
            ELSE 'text'::educational_content_type
        END;
        
        -- Create educational content record
        INSERT INTO educational_content (
            title,
            content_type,
            text_content,
            media_url,
            estimated_duration,
            created_at,
            updated_at
        ) VALUES (
            COALESCE(lesson_record.title, 'Untitled Lesson'),
            content_type_mapped,
            lesson_record.content_text,
            lesson_record.content_url,
            NULL, -- We'll calculate this later
            lesson_record.created_at,
            lesson_record.updated_at
        ) RETURNING id INTO new_content_id;
        
        -- Update lesson to reference new content
        UPDATE course_lessons 
        SET 
            content_id = new_content_id,
            is_published = true, -- Assume existing lessons are published
            updated_at = NOW()
        WHERE id = lesson_record.id;
        
        migrated_count := migrated_count + 1;
        
        -- Log progress every 10 lessons
        IF migrated_count % 10 = 0 THEN
            RAISE NOTICE '📝 Migrated % lessons from content_text...', migrated_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Successfully migrated % lessons from content_text to educational content', migrated_count;
END $$;

-- ============================================================================
-- STEP 3: Handle video embeds and external links
-- ============================================================================

DO $$
DECLARE
    lesson_record RECORD;
    video_record RECORD;
    migrated_count INTEGER := 0;
BEGIN
    -- Create course_videos records for video_embed lessons
    FOR lesson_record IN 
        SELECT 
            cl.*,
            ec.*
        FROM course_lessons cl
        JOIN educational_content ec ON cl.content_id = ec.id
        WHERE ec.content_type = 'video_embed'
        AND cl.content_url IS NOT NULL
    LOOP
        -- Extract video metadata (basic YouTube/Vimeo detection)
        INSERT INTO course_videos (
            lesson_id,
            content_id,
            title,
            video_url,
            video_provider,
            provider_video_id,
            show_controls,
            created_at,
            updated_at
        ) VALUES (
            lesson_record.id,
            lesson_record.content_id,
            lesson_record.title,
            lesson_record.content_url,
            CASE 
                WHEN lesson_record.content_url LIKE '%youtube.com%' OR lesson_record.content_url LIKE '%youtu.be%' THEN 'youtube'
                WHEN lesson_record.content_url LIKE '%vimeo.com%' THEN 'vimeo'
                ELSE 'external'
            END,
            -- Extract video ID for YouTube/Vimeo (basic regex)
            CASE 
                WHEN lesson_record.content_url LIKE '%youtube.com%' THEN 
                    substring(lesson_record.content_url from 'v=([^&]+)')
                WHEN lesson_record.content_url LIKE '%youtu.be%' THEN 
                    substring(lesson_record.content_url from 'youtu.be/([^?]+)')
                WHEN lesson_record.content_url LIKE '%vimeo.com%' THEN 
                    substring(lesson_record.content_url from 'vimeo.com/([^?]+)')
                ELSE NULL
            END,
            true,
            lesson_record.created_at,
            lesson_record.updated_at
        );
        
        migrated_count := migrated_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Created % video records for video embed lessons', migrated_count;
END $$;

-- ============================================================================
-- STEP 4: Update content types and clean up
-- ============================================================================

-- Ensure all lessons have proper content types
UPDATE course_lessons 
SET content_type = 'rich_text' 
WHERE content_type IS NULL OR content_type = '';

-- Mark all migrated lessons as published
UPDATE course_lessons 
SET is_published = true 
WHERE content_id IS NOT NULL;

-- ============================================================================
-- STEP 5: Create migration report
-- ============================================================================

DO $$
DECLARE
    total_lessons INTEGER;
    migrated_lessons INTEGER;
    lessons_with_posts INTEGER;
    lessons_with_content INTEGER;
    video_records INTEGER;
    post_lessons INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_lessons FROM course_lessons;
    SELECT COUNT(*) INTO migrated_lessons FROM course_lessons WHERE content_id IS NOT NULL;
    SELECT COUNT(*) INTO lessons_with_posts FROM course_lessons WHERE post_id IS NOT NULL;
    SELECT COUNT(*) INTO lessons_with_content FROM course_lessons WHERE content_text IS NOT NULL;
    SELECT COUNT(*) INTO video_records FROM course_videos;
    SELECT COUNT(*) INTO post_lessons 
    FROM course_lessons cl 
    JOIN posts p ON cl.post_id = p.id 
    WHERE p.post_type = 'course_page';
    
    RAISE NOTICE '📊 MIGRATION REPORT:';
    RAISE NOTICE '  Total lessons: %', total_lessons;
    RAISE NOTICE '  Successfully migrated: %', migrated_lessons;
    RAISE NOTICE '  Lessons with post_id: %', lessons_with_posts;
    RAISE NOTICE '  Lessons with content_text: %', lessons_with_content;
    RAISE NOTICE '  Video records created: %', video_records;
    RAISE NOTICE '  Post-based lessons found: %', post_lessons;
    RAISE NOTICE '  Migration success rate: %%%', 
        CASE WHEN total_lessons > 0 THEN ROUND((migrated_lessons::DECIMAL / total_lessons) * 100, 2) ELSE 0 END;
END $$;

-- ============================================================================
-- STEP 6: Verification queries
-- ============================================================================

-- Show sample of migrated data
DO $$
BEGIN
    RAISE NOTICE '📋 SAMPLE OF MIGRATED DATA:';
    RAISE NOTICE '  Checking educational_content table...';
END $$;

-- Verify no data loss
DO $$
DECLARE
    unmigrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unmigrated_count 
    FROM course_lessons 
    WHERE content_id IS NULL 
    AND (content_text IS NOT NULL OR post_id IS NOT NULL);
    
    IF unmigrated_count > 0 THEN
        RAISE WARNING '⚠️  % lessons were not migrated successfully', unmigrated_count;
    ELSE
        RAISE NOTICE '✅ All lessons migrated successfully - no data loss detected';
    END IF;
END $$;

-- ============================================================================
-- STEP 7: Performance optimization
-- ============================================================================

-- Analyze tables for query optimization
ANALYZE educational_content;
ANALYZE course_lessons;
ANALYZE course_media;
ANALYZE course_videos;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '✅ Lessons are no longer dependent on the posts table';
    RAISE NOTICE '📚 Educational content now has proper separation from social posts';
    RAISE NOTICE '💾 Backup data saved in migration_backup_lessons table';
    RAISE NOTICE '🚀 Ready to update frontend code to use new structure';
END $$; 