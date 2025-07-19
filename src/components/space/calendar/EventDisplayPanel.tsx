import { log } from '@/utils/logger';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import type { SpaceEvent } from '@/types/calendar';
import { EventItemCard } from './EventItemCard'; // Will be created next

interface EventDisplayPanelProps {
  selectedDate: Date;
  allEvents: SpaceEvent[];
  onEditEvent: (event: SpaceEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  isUserAdminOrOwner: boolean;
}

export const EventDisplayPanel: React.FC<EventDisplayPanelProps> = ({
  selectedDate,
  allEvents,
  onEditEvent,
  onDeleteEvent,
  isUserAdminOrOwner,
}) => {
  const formattedDate = selectedDate.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  const endOfSelectedDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999);

  const eventsForSelectedDate = allEvents.filter(event => {
    try {
      const eventDate = new Date(event.start_time);
      // Check if the date is valid
      if (isNaN(eventDate.getTime())) {
        log.warn('Component', "Invalid event date in filter:", event.start_time);
        return false;
      }
      
      return eventDate.getFullYear() === selectedDate.getFullYear() &&
            eventDate.getMonth() === selectedDate.getMonth() &&
            eventDate.getDate() === selectedDate.getDate();
    } catch (error) {
      log.error('Component', "Error parsing event date:", error);
      return false;
    }
  }).sort((a, b) => {
    try {
      const dateA = new Date(a.start_time);
      const dateB = new Date(b.start_time);
      
      // Validate dates
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        return 0;
      }
      
      return dateA.getTime() - dateB.getTime();
    } catch (error) {
      log.error('Component', "Error sorting events:", error);
      return 0;
    }
  });

  const upcomingEvents = allEvents.filter(event => {
    try {
      const eventStartDate = new Date(event.start_time);
      // Check if the date is valid
      if (isNaN(eventStartDate.getTime()) || isNaN(endOfSelectedDay.getTime())) {
        log.warn('Component', "Invalid date in upcoming events filter:", event.start_time);
        return false;
      }
      
      return eventStartDate.getTime() > endOfSelectedDay.getTime();
    } catch (error) {
      log.error('Component', "Error filtering upcoming events:", error);
      return false;
    }
  }).sort((a, b) => {
    try {
      const dateA = new Date(a.start_time);
      const dateB = new Date(b.start_time);
      
      // Validate dates
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        return 0;
      }
      
      return dateA.getTime() - dateB.getTime();
    } catch (error) {
      log.error('Component', "Error sorting upcoming events:", error);
      return 0;
    }
  });

  return (
    <div className="flex flex-col h-full">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Events for {formattedDate}
          </h2>
          {/* TODO: "Show Upcoming" button from screenshot */}
          {/* <Button variant="outline" size="sm">Show Upcoming</Button> */}
        </div>
        {eventsForSelectedDate.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No events scheduled for this day.</p>
        ) : (
          <div className="space-y-3">
            {eventsForSelectedDate.map(event => (
              <EventItemCard 
                key={event.id} 
                event={event} 
                onEdit={onEditEvent} 
                onDelete={onDeleteEvent}
                isUserAdminOrOwner={isUserAdminOrOwner}
              />
            ))}
          </div>
        )}
      </div>

      {upcomingEvents.length > 0 && (
        <div className="mt-auto pt-4">
          <div className="space-y-3">
            {upcomingEvents.map(event => (
              <EventItemCard 
                key={event.id} 
                event={event} 
                onEdit={onEditEvent} 
                onDelete={onDeleteEvent}
                isUserAdminOrOwner={isUserAdminOrOwner}
                isUpcoming={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 