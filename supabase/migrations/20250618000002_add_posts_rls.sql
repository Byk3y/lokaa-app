-- Migration: Add Row Level Security policies for posts table
-- Created: 2025-06-18
-- Purpose: Ensure proper access control for posts based on space membership

-- Enable RLS on posts table
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Function to check if user is a member of a space
CREATE OR REPLACE FUNCTION public.is_space_member(space_id UUID, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM space_members 
    WHERE space_id = $1 
    AND user_id = $2 
    AND status = 'active'
  );
END;
$$;

-- Function to check if user is an admin of a space
CREATE OR REPLACE FUNCTION public.is_space_admin(space_id UUID, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM space_members 
    WHERE space_id = $1 
    AND user_id = $2 
    AND status = 'active'
    AND role IN ('admin', 'owner')
  );
END;
$$;

-- Policy: Users can read posts in spaces they are members of
CREATE POLICY "Users can read posts in their spaces"
ON public.posts
FOR SELECT
USING (
  is_space_member(space_id)
);

-- Policy: Users can create posts in spaces they are members of
CREATE POLICY "Users can create posts in their spaces"
ON public.posts
FOR INSERT
WITH CHECK (
  is_space_member(space_id)
);

-- Policy: Users can update their own posts
CREATE POLICY "Users can update their own posts"
ON public.posts
FOR UPDATE
USING (
  auth.uid() = user_id
)
WITH CHECK (
  is_space_member(space_id)
);

-- Policy: Space admins can update any post in their space
CREATE POLICY "Admins can update any post in their spaces"
ON public.posts
FOR UPDATE
USING (
  is_space_admin(space_id)
)
WITH CHECK (
  is_space_admin(space_id)
);

-- Policy: Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
ON public.posts
FOR DELETE
USING (
  auth.uid() = user_id AND is_space_member(space_id)
);

-- Policy: Space admins can delete any post in their space
CREATE POLICY "Admins can delete any post in their spaces"
ON public.posts
FOR DELETE
USING (
  is_space_admin(space_id)
);

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.is_space_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_space_admin(UUID, UUID) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.is_space_member(UUID, UUID) IS 'Checks if a user is an active member of a space';
COMMENT ON FUNCTION public.is_space_admin(UUID, UUID) IS 'Checks if a user is an admin or owner of a space'; 