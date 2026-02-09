import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { log } from '@/utils/logger';

/**
 * useAppLifecycle - Standard React hook for app visibility and network events
 * 
 * This replaces the legacy imperative systems with a 
 * predictable React lifecycle.
 */
export function useAppLifecycle() {
    const {
        setOnline,
        recordBackground,
        recordForeground,
        setLifecycle
    } = useAppStore();

    useEffect(() => {
        // 1. Network Status
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // 2. Visibility Change
        const handleVisibilityChange = () => {
            if (document.hidden) {
                recordBackground();
            } else {
                recordForeground();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 3. Focus/Blur
        const handleFocus = () => setLifecycle({ isFocused: true });
        const handleBlur = () => setLifecycle({ isFocused: false });

        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);

        // 4. Page Lifecycle (bfcache)
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                log.debug('App', 'Restored from bfcache');
                recordForeground();
            }
        };

        window.addEventListener('pageshow', handlePageShow);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('pageshow', handlePageShow);
        };
    }, [setOnline, recordBackground, recordForeground, setLifecycle]);
}
