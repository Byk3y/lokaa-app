-- Create direct_messages table for private conversations
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  CHECK (sender_id <> receiver_id), -- Prevent self-messaging
  CHECK (user_id IN (sender_id, receiver_id)) -- Ensure user_id is either sender or receiver
);

-- Create conversation_participants table to track 1:1 conversations
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Create a view to display conversations for users
CREATE OR REPLACE VIEW user_conversations AS
WITH latest_messages AS (
  SELECT 
    DISTINCT ON (
      LEAST(sender_id, receiver_id),
      GREATEST(sender_id, receiver_id)
    )
    LEAST(sender_id, receiver_id) as user_1,
    GREATEST(sender_id, receiver_id) as user_2,
    id as message_id,
    content,
    created_at,
    sender_id
  FROM direct_messages
  ORDER BY 
    LEAST(sender_id, receiver_id),
    GREATEST(sender_id, receiver_id),
    created_at DESC
),
conversation_details AS (
  SELECT 
    cp.user_id,
    cp.conversation_id,
    lm.message_id,
    lm.content as latest_message_content,
    lm.created_at as latest_message_time,
    lm.sender_id as latest_message_sender,
    COALESCE(cp.last_read_at, '1970-01-01'::timestamptz) as last_read_at
  FROM conversation_participants cp
  JOIN latest_messages lm ON 
    (cp.user_id = lm.user_1 AND (
      SELECT user_id FROM conversation_participants 
      WHERE conversation_id = cp.conversation_id AND user_id <> cp.user_id
      LIMIT 1
    ) = lm.user_2)
    OR
    (cp.user_id = lm.user_2 AND (
      SELECT user_id FROM conversation_participants 
      WHERE conversation_id = cp.conversation_id AND user_id <> cp.user_id
      LIMIT 1
    ) = lm.user_1)
)
SELECT 
  cd.user_id,
  cd.conversation_id,
  p.full_name as conversation_name,
  false as is_group,
  CASE 
    WHEN cd.latest_message_time > cd.last_read_at AND cd.latest_message_sender <> cd.user_id 
    THEN 1 
    ELSE 0 
  END as unread_count,
  cd.latest_message_content,
  cd.latest_message_time,
  json_agg(
    json_build_object(
      'user_id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'profile_url', p.profile_url
    )
  ) as other_participants
FROM conversation_details cd
JOIN conversation_participants cp ON cd.conversation_id = cp.conversation_id AND cd.user_id <> cp.user_id
JOIN profiles p ON cp.user_id = p.id
GROUP BY 
  cd.user_id, 
  cd.conversation_id, 
  p.full_name,
  cd.latest_message_content,
  cd.latest_message_time,
  cd.latest_message_sender,
  cd.last_read_at;

-- Create a function to get or create a conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1 UUID, user2 UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_id UUID;
BEGIN
  -- Check if users are the same
  IF user1 = user2 THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;

  -- Check if conversation already exists
  SELECT cp1.conversation_id INTO conversation_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = user1 AND cp2.user_id = user2;
  
  -- If conversation doesn't exist, create it
  IF conversation_id IS NULL THEN
    conversation_id := uuid_generate_v4();
    
    -- Insert participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES 
      (conversation_id, user1),
      (conversation_id, user2);
  END IF;
  
  RETURN conversation_id;
END;
$$;

-- Create alias function that matches what the client code expects
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN get_or_create_conversation(user1_id, user2_id);
END;
$$;

-- Update triggers
CREATE OR REPLACE FUNCTION update_direct_messages_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := NEW.sender_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_direct_messages_user_id
BEFORE INSERT ON direct_messages
FOR EACH ROW
EXECUTE FUNCTION update_direct_messages_user_id();

-- Update RLS for direct messages
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read messages they are part of" ON direct_messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert their own messages" ON direct_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" ON direct_messages
FOR UPDATE
USING (auth.uid() = sender_id);

-- Set RLS for conversation participants
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their conversations" ON conversation_participants
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage conversations" ON conversation_participants
FOR ALL
USING (auth.uid() IN (
  SELECT user_id FROM conversation_participants WHERE conversation_id = conversation_participants.conversation_id
));

-- Function to send a direct message
CREATE OR REPLACE FUNCTION send_direct_message(
  to_user_id UUID,
  message_content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_id UUID;
  conversation_id UUID;
  message_id UUID;
BEGIN
  -- Get current user ID
  sender_id := auth.uid();
  
  -- Prevent messaging yourself
  IF sender_id = to_user_id THEN
    RAISE EXCEPTION 'Cannot send message to yourself';
  END IF;
  
  -- Get or create conversation
  conversation_id := get_or_create_conversation(sender_id, to_user_id);
  
  -- Insert the message
  INSERT INTO direct_messages (
    sender_id,
    receiver_id,
    content,
    user_id
  ) VALUES (
    sender_id,
    to_user_id,
    message_content,
    sender_id
  ) RETURNING id INTO message_id;
  
  -- Update last read time for sender
  UPDATE conversation_participants
  SET last_read_at = NOW()
  WHERE conversation_id = conversation_id AND user_id = sender_id;
  
  RETURN message_id;
END;
$$; 