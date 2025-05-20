import React from 'react';
import { MonthGrid } from './MonthGrid';
// import type { SpaceEvent } from '@/types/calendar'; // Add this when SpaceEvent is defined

interface CalendarViewProps {
  currentDate: Date;
  selectedView: "month" | "week" | "day";
  events: any[]; // Replace 'any' with SpaceEvent later
  onEventClick: (event: any) => void; // Replace 'any' with SpaceEvent
  onDayClick: (date: Date) => void;
  onEditEvent: (event: any) => void; // Replace 'any' with SpaceEvent
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentDate,
  selectedView,
  events,
  onEventClick,
  onDayClick,
  onEditEvent
}) => {
  if (selectedView === 'month') {
    return (
      <MonthGrid 
        currentDate={currentDate} 
        events={events} 
        onEventClick={onEventClick} 
        onDayClick={onDayClick}
        onEditEvent={onEditEvent}
      />
    );
  }
  // Add WeekGrid and DayGrid/AgendaView later
  return <div className="p-4 bg-white rounded-lg shadow">View for {selectedView} coming soon...</div>;
}; 