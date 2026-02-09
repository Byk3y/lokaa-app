import { create } from 'zustand';
import { log } from '@/utils/logger';

export type TransitionStage = 'idle' | 'initiated' | 'snapshot-created' | 'switching' | 'loading' | 'completed' | 'failed';

interface SpaceSnapshot {
    spaceId: string;
    subdomain: string;
    timestamp: number;
    isValid: boolean;
    data: any;
}

interface SpaceState {
    currentSpaceId: string | null;
    previousSpaceId: string | null;
    isTransitioning: boolean;
    transitionStage: TransitionStage;
    error: string | null;
    snapshots: Record<string, SpaceSnapshot>;

    initiateTransition: (spaceId: string, subdomain: string) => void;
    setTransitionStage: (stage: TransitionStage) => void;
    completeTransition: (spaceId: string) => void;
    failTransition: (error: string) => void;
    saveSnapshot: (spaceId: string, snapshot: SpaceSnapshot) => void;
}

export const useSpaceStore = create<SpaceState>((set) => ({
    currentSpaceId: null,
    previousSpaceId: null,
    isTransitioning: false,
    transitionStage: 'idle',
    error: null,
    snapshots: {},

    initiateTransition: (spaceId: string, subdomain: string) => {
        log.debug('SpaceStore', `Initiating switch to ${spaceId} (${subdomain})`);
        set((state) => ({
            previousSpaceId: state.currentSpaceId,
            currentSpaceId: spaceId,
            isTransitioning: true,
            transitionStage: 'initiated',
            error: null,
        }));
    },

    setTransitionStage: (stage: TransitionStage) => {
        log.debug('SpaceStore', `Transition stage: ${stage}`);
        set({ transitionStage: stage });
    },

    completeTransition: (spaceId: string) => {
        log.debug('SpaceStore', `Transition completed for ${spaceId}`);
        set({
            isTransitioning: false,
            transitionStage: 'completed',
            currentSpaceId: spaceId
        });
    },

    failTransition: (error: string) => {
        log.error('SpaceStore', `Transition failed: ${error}`);
        set({
            isTransitioning: false,
            transitionStage: 'failed',
            error
        });
    },

    saveSnapshot: (spaceId: string, snapshot: SpaceSnapshot) => {
        set((state) => ({
            snapshots: { ...state.snapshots, [spaceId]: snapshot }
        }));
    }
}));
