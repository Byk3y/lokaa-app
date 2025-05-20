-- Fix infinite recursion policy error for space_access table

-- First, drop any potentially recursive policies on space_access
DROP POLICY IF EXISTS "Members can view other members" ON space_access;
DROP POLICY IF EXISTS "Allow users to join spaces" ON space_access;

-- Create a simpler policy that doesn't check itself recursively
CREATE POLICY "Members can view members without recursion" ON space_access
    FOR SELECT
    TO authenticated
    USING (
        is_active = true OR -- Always show active records
        user_id = auth.uid() -- Always show user's own records
    );

-- Create a simple insert policy
CREATE POLICY "Simple insert policy for space_access" ON space_access
    FOR INSERT
    TO authenticated
    WITH CHECK (false); -- Make table effectively read-only via this policy for new inserts

-- Create a simple update policy
CREATE POLICY "Simple update policy for space_access" ON space_access
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
    )
    WITH CHECK (
        user_id = auth.uid()
    );

-- Make sure RLS is enabled
ALTER TABLE space_access ENABLE ROW LEVEL SECURITY; 