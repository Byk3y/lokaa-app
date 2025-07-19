import { log } from '@/utils/logger';
import { SupabaseClient } from '@supabase/supabase-js';

interface Space {
  slug: string;
  id: string;
  name: string;
  created_at: string;
}

/**
 * Determines the appropriate redirect path for a logged-in user based on their spaces
 * and localStorage hints.
 *
 * @param userId The ID of the current user.
 * @param supabase The Supabase client instance.
 * @returns A promise that resolves to the redirect path string (e.g., "/myspace/space/feed" or "/discover").
 */
export async function getUserSpaceRedirectPath(
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  log.debug('Utils', `[getUserSpaceRedirectPath] Attempting to determine redirect for user ${userId}`);

  let userSpaces: Space[] = [];

  try {
    // First, get the IDs of spaces the user is a member of
    const { data: memberSpaceIdsData, error: memberSpaceIdsError } = await getSupabaseClient()
      .from('space_members')
      .select('space_id')
      .eq('user_id', userId);

    if (memberSpaceIdsError) {
      log.error('Utils', '[getUserSpaceRedirectPath] Error fetching user space memberships:', memberSpaceIdsError);
      return '/discover';
    }

    const spaceIds = memberSpaceIdsData?.map(m => m.space_id) || [];

    if (spaceIds.length === 0) {
      log.debug('Utils', '[getUserSpaceRedirectPath] User is not a member of any spaces.');
      return '/discover';
    }

    // Now, fetch the details of those spaces
    const { data: spacesData, error: spacesError } = await getSupabaseClient()
      .from('spaces')
      .select('slug, id, name, created_at')
      .in('id', spaceIds) // Use the array of IDs here
      .eq('is_archived', false)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }); // Fetch most recently created spaces first

    if (spacesError) {
      log.error('Utils', '[getUserSpaceRedirectPath] Error fetching user spaces details:', spacesError);
      return '/discover'; // Fallback on error
    }
    userSpaces = spacesData || [];
    log.debug('Utils', '[getUserSpaceRedirectPath] Fetched user spaces:', userSpaces.map(s => s.slug));

  } catch (e) {
    log.error('Utils', '[getUserSpaceRedirectPath] Exception fetching user spaces:', e);
    return '/discover'; // Fallback on error
  }

  if (userSpaces.length === 0) {
    // This case should ideally be caught by the spaceIds.length === 0 check earlier
    log.debug('Utils', '[getUserSpaceRedirectPath] User has no active/valid spaces after filtering. Redirecting to /discover.');
    return '/discover';
  }

  // Check localStorage for hints
  const lastVisitedSpaceSlug = localStorage.getItem('lastVisitedSpace');
  const lastCreatedSpaceSlug = localStorage.getItem('lastCreatedSpace');

  if (lastVisitedSpaceSlug) {
    const visitedSpace = userSpaces.find(s => s.slug === lastVisitedSpaceSlug);
    if (visitedSpace) {
      log.debug('Utils', `[getUserSpaceRedirectPath] Redirecting to last visited space: ${visitedSpace.slug}`);
      return `/${visitedSpace.slug}/space/feed`;
    } else {
      log.debug('Utils', `[getUserSpaceRedirectPath] Last visited space slug "${lastVisitedSpaceSlug}" not found in user's current spaces.`);
    }
  }

  if (lastCreatedSpaceSlug) {
    const createdSpace = userSpaces.find(s => s.slug === lastCreatedSpaceSlug);
    if (createdSpace) {
      // This acts as a secondary hint if lastVisited wasn't valid or present
      log.debug('Utils', `[getUserSpaceRedirectPath] Redirecting to last created (and stored) space: ${createdSpace.slug}`);
      return `/${createdSpace.slug}/space/feed`;
    } else {
       log.debug('Utils', `[getUserSpaceRedirectPath] Last created space slug "${lastCreatedSpaceSlug}" not found in user's current spaces.`);
    }
  }

  // If no valid localStorage hints, or hints were not in current spaces:
  // The spaces are already sorted by created_at descending from the query.
  const defaultSpace = userSpaces[0];
  if (defaultSpace) {
    log.debug('Utils', `[getUserSpaceRedirectPath] Redirecting to default (most recent/first fetched) space: ${defaultSpace.slug}`);
    return `/${defaultSpace.slug}/space/feed`;
  }

  // Fallback if somehow no space was chosen (should be rare if userSpaces.length > 0)
  log.debug('Utils', '[getUserSpaceRedirectPath] No specific space determined, defaulting to /discover.');
  return '/discover';
} 