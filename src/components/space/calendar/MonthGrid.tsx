import React from 'react';
import type { SpaceEvent } from '@/types/calendar';
import { Button } from '@/components/ui/button'; // For potential event actions
import { Edit3 } from 'lucide-react'; // Example icon

interface MonthGridProps {
  currentDate: Date; // The month/year to display
  selectedDate: Date; // The specifically selected day by the user
  events: SpaceEvent[];
  onDayClick: (date: Date) => void;
  onEditEvent?: (event: SpaceEvent) => void; // Optional, if direct edit from grid is needed
  isUserAdminOrOwner: boolean;
}

export const MonthGrid: React.FC<MonthGridProps> = ({
  currentDate,
  selectedDate,
  events,
  onDayClick,
  onEditEvent,
  isUserAdminOrOwner,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  // Create an array of day numbers for the current month
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Create prefix empty cells for days before the first of the month
  const emptyCellsPrefix = Array.from({ length: firstDayOfMonth }, () => null);

  // Combine empty cells with actual day numbers
  const calendarCells = [...emptyCellsPrefix, ...daysArray];

  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Using single letter as per image

  return (
    <div className="mt-4">
      <div className="grid grid-cols-7 gap-x-2 text-center text-xs font-medium text-gray-500 mb-2">
        {weekdays.map((day, index) => <div key={`${day}-${index}`}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-x-0.5 gap-y-0.5">
        {calendarCells.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="aspect-square"></div>; // Empty cell for spacing
          }
          const cellDate = new Date(year, month, day);
          const isToday = day === todayDate && month === todayMonth && year === todayYear;
          const isSelected = 
            day === selectedDate.getDate() && 
            month === selectedDate.getMonth() && 
            year === selectedDate.getFullYear();

          const dayEvents = events.filter(e => {
            const eventDate = new Date(e.start_time);
            return eventDate.getFullYear() === year && eventDate.getMonth() === month && eventDate.getDate() === day;
          });
          const hasEvents = dayEvents.length > 0;

          return (
            <div 
              key={`${year}-${month}-${day}`} 
              className={`aspect-square flex flex-col items-center justify-center rounded-full cursor-pointer transition-all duration-150 ease-in-out transform hover:scale-105
                          ${isSelected ? 'bg-teal-600 text-white scale-105' : 'hover:bg-gray-100'}
                          ${isToday && !isSelected ? 'bg-teal-100 text-teal-700' : ''}
                          ${!isToday && !isSelected ? 'text-gray-700' : ''}
                        `}
              onClick={() => onDayClick(cellDate)}
            >
              <span className={`text-sm ${isSelected ? 'font-semibold' : (isToday ? 'font-medium' : 'font-normal')}`}>{day}</span>
              {hasEvents && (
                <div className={`mt-0.5 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-teal-500'}`}></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}; 