import React from 'react';
import type { SpaceEvent } from '@/types/calendar';
import { Button } from '@/components/ui/button';
// Using SVGs directly for icons as per EventDetails.tsx update

interface EventItemCardProps {
  event: SpaceEvent;
  onEdit: (event: SpaceEvent) => void;
  onDelete: (eventId: string) => void;
  isUserAdminOrOwner: boolean;
  isUpcoming?: boolean;
}

export const EventItemCard: React.FC<EventItemCardProps> = ({
  event,
  onEdit,
  onDelete,
  isUserAdminOrOwner,
  isUpcoming,
}) => {
  return (
    <div className={`border rounded-lg p-2.5 transition-all duration-150 ease-in-out transform hover:scale-[1.02] hover:shadow-lg ${isUpcoming ? 'bg-gray-50 border-gray-200' : 'bg-teal-50 border-teal-200'}`}>
      <div className="flex justify-between items-start mb-0.5">
        <div>
          <div className="flex items-center">
            <h4 className={`text-sm font-semibold ${isUpcoming ? 'text-gray-700' : 'text-teal-800'}`}>{event.title}</h4>
            {isUpcoming && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Upcoming
              </span>
            )}
          </div>
          <p className={`text-xs ${isUpcoming ? 'text-gray-500' : 'text-teal-600'}`}>
            <span className="inline-flex items-center mr-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock mr-0.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
              {new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="inline-flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-days mr-0.5"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
              {new Date(event.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          </p>
        </div>
        {isUserAdminOrOwner && (
          <div className="flex space-x-0.5 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => onEdit(event)} className={`p-0.5 h-auto ${isUpcoming ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-teal-700'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(event.id)} className={`p-0.5 h-auto ${isUpcoming ? 'text-gray-400 hover:text-red-500' : 'text-gray-500 hover:text-red-600'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="m10 11 0 6"/><path d="m14 11 0 6"/></svg>
            </Button>
          </div>
        )}
      </div>
      {event.description && <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">{event.description}</p>}
    </div>
  );
}; 