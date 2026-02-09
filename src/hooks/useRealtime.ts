import { useEffect, useRef } from 'react';
import { realtimeManager } from '@/services/RealtimeManager';

interface RealtimeOptions {
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
    protectOnNavigation?: boolean;
}

/**
 * useRealtime - Standard Hook for Table-level Realtime Subscriptions
 * 
 * Usage:
 * useRealtime(spaceId, 'posts', (payload) => { ... }, { event: 'INSERT' });
 */
export function useRealtime(
    spaceId: string | undefined,
    table: string,
    callback: (payload: any) => void,
    options: RealtimeOptions = {}
) {
    const callbackRef = useRef(callback);

    // Update ref when callback changes to avoid effect re-runs
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!spaceId) return;

        // Use a proxy callback that always calls the latest ref
        const stableCallback = (payload: any) => callbackRef.current(payload);

        const subscriptionId = realtimeManager.subscribe(
            spaceId,
            table,
            stableCallback,
            options
        );

        return () => {
            realtimeManager.unsubscribe(subscriptionId);
        };
    }, [spaceId, table, options.event, options.filter, options.protectOnNavigation]);
}
