import { log } from '@/utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { SpaceEvent, NewSpaceEventData, UpdateSpaceEventData } from '@/types/calendar';
import type { Database, TablesInsert, TablesUpdate } from '@/types/supabase'; // Correctly import TablesInsert/Update
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { spaceEventCoordinator } from '@/utils/spaceEventCoordinator';
import { 
  SpaceEventType, 
  SpaceState, 
  SpaceSnapshot,
  SpaceTransitionState 
} from '@/types/spaceEvents';

// Helper to get the start and end of a given month for querying
const getMonthDateRange = (dateInMonth: Date) => {
  const year = dateInMonth.getFullYear();
  const month = dateInMonth.getMonth();
  const firstDay = new Date(year, month, 1, 0, 0, 0, 0).toISOString();
  // const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString(); // No longer strictly needed for lastDay here
  return { firstDay }; // Simplified, or adjust usage below
};

export const useSpaceEvents = (spaceId: string | undefined, currentMonthForDisplay: Date) => {
  const { user } = useOptimizedAuth();
  const [events, setEvents] = useState<SpaceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null); // Consider a more specific error type

  const fetchEvents = useCallback(async () => {
    if (!spaceId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    // const { firstDay, lastDay } = getMonthDateRange(currentMonthForDisplay); // Old way
    const year = currentMonthForDisplay.getFullYear();
    const month = currentMonthForDisplay.getMonth();
    const firstDayOfCurrentMonth = new Date(year, month, 1, 0, 0, 0, 0).toISOString();

    try {
      const { data, error: fetchError } = await getSupabaseClient()
        .from('space_events') // This should now be recognized by TypeScript
        .select('*')
        .eq('space_id', spaceId)
        .gte('start_time', firstDayOfCurrentMonth) // Fetch from start of current month display onwards
        // .lte('start_time', lastDay) // Removed upper bound to fetch all upcoming events
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;
      setEvents(data as SpaceEvent[] || []); // Cast to SpaceEvent[]
    } catch (err) {
      log.error('Hook', 'Error fetching space events:', err);
      setError(err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [spaceId, currentMonthForDisplay]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = async (eventData: NewSpaceEventData): Promise<SpaceEvent> => {
    if (!user) throw new Error('User not authenticated to add event.');
    if (!spaceId) throw new Error('Space ID is required to add event.');

    // Use TablesInsert for correct typing
    const fullEventData: TablesInsert<'space_events'> = {
      ...eventData,
      space_id: spaceId,
      creator_id: user.id,
      // Supabase will handle id, created_at, updated_at if they have defaults or are auto-generated
      // is_all_day might need a default if not provided and is NOT NULL without a DB default
    };

    setLoading(true);
    const { data: newEvent, error: insertError } = await getSupabaseClient()
      .from('space_events')
      .insert(fullEventData)
      .select()
      .single();
    setLoading(false);

    if (insertError) {
      log.error('Hook', "Error adding event:", insertError);
      setError(insertError);
      throw insertError;
    }
    if (!newEvent) throw new Error('Failed to create event, no data returned.');
    
    fetchEvents();
    return newEvent as SpaceEvent;
  };

  const updateEvent = async (eventId: string, eventData: UpdateSpaceEventData): Promise<SpaceEvent> => {
    setLoading(true);
    // Use TablesUpdate for correct typing. Ensure eventData matches this shape.
    const { data: updatedEvent, error: updateError } = await getSupabaseClient()
      .from('space_events')
      .update(eventData as TablesUpdate<'space_events'>) // Cast eventData if UpdateSpaceEventData is slightly different
      .eq('id', eventId)
      .select()
      .single();
    setLoading(false);

    if (updateError) {
      log.error('Hook', "Error updating event:", updateError);
      setError(updateError);
      throw updateError;
    }
    if (!updatedEvent) throw new Error('Failed to update event, no data returned.');

    fetchEvents();
    return updatedEvent as SpaceEvent;
  };

  const deleteEvent = async (eventId: string): Promise<void> => {
    setLoading(true);
    const { error: deleteError } = await getSupabaseClient()
      .from('space_events')
      .delete()
      .eq('id', eventId);
    setLoading(false);

    if (deleteError) {
      log.error('Hook', "Error deleting event:", deleteError);
      setError(deleteError);
      throw deleteError;
    }
    fetchEvents();
  };

  return { events, loading, error, fetchEvents, addEvent, updateEvent, deleteEvent };
};

// Hook for listening to specific space events
export function useSpaceEvent(
  eventType: SpaceEventType | 'all',
  handler: (event: SpaceEvent) => void | Promise<void>,
  dependencies: any[] = [],
  priority: number = 0
) {
  const handlerRef = useRef(handler);
  const listenerIdRef = useRef<string | null>(null);

  // Update handler ref when dependencies change
  useEffect(() => {
    handlerRef.current = handler;
  }, dependencies);

  useEffect(() => {
    // Remove old listener
    if (listenerIdRef.current) {
      spaceEventCoordinator.removeEventListener(listenerIdRef.current);
    }

    // Add new listener
    listenerIdRef.current = spaceEventCoordinator.addEventListener(
      eventType,
      (event) => handlerRef.current(event),
      priority
    );

    // Cleanup on unmount
    return () => {
      if (listenerIdRef.current) {
        spaceEventCoordinator.removeEventListener(listenerIdRef.current);
        listenerIdRef.current = null;
      }
    };
  }, [eventType, priority]);
}

// Hook for accessing current space state
export function useSpaceState() {
  const [state, setState] = useState<SpaceState>(spaceEventCoordinator.getState());

  useSpaceEvent('all', () => {
    setState(spaceEventCoordinator.getState());
  }, [], 100); // High priority for state updates

  return state;
}

// Hook for managing space transitions
export function useSpaceTransition() {
  const [transition, setTransition] = useState<SpaceTransitionState | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useSpaceEvent('space:switch-initiated', (event) => {
    setIsTransitioning(true);
    setTransition({
      fromSpace: spaceEventCoordinator.getState().previousSpace || undefined,
      toSpace: event.payload.spaceId,
      stage: 'initiated',
      progress: 0
    });
  }, [], 90);

  useSpaceEvent('space:snapshot-created', (event) => {
    setTransition(prev => prev ? {
      ...prev,
      stage: 'snapshot-created',
      progress: 20,
      snapshot: event.payload.snapshot
    } : null);
  }, [], 90);

  useSpaceEvent('space:switching', (event) => {
    setTransition(prev => prev ? {
      ...prev,
      stage: 'switching',
      progress: 40
    } : null);
  }, [], 90);

  useSpaceEvent('space:loading', (event) => {
    setTransition(prev => prev ? {
      ...prev,
      stage: 'loading',
      progress: 60
    } : null);
  }, [], 90);

  useSpaceEvent('space:completed', (event) => {
    setTransition(prev => prev ? {
      ...prev,
      stage: 'completed',
      progress: 100
    } : null);
    setIsTransitioning(false);
  }, [], 90);

  useSpaceEvent('space:failed', (event) => {
    setTransition(prev => prev ? {
      ...prev,
      stage: 'failed',
      progress: 0,
      error: event.payload.error
    } : null);
    setIsTransitioning(false);
  }, [], 90);

  return {
    transition,
    isTransitioning,
    progress: transition?.progress || 0
  };
}

// Hook for accessing space snapshots
export function useSpaceSnapshot(spaceId?: string) {
  const [snapshot, setSnapshot] = useState<SpaceSnapshot | null>(
    spaceId ? spaceEventCoordinator.getSnapshot(spaceId) : null
  );

  useSpaceEvent('space:snapshot-created', (event) => {
    if (!spaceId || event.payload.spaceId === spaceId) {
      setSnapshot(event.payload.snapshot || null);
    }
  }, [spaceId], 80);

  useSpaceEvent('space:data-updated', (event) => {
    if (!spaceId || event.payload.spaceId === spaceId) {
      // Refresh snapshot when data updates
      const updatedSnapshot = spaceEventCoordinator.getSnapshot(event.payload.spaceId);
      setSnapshot(updatedSnapshot);
    }
  }, [spaceId], 80);

  return snapshot;
}

// Hook for orchestrating space switches
export function useSpaceSwitcher() {
  const switchSpace = useCallback(async (
    spaceId: string, 
    subdomain: string, 
    source: 'navigation' | 'refresh' | 'user-action' = 'user-action'
  ) => {
    try {
      await spaceEventCoordinator.switchSpace(spaceId, subdomain, source);
    } catch (error) {
      log.error('Hook', '[useSpaceSwitcher] Failed to switch space:', error);
      throw error;
    }
  }, []);

  const createSnapshot = useCallback(async (spaceId: string, subdomain: string) => {
    try {
      return await spaceEventCoordinator.createSnapshot(spaceId, subdomain);
    } catch (error) {
      log.error('Hook', '[useSpaceSwitcher] Failed to create snapshot:', error);
      throw error;
    }
  }, []);

  return {
    switchSpace,
    createSnapshot,
    isTransitioning: spaceEventCoordinator.isTransitioning(),
    currentSpace: spaceEventCoordinator.getCurrentSpace()
  };
}

// Hook for data updates (for existing hooks to integrate)
export function useSpaceDataUpdates(spaceId: string, dataType: 'posts' | 'members' | 'presence') {
  const triggerUpdate = useCallback(async (data: any) => {
    await spaceEventCoordinator.dispatchEvent('space:data-updated', {
      spaceId,
      subdomain: '', // Will be filled by coordinator
      source: 'system',
      timestamp: Date.now()
    });
  }, [spaceId]);

  // Listen for relevant events
  useSpaceEvent(`space:${dataType}-updated` as SpaceEventType, (event) => {
    if (event.payload.spaceId === spaceId) {
      // Data was updated for this space
      log.debug('Hook', `[useSpaceDataUpdates] ${dataType} updated for space ${spaceId}`);
    }
  }, [spaceId, dataType], 70);

  return { triggerUpdate };
}

// Debug hook for development
export function useSpaceEventDebug() {
  const [debugInfo, setDebugInfo] = useState(spaceEventCoordinator.getDebugInfo());
  const [eventLog, setEventLog] = useState<SpaceEvent[]>([]);

  useSpaceEvent('all', (event) => {
    setDebugInfo(spaceEventCoordinator.getDebugInfo());
    setEventLog(prev => [...prev.slice(-19), event]); // Keep last 20 events
  }, [], 10); // Low priority

  const clearEventLog = useCallback(() => {
    setEventLog([]);
  }, []);

  return {
    debugInfo,
    eventLog,
    clearEventLog,
    coordinator: spaceEventCoordinator
  };
} 