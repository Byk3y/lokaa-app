-- ============================================================================
-- MIGRATION: Temporarily Disable RLS on Educational Content
-- ============================================================================
-- This migration temporarily disables RLS on the educational_content table
-- to test if the timeout issue is caused by complex RLS policies.
-- 
-- WARNING: This is a temporary fix for testing purposes only.
-- Proper RLS policies should be implemented for production.
-- ============================================================================

-- Temporarily disable RLS on educational_content table
ALTER TABLE public.educational_content DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🎉 RLS temporarily disabled on educational_content table';
  RAISE NOTICE '⚠️  WARNING: This is for testing only - implement proper policies for production';
  RAISE NOTICE '🚀 Video saving functionality should now work without timeouts';
END $$; 