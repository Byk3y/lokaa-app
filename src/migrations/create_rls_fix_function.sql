-- Create a function that can be called from the client to fix the space RLS policies
-- This is a security_definer function that can bypass RLS to fix the problem

CREATE OR REPLACE FUNCTION fix_spaces_rls_policy()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  policy_count int := 0;
  result jsonb;
BEGIN
  -- Drop all existing policies on the spaces table
  FOR policy_count IN
    EXECUTE '
      SELECT COUNT(*) FROM pg_policies WHERE tablename = ''spaces''
    '
  LOOP
    -- Just getting the count
  END LOOP;
  
  -- Drop existing policies
  EXECUTE '
    DO $policy_drop$
    DECLARE
      policy_record RECORD;
    BEGIN
      FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = ''spaces''
      LOOP
        EXECUTE format(''DROP POLICY IF EXISTS %I ON spaces'', policy_record.policyname);
      END LOOP;
    END $policy_drop$;
  ';

  -- Create simplified SELECT policy
  EXECUTE '
    CREATE POLICY "spaces_access_policy" ON spaces
      FOR SELECT
      TO authenticated
      USING (
        owner_id = auth.uid() OR
        is_private = false
      )
  ';
  
  -- Simple INSERT policy
  EXECUTE '
    CREATE POLICY "spaces_insert_policy" ON spaces
      FOR INSERT
      TO authenticated
      WITH CHECK (owner_id = auth.uid())
  ';
  
  -- Simple UPDATE policy
  EXECUTE '
    CREATE POLICY "spaces_update_policy" ON spaces
      FOR UPDATE
      TO authenticated
      USING (owner_id = auth.uid())
  ';
  
  -- Simple DELETE policy
  EXECUTE '
    CREATE POLICY "spaces_delete_policy" ON spaces
      FOR DELETE
      TO authenticated
      USING (owner_id = auth.uid())
  ';
  
  -- Make sure RLS is enabled
  EXECUTE 'ALTER TABLE spaces ENABLE ROW LEVEL SECURITY';
  
  -- Return success
  SELECT jsonb_build_object(
    'success', true,
    'message', 'Successfully fixed spaces RLS policy',
    'policies_dropped', policy_count,
    'policies_created', 4
  ) INTO result;
  
  RETURN result;
END;
$$; 