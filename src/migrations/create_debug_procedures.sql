-- RPC functions for debugging space access issues
-- These can be called from the client using supabase.rpc()

-- First create the diagnostic function if it doesn't already exist
CREATE OR REPLACE FUNCTION check_user_space_access(
  target_user_id UUID,
  target_space_subdomain TEXT
) RETURNS JSONB AS $$
DECLARE
  space_record RECORD;
  access_records JSON;
  space_id UUID;
  is_owner BOOLEAN;
  has_access BOOLEAN;
  result JSONB;
BEGIN
  -- Get the space record
  SELECT * INTO space_record 
  FROM spaces 
  WHERE subdomain = target_space_subdomain;
  
  -- If space not found, return error
  IF space_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Space not found with subdomain: ' || target_space_subdomain,
      'phase', 'space_lookup'
    );
  END IF;
  
  -- Store space_id for later use
  space_id := space_record.id;
  
  -- Check if user is the owner
  is_owner := (space_record.owner_id = target_user_id);
  
  -- Check space_access records
  SELECT COALESCE(json_agg(t), '[]'::json) INTO access_records
  FROM (
    SELECT * FROM space_access 
    WHERE user_id = target_user_id 
    AND space_id = space_record.id
  ) t;
  
  -- Determine if user has access
  has_access := is_owner OR EXISTS (
    SELECT 1 FROM space_access 
    WHERE user_id = target_user_id 
    AND space_id = space_record.id 
    AND is_active = true
  );
  
  -- Build result JSON
  SELECT jsonb_build_object(
    'success', true,
    'space', row_to_json(space_record),
    'is_owner', is_owner, 
    'has_access', has_access,
    'access_records', access_records,
    'summary', CASE 
      WHEN is_owner THEN 'User is the owner of this space'
      WHEN has_access THEN 'User has access via membership'
      ELSE 'User does not have access to this space'
    END
  ) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'phase', 'unexpected'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an RPC function to diagnose space access for the current user
-- This is safe to expose because it only checks the current authenticated user
CREATE OR REPLACE FUNCTION debug_my_space_access(
  space_subdomain TEXT
) RETURNS JSONB AS $$
BEGIN
  RETURN check_user_space_access(auth.uid(), space_subdomain);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an RPC function to diagnose space access for any user
-- This requires special admin access
CREATE OR REPLACE FUNCTION debug_user_space_access(
  user_id UUID,
  space_subdomain TEXT
) RETURNS JSONB AS $$
BEGIN
  -- Check if the calling user has admin role
  IF NOT (SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_app_meta_data->>'roles' ? 'admin'
  )) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized. Admin role required.',
      'phase', 'authorization'
    );
  END IF;
  
  RETURN check_user_space_access(user_id, space_subdomain);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an RPC function to add a user to a space (for fixing access issues)
CREATE OR REPLACE FUNCTION fix_space_access(
  user_id UUID,
  space_subdomain TEXT
) RETURNS JSONB AS $$
DECLARE
  space_record RECORD;
  access_record RECORD;
  result JSONB;
BEGIN
  -- Only admin or space owner can use this function
  IF NOT (
    -- Check for admin role
    (SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_app_meta_data->>'roles' ? 'admin'
    ))
    OR
    -- Check if caller is space owner
    (SELECT EXISTS (
      SELECT 1 FROM spaces
      WHERE subdomain = space_subdomain
      AND owner_id = auth.uid()
    ))
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized. Must be admin or space owner.',
      'phase', 'authorization'
    );
  END IF;
  
  -- Get the space record
  SELECT * INTO space_record 
  FROM spaces 
  WHERE subdomain = space_subdomain;
  
  -- If space not found, return error
  IF space_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Space not found with subdomain: ' || space_subdomain,
      'phase', 'space_lookup'
    );
  END IF;
  
  -- Check if access record already exists
  SELECT * INTO access_record
  FROM space_access
  WHERE space_id = space_record.id
  AND user_id = user_id;
  
  IF access_record IS NOT NULL THEN
    -- Record exists, make sure it's active
    UPDATE space_access
    SET is_active = true
    WHERE id = access_record.id;
    
    RETURN jsonb_build_object(
      'success', true,
      'action', 'updated',
      'message', 'Space access record updated and activated',
      'space', row_to_json(space_record)
    );
  ELSE
    -- Create new access record
    INSERT INTO space_access (
      space_id,
      user_id,
      is_active,
      role,
      created_at
    ) VALUES (
      space_record.id,
      user_id,
      true,
      'member',
      NOW()
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'action', 'created',
      'message', 'New space access record created',
      'space', row_to_json(space_record)
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'phase', 'unexpected'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 