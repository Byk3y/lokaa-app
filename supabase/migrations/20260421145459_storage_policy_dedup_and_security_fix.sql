-- Storage bucket policies cleanup. Two concerns:
--
-- 1. SECURITY BUGS: several policies grant ALL ops to the public role on
--    the `media` bucket ("Media Full Access", "Media bucket public access",
--    "Media Owner Delete/Update" with roles={-}). In plain English:
--    any anonymous visitor could DELETE or UPDATE any file in the media
--    bucket. Also `space-media` had two "Temporary" policies that let any
--    authenticated user manage any file in the bucket. All dropped.
--
-- 2. DUPLICATES: the media bucket had 3 INSERT policies for authenticated
--    (one of them gated on a bizarre "space_<id> is in the space name"
--    check that doesn't match real uploads), 2 DELETE policies with the
--    same owner scope, 2 UPDATE policies with the same scope, and 2 public
--    SELECT policies. Space-media had 2 public SELECT policies. Deduped.
--
-- End state: each bucket has one public SELECT (for CDN URL access and
-- client `.list()` availability probes), one authenticated INSERT, and
-- owner-scoped UPDATE/DELETE. Known remaining advisor warning:
-- "Public Bucket Allows Listing" still fires for each bucket because the
-- lone public SELECT technically permits LIST. That's intentional —
-- SpaceMediaGallery and media-storage.ts use `.list()` as an availability
-- probe. Pre-launch we accept the lint; post-launch consider switching
-- those probes to HEAD-URL checks and removing the SELECT policies.

-- media — drop dangerous and redundant policies
DROP POLICY IF EXISTS "Media Full Access"              ON storage.objects;
DROP POLICY IF EXISTS "Media bucket public access"     ON storage.objects;
DROP POLICY IF EXISTS "Media Owner Delete"             ON storage.objects;
DROP POLICY IF EXISTS "Media Owner Update"             ON storage.objects;
DROP POLICY IF EXISTS "Media Authenticated Delete"     ON storage.objects;
DROP POLICY IF EXISTS "Media Authenticated Update"     ON storage.objects;
DROP POLICY IF EXISTS "Media Authenticated Insert"     ON storage.objects;
DROP POLICY IF EXISTS "Media Authenticated Upload"     ON storage.objects;
DROP POLICY IF EXISTS "Media Public Access"            ON storage.objects;

-- space-media — drop dangerous "Temporary" grants and duplicate SELECT
DROP POLICY IF EXISTS "Temporary - Allow all authenticated users to manage space-media" ON storage.objects;
DROP POLICY IF EXISTS "Temporary - Allow all authenticated users to upload to space-me" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for space media" ON storage.objects;

-- Add a proper authenticated INSERT for space-media. Post-launch this
-- should be tightened to require space membership, but pre-launch a
-- basic authenticated check is enough to keep uploads working.
CREATE POLICY "space_media_authenticated_upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'space-media');

CREATE POLICY "space_media_owner_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'space-media' AND owner = (SELECT auth.uid()))
  WITH CHECK (bucket_id = 'space-media' AND owner = (SELECT auth.uid()));

CREATE POLICY "space_media_owner_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'space-media' AND owner = (SELECT auth.uid()));
