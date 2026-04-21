import { useEffect, useState } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { migrationAdapter } from '@/utils/indexeddb/migration/MigrationAdapter';
import { log } from '@/utils/logger';

/**
 * Returns the current user's `profile_url` (slug) if available, or null while
 * loading / if not set yet. Navigations to a profile should prefer the slug
 * over the raw UUID so the resulting URL is canonical and shareable.
 *
 * Falls back to null — callers should route to `/settings/profile` when the
 * slug hasn't resolved yet.
 */
export function useCurrentUserProfileUrl(): string | null {
  const { user } = useOptimizedAuth();
  const [profileUrl, setProfileUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setProfileUrl(null);
      return;
    }

    (async () => {
      try {
        const { data, error } = await migrationAdapter.getUserProfile(user.id, ['profile_url']);
        if (cancelled) return;
        if (error) {
          log.warn('Hook', '[useCurrentUserProfileUrl] fetch failed:', error);
          return;
        }
        if (data?.profile_url) setProfileUrl(data.profile_url);
      } catch (err) {
        if (!cancelled) log.warn('Hook', '[useCurrentUserProfileUrl] error:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return profileUrl;
}
