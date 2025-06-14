-- Function to get recently contacted users
CREATE OR REPLACE FUNCTION get_recently_contacted_users(limit_count INT DEFAULT 5)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  RETURN QUERY
  WITH recent_contacts AS (
    SELECT DISTINCT
      CASE 
        WHEN sender_id = current_user_id THEN receiver_id
        ELSE sender_id
      END AS user_id,
      MAX(created_at) AS last_contact_time
    FROM direct_messages
    WHERE sender_id = current_user_id OR receiver_id = current_user_id
    GROUP BY user_id
    ORDER BY last_contact_time DESC
    LIMIT limit_count
  )
  SELECT
    json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'profile_url', p.profile_url
    )
  FROM recent_contacts rc
  JOIN profiles p ON rc.user_id = p.id
  ORDER BY rc.last_contact_time DESC;
END;
$$;

-- Function to check if two users have an existing conversation
CREATE OR REPLACE FUNCTION have_conversation(user_id_1 UUID, user_id_2 UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = user_id_1 AND cp2.user_id = user_id_2
  ) INTO conversation_exists;
  
  RETURN conversation_exists;
END;
$$; 