import { log } from '@/utils/logger';
// Global Tab Component Manager - Prevents tab component recreation across SpaceShellLayout remounts
// This solves the Chat→Feed "reappearing" issue by persisting tab components globally

import React from 'react';

interface TabComponentData {
  component: JSX.Element;
  createdAt: number;
  lastAccessed: number;
  spaceId: string;
  userId: string;
}

class GlobalTabComponentManager {
  private components: Map<string, TabComponentData> = new Map();
  private readonly MAX_AGE = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_COMPONENTS = 50; // Prevent memory leaks

  // Generate unique key for tab component
  private generateKey(subdomain: string, tabKey: string, userId: string): string {
    return `${subdomain}:${tabKey}:${userId}`;
  }

  // Store a tab component globally
  setTabComponent(
    subdomain: string, 
    tabKey: string, 
    userId: string, 
    spaceId: string, 
    component: JSX.Element
  ): void {
    const key = this.generateKey(subdomain, tabKey, userId);
    const now = Date.now();
    
    this.components.set(key, {
      component,
      createdAt: now,
      lastAccessed: now,
      spaceId,
      userId
    });
    
    if (process.env.NODE_ENV === 'development') {
      log.debug('Utils', `🌐 [GlobalTabManager] Stored ${tabKey} component for ${subdomain} (total: ${this.components.size})`);
    }
    
    // Cleanup old components
    this.cleanup();
  }

  // Retrieve a tab component if it exists and is still valid
  getTabComponent(subdomain: string, tabKey: string, userId: string): JSX.Element | null {
    const key = this.generateKey(subdomain, tabKey, userId);
    const data = this.components.get(key);
    
    if (!data) {
      return null;
    }
    
    const now = Date.now();
    
    // Check if component is too old
    if (now - data.createdAt > this.MAX_AGE) {
      this.components.delete(key);
      if (process.env.NODE_ENV === 'development') {
        log.debug('Utils', `🌐 [GlobalTabManager] Expired ${tabKey} component for ${subdomain}`);
      }
      return null;
    }
    
    // Update last accessed time
    data.lastAccessed = now;
    
    if (process.env.NODE_ENV === 'development') {
      log.debug('Utils', `🌐 [GlobalTabManager] Retrieved ${tabKey} component for ${subdomain}`);
    }
    
    return data.component;
  }

  // Check if a component exists without retrieving it
  hasTabComponent(subdomain: string, tabKey: string, userId: string): boolean {
    const key = this.generateKey(subdomain, tabKey, userId);
    const data = this.components.get(key);
    
    if (!data) return false;
    
    // Check if still valid
    const now = Date.now();
    if (now - data.createdAt > this.MAX_AGE) {
      this.components.delete(key);
      return false;
    }
    
    return true;
  }

  // Clear components for a specific space (when user leaves space)
  clearSpaceComponents(subdomain: string, userId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, data] of this.components.entries()) {
      if (key.startsWith(`${subdomain}:`) && data.userId === userId) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.components.delete(key));
    
    if (process.env.NODE_ENV === 'development') {
      log.debug('Utils', `🌐 [GlobalTabManager] Cleared ${keysToDelete.length} components for ${subdomain}`);
    }
  }

  // Clear all components for a user (when user logs out)
  clearUserComponents(userId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, data] of this.components.entries()) {
      if (data.userId === userId) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.components.delete(key));
    
    if (process.env.NODE_ENV === 'development') {
      log.debug('Utils', `🌐 [GlobalTabManager] Cleared ${keysToDelete.length} components for user logout`);
    }
  }

  // Clear all components (emergency logout cleanup)
  clearAllComponents(): void {
    const count = this.components.size;
    this.components.clear();
    
    if (process.env.NODE_ENV === 'development') {
      log.debug('Utils', `🌐 [GlobalTabManager] Cleared all ${count} components for emergency logout`);
    }
  }

  // Cleanup old and excess components
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    // Remove expired components
    for (const [key, data] of this.components.entries()) {
      if (now - data.createdAt > this.MAX_AGE) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.components.delete(key));
    
    // Remove oldest components if we have too many
    if (this.components.size > this.MAX_COMPONENTS) {
      const sortedEntries = Array.from(this.components.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
      
      const toRemove = sortedEntries.slice(0, this.components.size - this.MAX_COMPONENTS);
      toRemove.forEach(([key]) => this.components.delete(key));
      
      if (process.env.NODE_ENV === 'development') {
        log.debug('Utils', `🌐 [GlobalTabManager] Removed ${toRemove.length} old components (limit: ${this.MAX_COMPONENTS})`);
      }
    }
  }

  // Get status for debugging
  getStatus(): {
    totalComponents: number;
    componentsBySpace: Record<string, number>;
    oldestComponent: number;
    newestComponent: number;
  } {
    const componentsBySpace: Record<string, number> = {};
    let oldestTime = Date.now();
    let newestTime = 0;
    
    for (const [key, data] of this.components.entries()) {
      const subdomain = key.split(':')[0];
      componentsBySpace[subdomain] = (componentsBySpace[subdomain] || 0) + 1;
      
      if (data.createdAt < oldestTime) oldestTime = data.createdAt;
      if (data.createdAt > newestTime) newestTime = data.createdAt;
    }
    
    return {
      totalComponents: this.components.size,
      componentsBySpace,
      oldestComponent: oldestTime,
      newestComponent: newestTime
    };
  }
}

// Global instance
export const globalTabComponentManager = new GlobalTabComponentManager();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).globalTabComponentManager = globalTabComponentManager;
} 