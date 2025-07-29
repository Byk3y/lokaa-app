-- ============================================================================
-- MIGRATION: Create Educational Content System
-- ============================================================================
-- This migration creates the new educational content system that properly
-- separates educational content from social posts.
-- 
-- This replaces the terrible practice of storing lessons as posts.
-- ============================================================================

-- Create educational content type enum
CREATE TYPE IF NOT EXISTS educational_content_type AS ENUM (
  'text',
  'rich_text',
  'video_upload',
  'video_embed',
  'image',
  'document',
  'audio',
  'quiz',
  'assignment',
  'external_link'
);

-- Create educational content table
CREATE TABLE IF NOT EXISTS educational_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content identification
  title TEXT NOT NULL,
  content_type educational_content_type NOT NULL DEFAULT 'rich_text',
  
  -- Text content (for text and rich_text types)
  text_content TEXT,
  
  -- Media content
  media_url TEXT,
  media_metadata JSONB DEFAULT '{}',
  thumbnail_url TEXT,
  
  -- Embed data (for video_embed, external_link)
  embed_data JSONB DEFAULT '{}',
  
  -- Content settings
  estimated_duration INTEGER, -- in minutes
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing fields to course_lessons table
ALTER TABLE course_lessons 
ADD COLUMN IF NOT EXISTS content_id UUID REFERENCES educational_content(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS estimated_duration INTEGER, -- in minutes
ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
ADD COLUMN IF NOT EXISTS prerequisites TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS learning_objectives TEXT[] DEFAULT '{}';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_educational_content_content_type ON educational_content(content_type);
CREATE INDEX IF NOT EXISTS idx_educational_content_difficulty ON educational_content(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_course_lessons_content_id ON course_lessons(content_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_is_published ON course_lessons(is_published);

-- Create updated_at trigger for educational_content
CREATE OR REPLACE FUNCTION update_educational_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_educational_content_updated_at
  BEFORE UPDATE ON educational_content
  FOR EACH ROW
  EXECUTE FUNCTION update_educational_content_updated_at();

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🎉 Educational content system created successfully!';
  RAISE NOTICE '✅ Added missing fields to course_lessons table';
  RAISE NOTICE '📚 Educational content now properly separated from social posts';
  RAISE NOTICE '🚀 Ready for data migration from posts system';
END $$; 