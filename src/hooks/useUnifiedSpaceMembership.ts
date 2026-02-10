import { useMemo, useEffect } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { log } from '@/utils/logger';

export interface UnifiedMembership {
    isOwner: boolean;
    isAdmin: boolean;
    isMember: boolean;
    role: 'owner' | 'admin' | 'member' | 'guest';
    loading: boolean;
    permissions: any; // Using any for now to avoid extensive type imports, but ideally matched with SpacePermissions
}

/**
 * useUnifiedSpaceMembership
 * 
 * The single source of truth for user membership and roles in a space.
 * Uses request deduplication and centralized store to prevent "Fetch Storms".
 */
export function useUnifiedSpaceMembership(spaceId: string | undefined, subdomain: string | undefined) {
    const { user, loading: authLoading } = useOptimizedAuth();
    const {
        space,
        permissions,
        loadingSpace,
        loadingPermissions,
        loadActiveSpace
    } = useSpaceSettingsStore();

    const cacheKey = subdomain || spaceId || 'none';

    // Auto-load space data if missing or different
    useEffect(() => {
        if (!user?.id || (!spaceId && !subdomain)) return;

        const currentSpaceId = space?.id;
        const currentSubdomain = space?.subdomain;

        const needsLoad = !space ||
            (spaceId && currentSpaceId !== spaceId) ||
            (subdomain && currentSubdomain !== subdomain);

        if (needsLoad) {
            log.debug('Hook', `🛡️ [useUnifiedSpaceMembership] Dispatching load for ${cacheKey}`);
            loadActiveSpace({ subdomain, spaceId }, user.id);
        }
    }, [user?.id, spaceId, subdomain, space?.id, space?.subdomain, loadActiveSpace, cacheKey]);

    return useMemo(() => {
        const isLoading = authLoading || loadingSpace || loadingPermissions;

        // If we're loading and have no permissions yet, return safe defaults
        if (isLoading && !permissions) {
            return {
                isOwner: false,
                isAdmin: false,
                isMember: false,
                role: 'guest' as const,
                loading: true,
                permissions: null
            };
        }

        // Role detection
        let role: 'owner' | 'admin' | 'member' | 'guest' = 'guest';
        if (permissions?.isOwner) role = 'owner';
        else if (permissions?.isAdmin) role = 'admin';
        else if (permissions?.isMember) role = 'member';

        return {
            isOwner: !!permissions?.isOwner,
            isAdmin: !!permissions?.isAdmin,
            isMember: !!permissions?.isMember,
            role,
            loading: isLoading,
            permissions
        };
    }, [authLoading, loadingSpace, loadingPermissions, permissions]);
}
