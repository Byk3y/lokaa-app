-- Function to get all public spaces
-- This function returns all public spaces (is_private = false)
-- It requires authenticated users to access
CREATE OR REPLACE FUNCTION get_public_spaces()
RETURNS SETOF spaces AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM spaces
  WHERE is_private = false
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get space by subdomain for all users
CREATE OR REPLACE FUNCTION get_space_by_subdomain(target_subdomain TEXT)
RETURNS SETOF spaces AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM spaces
  WHERE subdomain = target_subdomain AND is_private = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get space by subdomain for admins
CREATE OR REPLACE FUNCTION admin_get_space_by_subdomain(target_subdomain TEXT)
RETURNS SETOF spaces AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM spaces
  WHERE subdomain = target_subdomain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 