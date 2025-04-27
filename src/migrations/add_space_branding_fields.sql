-- Migration: Add space branding fields
-- This migration adds fields to support customization of space branding and about pages
-- Date: October 2023

-- Add columns for space branding if they don't exist yet
DO $$
BEGIN
  -- Add cover_image column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'spaces' AND column_name = 'cover_image') THEN
    ALTER TABLE public.spaces ADD COLUMN cover_image TEXT;
    RAISE NOTICE 'Added cover_image column to spaces table';
  END IF;

  -- Add icon_image column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'spaces' AND column_name = 'icon_image') THEN
    ALTER TABLE public.spaces ADD COLUMN icon_image TEXT;
    RAISE NOTICE 'Added icon_image column to spaces table';
  END IF;

  -- Add description column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'spaces' AND column_name = 'description') THEN
    ALTER TABLE public.spaces ADD COLUMN description TEXT;
    RAISE NOTICE 'Added description column to spaces table';
  END IF;

  -- Add primary_color column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'spaces' AND column_name = 'primary_color') THEN
    ALTER TABLE public.spaces ADD COLUMN primary_color TEXT DEFAULT '#00BFFF';
    RAISE NOTICE 'Added primary_color column to spaces table';
  END IF;

  -- Add initials column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'spaces' AND column_name = 'initials') THEN
    ALTER TABLE public.spaces ADD COLUMN initials TEXT;
    RAISE NOTICE 'Added initials column to spaces table';
  END IF;

  RAISE NOTICE 'Space branding fields migration completed';
END $$; 