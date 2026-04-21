-- create_post_notifications copies NEW.title into notifications.title.
-- posts.title is nullable; notifications.title is NOT NULL. A post
-- without a title therefore fails with 23502 and takes the whole
-- INSERT with it. Surfaced by the rls-recursion integration test.
--
-- Fix: fall back to a 60-char excerpt of the content, then to a
-- generic string, so notifications.title is always populated.

CREATE OR REPLACE FUNCTION public.create_post_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  space_member RECORD;
  post_creator_role TEXT;
  notification_id UUID;
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
    FOR space_member IN
      SELECT user_id, role
      FROM space_members
      WHERE space_id = NEW.space_id
        AND user_id != NEW.user_id
    LOOP
      SELECT upsert_batched_notification(
        space_member.user_id,
        NEW.user_id,
        'new_post',
        notification_title,
        LEFT(NEW.content, 100),
        'admin',
        NEW.space_id,
        NEW.id
      ) INTO notification_id;
    END LOOP;

  ELSE
    FOR space_member IN
      SELECT user_id, role
      FROM space_members
      WHERE space_id = NEW.space_id
        AND role = 'admin'
        AND user_id != NEW.user_id
    LOOP
      SELECT upsert_batched_notification(
        space_member.user_id,
        NEW.user_id,
        'new_post',
        notification_title,
        LEFT(NEW.content, 100),
        'member',
        NEW.space_id,
        NEW.id
      ) INTO notification_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;
