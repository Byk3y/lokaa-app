import { useState, useEffect } from "react";
import { CalendarControls } from "./calendar/CalendarControls";
import { MonthGrid } from "./calendar/MonthGrid";
import { EventModal } from "./calendar/EventModal";
import { EventDisplayPanel } from "./calendar/EventDisplayPanel";
import { useSpaceEvents } from "@/hooks/useSpaceEvents";
import type { SpaceEvent } from "@/types/calendar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface CalendarTabProps {
  space: {
    id: string;
    name: string;
    owner_id: string;
  };
}

export default function CalendarTab({ space }: CalendarTabProps) {
  const { user } = useAuth();
  const isUserAdminOrOwner = user?.id === space.owner_id;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SpaceEvent | null>(null);

  const { 
    events, 
    loading: loadingEvents, 
    error: eventsError, 
    addEvent, 
    updateEvent, 
    deleteEvent, 
    fetchEvents 
  } = useSpaceEvents(space.id, currentMonth);

  const handleAddEventClick = () => {
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: SpaceEvent) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      try {
        await deleteEvent(eventId);
        fetchEvents();
      } catch (error) {
        console.error("Failed to delete event:", error);
      }
    }
  };

  const handleModalClose = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
  };

  const handleEventSave = async (eventData: Omit<SpaceEvent, 'id' | 'created_at' | 'updated_at'> | Partial<SpaceEvent>) => {
    try {
      if (editingEvent && 'id' in eventData) {
        await updateEvent(editingEvent.id, eventData as Partial<SpaceEvent>);
      } else if (!editingEvent) {
        await addEvent(eventData as Omit<SpaceEvent, 'id' | 'created_at' | 'updated_at' | 'creator_id'>);
      }
      fetchEvents();
      handleModalClose();
    } catch (error) {
      console.error("Failed to save event:", error);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-gray-50 gap-6 p-6">
      <div className="w-full md:w-[320px] lg:w-[360px] flex-shrink-0 bg-white p-4 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Calendar</h2>
          {isUserAdminOrOwner && (
            <Button onClick={handleAddEventClick} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="mr-1.5 h-4 w-4" /> New Event
            </Button>
          )}
        </div>
        <CalendarControls
          currentDate={currentMonth}
          setCurrentDate={setCurrentMonth}
        />
        <MonthGrid
          currentDate={currentMonth}
          selectedDate={selectedDate}
          events={events}
          onDayClick={setSelectedDate}
          onEditEvent={isUserAdminOrOwner ? handleEditEvent : undefined}
          isUserAdminOrOwner={isUserAdminOrOwner}
        />
        <p className="text-xs text-gray-500 mt-3 text-center">
          Click a day to see events or add new.
        </p>
      </div>

      <div className="flex-grow bg-white p-4 rounded-lg shadow-md min-h-[400px]">
        <EventDisplayPanel 
          selectedDate={selectedDate}
          allEvents={events}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
          isUserAdminOrOwner={isUserAdminOrOwner}
        />
      </div>

      {isEventModalOpen && (
        <EventModal
          isOpen={isEventModalOpen}
          onClose={handleModalClose}
          onSave={handleEventSave}
          event={editingEvent}
          spaceId={space.id}
        />
      )}
    </div>
  );
} 