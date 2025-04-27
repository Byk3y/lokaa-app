-- Migration to fix the infinite recursion in spaces table RLS policies
-- Problem: Current policies create recursive queries when checking access

-- Step 1: Drop all existing policies on the spaces table
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'spaces'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON spaces', policy_record.policyname);
    RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
  END LOOP;
END $$;

-- Step 2: Create new non-recursive policies that allow:
-- 1. Users to access spaces they own (spaces.owner_id = auth.uid())
-- 2. Users to access public spaces (spaces.is_private = false)

-- Policy for SELECT - Allow access to owned spaces AND public spaces
CREATE POLICY "spaces_select_owned_and_public" ON spaces
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id OR  -- User owns the space
    is_private = false        -- Space is public
  );

-- Policy for INSERT - Users can only create spaces they own
CREATE POLICY "spaces_insert_owned" ON spaces
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Policy for UPDATE - Only owners can update their spaces
CREATE POLICY "spaces_update_owned" ON spaces
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy for DELETE - Only owners can delete their spaces
CREATE POLICY "spaces_delete_owned" ON spaces
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Step 3: Make sure RLS is enabled
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

-- Step 4: Create/update function to get public spaces without recursion
CREATE OR REPLACE FUNCTION get_public_spaces()
RETURNS SETOF spaces AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM spaces
  WHERE is_private = false
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 