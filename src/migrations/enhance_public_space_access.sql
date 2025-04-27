-- Update function to get space by subdomain with a more complete data set
-- This function doesn't require authentication and is safe for public access
CREATE OR REPLACE FUNCTION get_space_by_subdomain(target_subdomain TEXT)
RETURNS SETOF spaces AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    name,
    description,
    subdomain,
    owner_id,
    cover_image,
    primary_color,
    created_at,
    updated_at,
    pricing_type,
    price_per_month,
    member_count,
    is_private
  FROM 
    spaces
  WHERE 
    subdomain = target_subdomain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update any existing function if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_space_by_subdomain'
  ) THEN
    RAISE NOTICE 'Function get_space_by_subdomain updated successfully.';
  ELSE
    RAISE NOTICE 'Function get_space_by_subdomain created successfully.';
  END IF;
END $$; 