import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { devLogger } from '@/utils/developmentLogger';

interface SubscriptionData {
    channel: any; // Using any for RealtimeChannel to avoid type conflicts if not installed
    callbacks: Set<Function>;
    refCount: number;
    lastUsed: number;
    spaceId: string;
    table: string;
    filter: string;
    event: string;
    isProtected: boolean;
}

interface NavigationState {
    currentRoute: string;
    previousRoute: string;
    lastNavigationTime: number;
}

/**
 * RealtimeManager - Unified Service for Supabase Realtime
 */
class RealtimeManager {
    private static instance: RealtimeManager;
    private subscriptions = new Map<string, SubscriptionData>();
    private navigationState: NavigationState = {
        currentRoute: typeof window !== 'undefined' ? window.location.pathname : '',
        previousRoute: '',
        lastNavigationTime: 0
    };
    private cleanupInterval: any = null; // Using any to avoid NodeJS.Timeout conflict

    private constructor() {
        this.setupNavigationTracking();
        this.startCleanupInterval();

        if (typeof window !== 'undefined') {
            (window as any).realtimeManager = this;
        }
        devLogger.startup('RealtimeManager', 'Unified service initialized');
    }

    static getInstance(): RealtimeManager {
        if (!RealtimeManager.instance) {
            RealtimeManager.instance = new RealtimeManager();
        }
        return RealtimeManager.instance;
    }

    subscribe(
        spaceId: string,
        table: string,
        callback: Function,
        options: {
            event?: string;
            filter?: string;
            protectOnNavigation?: boolean;
        } = {}
    ): string {
        const { event = '*', filter = '', protectOnNavigation = false } = options;
        const finalFilter = filter || `space_id=eq.${spaceId}`;
        const key = `${spaceId}:${table}:${finalFilter}:${event}`;

        const subscriptionId = `${key}:${Math.random().toString(36).slice(2, 9)}`;

        let subscription = this.subscriptions.get(key);

        if (!subscription) {
            devLogger.log('RealtimeManager', `Creating new pooled subscription: ${key}`);
            const channel = this.createChannel(spaceId, table, event, finalFilter, key);

            subscription = {
                channel,
                callbacks: new Set([callback]),
                refCount: 1,
                lastUsed: Date.now(),
                spaceId,
                table,
                filter: finalFilter,
                event,
                isProtected: protectOnNavigation
            };
            this.subscriptions.set(key, subscription);
        } else {
            devLogger.log('RealtimeManager', `Reusing pooled subscription: ${key} (refs: ${subscription.refCount + 1})`);
            subscription.callbacks.add(callback);
            subscription.refCount++;
            subscription.lastUsed = Date.now();
            if (protectOnNavigation) subscription.isProtected = true;
        }

        return subscriptionId;
    }

    unsubscribe(subscriptionId: string): void {
        if (!subscriptionId) return;

        const parts = subscriptionId.split(':');
        if (parts.length < 4) return;
        const key = parts.slice(0, 4).join(':');
        const subscription = this.subscriptions.get(key);

        if (!subscription) return;

        subscription.refCount--;
        devLogger.log('RealtimeManager', `Unsubscribing from ${key} (refs: ${subscription.refCount})`);

        if (subscription.refCount <= 0) {
            const timeSinceNav = Date.now() - this.navigationState.lastNavigationTime;
            const isNavigating = timeSinceNav < 5000;

            if (subscription.isProtected && isNavigating && this.isCriticalNavigation()) {
                devLogger.log('RealtimeManager', `Protection active for ${key} during navigation. Deferring cleanup.`);
                return;
            }

            setTimeout(() => {
                const current = this.subscriptions.get(key);
                if (current && current.refCount <= 0) {
                    devLogger.log('RealtimeManager', `Final cleanup for subscription: ${key}`);
                    current.channel.unsubscribe();
                    this.subscriptions.delete(key);
                }
            }, 10000);
        }
    }

    private createChannel(spaceId: string, table: string, event: string, filter: string, key: string): any {
        const channelName = `rt_${table}_${spaceId}_${Date.now()}`;

        return getSupabaseClient()
            .channel(channelName)
            .on(
                'postgres_changes' as any,
                {
                    event: event as any,
                    schema: 'public',
                    table,
                    filter,
                },
                (payload: any) => {
                    const sub = this.subscriptions.get(key);
                    if (sub) {
                        sub.lastUsed = Date.now();
                        sub.callbacks.forEach(cb => {
                            try { cb(payload); } catch (e) {
                                log.error('RealtimeManager', 'Callback error', e instanceof Error ? e : new Error(String(e)));
                            }
                        });
                    }
                }
            )
            .subscribe((status: any) => {
                devLogger.log('RealtimeManager', `Channel ${key} status: ${status}`);
            });
    }

    private setupNavigationTracking(): void {
        if (typeof window === 'undefined') return;

        const onNav = () => {
            this.navigationState.previousRoute = this.navigationState.currentRoute;
            this.navigationState.currentRoute = window.location.pathname;
            this.navigationState.lastNavigationTime = Date.now();
            devLogger.log('RealtimeManager', `Navigation detected: ${this.navigationState.previousRoute} -> ${this.navigationState.currentRoute}`);
        };

        window.addEventListener('popstate', onNav);

        const wrap = (fn: any) => function (this: any, ...args: any[]) {
            const res = fn.apply(this, args);
            onNav();
            return res;
        };

        history.pushState = wrap(history.pushState);
        history.replaceState = wrap(history.replaceState);
    }

    private isCriticalNavigation(): boolean {
        const from = this.navigationState.previousRoute;
        const to = this.navigationState.currentRoute;
        const isChat = (r: string) => r.includes('/chat');
        const isSpace = (r: string) => r.includes('/space') && !r.includes('/chat');
        return (isChat(from) && isSpace(to)) || (isSpace(from) && isChat(to));
    }

    public reconnectAll(): void {
        devLogger.log('RealtimeManager', `Manually reconnecting all ${this.subscriptions.size} channels...`);
        for (const [key, sub] of this.subscriptions.entries()) {
            try {
                sub.channel.unsubscribe();
                sub.channel = this.createChannel(sub.spaceId, sub.table, sub.event, sub.filter, key);
                devLogger.log('RealtimeManager', `Reconnected channel: ${key}`);
            } catch (err) {
                log.error('RealtimeManager', `Failed to reconnect ${key}`, err instanceof Error ? err : new Error(String(err)));
            }
        }
    }

    private startCleanupInterval(): void {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            const staleThreshold = 10 * 60 * 1000;

            for (const [key, sub] of this.subscriptions.entries()) {
                if (sub.refCount <= 0 && now - sub.lastUsed > staleThreshold) {
                    devLogger.log('RealtimeManager', `Cleaning up stale subscription: ${key}`);
                    sub.channel.unsubscribe();
                    this.subscriptions.delete(key);
                }
            }
        }, 5 * 60 * 1000);
    }

    public destroy(): void {
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);
        this.subscriptions.forEach(s => s.channel.unsubscribe());
        this.subscriptions.clear();
    }
}

export const realtimeManager = RealtimeManager.getInstance();
