-- Create the media storage bucket if it doesn't exist
-- First drop the bucket if it already exists (to clean up previous attempts)
DROP BUCKET IF EXISTS "media";

-- Create the bucket with public access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media', 
  'media', 
  true, 
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'text/plain']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'text/plain'];

-- Create test directory
INSERT INTO storage.objects (id, bucket_id, name, owner, created_at, updated_at, metadata)
SELECT
  gen_random_uuid(),
  'media',
  'test/',
  auth.uid(),
  now(),
  now(),
  '{}'
ON CONFLICT DO NOTHING;

-- Create public directory
INSERT INTO storage.objects (id, bucket_id, name, owner, created_at, updated_at, metadata)
SELECT
  gen_random_uuid(),
  'media',
  'public/',
  auth.uid(),
  now(),
  now(),
  '{}'
ON CONFLICT DO NOTHING;

-- Create spaces directory
INSERT INTO storage.objects (id, bucket_id, name, owner, created_at, updated_at, metadata)
SELECT
  gen_random_uuid(),
  'media',
  'spaces/',
  auth.uid(),
  now(),
  now(),
  '{}'
ON CONFLICT DO NOTHING;

-- Enable row level security
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for the media bucket if they exist
DROP POLICY IF EXISTS "Media bucket read access for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Media bucket insert access for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Media bucket update access for owners" ON storage.objects;
DROP POLICY IF EXISTS "Media bucket delete access for owners" ON storage.objects;
DROP POLICY IF EXISTS "Media bucket public read access" ON storage.objects;

-- Create policies for the media bucket
-- 1. Allow authenticated users to read any files in the media bucket
CREATE POLICY "Media bucket read access for authenticated users"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'media' 
  AND auth.role() = 'authenticated'
);

-- 2. Allow authenticated users to insert their own files in the media bucket
CREATE POLICY "Media bucket insert access for authenticated users"
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'spaces'
);

-- 3. Allow users to update their own files in the media bucket
CREATE POLICY "Media bucket update access for owners"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'spaces'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'spaces'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 4. Allow users to delete their own files in the media bucket
CREATE POLICY "Media bucket delete access for owners"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'spaces'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 5. Allow anonymous users to read public files
CREATE POLICY "Media bucket public read access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'media' 
  AND ((storage.foldername(name))[1] = 'public' OR bucket_id = 'media')
);

-- 6. Allow access to test directory for testing permissions
CREATE POLICY "Media bucket test directory access"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] = 'test'
)
WITH CHECK (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] = 'test'
); 