-- Update the media storage bucket with simple permissions
-- First drop the bucket if it already exists (to clean up previous attempts)
DROP BUCKET IF EXISTS "media";

-- Create a new bucket with public access
CREATE BUCKET IF NOT EXISTS "media" WITH (
  public = true,
  file_size_limit = '50MB',
  allowed_mime_types = '{image/jpeg,image/png,image/gif,image/webp,video/mp4,text/plain}'
);

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Media bucket read access for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Media bucket insert access for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Media bucket update access for owners" ON storage.objects;
DROP POLICY IF EXISTS "Media bucket delete access for owners" ON storage.objects;
DROP POLICY IF EXISTS "Media bucket public read access" ON storage.objects;
DROP POLICY IF EXISTS "Media bucket test directory access" ON storage.objects;

-- Create simple policies
-- Allow everyone to read from the media bucket
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Allow authenticated users to insert into the media bucket
CREATE POLICY "Allow authenticated users to upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Allow authenticated users to update media they own
CREATE POLICY "Allow authenticated users to update own media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media' AND owner = auth.uid());

-- Allow authenticated users to delete media they own
CREATE POLICY "Allow authenticated users to delete own media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND owner = auth.uid()); 