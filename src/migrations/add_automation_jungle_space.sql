-- Migration to create the automation-jungle space and ensure it's accessible
-- This script will:
-- 1. Create the space if it doesn't exist
-- 2. Make it public (non-private)
-- 3. Add a policy that makes it visible to all users

-- First, check if the automation-jungle space exists
DO $$
DECLARE
  space_id UUID;
  admin_user_id UUID;
BEGIN
  -- Find the admin user (this assumes there's at least one user)
  SELECT id INTO admin_user_id FROM auth.users LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in the system';
  END IF;
  
  -- Check if the space exists
  SELECT id INTO space_id 
  FROM spaces 
  WHERE subdomain = 'automation-jungle';
  
  -- If the space doesn't exist, create it
  IF space_id IS NULL THEN
    INSERT INTO spaces (
      name, 
      subdomain, 
      description, 
      owner_id, 
      is_private,
      created_at,
      updated_at
    ) VALUES (
      'Automation Jungle', 
      'automation-jungle', 
      'A space for testing automation features', 
      admin_user_id, 
      FALSE,
      NOW(),
      NOW()
    )
    RETURNING id INTO space_id;
    
    RAISE NOTICE 'Created automation-jungle space with ID %', space_id;
  ELSE
    -- Make sure it's not private
    UPDATE spaces 
    SET 
      is_private = FALSE,
      description = COALESCE(description, 'A space for testing automation features')
    WHERE id = space_id;
    
    RAISE NOTICE 'Updated existing automation-jungle space with ID %', space_id;
  END IF;

  -- Add the current user to the space
  -- First check if the user already has access
  IF NOT EXISTS (
    SELECT 1 
    FROM space_access 
    WHERE 
      space_id = space_id AND 
      user_id = auth.uid() AND
      is_active = TRUE
  ) THEN
    -- Add the user to the space
    INSERT INTO space_access (
      space_id,
      user_id,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      space_id,
      auth.uid(),
      TRUE,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Added current user to automation-jungle space';
  END IF;
  
  -- Create a special policy for this specific space
  DROP POLICY IF EXISTS "Allow viewing automation-jungle space" ON spaces;
  
  CREATE POLICY "Allow viewing automation-jungle space" ON spaces
    FOR SELECT
    TO authenticated
    USING (subdomain = 'automation-jungle');
    
  RAISE NOTICE 'Created policy for automation-jungle space';
END $$; 