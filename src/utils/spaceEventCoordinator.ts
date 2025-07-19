import { log } from '@/utils/logger';
// Space Event Coordinator
// Central event bus for all space state changes with snapshot system

import { 
  SpaceEvent, 
  SpaceEventType, 
  SpaceEventPayload, 
  EventListener, 
  SpaceState,
  SpaceSnapshot,
  SpaceTransitionState
} from '@/types/spaceEvents';

class SpaceEventCoordinator {
  private state: SpaceState;
  private listeners: Map<string, EventListener>;
  private eventQueue: SpaceEvent[];
  private isProcessingQueue: boolean;
  private debugMode: boolean;

  constructor() {
    this.state = {
      currentSpace: null,
      previousSpace: null,
      transition: null,
      snapshots: new Map(),
      isTransitioning: false,
      lastUpdate: Date.now()
    };
    
    this.listeners = new Map();
    this.eventQueue = [];
    this.isProcessingQueue = false;
    this.debugMode = process.env.NODE_ENV === 'development';
    
    // Initialize global debugging interface
    if (typeof window !== 'undefined') {
      (window as any).spaceEventCoordinator = this;
      this.log('🎯 Space Event Coordinator initialized');
    }
  }

  // Event Management
  addEventListener(
    type: SpaceEventType | 'all',
    handler: (event: SpaceEvent) => void | Promise<void>,
    priority: number = 0
  ): string {
    const id = `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.listeners.set(id, {
      id,
      type,
      handler,
      priority
    });
    
    this.log(`📝 Added listener ${id} for ${type} with priority ${priority}`);
    return id;
  }

  removeEventListener(id: string): boolean {
    const removed = this.listeners.delete(id);
    if (removed) {
      this.log(`🗑️ Removed listener ${id}`);
    }
    return removed;
  }

  // Event Dispatch
  async dispatchEvent(type: SpaceEventType, payload: SpaceEventPayload): Promise<void> {
    const event: SpaceEvent = {
      type,
      payload,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    this.log(`📤 Dispatching event: ${type}`, { event });
    
    // Add to queue
    this.eventQueue.push(event);
    
    // Process queue if not already processing
    if (!this.isProcessingQueue) {
      await this.processEventQueue();
    }
  }

  private async processEventQueue(): Promise<void> {
    if (this.isProcessingQueue || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    
    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()!;
        await this.processEvent(event);
      }
    } catch (error) {
      this.log('❌ Error processing event queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async processEvent(event: SpaceEvent): Promise<void> {
    // Update internal state
    this.updateState(event);
    
    // Get relevant listeners sorted by priority
    const relevantListeners = Array.from(this.listeners.values())
      .filter(listener => listener.type === 'all' || listener.type === event.type)
      .sort((a, b) => b.priority - a.priority);

    // Execute listeners
    for (const listener of relevantListeners) {
      try {
        await listener.handler(event);
      } catch (error) {
        this.log(`❌ Error in listener ${listener.id}:`, error);
      }
    }
  }

  private updateState(event: SpaceEvent): void {
    const { type, payload } = event;
    
    switch (type) {
      case 'space:switch-initiated':
        this.state.previousSpace = this.state.currentSpace;
        this.state.currentSpace = payload.spaceId;
        this.state.isTransitioning = true;
        this.state.transition = {
          fromSpace: this.state.previousSpace || undefined,
          toSpace: payload.spaceId,
          stage: 'initiated',
          progress: 0
        };
        break;
        
      case 'space:snapshot-created':
        this.state.transition = {
          ...this.state.transition!,
          stage: 'snapshot-created',
          progress: 20,
          snapshot: payload.snapshot
        };
        if (payload.snapshot) {
          this.state.snapshots.set(payload.spaceId, payload.snapshot);
        }
        break;
        
      case 'space:switching':
        this.state.transition = {
          ...this.state.transition!,
          stage: 'switching',
          progress: 40
        };
        break;
        
      case 'space:loading':
        this.state.transition = {
          ...this.state.transition!,
          stage: 'loading',
          progress: 60
        };
        break;
        
      case 'space:completed':
        this.state.transition = {
          ...this.state.transition!,
          stage: 'completed',
          progress: 100
        };
        this.state.isTransitioning = false;
        break;
        
      case 'space:failed':
        this.state.transition = {
          ...this.state.transition!,
          stage: 'failed',
          progress: 0,
          error: payload.error
        };
        this.state.isTransitioning = false;
        break;
    }
    
    this.state.lastUpdate = Date.now();
  }

  // Snapshot Management
  async createSnapshot(spaceId: string, subdomain: string): Promise<SpaceSnapshot> {
    this.log(`📸 Creating snapshot for space ${spaceId} (${subdomain})`);
    
    try {
      // Gather current state from all systems
      const snapshot: SpaceSnapshot = {
        spaceId,
        subdomain,
        spaceData: await this.gatherSpaceData(spaceId),
        memberCounts: await this.gatherMemberCounts(spaceId),
        posts: await this.gatherPostsData(spaceId),
        presence: await this.gatherPresenceData(spaceId),
        timestamp: Date.now(),
        isValid: true
      };
      
      // Store snapshot
      this.state.snapshots.set(spaceId, snapshot);
      
      this.log(`✅ Snapshot created for ${spaceId}`, { snapshot });
      return snapshot;
      
    } catch (error) {
      this.log(`❌ Failed to create snapshot for ${spaceId}:`, error);
      
      const errorSnapshot: SpaceSnapshot = {
        spaceId,
        subdomain,
        spaceData: null,
        memberCounts: { totalMembers: 0, onlineMembers: 0, adminMembers: 0 },
        posts: { fetchedPosts: [], pinnedPosts: [], categories: [] },
        presence: { onlineUsers: [], presenceState: null },
        timestamp: Date.now(),
        isValid: false
      };
      
      return errorSnapshot;
    }
  }

  private async gatherSpaceData(spaceId: string): Promise<any> {
    // Access global space data if available
    if (typeof window !== 'undefined') {
      const globalCache = (window as any).globalCacheCoordinator;
      if (globalCache?.getCachedData) {
        return globalCache.getCachedData(`space:${spaceId}`);
      }
    }
    return null;
  }

  private async gatherMemberCounts(spaceId: string): Promise<any> {
    // Access member counts from global cache or hooks
    if (typeof window !== 'undefined') {
      const globalCache = (window as any).globalCacheCoordinator;
      if (globalCache?.getCachedData) {
        const memberData = globalCache.getCachedData(`memberCounts:${spaceId}`);
        if (memberData) {
          return {
            totalMembers: memberData.totalMembers || 0,
            onlineMembers: memberData.onlineMembers || 0,
            adminMembers: memberData.adminMembers || 0
          };
        }
      }
    }
    return { totalMembers: 0, onlineMembers: 0, adminMembers: 0 };
  }

  private async gatherPostsData(spaceId: string): Promise<any> {
    // Access posts from global cache
    if (typeof window !== 'undefined') {
      const globalCache = (window as any).globalCacheCoordinator;
      if (globalCache?.getCachedData) {
        const postsData = globalCache.getCachedData(`posts:${spaceId}`);
        return {
          fetchedPosts: postsData?.fetchedPosts || [],
          pinnedPosts: postsData?.pinnedPosts || [],
          categories: postsData?.categories || []
        };
      }
    }
    return { fetchedPosts: [], pinnedPosts: [], categories: [] };
  }

  private async gatherPresenceData(spaceId: string): Promise<any> {
    // Access presence from unified presence system
    if (typeof window !== 'undefined') {
      const presenceSystem = (window as any).clearSpacePresenceData;
      if (presenceSystem) {
        // Get current presence state for space
        return {
          onlineUsers: [],
          presenceState: null
        };
      }
    }
    return { onlineUsers: [], presenceState: null };
  }

  // State Access
  getState(): SpaceState {
    return { ...this.state };
  }

  getSnapshot(spaceId: string): SpaceSnapshot | null {
    return this.state.snapshots.get(spaceId) || null;
  }

  getCurrentSpace(): string | null {
    return this.state.currentSpace;
  }

  isTransitioning(): boolean {
    return this.state.isTransitioning;
  }

  // Space Switching Orchestration
  async switchSpace(spaceId: string, subdomain: string, source: 'navigation' | 'refresh' | 'user-action' = 'user-action'): Promise<void> {
    this.log(`🔄 Initiating space switch to ${spaceId} (${subdomain})`);
    
    try {
      // Step 1: Initiate switch
      await this.dispatchEvent('space:switch-initiated', {
        spaceId,
        subdomain,
        source,
        timestamp: Date.now()
      });

      // Step 2: Create snapshot of current state
      const snapshot = await this.createSnapshot(spaceId, subdomain);
      await this.dispatchEvent('space:snapshot-created', {
        spaceId,
        subdomain,
        snapshot,
        source,
        timestamp: Date.now()
      });

      // Step 3: Begin switching
      await this.dispatchEvent('space:switching', {
        spaceId,
        subdomain,
        source,
        timestamp: Date.now()
      });

      // Step 4: Loading phase
      await this.dispatchEvent('space:loading', {
        spaceId,
        subdomain,
        source,
        timestamp: Date.now()
      });

      // Step 5: Complete
      await this.dispatchEvent('space:completed', {
        spaceId,
        subdomain,
        source,
        timestamp: Date.now()
      });

    } catch (error) {
      this.log(`❌ Space switch failed:`, error);
      await this.dispatchEvent('space:failed', {
        spaceId,
        subdomain,
        error: error instanceof Error ? error.message : 'Unknown error',
        source,
        timestamp: Date.now()
      });
    }
  }

  // Cleanup
  cleanup(): void {
    this.listeners.clear();
    this.eventQueue.length = 0;
    this.state.snapshots.clear();
    this.log('🧹 Space Event Coordinator cleaned up');
  }

  // Debugging
  private log(message: string, data?: any): void {
    if (this.debugMode) {
      if (data) {
        log.debug('Utils', `[SpaceEventCoordinator] ${message}`, data);
      } else {
        log.debug('Utils', `[SpaceEventCoordinator] ${message}`);
      }
    }
  }

  // Debug interface
  getDebugInfo() {
    return {
      state: this.state,
      listeners: Array.from(this.listeners.values()),
      queueLength: this.eventQueue.length,
      isProcessing: this.isProcessingQueue
    };
  }
}

// Create singleton instance
export const spaceEventCoordinator = new SpaceEventCoordinator(); 