# Notification System Database Schema

## Required Tables

### 1. notifications table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('new_post', 'comment_reply', 'mention', 'space_join', 'post_like')),
  title TEXT NOT NULL,
  content_preview TEXT,
  actor_relationship VARCHAR(20) CHECK (actor_relationship IN ('admin', 'following', 'member')),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  target_id TEXT, -- Post ID, comment ID, etc.
  read BOOLEAN DEFAULT FALSE,
  clicked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_target CHECK (
    (type IN ('new_post', 'post_like', 'mention') AND target_id IS NOT NULL) OR
    (type = 'comment_reply' AND target_id IS NOT NULL) OR
    (type = 'space_join' AND target_id IS NULL)
  )
);
```

### 2. notification_preferences table

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  new_posts BOOLEAN DEFAULT TRUE,
  comments BOOLEAN DEFAULT TRUE,
  likes BOOLEAN DEFAULT TRUE,
  mentions BOOLEAN DEFAULT TRUE,
  space_joins BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT FALSE,
  push_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

## Required Indexes

```sql
-- Performance indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_space_id ON notifications(space_id);
CREATE INDEX idx_notifications_target_id ON notifications(target_id);
```

## Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Notification preferences policies
CREATE POLICY "Users can manage their own preferences" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);
```

## Real-time Subscriptions

```sql
-- Enable real-time for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

## Helper Functions

```sql
-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_as_read(notification_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE notifications 
  SET read = TRUE, updated_at = NOW()
  WHERE id = ANY(notification_ids) AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread count
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM notifications 
    WHERE user_id = user_uuid AND read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Testing Data

After creating the tables, you can test with:

```sql
-- Insert test notification
INSERT INTO notifications (user_id, actor_id, type, title, content_preview, actor_relationship)
VALUES (
  auth.uid(),
  auth.uid(),
  'new_post',
  '🚀 Welcome to the notification system!',
  'This is a test notification.',
  'admin'
);
```

## Status

❌ **Not Implemented** - These tables do not exist in the current database.

The frontend notification system is complete and ready, but requires these database tables to function.

## Next Steps

1. Run the SQL migrations above in Supabase
2. Test notification creation using the debug panel
3. Verify real-time updates work
4. Test notification navigation and marking as read