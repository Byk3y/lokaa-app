-- ============================================================================
-- FIX: Disable RLS on Educational Content Table
-- ============================================================================
-- This script fixes the 504 Gateway Timeout issue when saving videos
-- by temporarily disabling RLS on the educational_content table.
-- 
-- Run this in your Supabase Dashboard > SQL Editor
-- ============================================================================

-- Temporarily disable RLS on educational_content table
ALTER TABLE public.educational_content DISABLE ROW LEVEL SECURITY;

-- Verify the change
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'educational_content';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🎉 RLS disabled on educational_content table';
  RAISE NOTICE '🚀 Video saving should now work without timeouts';
  RAISE NOTICE '⚠️  Remember to implement proper RLS policies later';
END $$; 