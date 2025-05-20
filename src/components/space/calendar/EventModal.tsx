import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
// import type { SpaceEvent } from '@/types/calendar'; // Add this when SpaceEvent is defined

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: any) => void; // Replace 'any' with Partial<SpaceEvent> or specific create/update type
  event: any | null; // Replace 'any' with SpaceEvent
  spaceId: string; 
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  event,
  spaceId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [eventType, setEventType] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      // Format dates for input type datetime-local: YYYY-MM-DDTHH:mm
      setStartTime(event.start_time ? new Date(event.start_time).toISOString().slice(0, 16) : '');
      setEndTime(event.end_time ? new Date(event.end_time).toISOString().slice(0, 16) : '');
      setIsAllDay(event.is_all_day || false);
      setEventType(event.event_type || '');
      setLocation(event.location || '');
    } else {
      // Reset form for new event
      setTitle('');
      setDescription('');
      setStartTime('');
      setEndTime('');
      setIsAllDay(false);
      setEventType('');
      setLocation('');
    }
  }, [event]);

  const handleSubmit = () => {
    // Basic validation (can be expanded)
    if (!title || !startTime || !endTime) {
      alert('Title, Start Time, and End Time are required.');
      return;
    }
    onSave({
      title,
      description,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      is_all_day: isAllDay,
      event_type: eventType,
      location,
      space_id: spaceId, // Ensure space_id is passed if creating new
      // id: event?.id // Pass id if updating
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Event' : 'Add New Event'}</DialogTitle>
          <DialogDescription>
            {event ? 'Update the details of your event.' : 'Fill in the details for your new event.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event Title" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="event-start-time">Start Time</Label>
            <Input id="event-start-time" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="event-end-time">End Time</Label>
            <Input id="event-end-time" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="event-all-day" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} className="h-4 w-4"/>
            <Label htmlFor="event-all-day" className="text-sm font-normal">All-day event</Label>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="event-description">Description (Optional)</Label>
            <Textarea id="event-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Event Description" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="event-type">Type (Optional)</Label>
            <Input id="event-type" value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="e.g., Meeting, Workshop" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="event-location">Location/Link (Optional)</Label>
            <Input id="event-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Zoom link, Room 101" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{event ? 'Save Changes' : 'Add Event'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 