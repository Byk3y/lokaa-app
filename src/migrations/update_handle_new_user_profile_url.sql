-- Update handle_new_user function to correctly use username for profile_url generation with /@ prefix

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    input_username TEXT;
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
    slug_exists BOOLEAN;
    v_full_name TEXT;
BEGIN
    v_full_name := NEW.raw_user_meta_data->>'full_name';
    IF v_full_name IS NULL OR v_full_name = '' THEN
        v_full_name := trim(COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', ''));
    END IF;

    input_username := NEW.raw_user_meta_data->>'username';

    -- If username is not provided in metadata, fallback to first_name-last_name or user_id
    IF input_username IS NULL OR trim(input_username) = '' THEN
        base_slug := lower(
            trim(
                COALESCE(NEW.raw_user_meta_data->>'first_name', '') || '-' || COALESCE(NEW.raw_user_meta_data->>'last_name', '')
            )
        );
        IF base_slug = '-' OR base_slug = '' THEN -- Handle cases where first_name and last_name might be empty
            base_slug := NEW.id::text;
        END IF;
    ELSE
        base_slug := input_username;
    END IF;

    -- Clean the base_slug (applies to username or generated first-last name slug)
    base_slug := lower(regexp_replace(base_slug, E'[^a-zA-Z0-9_.-]+', '', 'g')); -- Allow alphanumeric, underscore, dot, hyphen
    base_slug := regexp_replace(base_slug, E'^-+|-+$|^_+|E_+$|^\\.+|\\.$', '', 'g'); -- Trim leading/trailing hyphens, underscores, dots

    -- Ensure profile_url starts with /@
    final_slug := '/@' || base_slug;

    LOOP
        SELECT EXISTS(SELECT 1 FROM public.users WHERE profile_url = final_slug) INTO slug_exists;
        EXIT WHEN NOT slug_exists OR counter >= 10; -- Exit if slug is unique or 10 attempts made
        counter := counter + 1;
        -- Append a short random string if collision
        final_slug := '/@' || base_slug || '-' || substr(md5(random()::text), 1, 4);
    END LOOP;

    -- Ultimate fallback if still not unique after attempts
    IF slug_exists THEN
        final_slug := '/@' || NEW.id::text;
    END IF;

    INSERT INTO public.users (
        id,
        first_name,
        last_name,
        full_name,
        profile_url
    )
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        v_full_name,
        final_slug
    )
    ON CONFLICT (id) DO UPDATE
        SET first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            full_name = EXCLUDED.full_name,
            profile_url = EXCLUDED.profile_url, -- Allow profile_url to be updated if needed
            updated_at = NOW();
            
    RETURN NEW;
END;
$function$;

-- Re-grant execute permission on the function to the authenticated role if your trigger runs as 'authenticated'
-- If the trigger is on auth.users and defined as SECURITY DEFINER, it runs as the user that owns the table (usually postgres or supabase_admin)
-- However, it's good practice to ensure the role that will cause the trigger to fire (auth.users inserts typically by anon or authenticated) has relevant permissions on functions it might interact with if not SECURITY DEFINER.
-- In this specific case, as it's SECURITY DEFINER and SET search_path TO 'public', this is less critical but included for completeness.
-- GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- It is also good practice to ensure the trigger owner (postgres) has permissions on the users table.
-- This is typically already the case in Supabase. 