-- Migration: Add post pinning functionality with a 4-post limit
-- This migration adds columns for pinned posts and creates a function to handle pinning/unpinning with a 4-post limit

-- Add necessary columns to the posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES auth.users(id);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS pin_position INTEGER;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS pin_category TEXT;

-- Create index for better performance on pinned posts queries
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_posts_pin_category ON posts(pin_category) WHERE is_pinned = TRUE;

-- Function to toggle post pin status with a maximum of 4 pinned posts per category
CREATE OR REPLACE FUNCTION toggle_post_pin(
  post_id UUID,
  pin_action TEXT DEFAULT 'toggle',  -- 'pin', 'unpin', or 'toggle'
  category TEXT DEFAULT 'general'
) RETURNS JSONB AS $$
DECLARE
  is_currently_pinned BOOLEAN;
  oldest_pinned_post UUID;
  pinned_count INTEGER;
  result JSONB;
BEGIN
  -- Check if post exists and get current pin status
  SELECT is_pinned INTO is_currently_pinned FROM posts WHERE id = post_id;
  
  IF is_currently_pinned IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Post not found');
  END IF;
  
  -- Determine the action to take
  IF pin_action = 'toggle' THEN
    -- If toggling, do the opposite of current state
    IF is_currently_pinned THEN
      pin_action := 'unpin';
    ELSE
      pin_action := 'pin';
    END IF;
  END IF;
  
  -- Handle unpinning
  IF pin_action = 'unpin' THEN
    UPDATE posts
    SET 
      is_pinned = FALSE,
      pinned_at = NULL,
      pin_position = NULL,
      pin_category = NULL
    WHERE id = post_id;
    
    -- Reorder remaining pins
    WITH numbered_posts AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY pin_position ASC) AS new_position
      FROM posts
      WHERE is_pinned = TRUE AND pin_category = category
    )
    UPDATE posts
    SET pin_position = numbered_posts.new_position
    FROM numbered_posts
    WHERE posts.id = numbered_posts.id;
    
    RETURN jsonb_build_object('success', TRUE, 'action', 'unpinned', 'post_id', post_id);
  END IF;
  
  -- Handle pinning
  IF pin_action = 'pin' THEN
    -- Count current pinned posts in this category
    SELECT COUNT(*) INTO pinned_count
    FROM posts
    WHERE is_pinned = TRUE AND pin_category = category;
    
    -- If we already have 4 pinned posts, unpin the oldest one
    IF pinned_count >= 4 THEN
      SELECT id INTO oldest_pinned_post
      FROM posts
      WHERE is_pinned = TRUE AND pin_category = category
      ORDER BY pinned_at ASC
      LIMIT 1;
      
      IF oldest_pinned_post IS NOT NULL THEN
        UPDATE posts
        SET 
          is_pinned = FALSE,
          pinned_at = NULL,
          pin_position = NULL,
          pin_category = NULL
        WHERE id = oldest_pinned_post;
      END IF;
    END IF;
    
    -- Pin the new post
    UPDATE posts
    SET 
      is_pinned = TRUE,
      pinned_at = NOW(),
      pinned_by = auth.uid(),
      pin_position = pinned_count + 1,
      pin_category = category
    WHERE id = post_id;
    
    RETURN jsonb_build_object(
      'success', TRUE, 
      'action', 'pinned', 
      'post_id', post_id, 
      'replaced_post_id', oldest_pinned_post
    );
  END IF;
  
  -- If we get here, the pin_action was invalid
  RETURN jsonb_build_object('success', FALSE, 'message', 'Invalid pin action: ' || pin_action);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION toggle_post_pin(UUID, TEXT, TEXT) TO authenticated;

-- Function to update pin positions
CREATE OR REPLACE FUNCTION update_pin_positions(
  post_ids UUID[],
  category TEXT DEFAULT 'general'
) RETURNS JSONB AS $$
DECLARE
  i INTEGER;
  post_id UUID;
BEGIN
  -- Loop through the provided post IDs and update their positions
  FOR i IN 1..array_length(post_ids, 1) LOOP
    post_id := post_ids[i];
    
    -- Update the position for this post
    UPDATE posts
    SET pin_position = i
    WHERE id = post_id AND is_pinned = TRUE AND pin_category = category;
    
    -- If no rows were updated, the post wasn't found or isn't pinned in this category
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', FALSE, 
        'message', 'Post not found or not pinned in this category: ' || post_id
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object('success', TRUE, 'message', 'Pin positions updated successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_pin_positions(UUID[], TEXT) TO authenticated; 