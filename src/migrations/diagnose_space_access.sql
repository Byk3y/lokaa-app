-- Function to diagnose space access issues
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