-- Migration: Fix posts RLS policy to allow access to posts in public spaces
-- Created: 2025-06-18
-- Purpose: Allow users to read posts in public spaces without requiring membership

-- Function to check if a space is public
CREATE OR REPLACE FUNCTION public.is_space_public(space_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM spaces 
    WHERE id = space_id 
    AND is_private = false
  );
END;
$$;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can read posts in their spaces" ON public.posts;

-- Create new SELECT policy that allows:
-- 1. Users to read posts in spaces they are members of (existing behavior)
-- 2. Anyone to read posts in public spaces (new behavior)
CREATE POLICY "Users can read posts in their spaces or public spaces"
ON public.posts
FOR SELECT
USING (
  is_space_member(space_id) OR
  is_space_public(space_id)
);

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_space_public(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.is_space_public(UUID) IS 'Checks if a space is public (is_private = false)'; 