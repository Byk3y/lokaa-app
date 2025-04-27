-- EMERGENCY POLICY FIX - Run this in the SQL Editor

-- PART 1: Drop ALL space policies, regardless of name
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

-- PART 2: Create only the most basic minimal policies (no fancy conditions)
-- Simple SELECT policy (owners can view their spaces)
CREATE POLICY "spaces_select" ON spaces
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

-- Simple INSERT policy (users can create their own spaces)
CREATE POLICY "spaces_insert" ON spaces
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- PART 3: Grant service role permissions directly (bypass Row Level Security)
-- This function has SECURITY DEFINER to execute with DB owner privileges
CREATE OR REPLACE FUNCTION admin_create_space(
  space_name TEXT,
  space_subdomain TEXT,
  owner_id UUID
) RETURNS UUID AS $$
DECLARE
  new_space_id UUID;
BEGIN
  -- Direct insert with admin privileges
  INSERT INTO spaces (
    name,
    subdomain,
    owner_id,
    created_at
  ) VALUES (
    space_name,
    space_subdomain,
    owner_id,
    NOW()
  )
  RETURNING id INTO new_space_id;
  
  -- Return the new space ID
  RETURN new_space_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 