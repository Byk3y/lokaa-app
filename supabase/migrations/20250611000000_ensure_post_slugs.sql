-- 1. Ensure the slug column exists on the posts table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'posts'
        AND column_name = 'slug'
    ) THEN
        ALTER TABLE public.posts ADD COLUMN slug TEXT;
    END IF;
END $$;

-- 2. Ensure the unique index exists for (space_id, slug) where slug is not null
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'posts' 
        AND indexname = 'posts_space_id_slug_unique_idx'
    ) THEN
        CREATE UNIQUE INDEX posts_space_id_slug_unique_idx ON public.posts (space_id, slug)
        WHERE slug IS NOT NULL;
    END IF;
END $$;

-- 3. Ensure the generate_post_slug function exists
CREATE OR REPLACE FUNCTION public.generate_post_slug(title text, space_id uuid, content text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  slug_attempt TEXT;
  counter INTEGER := 0;
  slug_exists BOOLEAN;
BEGIN
  -- Add debug logging
  RAISE LOG 'generate_post_slug called with title: %, space_id: %, content length: %', 
    COALESCE(title, 'NULL'), 
    space_id, 
    CASE WHEN content IS NULL THEN 0 ELSE LENGTH(content) END;

  -- If title exists, use it for the slug
  IF title IS NOT NULL AND title != '' THEN
    -- Convert to lowercase, replace spaces and special chars with hyphens
    base_slug := lower(regexp_replace(title, '[^a-zA-Z0-9]', '-', 'g'));
  -- If title is empty but content exists, use content
  ELSIF content IS NOT NULL AND content != '' THEN
    -- Try to extract plain text from content (in case it contains HTML/markdown)
    -- Remove HTML tags if present
    content := regexp_replace(content, '<[^>]*>', ' ', 'g');
    -- Convert to lowercase, replace spaces and special chars with hyphens
    base_slug := lower(regexp_replace(content, '[^a-zA-Z0-9]', '-', 'g'));
  -- If neither title nor content, use a random string (fallback)
  ELSE
    base_slug := 'post-' || substr(md5(random()::text), 1, 8);
  END IF;
  
  -- Replace multiple hyphens with a single one
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  -- Remove leading and trailing hyphens
  base_slug := trim(both '-' from base_slug);
  -- Truncate to a reasonable length (100 chars)
  base_slug := substr(base_slug, 1, 100);
  
  -- If the slug is empty after all processing (e.g. title was only special chars or whitespace), use a fallback
  IF base_slug = '' OR base_slug IS NULL THEN
    RAISE LOG 'Base slug became empty after processing (title: "%"), falling back to random string.', COALESCE(title, 'NULL');
    base_slug := 'post-' || substr(md5(random()::text), 1, 8);
  END IF;
  
  -- Try the base slug first
  slug_attempt := base_slug;
  
  -- Check if slug exists in this space
  LOOP
    EXECUTE 'SELECT EXISTS(SELECT 1 FROM public.posts WHERE space_id = $1 AND slug = $2)'
    INTO slug_exists
    USING space_id, slug_attempt;
    
    -- If slug doesn't exist or we've tried too many times, exit loop
    IF NOT slug_exists OR counter > 100 THEN
      EXIT;
    END IF;
    
    -- Increment counter and append to slug
    counter := counter + 1;
    slug_attempt := base_slug || '-' || counter::text;
  END LOOP;
  
  RAISE LOG 'generate_post_slug returning: %', slug_attempt;
  RETURN slug_attempt;
END;
$$;

-- 4. Ensure the set_post_slug function exists
CREATE OR REPLACE FUNCTION public.set_post_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log entry to trigger function
  RAISE LOG 'set_post_slug trigger called with operation %', TG_OP;
  
  -- Set slug if it's NULL or empty
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    RAISE LOG 'Setting slug for post: title=%, content_length=%', 
      COALESCE(NEW.title, 'NULL'), 
      CASE WHEN NEW.content IS NULL THEN 0 ELSE LENGTH(NEW.content) END;
    
    NEW.slug := generate_post_slug(NEW.title, NEW.space_id, NEW.content);
    
    RAISE LOG 'Slug set to: %', NEW.slug;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Ensure the trigger is attached to the posts table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE event_object_schema = 'public'
        AND event_object_table = 'posts'
        AND trigger_name = 'set_post_slug_trigger'
    ) THEN
        -- Drop any existing trigger with the same name to ensure clean installation
        DROP TRIGGER IF EXISTS set_post_slug_trigger ON public.posts;
        
        -- Create the trigger to fire on both INSERT and UPDATE
        CREATE TRIGGER set_post_slug_trigger
        BEFORE INSERT OR UPDATE ON public.posts
        FOR EACH ROW
        EXECUTE FUNCTION set_post_slug();
    END IF;
END $$;

-- 6. Back-fill missing slugs (if any)
UPDATE public.posts 
SET slug = generate_post_slug(title, space_id, content)
WHERE slug IS NULL; 