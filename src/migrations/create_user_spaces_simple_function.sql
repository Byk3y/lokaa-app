-- Create the get_user_spaces_simple RPC function for fast path routing
-- This function returns user's spaces (owned + member) with minimal data for fast routing decisions

CREATE OR REPLACE FUNCTION get_user_spaces_simple(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  subdomain TEXT,
  is_owner BOOLEAN
) AS $$
BEGIN
  -- First return owned spaces (highest priority)
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.subdomain,
    true as is_owner
  FROM spaces s
  WHERE s.owner_id = user_id_param
  ORDER BY s.created_at DESC;

  -- Then return spaces where user is a member (if not already returned as owner)
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.subdomain,
    false as is_owner
  FROM spaces s
  INNER JOIN space_members sm ON s.id = sm.space_id
  WHERE sm.user_id = user_id_param 
    AND sm.status = 'active'
    AND s.owner_id != user_id_param  -- Exclude spaces already returned as owned
  ORDER BY sm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 