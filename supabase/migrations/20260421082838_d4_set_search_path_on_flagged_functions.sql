-- Phase D4: add SET search_path = 'public' to the load-bearing functions the
-- Supabase security advisor flagged for function_search_path_mutable. Without
-- it, a caller with a hijacked search_path could shadow `spaces`, `users`, etc.
-- with their own tables and trick a SECURITY DEFINER function into operating
-- on the wrong data.

ALTER FUNCTION public.get_user_spaces_with_memberships(uuid)
  SET search_path TO 'public';

ALTER FUNCTION public.sync_presence_systems()
  SET search_path TO 'public';

ALTER FUNCTION public.update_presence_state(uuid, uuid, jsonb)
  SET search_path TO 'public';

ALTER FUNCTION public.cleanup_stale_online_status(integer)
  SET search_path TO 'public';

ALTER FUNCTION public.generate_post_slug(text, uuid, text)
  SET search_path TO 'public';

ALTER FUNCTION public.set_post_slug()
  SET search_path TO 'public';
