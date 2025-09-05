-- ============================================================================
-- MIGRATION: Add Lesson Slug Generation
-- ============================================================================
-- This migration adds slug generation for course lessons to support the new URL structure
-- in Phase 3.1 of the URL structure optimization.
-- 
-- Changes:
-- 1. Add slug column to course_lessons table
-- 2. Create generate_lesson_slug() function
-- 3. Create set_lesson_slug() trigger function
-- 4. Add unique constraint on (course_id, slug)
-- 5. Back-fill existing lessons with slugs
-- ============================================================================

-- 1. Add slug column to course_lessons table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'course_lessons'
        AND column_name = 'slug'
    ) THEN
        ALTER TABLE public.course_lessons ADD COLUMN slug TEXT;
    END IF;
END $$;

-- 2. Create generate_lesson_slug function
CREATE OR REPLACE FUNCTION public.generate_lesson_slug(title text, course_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  slug_attempt TEXT;
  counter INTEGER := 0;
  slug_exists BOOLEAN;
BEGIN
  -- Add debug logging
  RAISE LOG 'generate_lesson_slug called with title: %, course_id: %', 
    COALESCE(title, 'NULL'), 
    course_id;
    
  -- If title exists, use it for the slug
  IF title IS NOT NULL AND title != '' THEN
    -- Convert to lowercase, replace spaces and special chars with hyphens
    base_slug := lower(regexp_replace(title, '[^a-zA-Z0-9]', '-', 'g'));
  -- If no title, use a fallback
  ELSE
    base_slug := 'lesson-' || substr(md5(random()::text), 1, 8);
  END IF;
  
  -- Replace multiple hyphens with a single one
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  -- Remove leading and trailing hyphens
  base_slug := trim(both '-' from base_slug);
  -- Truncate to a reasonable length (100 chars)
  base_slug := substr(base_slug, 1, 100);
  
  -- If the slug is empty after all processing, use a fallback
  IF base_slug = '' OR base_slug IS NULL THEN
    RAISE LOG 'Base slug became empty after processing (title: "%"), falling back to random string.', COALESCE(title, 'NULL');
    base_slug := 'lesson-' || substr(md5(random()::text), 1, 8);
  END IF;
  
  -- Try the base slug first
  slug_attempt := base_slug;
  
  -- Check if slug exists in this course
  LOOP
    EXECUTE 'SELECT EXISTS(SELECT 1 FROM public.course_lessons WHERE course_id = $1 AND slug = $2)'
    INTO slug_exists
    USING course_id, slug_attempt;
    
    -- If slug doesn't exist or we've tried too many times, exit loop
    IF NOT slug_exists OR counter > 100 THEN
      EXIT;
    END IF;
    
    -- Increment counter and append to slug
    counter := counter + 1;
    slug_attempt := base_slug || '-' || counter::text;
  END LOOP;
  
  RAISE LOG 'generate_lesson_slug returning: %', slug_attempt;
  RETURN slug_attempt;
END;
$$;

-- 3. Create set_lesson_slug trigger function
CREATE OR REPLACE FUNCTION public.set_lesson_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log entry to trigger function
  RAISE LOG 'set_lesson_slug trigger called with operation %', TG_OP;
  
  -- Set slug if it's NULL or empty
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    RAISE LOG 'Setting slug for lesson: title=%, course_id=%', 
      COALESCE(NEW.title, 'NULL'), 
      NEW.course_id;
      
    NEW.slug := generate_lesson_slug(NEW.title, NEW.course_id);
    
    RAISE LOG 'Slug set to: %', NEW.slug;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Create the trigger
DO $$
BEGIN
  -- Drop the existing trigger if it exists
  DROP TRIGGER IF EXISTS set_lesson_slug_trigger ON public.course_lessons;
  
  -- Create the trigger to fire on both INSERT and UPDATE
  CREATE TRIGGER set_lesson_slug_trigger
  BEFORE INSERT OR UPDATE ON public.course_lessons
  FOR EACH ROW
  EXECUTE FUNCTION set_lesson_slug();
END $$;

-- 5. Add unique constraint on (course_id, slug)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'course_lessons' 
    AND indexname = 'course_lessons_course_id_slug_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX course_lessons_course_id_slug_unique_idx ON public.course_lessons (course_id, slug)
    WHERE slug IS NOT NULL;
  END IF;
END $$;

-- 6. Back-fill existing lessons with slugs
UPDATE public.course_lessons 
SET slug = generate_lesson_slug(title, course_id)
WHERE slug IS NULL OR slug = '';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🎉 Lesson slug generation system created successfully!';
  RAISE NOTICE '✅ Added slug column to course_lessons table';
  RAISE NOTICE '✅ Created generate_lesson_slug() function';
  RAISE NOTICE '✅ Created set_lesson_slug() trigger';
  RAISE NOTICE '✅ Added unique constraint on (course_id, slug)';
  RAISE NOTICE '✅ Back-filled existing lessons with slugs';
  RAISE NOTICE '🚀 Ready for Phase 3.1 URL structure optimization!';
END $$;
