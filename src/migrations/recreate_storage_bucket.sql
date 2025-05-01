-- Recreate media storage bucket with simplified permissions
-- This follows the standard Supabase RLS patterns more closely

-- Drop existing bucket if it exists
DROP BUCKET IF EXISTS "media";

-- Create the media bucket with proper settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  TRUE, -- Make the bucket public by default
  52428800, -- 50MB size limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4']::text[]
);

-- Enable RLS on the buckets table
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies for this bucket
DROP POLICY IF EXISTS "Media Bucket Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Media Bucket Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Media Bucket Owner Update" ON storage.objects;
DROP POLICY IF EXISTS "Media Bucket Owner Delete" ON storage.objects;

-- Policy 1: Allow public read access to all objects
CREATE POLICY "Media Bucket Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Policy 2: Allow authenticated users to upload files
CREATE POLICY "Media Bucket Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' 
  AND (auth.uid() = owner OR auth.uid() IS NOT NULL)
);

-- Policy 3: Allow users to update their own files
CREATE POLICY "Media Bucket Owner Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media' AND owner = auth.uid())
WITH CHECK (bucket_id = 'media' AND owner = auth.uid());

-- Policy 4: Allow users to delete their own files
CREATE POLICY "Media Bucket Owner Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND owner = auth.uid());

-- Create required directories by adding placeholder files
-- These will be automatically removed by our directory creation logic in the UI 