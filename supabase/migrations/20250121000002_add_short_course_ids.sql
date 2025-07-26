-- ============================================================================
-- MIGRATION: Add Short Course IDs for Cleaner URLs
-- ============================================================================
-- This migration adds short_id fields to courses table to enable
-- shorter, cleaner URLs similar to Skool's approach.
-- 
-- Skool uses short IDs like "2f447d5e" instead of full UUIDs
-- for much cleaner URLs.
-- ============================================================================

-- Add short_id column to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS short_id VARCHAR(8);

-- Create unique index for short_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_short_id_unique 
ON courses(short_id) 
WHERE short_id IS NOT NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_courses_short_id ON courses(short_id);

-- ============================================================================
-- GENERATE SHORT IDs FOR EXISTING COURSES
-- ============================================================================

-- Function to generate a random 8-character alphanumeric ID
CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars))::integer + 1, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique short ID
CREATE OR REPLACE FUNCTION generate_unique_short_id()
RETURNS TEXT AS $$
DECLARE
    new_short_id TEXT;
    counter INTEGER := 0;
BEGIN
    LOOP
        new_short_id := generate_short_id();
        
        -- Check if this short_id already exists
        IF NOT EXISTS (SELECT 1 FROM courses WHERE short_id = new_short_id) THEN
            RETURN new_short_id;
        END IF;
        
        -- Prevent infinite loop
        counter := counter + 1;
        IF counter > 100 THEN
            RAISE EXCEPTION 'Unable to generate unique short_id after 100 attempts';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Generate short IDs for existing courses that don't have them
UPDATE courses 
SET short_id = generate_unique_short_id()
WHERE short_id IS NULL;

-- ============================================================================
-- ADD TRIGGER FOR AUTO-GENERATION
-- ============================================================================

-- Function to auto-generate short_id on insert
CREATE OR REPLACE FUNCTION auto_generate_short_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate short_id if it's not provided
    IF NEW.short_id IS NULL OR NEW.short_id = '' THEN
        NEW.short_id := generate_unique_short_id();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating short_id
DROP TRIGGER IF EXISTS trigger_auto_generate_short_id ON courses;
CREATE TRIGGER trigger_auto_generate_short_id
    BEFORE INSERT ON courses
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_short_id();

-- ============================================================================
-- LOG MIGRATION COMPLETION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Successfully added short course IDs to % courses', 
        (SELECT COUNT(*) FROM courses WHERE short_id IS NOT NULL);
    RAISE NOTICE '🔗 URLs now use short IDs: /classroom/short_id?md=lesson_id';
    RAISE NOTICE '📏 URL length reduced from ~36 chars to ~8 chars for course IDs';
END $$; 