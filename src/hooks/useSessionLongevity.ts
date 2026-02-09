import { useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';

/**
 * useSessionLongevity - Component-less version of the session protection logic
 * that was previously embedded in App.tsx.
 */
export function useSessionLongevity() {
    const isBackground = useAppStore((state: any) => state.isBackground);
    const lastBackgroundTime = useAppStore((state: any) => state.lastBackgroundTime);
    const wasBackgroundRef = useRef(isBackground);

    const handleProactiveSessionRefresh = async (): Promise<void> => {
        try {
            const client = getSupabaseClient();
            if (!client) return;
            const { data, error } = await client.auth.getSession();

            if (error || !data?.session) return;

            const session = data.session;
            const expiresAt = session?.expires_at ? session.expires_at * 1000 : 0;
            const now = Date.now();

            // Check if session expires within 15 minutes (proactive refresh)
            if (expiresAt - now < 900000) {
                log.debug('Auth', '🛡️ [SessionLongevity] Proactively refreshing session before background');
                const { error: refreshError } = await client.auth.refreshSession();

                if (refreshError) {
                    log.warn('Auth', '🛡️ [SessionLongevity] Proactive refresh failed:', refreshError);
                } else {
                    log.debug('Auth', '✅ [SessionLongevity] Proactive refresh successful');
                }
            }
        } catch (error) {
            log.warn('Auth', '🛡️ [SessionLongevity] Proactive refresh check failed:', error);
        }
    };

    const handleSessionValidation = async (reason: string, backgroundDuration: number): Promise<void> => {
        try {
            const client = getSupabaseClient();
            if (!client) return;
            const { data, error } = await client.auth.getSession();

            if (error || !data?.session) {
                log.debug('Auth', `🛡️ [SessionLongevity] No valid session found (${reason})`);
                return;
            }

            const session = data.session;
            const expiresAt = session?.expires_at ? session.expires_at * 1000 : 0;
            const now = Date.now();

            // Check if session expired or expires soon (5 minutes buffer)
            if (expiresAt <= now || expiresAt - now < 300000) {
                log.debug('Auth', `🛡️ [SessionLongevity] Session needs refresh after ${Math.round(backgroundDuration / 1000)}s background (${reason})`);

                const { error: refreshError } = await client.auth.refreshSession();

                if (refreshError) {
                    log.warn('Auth', `🛡️ [SessionLongevity] Session refresh failed (${reason}):`, refreshError);
                } else {
                    log.debug('Auth', `✅ [SessionLongevity] Session refresh successful (${reason})`);
                }
            } else {
                log.debug('Auth', `🛡️ [SessionLongevity] Session valid for ${Math.round((expiresAt - now) / 60000)} minutes`);
            }
        } catch (error) {
            log.warn('Auth', `🛡️ [SessionLongevity] Session validation failed (${reason}):`, error);
        }
    };

    useEffect(() => {
        const wasBackground = wasBackgroundRef.current;

        if (!wasBackground && isBackground) {
            // Just went to background
            handleProactiveSessionRefresh();
        } else if (wasBackground && !isBackground) {
            // Just returned to foreground
            const duration = lastBackgroundTime ? Date.now() - lastBackgroundTime : 0;
            if (duration > 30000) { // 30 seconds
                handleSessionValidation('background_return', duration);
            }
        }

        wasBackgroundRef.current = isBackground;
    }, [isBackground, lastBackgroundTime]);
}
