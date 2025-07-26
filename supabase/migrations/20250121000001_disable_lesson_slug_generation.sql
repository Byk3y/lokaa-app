-- ============================================================================
-- MIGRATION: Disable Lesson Slug Auto-Generation
-- ============================================================================
-- This migration disables the auto-generation of lesson slugs since we've
-- moved to using UUID-based URLs (Skool-style ?md=lessonId approach).
-- 
-- We keep the slug columns and data for potential future use, but disable
-- the triggers to prevent unnecessary slug generation.
-- ============================================================================

-- Disable the auto-generation trigger for course_lessons
DROP TRIGGER IF EXISTS trigger_auto_generate_lesson_slug ON course_lessons;

-- Disable the auto-generation trigger for educational_content
DROP TRIGGER IF EXISTS trigger_auto_generate_content_slug ON educational_content;

-- ============================================================================
-- LOG MIGRATION COMPLETION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Successfully disabled lesson slug auto-generation';
    RAISE NOTICE '📝 Slug columns and data preserved for potential future use';
    RAISE NOTICE '🔗 URLs now use UUID-based approach: ?md=lessonId';
END $$; 