import React from 'react';
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
    const eventDate = new Date(event.start_time);
    return eventDate.getFullYear() === selectedDate.getFullYear() &&
           eventDate.getMonth() === selectedDate.getMonth() &&
           eventDate.getDate() === selectedDate.getDate();
  }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const upcomingEvents = allEvents.filter(event => {
    const eventStartDate = new Date(event.start_time);
    return eventStartDate.getTime() > endOfSelectedDay.getTime();
  }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

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