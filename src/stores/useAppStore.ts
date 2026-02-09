import { create } from 'zustand';
import { log } from '@/utils/logger';
import { getStableMobileDetection } from '@/utils/mobileDetection';

interface AppState {
    // Device & Platform
    isMobile: boolean;

    // App Lifecycle
    isVisible: boolean;
    isFocused: boolean;
    isBackground: boolean;
    lastBackgroundTime: number | null;
    lastForegroundTime: number;

    // Network
    isOnline: boolean;

    // Actions
    setLifecycle: (state: Partial<Pick<AppState, 'isVisible' | 'isFocused' | 'isBackground'>>) => void;
    setOnline: (isOnline: boolean) => void;
    recordBackground: () => void;
    recordForeground: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
    isMobile: getStableMobileDetection(),

    isVisible: true,
    isFocused: true,
    isBackground: false,
    lastBackgroundTime: null,
    lastForegroundTime: Date.now(),

    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

    setLifecycle: (newState) => {
        set((state) => ({ ...state, ...newState }));
        log.debug('Store', 'App lifecycle updated', newState);
    },

    setOnline: (isOnline) => {
        set({ isOnline });
        log.debug('Store', `App is now ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
    },

    recordBackground: () => {
        const now = Date.now();
        set({
            isBackground: true,
            lastBackgroundTime: now
        });
        log.debug('Store', 'App went to background');
    },

    recordForeground: () => {
        const now = Date.now();
        const lastBg = get().lastBackgroundTime;
        const duration = lastBg ? now - lastBg : 0;

        set({
            isBackground: false,
            lastForegroundTime: now,
            isVisible: true
        });

        log.debug('Store', `App returned to foreground after ${Math.round(duration / 1000)}s`);
    }
}));
