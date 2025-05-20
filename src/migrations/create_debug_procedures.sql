-- RPC functions for debugging space access issues
-- These can be called from the client using supabase.rpc()

-- First create the diagnostic function if it doesn't already exist
CREATE OR REPLACE FUNCTION check_user_space_access(
  target_user_id UUID,
  target_space_subdomain TEXT
) RETURNS JSONB AS $$
DECLARE
  space_record RECORD;
  member_records JSON; -- Renamed from access_records
  space_id_val UUID; -- Renamed from space_id to avoid conflict with column names
  is_owner BOOLEAN;
  has_access BOOLEAN;
  result JSONB;
  member_role TEXT;
  member_status TEXT;
BEGIN
  -- Get the space record
  SELECT * INTO space_record 
  FROM public.spaces -- Assuming public schema
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
  space_id_val := space_record.id;
  
  -- Check if user is the owner
  is_owner := (space_record.owner_id = target_user_id);
  
  -- Check space_members records
  SELECT COALESCE(json_agg(sm), '[]'::json) INTO member_records
  FROM (
    SELECT 
        sm.id AS membership_id, 
        sm.role, 
        sm.status, 
        sm.created_at AS membership_created_at, 
        sm.updated_at AS membership_updated_at,
        u.full_name, -- Assuming you want user details too
        u.username
    FROM public.space_members sm
    JOIN public.users u ON sm.user_id = u.id
    WHERE sm.user_id = target_user_id 
    AND sm.space_id = space_id_val
  ) sm;

  -- Determine if user has access based on active membership
  -- and get role/status if they are a member
  SELECT sm.status = 'active', sm.role, sm.status
  INTO has_access, member_role, member_status
  FROM public.space_members sm
  WHERE sm.user_id = target_user_id
  AND sm.space_id = space_id_val
  AND sm.status = 'active'; -- Only consider active members for direct access via membership

  -- If owner, they always have access.
  -- If not found in space_members as active, has_access will be NULL from the query, so coalesce to false.
  has_access := is_owner OR COALESCE(has_access, false);

  IF is_owner AND member_role IS NULL THEN -- Owner might not have a separate member record, or it's not primary
      member_role := 'owner'; -- Assign 'owner' role if they are the owner
      member_status := 'active'; -- Owners are implicitly active
  END IF;
  
  -- Build result JSON
  SELECT jsonb_build_object(
    'success', true,
    'space', row_to_json(space_record),
    'is_owner', is_owner, 
    'has_access', has_access,
    'membership_role', member_role, -- Added role from space_members
    'membership_status', member_status, -- Added status from space_members
    'member_records', member_records, -- Changed from access_records
    'summary', CASE 
      WHEN is_owner AND has_access THEN 'User is the owner of this space and has access.'
      WHEN has_access THEN 'User has access via membership (Role: ' || COALESCE(member_role, 'N/A') || ', Status: ' || COALESCE(member_status, 'N/A') || ')'
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

-- TODO: Refactor or remove fix_space_access as it operates on space_access
-- and its logic needs to be adapted for space_members. 