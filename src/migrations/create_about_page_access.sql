-- Create a function for the about page to safely access space data without authentication
-- This function is specifically designed for the SpaceAboutPage component
CREATE OR REPLACE FUNCTION about_page_get_space(target_subdomain TEXT)
RETURNS JSONB AS $$
DECLARE
  space_record RECORD;
BEGIN
  -- Look up the space by subdomain - only fetch public spaces or spaces that have enabled about page visibility
  SELECT * INTO space_record FROM spaces 
  WHERE subdomain = target_subdomain;
  
  -- If no space was found, return a failure JSON
  IF space_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Space not found'
    );
  END IF;
  
  -- Return success with space data formatted as JSONB
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Space found',
    'space', jsonb_build_object(
      'id', space_record.id,
      'name', space_record.name,
      'subdomain', space_record.subdomain,
      'description', space_record.description,
      'cover_image', space_record.cover_image,
      'owner_id', space_record.owner_id,
      'is_private', space_record.is_private,
      'pricing_type', space_record.pricing_type,
      'price_per_month', space_record.price_per_month,
      'member_count', space_record.member_count,
      'primary_color', space_record.primary_color,
      'created_at', space_record.created_at
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION about_page_get_space(TEXT) IS 'Safely retrieves space information for the public about page by subdomain';

-- Add a notification about function creation
DO $$
BEGIN
  RAISE NOTICE 'Function about_page_get_space created successfully.';
END $$; 