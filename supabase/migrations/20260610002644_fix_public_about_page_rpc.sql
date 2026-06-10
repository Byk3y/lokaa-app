-- Public about pages must be readable by invite links before authentication.
-- Keep the returned JSON aligned with SpaceAboutStore's existing UI contract.

CREATE OR REPLACE FUNCTION public.about_page_get_space(target_subdomain text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  space_record public.spaces%ROWTYPE;
  owner_record public.users%ROWTYPE;
BEGIN
  SELECT *
  INTO space_record
  FROM public.spaces
  WHERE subdomain = target_subdomain;

  IF space_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Space not found'
    );
  END IF;

  SELECT *
  INTO owner_record
  FROM public.users
  WHERE id = space_record.owner_id;

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
        WHEN owner_record.id IS NULL THEN NULL
        ELSE jsonb_build_object(
          'id', owner_record.id,
          'full_name', owner_record.full_name,
          'avatar_url', owner_record.avatar_url
        )
      END
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.about_page_get_space(text) TO anon, authenticated;

COMMENT ON FUNCTION public.about_page_get_space(text) IS
  'Safely retrieves space information for the public about page by subdomain.';
