import { log } from '@/utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { SpaceEvent, NewSpaceEventData, UpdateSpaceEventData } from '@/types/calendar';
import type { TablesInsert, TablesUpdate } from '@/types/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSpaceStore } from '@/stores/useSpaceStore';
import { useRealtime } from '@/hooks/useRealtime';

/**
 * useSpaceEvents - Data fetching and mutations for space events
 */
export const useSpaceEvents = (spaceId: string | undefined, currentMonthForDisplay: Date) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<SpaceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchEvents = useCallback(async () => {
    if (!spaceId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const year = currentMonthForDisplay.getFullYear();
    const month = currentMonthForDisplay.getMonth();
    const firstDayOfCurrentMonth = new Date(year, month, 1, 0, 0, 0, 0).toISOString();

    try {
      const { data, error: fetchError } = await getSupabaseClient()
        .from('space_events')
        .select('*')
        .eq('space_id', spaceId)
        .gte('start_time', firstDayOfCurrentMonth)
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;
      setEvents(data as SpaceEvent[] || []);
    } catch (err) {
      log.error('Hook', 'Error fetching space events:', err);
      setError(err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [spaceId, currentMonthForDisplay]);

  // Set up real-time subscription for space events
  useRealtime(
    spaceId, // Only subscribe if spaceId is present
    'space_events',
    (payload) => {
      log.debug('Hook', '[useSpaceEvents] Real-time event received:', payload.eventType);
      fetchEvents(); // Refresh data on any change
    },
    {
      event: '*',
      filter: spaceId ? `space_id=eq.${spaceId}` : undefined
    }
  );

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = async (eventData: NewSpaceEventData): Promise<SpaceEvent> => {
    if (!user) throw new Error('User not authenticated.');
    if (!spaceId) throw new Error('Space ID is required.');

    const fullEventData: TablesInsert<'space_events'> = {
      ...eventData,
      space_id: spaceId,
      creator_id: user.id,
    };

    setLoading(true);
    try {
      const { data: newEvent, error: insertError } = await getSupabaseClient()
        .from('space_events')
        .insert(fullEventData)
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newEvent) throw new Error('No data returned.');

      fetchEvents();
      return newEvent as SpaceEvent;
    } finally {
      setLoading(false);
    }
  };

  const updateEvent = async (eventId: string, eventData: UpdateSpaceEventData): Promise<SpaceEvent> => {
    setLoading(true);
    try {
      const { data: updatedEvent, error: updateError } = await getSupabaseClient()
        .from('space_events')
        .update(eventData as TablesUpdate<'space_events'>)
        .eq('id', eventId)
        .select()
        .single();

      if (updateError) throw updateError;
      if (!updatedEvent) throw new Error('No data returned.');

      fetchEvents();
      return updatedEvent as SpaceEvent;
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (eventId: string): Promise<void> => {
    setLoading(true);
    try {
      const { error: deleteError } = await getSupabaseClient()
        .from('space_events')
        .delete()
        .eq('id', eventId);

      if (deleteError) throw deleteError;
      fetchEvents();
    } finally {
      setLoading(false);
    }
  };

  return { events, loading, error, fetchEvents, addEvent, updateEvent, deleteEvent };
};

/**
 * useSpaceState - Access current space state from Zustand
 */
export const useSpaceState = () => {
  const currentSpaceId = useSpaceStore((state: any) => state.currentSpaceId);
  const previousSpaceId = useSpaceStore((state: any) => state.previousSpaceId);
  return { currentSpaceId, previousSpaceId };
};

/**
 * useSpaceTransition - Manage space transition states from Zustand
 */
export const useSpaceTransition = () => {
  const isTransitioning = useSpaceStore((state: any) => state.isTransitioning);
  const transitionStage = useSpaceStore((state: any) => state.transitionStage);
  const transitionError = useSpaceStore((state: any) => state.error);

  return {
    isTransitioning,
    stage: transitionStage,
    error: transitionError,
    progress: transitionStage === 'completed' ? 100 : (isTransitioning ? 50 : 0)
  };
};

/**
 * useSpaceSnapshot - Access space snapshots
 */
export const useSpaceSnapshot = (spaceId?: string) => {
  const snapshots = useSpaceStore((state: any) => state.snapshots);
  return spaceId ? snapshots[spaceId] || null : null;
};

/**
 * useSpaceSwitcher - Orchestrate space switches
 */
export function useSpaceSwitcher() {
  const initiateTransition = useSpaceStore((state: any) => state.initiateTransition);
  const completeTransition = useSpaceStore((state: any) => state.completeTransition);
  const failTransition = useSpaceStore((state: any) => state.failTransition);
  const isTransitioning = useSpaceStore((state: any) => state.isTransitioning);
  const currentSpaceId = useSpaceStore((state: any) => state.currentSpaceId);

  const switchSpace = useCallback(async (
    spaceId: string,
    subdomain: string,
    source: string = 'user-action'
  ) => {
    log.info('Hook', `Switching space to ${spaceId} via ${source}`);
    initiateTransition(spaceId, subdomain);

    try {
      // Logic for transition here in future
      completeTransition(spaceId);
    } catch (err) {
      failTransition(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [initiateTransition, completeTransition, failTransition]);

  return {
    switchSpace,
    isTransitioning,
    currentSpace: currentSpaceId
  };
}

// Legacy Stubs for compatibility
export function useSpaceEvent(_eventType: any, _handler: any) {
  useEffect(() => {
    // Stub
  }, []);
}