import React from 'react';
// import type { SpaceEvent } from '@/types/calendar'; // Add this when SpaceEvent is defined
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react'; // Using X for close icon

interface EventDetailsProps {
  event: any; // Replace 'any' with SpaceEvent
  onClose: () => void;
  onEdit: (event: any) => void; // Replace 'any' with SpaceEvent
  onDelete: (eventId: string) => void;
  isUserAdminOrOwner: boolean; // Added to control edit/delete visibility
}

export const EventDetails: React.FC<EventDetailsProps> = ({
  event,
  onClose,
  onEdit,
  onDelete,
  isUserAdminOrOwner,
}) => {
  if (!event) return null;

  return (
    // This structure is a placeholder for displaying within the right panel
    // It will not be a modal itself but part of the EventDisplayPanel
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{event.title}</h3>
          <p className="text-sm text-gray-500">
            {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
            {new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
            {new Date(event.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </p>
        </div>
        {isUserAdminOrOwner && (
          <div className="flex space-x-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => onEdit(event)} className="p-1.5 h-auto text-gray-600 hover:text-gray-800">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(event.id)} className="p-1.5 h-auto text-gray-600 hover:text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="m10 11 0 6"/><path d="m14 11 0 6"/></svg>
            </Button>
          </div>
        )}
      </div>
      {event.description && <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.description}</p>}
      {/* Removed location and event_type to match screenshot more closely for the card, can be in modal */}
    </div>
  );
}; 