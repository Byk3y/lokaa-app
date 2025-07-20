-- Fix RPC function overload issue for get_notifications_with_actors
-- This drops all versions of the function and recreates it with consistent parameter types

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS get_notifications_with_actors(UUID, INTEGER, INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS get_notifications_with_actors(UUID, INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS get_notifications_with_actors(UUID, INTEGER, INTEGER, CHARACTER VARYING);

-- Recreate the function with TEXT parameter type for consistency
CREATE OR REPLACE FUNCTION get_notifications_with_actors(
  user_id_param UUID,
  offset_param INTEGER DEFAULT 0,
  limit_param INTEGER DEFAULT 25,
  type_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  actor_id UUID,
  type VARCHAR,
  title TEXT,
  content_preview TEXT,
  actor_relationship VARCHAR,
  space_id UUID,
  target_id TEXT,
  read BOOLEAN,
  clicked BOOLEAN,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  batch_key TEXT,
  actor_count INTEGER,
  actor_names TEXT[],
  last_actor_id UUID,
  batch_updated_at TIMESTAMPTZ,
  actor_full_name TEXT,
  actor_avatar_url TEXT,
  actor_first_name TEXT,
  actor_last_name TEXT,
  space_name TEXT,
  space_subdomain TEXT,
  space_icon_image TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.user_id,
    n.actor_id,
    n.type,
    n.title,
    n.content_preview,
    n.actor_relationship,
    n.space_id,
    n.target_id,
    n.read,
    n.clicked,
    n.created_at,
    n.expires_at,
    n.batch_key,
    n.actor_count,
    n.actor_names,
    n.last_actor_id,
    n.batch_updated_at,
    actor.raw_user_meta_data->>'full_name' as actor_full_name,
    actor.raw_user_meta_data->>'avatar_url' as actor_avatar_url,
    actor.raw_user_meta_data->>'first_name' as actor_first_name,
    actor.raw_user_meta_data->>'last_name' as actor_last_name,
    s.name as space_name,
    s.subdomain as space_subdomain,
    s.icon_image as space_icon_image
  FROM notifications n
  LEFT JOIN auth.users actor ON n.actor_id = actor.id
  LEFT JOIN spaces s ON n.space_id = s.id
  WHERE n.user_id = user_id_param
    AND (type_param IS NULL OR n.type = type_param)
    AND (n.expires_at IS NULL OR n.expires_at > NOW())
  ORDER BY n.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION get_notifications_with_actors IS 'Fixed function to get notifications with actor information - consistent TEXT type for type_param';