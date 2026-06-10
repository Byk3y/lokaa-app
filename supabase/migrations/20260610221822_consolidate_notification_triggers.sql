-- Consolidate notification creation onto Postgres triggers.
--
-- Background: notification creation was split across a DB trigger (new_post) and a
-- fragile client-side path (post_like via NotificationService + batch manager). The
-- client path silently stopped firing once posts went titleless, and the batching
-- engine never actually batched anything (avg actor_count = 1.00 in production).
--
-- This migration makes the DB the single source of truth:
--   1. create_post_notifications() inserts directly (no batching indirection).
--   2. New create_post_like_notification() trigger replaces the client-side like path,
--      deriving the title server-side (fixing the titleless gap) and de-duping likes.
--   3. Orphaned batching helper functions are dropped (columns are kept, non-destructive).

-- 1. new_post: insert directly instead of via upsert_batched_notification().
CREATE OR REPLACE FUNCTION public.create_post_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  space_member RECORD;
  post_creator_role TEXT;
  notification_title TEXT;
BEGIN
  -- Always resolve to a non-null title; notifications.title is NOT NULL.
  notification_title := COALESCE(
    NULLIF(TRIM(NEW.title), ''),
    NULLIF(TRIM(LEFT(NEW.content, 60)), ''),
    'New post'
  );

  SELECT role INTO post_creator_role
  FROM space_members
  WHERE space_id = NEW.space_id AND user_id = NEW.user_id;

  IF post_creator_role = 'admin' THEN
    -- Admin posted: notify all other members.
    FOR space_member IN
      SELECT user_id
      FROM space_members
      WHERE space_id = NEW.space_id
        AND user_id != NEW.user_id
    LOOP
      INSERT INTO notifications (
        user_id, actor_id, type, title, content_preview,
        actor_relationship, space_id, target_id
      ) VALUES (
        space_member.user_id, NEW.user_id, 'new_post', notification_title,
        LEFT(NEW.content, 100), 'admin', NEW.space_id, NEW.id
      );
    END LOOP;
  ELSE
    -- Member posted: notify space admins only.
    FOR space_member IN
      SELECT user_id
      FROM space_members
      WHERE space_id = NEW.space_id
        AND role = 'admin'
        AND user_id != NEW.user_id
    LOOP
      INSERT INTO notifications (
        user_id, actor_id, type, title, content_preview,
        actor_relationship, space_id, target_id
      ) VALUES (
        space_member.user_id, NEW.user_id, 'new_post', notification_title,
        LEFT(NEW.content, 100), 'member', NEW.space_id, NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. post_like: server-side trigger replacing the client NotificationTriggers path.
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

  -- Post missing (race/delete) — nothing to notify.
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Skip self-likes.
  IF post_record.user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Title derived server-side; works for titleless posts.
  notification_title := COALESCE(
    NULLIF(TRIM(post_record.title), ''),
    NULLIF(TRIM(LEFT(post_record.content, 60)), ''),
    'your post'
  );

  -- Dedup guard: one like notification per (recipient, actor, post). Prevents
  -- unlike/relike spam without the batching machinery.
  IF NOT EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = post_record.user_id
      AND actor_id = NEW.user_id
      AND type = 'post_like'
      AND target_id = NEW.post_id
  ) THEN
    INSERT INTO notifications (
      user_id, actor_id, type, title, content_preview,
      actor_relationship, space_id, target_id
    ) VALUES (
      post_record.user_id, NEW.user_id, 'post_like', notification_title,
      NULL, 'member', post_record.space_id, NEW.post_id
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS post_like_notification_trigger ON public.post_likes;
CREATE TRIGGER post_like_notification_trigger
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.create_post_like_notification();

-- 3. Drop orphaned batching helpers (columns retained, non-destructive).
DROP FUNCTION IF EXISTS public.upsert_batched_notification(uuid, uuid, text, text, text, text, uuid, uuid, timestamptz);
DROP FUNCTION IF EXISTS public.create_or_update_batched_notification(uuid, uuid, varchar, text, text, varchar, uuid, text, timestamptz);
DROP FUNCTION IF EXISTS public.generate_batch_key(uuid, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.get_actor_display_names(uuid[]);

-- Drop the redundant unread-count overload; keep the no-arg auth.uid() version the client calls.
DROP FUNCTION IF EXISTS public.get_unread_notification_count(uuid);
