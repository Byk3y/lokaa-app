import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SpaceEvent, NewSpaceEventData, UpdateSpaceEventData } from '@/types/calendar';
import type { Database, TablesInsert, TablesUpdate } from '@/types/supabase'; // Correctly import TablesInsert/Update
import { useAuth } from '@/contexts/AuthContext';

// Helper to get the start and end of a given month for querying
const getMonthDateRange = (dateInMonth: Date) => {
  const year = dateInMonth.getFullYear();
  const month = dateInMonth.getMonth();
  const firstDay = new Date(year, month, 1, 0, 0, 0, 0).toISOString();
  // const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString(); // No longer strictly needed for lastDay here
  return { firstDay }; // Simplified, or adjust usage below
};

export const useSpaceEvents = (spaceId: string | undefined, currentMonthForDisplay: Date) => {
  const { user } = useAuth();
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
      const { data, error: fetchError } = await supabase
        .from('space_events') // This should now be recognized by TypeScript
        .select('*')
        .eq('space_id', spaceId)
        .gte('start_time', firstDayOfCurrentMonth) // Fetch from start of current month display onwards
        // .lte('start_time', lastDay) // Removed upper bound to fetch all upcoming events
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;
      setEvents(data as SpaceEvent[] || []); // Cast to SpaceEvent[]
    } catch (err) {
      console.error('Error fetching space events:', err);
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
    const { data: newEvent, error: insertError } = await supabase
      .from('space_events')
      .insert(fullEventData)
      .select()
      .single();
    setLoading(false);

    if (insertError) {
      console.error("Error adding event:", insertError);
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
    const { data: updatedEvent, error: updateError } = await supabase
      .from('space_events')
      .update(eventData as TablesUpdate<'space_events'>) // Cast eventData if UpdateSpaceEventData is slightly different
      .eq('id', eventId)
      .select()
      .single();
    setLoading(false);

    if (updateError) {
      console.error("Error updating event:", updateError);
      setError(updateError);
      throw updateError;
    }
    if (!updatedEvent) throw new Error('Failed to update event, no data returned.');

    fetchEvents();
    return updatedEvent as SpaceEvent;
  };

  const deleteEvent = async (eventId: string): Promise<void> => {
    setLoading(true);
    const { error: deleteError } = await supabase
      .from('space_events')
      .delete()
      .eq('id', eventId);
    setLoading(false);

    if (deleteError) {
      console.error("Error deleting event:", deleteError);
      setError(deleteError);
      throw deleteError;
    }
    fetchEvents();
  };

  return { events, loading, error, fetchEvents, addEvent, updateEvent, deleteEvent };
}; 