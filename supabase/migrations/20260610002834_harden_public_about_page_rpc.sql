-- Harden the public about-page RPC used by unauthenticated invite links.
-- This keeps the endpoint read-only, slug-scoped, and limited to explicit public fields.

CREATE OR REPLACE FUNCTION public.about_page_get_space(target_subdomain text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_subdomain text;
  space_record public.spaces%ROWTYPE;
  owner_full_name text;
  owner_avatar_url text;
BEGIN
  normalized_subdomain := lower(trim(coalesce(target_subdomain, '')));

  IF normalized_subdomain = ''
    OR length(normalized_subdomain) > 63
    OR normalized_subdomain !~ '^[a-z0-9][a-z0-9-]{0,62}$'
  THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Space not found'
    );
  END IF;

  SELECT *
  INTO space_record
  FROM public.spaces
  WHERE subdomain = normalized_subdomain
  LIMIT 1;

  IF space_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Space not found'
    );
  END IF;

  SELECT full_name, avatar_url
  INTO owner_full_name, owner_avatar_url
  FROM public.users
  WHERE id = space_record.owner_id
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Space found',
    'space', jsonb_build_object(
      'id', space_record.id,
      'name', space_record.name,
      'subdomain', space_record.subdomain,
      'description', space_record.description,
      'icon_image', space_record.icon_image,
      'cover_image', space_record.cover_image,
      'intro_media_type', space_record.intro_media_type,
      'intro_media_url', space_record.intro_media_url,
      'intro_media_thumbnail_url', space_record.intro_media_thumbnail_url,
      'about_description', space_record.about_description,
      'pricing_type', space_record.pricing_type,
      'price_per_month', space_record.price_per_month,
      'is_private', space_record.is_private,
      'primary_color', space_record.primary_color,
      'owner_id', space_record.owner_id,
      'created_at', space_record.created_at,
      'updated_at', space_record.updated_at,
      'member_count', space_record.member_count,
      'owner', CASE
        WHEN owner_full_name IS NULL AND owner_avatar_url IS NULL THEN NULL
        ELSE jsonb_build_object(
          'id', space_record.owner_id,
          'full_name', owner_full_name,
          'avatar_url', owner_avatar_url
        )
      END
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.about_page_get_space(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.about_page_get_space(text) TO anon, authenticated;

COMMENT ON FUNCTION public.about_page_get_space(text) IS
  'Read-only public about-page lookup by normalized space subdomain. Returns a fixed public field allowlist for invite/about pages.';
