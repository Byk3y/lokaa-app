// Space Events Type Definitions
// Types for the space event coordination system

export type SpaceEventType = 
  | 'space:switch-initiated'
  | 'space:snapshot-created' 
  | 'space:switching'
  | 'space:loading'
  | 'space:completed'
  | 'space:failed'
  | 'space:data-updated'
  | 'space:members-updated'
  | 'space:posts-updated'
  | 'space:presence-updated';

export interface SpaceEventPayload {
  spaceId: string;
  subdomain: string;
  source: 'navigation' | 'refresh' | 'user-action' | 'system';
  timestamp: number;
  snapshot?: SpaceSnapshot;
  error?: string;
  data?: any;
}

export interface SpaceEvent {
  type: SpaceEventType;
  payload: SpaceEventPayload;
  id: string;
  timestamp: number;
}

export interface EventListener {
  id: string;
  type: SpaceEventType | 'all';
  handler: (event: SpaceEvent) => void | Promise<void>;
  priority: number;
}

export interface SpaceState {
  currentSpace: string | null;
  previousSpace: string | null;
  transition: SpaceTransitionState | null;
  snapshots: Map<string, SpaceSnapshot>;
  isTransitioning: boolean;
  lastUpdate: number;
}

export interface SpaceSnapshot {
  spaceId: string;
  subdomain: string;
  spaceData: any;
  memberCounts: {
    totalMembers: number;
    onlineMembers: number;
    adminMembers: number;
  };
  posts: {
    fetchedPosts: any[];
    pinnedPosts: any[];
    categories: any[];
  };
  presence: {
    onlineUsers: any[];
    presenceState: any;
  };
  timestamp: number;
  isValid: boolean;
}

export interface SpaceTransitionState {
  fromSpace?: string;
  toSpace: string;
  stage: 'initiated' | 'snapshot-created' | 'switching' | 'loading' | 'completed' | 'failed';
  progress: number;
  snapshot?: SpaceSnapshot;
  error?: string;
} 