-- Capture the space-scoped post/comment search function into version control.
--
-- This function powers in-space search but previously existed only in the live
-- database (created out-of-band); migrations only ALTERed it (search_path) without
-- ever CREATE-ing it. A fresh DB build / preview branch would therefore have NO
-- search. This migration records the exact current definition so search survives a
-- rebuild. Body is identical to the live function — CREATE OR REPLACE is a no-op
-- behaviorally.

CREATE OR REPLACE FUNCTION public.search_posts_in_space_optimized(space_id_param uuid, search_query text, limit_param integer DEFAULT 20, offset_param integer DEFAULT 0, include_comments boolean DEFAULT true, category_filter uuid DEFAULT NULL::uuid, date_filter interval DEFAULT NULL::interval)
 RETURNS TABLE(id uuid, title text, content text, user_id uuid, user_full_name text, user_avatar_url text, user_profile_url text, space_id uuid, category_id uuid, category_name text, category_icon text, like_count integer, comment_count integer, is_pinned boolean, created_at timestamp with time zone, updated_at timestamp with time zone, slug text, rank double precision, result_type text, comment_id uuid, comment_content text, comment_user_id uuid, comment_user_name text, comment_user_avatar text, comment_created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Build dynamic WHERE clause for better performance
    RETURN QUERY
    WITH search_results AS (
        -- Search in posts with optimized query
        SELECT
            p.id,
            p.title,
            p.content,
            p.user_id,
            u.full_name as user_full_name,
            u.avatar_url as user_avatar_url,
            u.profile_url as user_profile_url,
            p.space_id,
            p.category_id,
            sc.name as category_name,
            sc.icon as category_icon,
            p.like_count,
            p.comment_count,
            p.is_pinned,
            p.created_at,
            p.updated_at,
            p.slug,
            ts_rank(p.search_vector, plainto_tsquery('english', search_query)) as rank,
            'post'::text as result_type,
            NULL::uuid as comment_id,
            NULL::text as comment_content,
            NULL::uuid as comment_user_id,
            NULL::text as comment_user_name,
            NULL::text as comment_user_avatar,
            NULL::timestamptz as comment_created_at
        FROM public.posts p
        LEFT JOIN public.users u ON p.user_id = u.id
        LEFT JOIN public.space_categories sc ON p.category_id = sc.id
        WHERE p.space_id = space_id_param
        AND p.search_vector @@ plainto_tsquery('english', search_query)
        AND (category_filter IS NULL OR p.category_id = category_filter)
        AND (date_filter IS NULL OR p.created_at >= NOW() - date_filter)

        UNION ALL

        -- Search in comments (only if include_comments is true)
        SELECT
            p.id,
            p.title,
            p.content,
            p.user_id,
            u.full_name as user_full_name,
            u.avatar_url as user_avatar_url,
            u.profile_url as user_profile_url,
            p.space_id,
            p.category_id,
            sc.name as category_name,
            sc.icon as category_icon,
            p.like_count,
            p.comment_count,
            p.is_pinned,
            p.created_at,
            p.updated_at,
            p.slug,
            ts_rank(to_tsvector('english', pc.content), plainto_tsquery('english', search_query)) * 0.8 as rank,
            'comment'::text as result_type,
            pc.id as comment_id,
            pc.content as comment_content,
            pc.user_id as comment_user_id,
            cu.full_name as comment_user_name,
            cu.avatar_url as comment_user_avatar,
            pc.created_at as comment_created_at
        FROM public.post_comments pc
        JOIN public.posts p ON pc.post_id = p.id
        LEFT JOIN public.users u ON p.user_id = u.id
        LEFT JOIN public.users cu ON pc.user_id = cu.id
        LEFT JOIN public.space_categories sc ON p.category_id = sc.id
        WHERE p.space_id = space_id_param
        AND include_comments = true
        AND to_tsvector('english', pc.content) @@ plainto_tsquery('english', search_query)
        AND (category_filter IS NULL OR p.category_id = category_filter)
        AND (date_filter IS NULL OR pc.created_at >= NOW() - date_filter)
    )
    SELECT * FROM search_results
    ORDER BY rank DESC, created_at DESC
    LIMIT limit_param
    OFFSET offset_param;
END;
$function$;
