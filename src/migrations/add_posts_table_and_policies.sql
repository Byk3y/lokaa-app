-- Migration: Create posts table and set member posting policies
-- This migration adds the posts table if it doesn't exist and sets up policies for members to post

-- First, create the posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  media_urls JSONB DEFAULT NULL,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_space_id ON posts(space_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);

-- Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policies for the posts table
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Anyone can read posts" ON posts;
    DROP POLICY IF EXISTS "Space owners can manage all posts" ON posts;
    DROP POLICY IF EXISTS "Users can manage their own posts" ON posts;
    DROP POLICY IF EXISTS "Space members can create posts" ON posts;

    -- Policy 1: Anyone can read posts in public spaces or spaces they're a member of
    CREATE POLICY "Anyone can read posts"
    ON posts FOR SELECT
    USING (
        -- Can read if the space is public
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = posts.space_id
            AND spaces.is_private = false
        )
        OR
        -- Can read if the user is a member of the space
        EXISTS (
            SELECT 1 FROM space_access
            WHERE space_access.space_id = posts.space_id
            AND space_access.user_id = auth.uid()
            AND space_access.is_active = true
        )
        OR
        -- Can read if the user is the owner of the space
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = posts.space_id
            AND spaces.owner_id = auth.uid()
        )
    );

    -- Policy 2: Space owners can manage all posts in their spaces
    CREATE POLICY "Space owners can manage all posts"
    ON posts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = posts.space_id
            AND spaces.owner_id = auth.uid()
        )
    );

    -- Policy 3: Users can manage their own posts
    CREATE POLICY "Users can manage their own posts"
    ON posts FOR ALL
    USING (user_id = auth.uid());

    -- Policy 4: Space members can create posts
    CREATE POLICY "Space members can create posts"
    ON posts FOR INSERT
    WITH CHECK (
        -- Must be the owner of the space
        EXISTS (
            SELECT 1 FROM spaces
            WHERE spaces.id = posts.space_id
            AND spaces.owner_id = auth.uid()
        )
        OR
        -- OR must be a member of the space
        EXISTS (
            SELECT 1 FROM space_access
            WHERE space_access.space_id = posts.space_id
            AND space_access.user_id = auth.uid()
            AND space_access.is_active = true
        )
    );

    RAISE NOTICE 'Posts table policies have been created/updated';
END $$; 