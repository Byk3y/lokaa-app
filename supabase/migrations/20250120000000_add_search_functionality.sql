-- Migration: Add search functionality for posts and spaces
-- This adds full-text search capabilities and search indexes

-- Add search vector column to posts table for better search performance
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create full-text search index on posts
CREATE INDEX IF NOT EXISTS posts_search_idx ON public.posts USING gin(search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_posts_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS posts_search_vector_update ON public.posts;
CREATE TRIGGER posts_search_vector_update
    BEFORE INSERT OR UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION update_posts_search_vector();

-- Update existing posts with search vectors
UPDATE public.posts SET 
    search_vector = 
        setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(content, '')), 'B')
WHERE search_vector IS NULL;

-- Add search function for posts within a space
CREATE OR REPLACE FUNCTION search_posts_in_space(
    space_id_param uuid,
    search_query text,
    limit_param integer DEFAULT 20,
    offset_param integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    title text,
    content text,
    user_id uuid,
    space_id uuid,
    category_id uuid,
    like_count integer,
    comment_count integer,
    is_pinned boolean,
    created_at timestamptz,
    updated_at timestamptz,
    rank real
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.content,
        p.user_id,
        p.space_id,
        p.category_id,
        p.like_count,
        p.comment_count,
        p.is_pinned,
        p.created_at,
        p.updated_at,
        ts_rank(p.search_vector, plainto_tsquery('english', search_query)) as rank
    FROM public.posts p
    WHERE p.space_id = space_id_param
    AND p.search_vector @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC, p.created_at DESC
    LIMIT limit_param
    OFFSET offset_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add search function for spaces
CREATE OR REPLACE FUNCTION search_spaces(
    search_query text,
    user_id_param uuid DEFAULT NULL,
    limit_param integer DEFAULT 20,
    offset_param integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    image_url text,
    is_private boolean,
    member_count bigint,
    created_at timestamptz,
    rank real
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.description,
        s.image_url,
        s.is_private,
        COALESCE(mc.member_count, 0) as member_count,
        s.created_at,
        ts_rank(
            setweight(to_tsvector('english', COALESCE(s.name, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(s.description, '')), 'B'),
            plainto_tsquery('english', search_query)
        ) as rank
    FROM public.spaces s
    LEFT JOIN (
        SELECT space_id, COUNT(*) as member_count
        FROM public.space_members
        GROUP BY space_id
    ) mc ON s.id = mc.space_id
    WHERE (
        setweight(to_tsvector('english', COALESCE(s.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(s.description, '')), 'B')
    ) @@ plainto_tsquery('english', search_query)
    AND (user_id_param IS NULL OR s.is_private = false OR EXISTS (
        SELECT 1 FROM public.space_members sm 
        WHERE sm.space_id = s.id AND sm.user_id = user_id_param
    ))
    ORDER BY rank DESC, s.created_at DESC
    LIMIT limit_param
    OFFSET offset_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add search analytics table for tracking search queries
CREATE TABLE IF NOT EXISTS public.search_analytics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    search_query text NOT NULL,
    search_type text NOT NULL, -- 'posts', 'spaces', 'members'
    space_id uuid REFERENCES public.spaces(id),
    results_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Create index for search analytics
CREATE INDEX IF NOT EXISTS search_analytics_user_idx ON public.search_analytics(user_id);
CREATE INDEX IF NOT EXISTS search_analytics_query_idx ON public.search_analytics(search_query);
CREATE INDEX IF NOT EXISTS search_analytics_type_idx ON public.search_analytics(search_type);

-- Enable RLS on search analytics
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policy for search analytics
CREATE POLICY "Users can view their own search analytics" ON public.search_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search analytics" ON public.search_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);