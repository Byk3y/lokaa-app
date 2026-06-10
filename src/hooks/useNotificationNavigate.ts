import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';
import type { NotificationWithActor } from '@/types/notification';

/**
 * Shared navigation handler for notification clicks.
 *
 * Resolves a notification to its destination route and navigates there.
 * Used by both the desktop bell dropdown (NotificationCenter) and the
 * full-screen notifications page (NotificationsPage) so the behavior stays
 * in one place.
 */
export function useNotificationNavigate() {
  const navigate = useNavigate();

  return useCallback(
    async (notification: NotificationWithActor) => {
      log.debug('useNotificationNavigate', 'Navigating to notification:', notification);

      // Post-related notifications: resolve the post slug, then navigate.
      if (
        ['post_like', 'comment_reply', 'mention', 'new_post'].includes(notification.type) &&
        notification.target_id
      ) {
        try {
          const { data: postData, error: postError } = await getSupabaseClient()
            .from('posts')
            .select('id, slug, space_id')
            .eq('id', notification.target_id)
            .single();

          if (postError || !postData) {
            log.error('useNotificationNavigate', 'Failed to fetch post for navigation:', postError);
            return;
          }

          const { data: spaceData, error: spaceError } = await getSupabaseClient()
            .from('spaces')
            .select('subdomain')
            .eq('id', postData.space_id)
            .single();

          if (spaceError || !spaceData) {
            log.error('useNotificationNavigate', 'Failed to fetch space for navigation:', spaceError);
            return;
          }

          const spaceSubdomain = spaceData.subdomain || notification.space?.subdomain;
          if (spaceSubdomain && postData.slug) {
            navigate(`/${spaceSubdomain}/space/${postData.slug}`, { replace: false });
          } else {
            log.error('useNotificationNavigate', 'Missing space subdomain or post slug');
          }
        } catch (error) {
          log.error('useNotificationNavigate', 'Error navigating to post:', error);
        }
      }
      // Space-join notifications: navigate to the space.
      else if (notification.type === 'space_join' && notification.space?.subdomain) {
        navigate(`/${notification.space.subdomain}/space`, { replace: false });
      } else {
        log.debug('useNotificationNavigate', 'Unhandled notification type:', notification.type);
      }
    },
    [navigate]
  );
}
