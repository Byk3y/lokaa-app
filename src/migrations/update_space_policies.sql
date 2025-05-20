-- UPDATED SOLUTION: Fix space policies recursion by first checking what exists

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

-- Step 2: Drop the problematic policies one by one
DO $$
BEGIN
    -- Drop existing policies one by one, ignoring errors if they don't exist
    BEGIN
        DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON spaces;
    EXCEPTION WHEN OTHERS THEN
        -- Do nothing, policy didn't exist
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON spaces;
    EXCEPTION WHEN OTHERS THEN
        -- Do nothing, policy didn't exist
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable update for users based on owner_id" ON spaces;
    EXCEPTION WHEN OTHERS THEN
        -- Do nothing, policy didn't exist
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Enable delete for users based on owner_id" ON spaces;
    EXCEPTION WHEN OTHERS THEN
        -- Do nothing, policy didn't exist
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Read spaces for authenticated users" ON spaces;
    EXCEPTION WHEN OTHERS THEN
        -- Do nothing, policy didn't exist
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Insert spaces for authenticated users" ON spaces;
    EXCEPTION WHEN OTHERS THEN
        -- Do nothing, policy didn't exist
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Update spaces for owners" ON spaces;
    EXCEPTION WHEN OTHERS THEN
        -- Do nothing, policy didn't exist
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Delete spaces for owners" ON spaces;
    EXCEPTION WHEN OTHERS THEN
        -- Do nothing, policy didn't exist
    END;
END $$;

-- Step 3: Create the policies with IF NOT EXISTS
DO $$
BEGIN
    -- Check if "Read spaces for authenticated users" policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'spaces' 
        AND policyname = 'Read spaces for authenticated users'
    ) THEN
        EXECUTE 'CREATE POLICY "Read spaces for authenticated users" ON spaces
            FOR SELECT
            TO authenticated
            USING (
                auth.uid() = owner_id OR
                public.is_active_member_of_space(spaces.id, auth.uid())
            )';
    END IF;
    
    -- Check if "Insert spaces for authenticated users" policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'spaces' 
        AND policyname = 'Insert spaces for authenticated users'
    ) THEN
        EXECUTE 'CREATE POLICY "Insert spaces for authenticated users" ON spaces
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = owner_id)';
    END IF;
    
    -- Check if "Update spaces for owners" policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'spaces' 
        AND policyname = 'Update spaces for owners'
    ) THEN
        EXECUTE 'CREATE POLICY "Update spaces for owners" ON spaces
            FOR UPDATE
            TO authenticated
            USING (auth.uid() = owner_id)
            WITH CHECK (auth.uid() = owner_id)';
    END IF;
    
    -- Check if "Delete spaces for owners" policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'spaces' 
        AND policyname = 'Delete spaces for owners'
    ) THEN
        EXECUTE 'CREATE POLICY "Delete spaces for owners" ON spaces
            FOR DELETE
            TO authenticated
            USING (auth.uid() = owner_id)';
    END IF;
END $$;

-- Make sure RLS is enabled for both tables
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_access ENABLE ROW LEVEL SECURITY;

-- Create policies for space_access table if they don't exist
DO $$
BEGIN
    -- Check if "Space owners can manage access" policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'space_access' 
        AND policyname = 'Space owners can manage access'
    ) THEN
        EXECUTE 'CREATE POLICY "Space owners can manage access" ON space_access
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM spaces 
                    WHERE spaces.id = space_access.space_id 
                    AND spaces.owner_id = auth.uid()
                )
            )';
    END IF;
    
    -- Check if "Users can view their own access" policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'space_access' 
        AND policyname = 'Users can view their own access'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can view their own access" ON space_access
            FOR SELECT
            TO authenticated
            USING (user_id = auth.uid())';
    END IF;
END $$;

-- Function to safely create a space
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
  
  -- Return the space ID and subdomain for navigation
  SELECT jsonb_build_object(
    'id', new_space_id,
    'subdomain', space_subdomain
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 