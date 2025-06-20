-- Fix avatar_url sync from auth.users to public.users
-- This ensures members list shows profile pictures correctly

-- Update the handle_new_user function to include avatar_url
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
        profile_url,
        avatar_url  -- CRITICAL FIX: Add avatar_url sync
    )
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        v_full_name,
        final_slug,
        NEW.raw_user_meta_data->>'avatar_url'  -- CRITICAL FIX: Sync avatar_url from auth
    )
    ON CONFLICT (id) DO UPDATE
        SET first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            full_name = EXCLUDED.full_name,
            profile_url = EXCLUDED.profile_url,
            avatar_url = EXCLUDED.avatar_url,  -- CRITICAL FIX: Update avatar_url on conflict
            updated_at = NOW();
            
    RETURN NEW;
END;
$function$;

-- Also sync existing users who don't have avatar_url
-- This updates all existing users in public.users with their auth avatar_url
UPDATE public.users 
SET avatar_url = auth_data.avatar_url
FROM (
    SELECT 
        id,
        raw_user_meta_data->>'avatar_url' as avatar_url
    FROM auth.users 
    WHERE raw_user_meta_data->>'avatar_url' IS NOT NULL
    AND raw_user_meta_data->>'avatar_url' != ''
) auth_data
WHERE public.users.id = auth_data.id
AND (public.users.avatar_url IS NULL OR public.users.avatar_url = '');

-- Log the fix
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Avatar sync fix applied! Updated % existing users with avatar URLs', updated_count;
END $$; 