-- Harden post_like notification dedup with a partial unique index + ON CONFLICT.
-- Backs the dedup logic in create_post_like_notification() with a real constraint
-- so concurrent unlike->relike races cannot create duplicates, and gives the dedup
-- lookup index coverage.

-- 1. Remove pre-existing duplicate post_like notifications (keep the newest per key).
DELETE FROM notifications a
USING notifications b
WHERE a.type = 'post_like' AND b.type = 'post_like'
  AND a.user_id = b.user_id
  AND a.actor_id = b.actor_id
  AND a.target_id = b.target_id
  AND a.id <> b.id
  AND (a.created_at < b.created_at
       OR (a.created_at = b.created_at AND a.id < b.id));

-- 2. Partial unique index enforcing one post_like notification per (recipient, actor, post).
CREATE UNIQUE INDEX IF NOT EXISTS notifications_post_like_dedup_uidx
  ON notifications (user_id, actor_id, target_id)
  WHERE type = 'post_like';

-- 3. Use the index for atomic dedup instead of a non-atomic NOT EXISTS check.
CREATE OR REPLACE FUNCTION public.create_post_like_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  post_record RECORD;
  notification_title TEXT;
BEGIN
  SELECT user_id, space_id, title, content
  INTO post_record
  FROM posts
  WHERE id = NEW.post_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF post_record.user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  notification_title := COALESCE(
    NULLIF(TRIM(post_record.title), ''),
    NULLIF(TRIM(LEFT(post_record.content, 60)), ''),
    'your post'
  );

  INSERT INTO notifications (
    user_id, actor_id, type, title, content_preview,
    actor_relationship, space_id, target_id
  ) VALUES (
    post_record.user_id, NEW.user_id, 'post_like', notification_title,
    NULL, 'member', post_record.space_id, NEW.post_id
  )
  ON CONFLICT (user_id, actor_id, target_id) WHERE type = 'post_like'
  DO NOTHING;

  RETURN NEW;
END;
$function$;
