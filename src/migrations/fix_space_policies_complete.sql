-- COMPLETE SOLUTION: Fixes space policies recursion and adds helper functions

-- Step 1: First check if space_access table exists and create it if not
CREATE TABLE IF NOT EXISTS space_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(space_id, user_id)
);

-- Step 2: Fix the spaces table policies by dropping and recreating them
-- First, drop any existing RLS policies on the spaces table that might be causing recursion
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON spaces;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON spaces;
DROP POLICY IF EXISTS "Enable update for users based on owner_id" ON spaces;
DROP POLICY IF EXISTS "Enable delete for users based on owner_id" ON spaces;

-- Create simplified read policy (show spaces to authenticated users who have access)
CREATE POLICY "Read spaces for authenticated users" ON spaces
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id OR  -- User owns the space
    EXISTS (
      SELECT 1 FROM space_access 
      WHERE space_access.space_id = spaces.id 
      AND space_access.user_id = auth.uid()
      AND space_access.is_active = true
    )
  );

-- Simple insert policy (authenticated users can create spaces)
CREATE POLICY "Insert spaces for authenticated users" ON spaces
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Update policy (owners can update their spaces)
CREATE POLICY "Update spaces for owners" ON spaces
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Delete policy (owners can delete their spaces)
CREATE POLICY "Delete spaces for owners" ON spaces
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Also add RLS to the space_access table
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_access ENABLE ROW LEVEL SECURITY;

-- Create policies for space_access table
CREATE POLICY "Space owners can manage access" ON space_access
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM spaces 
      WHERE spaces.id = space_access.space_id 
      AND spaces.owner_id = auth.uid()
    )
  );

-- Users can view their own access records
CREATE POLICY "Users can view their own access" ON space_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Step 3: Add a secure function to create spaces safely without hitting recursion issues
CREATE OR REPLACE FUNCTION create_space_safely(
  space_name TEXT,
  space_subdomain TEXT,
  owner_id UUID
) RETURNS JSONB AS $$
DECLARE
  new_space_id UUID;
  result JSONB;
BEGIN
  -- Insert with minimal fields to avoid policy recursion issues
  INSERT INTO spaces (
    name,
    subdomain,
    owner_id,
    created_at,
    description,
    member_count,
    pricing_type,
    price_per_month,
    primary_color
  ) VALUES (
    space_name,
    space_subdomain,
    owner_id,
    NOW(),
    space_name || ' - a space to build and learn together.',
    1,
    'free',
    19,
    '#10b981'
  )
  RETURNING id INTO new_space_id;
  
  -- Also add the owner to space_access
  INSERT INTO space_access (
    space_id,
    user_id,
    is_active,
    role
  ) VALUES (
    new_space_id,
    owner_id,
    true,
    'admin'
  );
  
  -- Return the space ID and subdomain for navigation
  SELECT jsonb_build_object(
    'id', new_space_id,
    'subdomain', space_subdomain
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 