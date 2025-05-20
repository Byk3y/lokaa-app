export interface SpaceEvent {
  id: string; 
  space_id: string;
  creator_id: string;
  title: string;
  description?: string | null;
  start_time: string; // ISO string format
  end_time: string;   // ISO string format
  is_all_day: boolean;
  event_type?: string | null;
  location?: string | null;
  created_at: string; // ISO string format
  updated_at: string; // ISO string format
}

// You might want to add types for event creation/update 
// if they differ significantly (e.g., some fields are not present on creation)
export type NewSpaceEventData = Omit<SpaceEvent, 'id' | 'created_at' | 'updated_at' | 'creator_id'> & {
  // creator_id will be added by the hook or backend logic
};

export type UpdateSpaceEventData = Partial<Omit<SpaceEvent, 'id' | 'created_at' | 'updated_at' | 'creator_id' | 'space_id'>>; 