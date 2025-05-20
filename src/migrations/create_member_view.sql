-- Create a view to join space_access with user data
CREATE OR REPLACE VIEW public.space_members AS
SELECT 
  sa.id,
  sa.space_id,
  sa.user_id,
  sa.role,
  sa.is_active,
  sa.created_at,
  COALESCE(u.full_name, 'User ' || SUBSTRING(sa.user_id::text, 1, 6)) as full_name,
  LOWER(REGEXP_REPLACE(COALESCE(u.full_name, ''), '[^a-zA-Z0-9]', '-', 'g')) as username,
  u.avatar_url
FROM 
  public.space_access sa
LEFT JOIN 
  public.users u ON sa.user_id = u.id
WHERE 
  sa.is_active = true;

-- Grant access to the view
GRANT SELECT ON public.space_members TO service_role;
GRANT SELECT ON public.space_members TO authenticated;
GRANT SELECT ON public.space_members TO anon;

-- Create a function to get members for a space
CREATE OR REPLACE FUNCTION public.get_space_members(space_id_param UUID)
RETURNS TABLE (
  id UUID,
  space_id UUID,
  user_id UUID,
  role TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.id,
    sm.space_id,
    sm.user_id,
    sm.role,
    sm.is_active,
    sm.created_at,
    sm.full_name,
    sm.username,
    sm.avatar_url
  FROM 
    public.space_members sm
  WHERE 
    sm.space_id = space_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 