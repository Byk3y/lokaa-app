-- Fix for the infinite recursion in space_members table policies

-- Step 1: First check and drop any problematic policies on space_members table
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'space_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON space_members', policy_record.policyname);
    RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
  END LOOP;
END $$;

-- Step 2: Create new simplified policies that won't cause infinite recursion

-- Policy for SELECT - Allow users to see their own memberships and space owners to see all memberships
CREATE POLICY "space_members_select_policy" ON space_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR  -- User can see their own memberships
    EXISTS (                 -- Space owners can see all memberships for their spaces
      SELECT 1 FROM spaces 
      WHERE spaces.id = space_members.space_id 
      AND spaces.owner_id = auth.uid()
    )
  );

-- Policy for INSERT - Space owners can add members
CREATE POLICY "space_members_insert_policy" ON space_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to add themselves to public spaces
    (
      user_id = auth.uid() AND
      EXISTS (
        SELECT 1 FROM spaces 
        WHERE spaces.id = space_members.space_id 
        AND spaces.is_private = false
      )
    )
    OR
    -- Allow space owners to add any user
    EXISTS (
      SELECT 1 FROM spaces 
      WHERE spaces.id = space_members.space_id 
      AND spaces.owner_id = auth.uid()
    )
  );

-- Policy for UPDATE - Space owners can update memberships
CREATE POLICY "space_members_update_policy" ON space_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM spaces 
      WHERE spaces.id = space_members.space_id 
      AND spaces.owner_id = auth.uid()
    )
  );

-- Policy for DELETE - Space owners can remove members, users can remove themselves
CREATE POLICY "space_members_delete_policy" ON space_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR  -- Users can remove themselves
    EXISTS (                 -- Space owners can remove any member
      SELECT 1 FROM spaces 
      WHERE spaces.id = space_members.space_id 
      AND spaces.owner_id = auth.uid()
    )
  );

-- Make sure RLS is enabled
ALTER TABLE space_members ENABLE ROW LEVEL SECURITY;

-- Create a helper function that can be used to check membership without recursion
CREATE OR REPLACE FUNCTION check_space_membership(space_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM space_members
    WHERE space_members.space_id = $1
    AND space_members.user_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 