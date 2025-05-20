-- Debug script to check space_access records and diagnose member visibility issues

-- Create a function to retrieve all space_access records for a space
-- This uses SECURITY DEFINER to bypass RLS restrictions
CREATE OR REPLACE FUNCTION debug_space_members(space_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  member_records JSONB; -- Renamed from access_records
  space_record JSONB;
  user_info JSONB;
  result JSONB;
BEGIN
  -- Get the space info
  SELECT row_to_json(s)::jsonb INTO space_record
  FROM public.spaces s -- Assuming spaces is in public schema
  WHERE s.id = space_id_param;
  
  -- If space not found
  IF space_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Space not found with ID: ' || space_id_param
    );
  END IF;
  
  -- Get all space_members records
  SELECT jsonb_agg(row_to_json(sm_data)::jsonb) INTO member_records
  FROM (
    SELECT 
      sm.id, -- This is the space_members record ID
      sm.user_id,
      sm.space_id,
      sm.role,
      sm.status,
      sm.created_at AS membership_created_at,
      sm.updated_at AS membership_updated_at,
      u.full_name,
      u.username,
      u.avatar_url,
      (sm.status = 'active') AS is_active -- Derived from status
    FROM public.space_members sm -- Querying space_members
    JOIN public.users u ON sm.user_id = u.id -- Joining with public.users
    WHERE sm.space_id = space_id_param
    ORDER BY sm.created_at DESC
  ) sm_data;
  
  -- Get current user info
  SELECT jsonb_build_object(
    'id', auth.uid(),
    'roles', COALESCE(auth.jwt() ->> 'app_metadata'::text, '{}')::jsonb -> 'roles'
  ) INTO user_info;
  
  -- Build the response
  SELECT jsonb_build_object(
    'success', true,
    'space', space_record,
    'members', COALESCE(member_records, '[]'::jsonb),
    'member_count', jsonb_array_length(COALESCE(member_records, '[]'::jsonb)),
    'user_info', user_info,
    'timestamp', NOW()
  ) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', 'Error in debug_space_members function'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run this query from a SQL client or via supabase functions:
-- SELECT debug_space_members('your-space-id-here');

-- Grant execute permissions
ALTER FUNCTION debug_space_members(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION debug_space_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION debug_space_members(UUID) TO anon;
GRANT EXECUTE ON FUNCTION debug_space_members(UUID) TO service_role;

-- fix_space_members function is likely outdated as it operates on space_access
-- and its logic for owner and member activation needs review against space_members schema and triggers.
-- TODO: Review and refactor or remove fix_space_members.

-- How to use:
-- 1. First diagnose: SELECT debug_space_members('your-space-id-here');
-- 2. Then fix: SELECT fix_space_members('your-space-id-here');
