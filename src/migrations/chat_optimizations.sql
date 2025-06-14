-- Optimize the user_conversations view with more specific columns
CREATE OR REPLACE VIEW user_conversations AS
WITH latest_messages AS (
  SELECT DISTINCT ON (m.conversation_id) 
    m.conversation_id,
    m.id AS message_id,
    m.content,
    m.created_at,
    m.sender_id
  FROM chat_messages m
  WHERE NOT m.is_deleted
  ORDER BY m.conversation_id, m.created_at DESC
)
SELECT 
  c.id AS conversation_id,
  c.name AS conversation_name,
  c.is_group,
  c.created_at,
  c.last_message_at,
  p.user_id,
  p.last_read_at,
  p.is_admin,
  lm.message_id AS latest_message_id,
  lm.content AS latest_message_content,
  lm.created_at AS latest_message_time,
  lm.sender_id AS latest_message_sender,
  COALESCE(
    (SELECT count(*) 
     FROM chat_messages m
     WHERE m.conversation_id = c.id 
       AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at) 
       AND m.sender_id <> p.user_id 
       AND NOT m.is_deleted
    ), 0
  ) AS unread_count,
  (
    SELECT json_agg(
      json_build_object(
        'user_id', u.id, 
        'full_name', u.full_name, 
        'avatar_url', u.avatar_url, 
        'profile_url', u.profile_url,
        'last_seen_at', sm.last_active_at,
        'is_online', sm.is_online
      )
    )
    FROM chat_participants other_p
    JOIN users u ON u.id = other_p.user_id
    LEFT JOIN space_members sm ON sm.user_id = u.id
    WHERE other_p.conversation_id = c.id AND other_p.user_id <> p.user_id
  ) AS other_participants
FROM chat_conversations c
JOIN chat_participants p ON p.conversation_id = c.id
LEFT JOIN latest_messages lm ON lm.conversation_id = c.id;

-- Add indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id_created_at
ON chat_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_participants_user_conversation
ON chat_participants(user_id, conversation_id);

-- Set the appropriate VACUUM settings for these tables
ALTER TABLE chat_messages SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE chat_conversations SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE chat_participants SET (autovacuum_vacuum_scale_factor = 0.1); 