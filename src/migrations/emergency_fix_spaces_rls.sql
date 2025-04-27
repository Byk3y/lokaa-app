-- EMERGENCY FIX: Resolve infinite recursion in spaces table RLS policy
-- This script fixes the 500 Internal Server Error during space access checks

-- 1. Drop all existing policies on the spaces table to eliminate recursive queries
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

-- 2. Create a simplified SELECT policy that allows:
--    - Users to see their owned spaces (owner_id = auth.uid())
--    - Everyone to see public spaces (is_private = false)
--    This avoids recursive queries that caused the 500 error
CREATE POLICY "spaces_access_policy" ON spaces
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR   -- User owns the space
    is_private = false         -- Space is public
  );

-- 3. Basic policies for modification (these don't cause recursion)
CREATE POLICY "spaces_insert_policy" ON spaces
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "spaces_update_policy" ON spaces
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "spaces_delete_policy" ON spaces
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- 4. Make sure RLS is enabled
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

-- 5. Update the public spaces function to avoid recursion
CREATE OR REPLACE FUNCTION get_public_spaces()
RETURNS SETOF spaces AS $$
BEGIN
  -- Security definer means this runs with elevated privileges,
  -- bypassing RLS and avoiding the recursion
  RETURN QUERY
  SELECT *
  FROM spaces
  WHERE is_private = false
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 