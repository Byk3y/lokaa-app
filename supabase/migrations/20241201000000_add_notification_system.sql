-- Create comprehensive notification system with push notification support
-- This migration creates the foundational tables for the notification system
-- Author: Claude Code Assistant
-- Date: 2024-12-01

-- ================================================
-- 1. CORE NOTIFICATIONS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('new_post', 'comment_reply', 'mention', 'space_join', 'post_like')),
  title TEXT NOT NULL,
  content_preview TEXT,
  actor_relationship VARCHAR(20) CHECK (actor_relationship IN ('admin', 'following', 'member')),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  target_id TEXT, -- post_id, comment_id, etc.
  read BOOLEAN NOT NULL DEFAULT FALSE,
  clicked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Smart batching system fields (from existing migration)
  batch_key TEXT,
  actor_count INTEGER DEFAULT 1 CHECK (actor_count >= 1),
  actor_names TEXT[] DEFAULT ARRAY[]::TEXT[],
  last_actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  batch_updated_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_batch_key ON notifications(batch_key) WHERE batch_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_space_id ON notifications(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ================================================
-- 2. PUSH SUBSCRIPTIONS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  device_info JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique subscriptions per user
  CONSTRAINT unique_user_endpoint UNIQUE(user_id, endpoint)
);

-- Indexes for push subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- ================================================
-- 3. USER DEVICES TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT,
  device_type VARCHAR(20) CHECK (device_type IN ('mobile', 'desktop', 'tablet')),
  user_agent TEXT,
  push_subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique device names per user
  CONSTRAINT unique_user_device UNIQUE(user_id, device_name)
);

-- Indexes for user devices
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_active ON user_devices(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_user_devices_push_subscription ON user_devices(push_subscription_id) WHERE push_subscription_id IS NOT NULL;

-- ================================================
-- 4. NOTIFICATION PREFERENCES TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Push notification settings
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Notification type preferences
  new_posts BOOLEAN NOT NULL DEFAULT TRUE,
  comments BOOLEAN NOT NULL DEFAULT TRUE,
  likes BOOLEAN NOT NULL DEFAULT TRUE,
  mentions BOOLEAN NOT NULL DEFAULT TRUE,
  space_joins BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Timing preferences
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one preference record per user
  CONSTRAINT unique_user_preferences UNIQUE(user_id)
);

-- Indexes for notification preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- ================================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Notifications policies (users can only see their own notifications)
CREATE POLICY "users_can_view_own_notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Push subscriptions policies
CREATE POLICY "users_manage_own_push_subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- User devices policies
CREATE POLICY "users_manage_own_devices" ON user_devices
  FOR ALL USING (auth.uid() = user_id);

-- Notification preferences policies
CREATE POLICY "users_manage_own_notification_preferences" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- ================================================
-- 6. HELPER FUNCTIONS
-- ================================================

-- Function to automatically create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default preferences when a user signs up
CREATE TRIGGER trigger_create_default_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Function to update notification preferences updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on notification preferences
CREATE TRIGGER trigger_update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Function to update push subscriptions updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on push subscriptions
CREATE TRIGGER trigger_update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- ================================================
-- 7. STORED PROCEDURES FOR NOTIFICATION MANAGEMENT
-- ================================================

-- Function to get notifications with actor information (for NotificationService.ts)
CREATE OR REPLACE FUNCTION get_notifications_with_actors(
  user_id_param UUID,
  offset_param INTEGER DEFAULT 0,
  limit_param INTEGER DEFAULT 25,
  type_param VARCHAR DEFAULT NULL
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

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = user_id_param
      AND read = FALSE
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_as_read(notification_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE
  WHERE id = ANY(notification_ids);
END;
$$ LANGUAGE plpgsql;

-- Function to create or update batched notifications
CREATE OR REPLACE FUNCTION create_or_update_batched_notification(
  p_user_id UUID,
  p_actor_id UUID,
  p_type VARCHAR,
  p_title TEXT,
  p_content_preview TEXT DEFAULT NULL,
  p_actor_relationship VARCHAR DEFAULT 'member',
  p_space_id UUID DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  batch_key_value TEXT;
  existing_notification_id UUID;
  new_notification_id UUID;
  actor_name TEXT;
BEGIN
  -- Generate batch key
  batch_key_value := p_user_id::TEXT || '_' || p_type || '_' || COALESCE(p_target_id, 'null') || '_' || COALESCE(p_space_id::TEXT, 'null');
  
  -- Get actor name
  SELECT raw_user_meta_data->>'full_name' INTO actor_name
  FROM auth.users WHERE id = p_actor_id;
  
  -- Check if a notification with this batch key exists
  SELECT id INTO existing_notification_id
  FROM notifications
  WHERE batch_key = batch_key_value
    AND created_at > NOW() - INTERVAL '24 hours'; -- Only batch within 24 hours
  
  IF existing_notification_id IS NOT NULL THEN
    -- Update existing notification
    UPDATE notifications
    SET 
      actor_count = actor_count + 1,
      actor_names = CASE 
        WHEN array_length(actor_names, 1) < 5 THEN array_append(actor_names, actor_name)
        ELSE actor_names
      END,
      last_actor_id = p_actor_id,
      batch_updated_at = NOW(),
      read = FALSE -- Mark as unread since there's new activity
    WHERE id = existing_notification_id;
    
    RETURN existing_notification_id;
  ELSE
    -- Create new notification
    INSERT INTO notifications (
      user_id,
      actor_id,
      type,
      title,
      content_preview,
      actor_relationship,
      space_id,
      target_id,
      expires_at,
      batch_key,
      actor_count,
      actor_names,
      last_actor_id,
      batch_updated_at
    ) VALUES (
      p_user_id,
      p_actor_id,
      p_type,
      p_title,
      p_content_preview,
      p_actor_relationship,
      p_space_id,
      p_target_id,
      p_expires_at,
      batch_key_value,
      1,
      ARRAY[actor_name],
      p_actor_id,
      NOW()
    ) RETURNING id INTO new_notification_id;
    
    RETURN new_notification_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 8. COMMENTS AND DOCUMENTATION
-- ================================================

COMMENT ON TABLE notifications IS 'Core notifications table storing all user notifications with smart batching support';
COMMENT ON TABLE push_subscriptions IS 'Push notification subscriptions for PWA push notifications';
COMMENT ON TABLE user_devices IS 'Device management for tracking user devices and their push subscriptions';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification types and delivery methods';

COMMENT ON COLUMN notifications.batch_key IS 'Key for grouping similar notifications together (e.g., multiple likes on same post)';
COMMENT ON COLUMN notifications.actor_count IS 'Number of actors in a batched notification (e.g., "5 people liked your post")';
COMMENT ON COLUMN notifications.actor_names IS 'Array of actor names for display in batched notifications';

COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL for sending push notifications';
COMMENT ON COLUMN push_subscriptions.p256dh_key IS 'P256DH public key for push notification encryption';
COMMENT ON COLUMN push_subscriptions.auth_key IS 'Auth secret for push notification authentication';

-- Migration complete message
DO $$
BEGIN
  RAISE NOTICE 'Notification system migration completed successfully!';
  RAISE NOTICE 'Created tables: notifications, push_subscriptions, user_devices, notification_preferences';
  RAISE NOTICE 'Created functions: get_notifications_with_actors, get_unread_notification_count, mark_notifications_as_read, create_or_update_batched_notification';
  RAISE NOTICE 'Enabled RLS policies for all tables';
  RAISE NOTICE 'Ready for push notification integration!';
END $$;