-- Drop the remaining public SELECT policies on storage.objects.
--
-- Public buckets (`public: true` on storage.buckets) serve object URLs via
-- the CDN endpoint `/storage/v1/object/public/<bucket>/<path>` WITHOUT
-- consulting storage.objects RLS. These public SELECT policies were only
-- doing one thing: permitting `.list()` on the bucket, which the advisor
-- (public_bucket_allows_listing) correctly flagged as "broader than you
-- want for a public bucket."
--
-- The two client-side callers of `.list()` (SpaceMediaGallery's probe,
-- media-storage's checkStorageAvailability) are refactored in the
-- accompanying code change to rely on the session check only. The upload
-- path (.upload(), INSERT policy) is unchanged. Object URLs via CDN are
-- unaffected.
--
-- StorageDebugger still calls .list() on the `media` bucket; that's a
-- dev-only page and its feature degradation is acceptable.

DROP POLICY IF EXISTS "Anyone can view avatars"                ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access"               ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read files"             ON storage.objects;
DROP POLICY IF EXISTS "Public read access for post media 8o6wzb_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read space-covers"      ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read space-icons"       ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to space media" ON storage.objects;
