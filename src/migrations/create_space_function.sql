-- Function to safely create a space without hitting recursion issues
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
    created_at
  ) VALUES (
    space_name,
    space_subdomain,
    owner_id,
    NOW()
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