-- SUPABASE STORAGE PERMISSIONS FIX
-- Run this in the Supabase SQL Editor

-- First, check for existing policies on storage.objects
SELECT 
  p.polname as policy_name,
  p.polpermissive,
  pg_get_expr(p.polqual, t.oid) as policy_definition,
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as command
FROM pg_policy p
JOIN pg_class t ON p.polrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE n.nspname = 'storage' AND t.relname = 'objects'
ORDER BY p.polname;

-- Drop existing policies if they conflict
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public viewing" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to update and delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to delete" ON storage.objects;

-- Create a simple permissive policy for the media bucket
-- This is deliberately very permissive to help debug
CREATE POLICY "Media bucket public access" ON storage.objects
FOR ALL
USING (bucket_id = 'media')
WITH CHECK (bucket_id = 'media');

-- Create a simpler set of policies (uncomment these if the above doesn't work)
/*
-- Allow anyone to read from the media bucket
CREATE POLICY "Media bucket public read" ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'media');

-- Allow authenticated users to upload to the media bucket
CREATE POLICY "Media bucket authenticated uploads" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Allow authenticated users to update their own files
CREATE POLICY "Media bucket file updates" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'media' AND (owner = auth.uid() OR owner IS NULL));

-- Allow authenticated users to delete their own files
CREATE POLICY "Media bucket file deletion" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND (owner = auth.uid() OR owner IS NULL));
*/

-- Enable RLS (should already be enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Test query to check if policies are working
SELECT * FROM storage.objects WHERE bucket_id = 'media' LIMIT 5;

-- Note: After running this script, try uploading a file through the UI
-- to check if the permissions are now working correctly 