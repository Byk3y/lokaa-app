-- Add batching columns to notifications table for Phase 2.5 Smart Batching System
-- This enables "Francis and 5 others liked your post" functionality

-- Add new batching columns
ALTER TABLE notifications ADD COLUMN batch_key TEXT;
ALTER TABLE notifications ADD COLUMN actor_count INTEGER DEFAULT 1;
ALTER TABLE notifications ADD COLUMN actor_names TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE notifications ADD COLUMN last_actor_id UUID;
ALTER TABLE notifications ADD COLUMN batch_updated_at TIMESTAMPTZ;

-- Create performance indexes for batching
CREATE INDEX idx_notifications_batch_key ON notifications(batch_key);
CREATE INDEX idx_notifications_user_batch ON notifications(user_id, batch_key);
CREATE INDEX idx_notifications_batch_updated ON notifications(batch_updated_at DESC);

-- Create function to generate batch key for similar notifications
CREATE OR REPLACE FUNCTION generate_batch_key(
  p_user_id UUID,
  p_type TEXT,
  p_target_id UUID,
  p_space_id UUID
) RETURNS TEXT AS $$
BEGIN
  -- Generate unique batch key for grouping similar notifications
  -- Format: {user_id}_{type}_{target_id}_{space_id}
  RETURN CONCAT(
    p_user_id::TEXT, '_',
    p_type, '_',
    COALESCE(p_target_id::TEXT, 'null'), '_',
    COALESCE(p_space_id::TEXT, 'null')
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to get actor display names for batching
CREATE OR REPLACE FUNCTION get_actor_display_names(actor_ids UUID[])
RETURNS TEXT[] AS $$
DECLARE
  result TEXT[];
BEGIN
  SELECT ARRAY_AGG(COALESCE(full_name, 'Unknown User') ORDER BY full_name)
  INTO result
  FROM users
  WHERE id = ANY(actor_ids);
  
  RETURN COALESCE(result, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;

-- Create function to upsert batched notifications
CREATE OR REPLACE FUNCTION upsert_batched_notification(
  p_user_id UUID,
  p_actor_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_content_preview TEXT DEFAULT NULL,
  p_actor_relationship TEXT DEFAULT 'member',
  p_space_id UUID DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_batch_key TEXT;
  v_existing_notification notifications%ROWTYPE;
  v_new_actor_names TEXT[];
  v_notification_id UUID;
  v_batch_window INTERVAL := '1 hour';
  v_max_batch_window INTERVAL := '24 hours';
BEGIN
  -- Generate batch key
  v_batch_key := generate_batch_key(p_user_id, p_type, p_target_id, p_space_id);
  
  -- Look for existing notification within batch window
  SELECT * INTO v_existing_notification
  FROM notifications
  WHERE user_id = p_user_id
    AND batch_key = v_batch_key
    AND created_at > NOW() - v_batch_window
    AND (batch_updated_at IS NULL OR batch_updated_at > NOW() - v_max_batch_window)
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF FOUND THEN
    -- Update existing notification (batch it)
    -- Add new actor if not already in the list
    IF NOT (p_actor_id = ANY(ARRAY[v_existing_notification.actor_id] || COALESCE(v_existing_notification.actor_names, ARRAY[]::TEXT[]))) THEN
      -- Get updated actor names
      v_new_actor_names := get_actor_display_names(
        ARRAY[v_existing_notification.actor_id] || 
        COALESCE(string_to_array(array_to_string(v_existing_notification.actor_names, ','), ','), ARRAY[]::TEXT[]) || 
        ARRAY[p_actor_id]
      );
      
      -- Update the existing notification
      UPDATE notifications SET
        actor_count = COALESCE(actor_count, 1) + 1,
        actor_names = v_new_actor_names,
        last_actor_id = p_actor_id,
        batch_updated_at = NOW(),
        read = false -- Mark as unread since there's new activity
      WHERE id = v_existing_notification.id;
      
      RETURN v_existing_notification.id;
    ELSE
      -- Actor already in batch, just update timestamp
      UPDATE notifications SET
        batch_updated_at = NOW(),
        read = false
      WHERE id = v_existing_notification.id;
      
      RETURN v_existing_notification.id;
    END IF;
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
      v_batch_key,
      1,
      ARRAY[]::TEXT[],
      p_actor_id,
      NOW()
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old batched notifications
CREATE OR REPLACE FUNCTION cleanup_old_batched_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete notifications older than 30 days
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION upsert_batched_notification IS 'Creates or updates batched notifications for similar actions (e.g., multiple likes on same post)';
COMMENT ON FUNCTION generate_batch_key IS 'Generates unique batch key for grouping similar notifications';
COMMENT ON FUNCTION get_actor_display_names IS 'Returns display names for actor IDs used in batching';
COMMENT ON FUNCTION cleanup_old_batched_notifications IS 'Cleans up old notifications to maintain performance';