-- Fix missing profile URLs for users
-- This migration ensures all users have a profile_url value
-- If profile_url is null, it will generate one from full_name or first_name + last_name

-- Create a function to generate a profile URL from a name
CREATE OR REPLACE FUNCTION generate_profile_url(name text) 
RETURNS text AS $$
BEGIN
  -- Convert to lowercase, replace spaces and special chars with hyphens
  -- Then remove any leading or trailing hyphens
  RETURN trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Update users with missing profile_url based on full_name
UPDATE public.users
SET profile_url = 
  CASE 
    -- If full_name is available, use it to generate profile_url
    WHEN full_name IS NOT NULL THEN 
      generate_profile_url(full_name)
    -- If first_name and last_name are available, combine them
    WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN
      generate_profile_url(first_name || ' ' || last_name)
    -- If only first_name is available, use that
    WHEN first_name IS NOT NULL THEN
      generate_profile_url(first_name)
    -- Otherwise use a placeholder with the user ID
    ELSE 
      'user-' || substring(id::text, 1, 8)
  END
WHERE profile_url IS NULL;

-- Add a random suffix to any duplicate profile_urls
WITH duplicates AS (
  SELECT profile_url, count(*) 
  FROM public.users 
  GROUP BY profile_url 
  HAVING count(*) > 1
)
UPDATE public.users u
SET profile_url = u.profile_url || '-' || substring(u.id::text, 1, 4)
FROM duplicates d
WHERE u.profile_url = d.profile_url;

-- Drop the temporary function
DROP FUNCTION IF EXISTS generate_profile_url(text);

-- Add a comment to explain this migration
COMMENT ON TABLE public.users IS 'User profiles with unique profile_url slugs for public pages'; 