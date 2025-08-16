-- Fix signup 500s caused by RLS blocking trigger inserts on notification_preferences
-- Ensure trigger function runs with elevated privileges and safe search_path

-- 1) Create or replace function with SECURITY DEFINER and safe search_path
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Ensure the function owner is postgres so it can bypass RLS
ALTER FUNCTION public.create_default_notification_preferences() OWNER TO postgres;

-- 2) Recreate the trigger on auth.users to ensure it points to the updated function
DROP TRIGGER IF EXISTS trigger_create_default_notification_preferences ON auth.users;

CREATE TRIGGER trigger_create_default_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_preferences();

-- 3) Optional: grant execute (not required for triggers, but useful if called directly)
GRANT EXECUTE ON FUNCTION public.create_default_notification_preferences() TO anon, authenticated, service_role;

-- Notes:
-- - SECURITY DEFINER allows the function (owned by postgres) to bypass RLS on public.notification_preferences
-- - This prevents sign-up failures when the trigger runs without a JWT context
-- - The trigger is recreated to ensure the latest function definition is used




