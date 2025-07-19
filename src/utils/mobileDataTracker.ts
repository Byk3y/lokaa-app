import { log } from '@/utils/logger';
/**
 * Mobile Data Tracker
 * 
 * A specialized utility for tracking space data loading and access patterns on mobile.
 * This helps identify race conditions and loading issues.
 */

interface DataAccessEvent {
  timestamp: number;
  component: string;
  source: 'storeSpace' | 'contextSpace' | 'currentSpaceData';
  action: 'access' | 'set' | 'clear';
  hasData: boolean;
  spaceId?: string | null;
  metadata?: Record<string, any>;
}

class MobileDataTracker {
  private events: DataAccessEvent[] = [];
  private isEnabled: boolean;
  private sessionId: string;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development' || 
                     localStorage.getItem('mobile_debug') === 'true';
    this.sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    
    // Auto-cleanup to prevent memory issues
    setInterval(() => {
      if (this.events.length > 200) {
        this.events = this.events.slice(-100);
      }
    }, 60000);
  }

  trackAccess(component: string, source: 'storeSpace' | 'contextSpace' | 'currentSpaceData', data: any, metadata?: Record<string, any>) {
    if (!this.isEnabled) return;
    
    this.recordEvent({
      timestamp: Date.now(),
      component,
      source,
      action: 'access',
      hasData: !!data,
      spaceId: data?.id || null,
      metadata
    });
    
    log.debug('Utils', `📱 [Mobile] ${component} accessed ${source}: ${data?.id || 'null'}`);
  }
  
  trackUpdate(component: string, source: 'storeSpace' | 'contextSpace' | 'currentSpaceData', data: any, metadata?: Record<string, any>) {
    if (!this.isEnabled) return;
    
    this.recordEvent({
      timestamp: Date.now(),
      component,
      source,
      action: 'set',
      hasData: !!data,
      spaceId: data?.id || null,
      metadata
    });
    
    log.debug('Utils', `📱 [Mobile] ${component} updated ${source}: ${data?.id || 'null'}`);
  }
  
  trackClear(component: string, source: 'storeSpace' | 'contextSpace' | 'currentSpaceData', metadata?: Record<string, any>) {
    if (!this.isEnabled) return;
    
    this.recordEvent({
      timestamp: Date.now(),
      component,
      source,
      action: 'clear',
      hasData: false,
      spaceId: null,
      metadata
    });
    
    log.debug('Utils', `📱 [Mobile] ${component} cleared ${source}`);
  }
  
  private recordEvent(event: DataAccessEvent) {
    this.events.push(event);
  }
  
  getEvents() {
    return [...this.events];
  }
  
  getStats() {
    if (this.events.length === 0) return null;
    
    const stats = {
      total: this.events.length,
      byComponent: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
      byAction: {} as Record<string, number>,
      dataClearCount: 0,
      dataAccessWithoutDataCount: 0,
      potentialIssues: [] as string[]
    };
    
    this.events.forEach(event => {
      // Count by component
      stats.byComponent[event.component] = (stats.byComponent[event.component] || 0) + 1;
      
      // Count by source
      stats.bySource[event.source] = (stats.bySource[event.source] || 0) + 1;
      
      // Count by action
      stats.byAction[event.action] = (stats.byAction[event.action] || 0) + 1;
      
      // Count clears
      if (event.action === 'clear') {
        stats.dataClearCount++;
      }
      
      // Count accesses without data
      if (event.action === 'access' && !event.hasData) {
        stats.dataAccessWithoutDataCount++;
      }
    });
    
    // Look for potential issues
    if (stats.dataClearCount > 5) {
      stats.potentialIssues.push(`High number of data clears (${stats.dataClearCount})`);
    }
    
    if (stats.dataAccessWithoutDataCount > 10) {
      stats.potentialIssues.push(`Many data accesses without data (${stats.dataAccessWithoutDataCount})`);
    }
    
    return stats;
  }
  
  clearEvents() {
    this.events = [];
  }
}

// Create singleton instance
export const mobileDataTracker = new MobileDataTracker();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).mobileDataTracker = mobileDataTracker;
}

export default mobileDataTracker; 