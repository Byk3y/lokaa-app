# Phase 5B: Advanced Performance Optimization Strategy

## 🎯 **Current Performance Baseline (Post-Phase 5A)**
- **Build Time:** 11.96s (improvement from 12.18s in Phase 5A)
- **Bundle Size:** 1,437.32 kB main bundle (403.93 kB gzipped)  
- **Chunk Strategy:** 35 optimized chunks with intelligent splitting
- **Module Count:** 7,514 modules transformed (stable)
- **Achievement:** 33% bundle reduction from original 2,170kB baseline
- **Architecture:** Modern code-splitting with progressive loading

---

## 🚀 **Phase 5B Advanced Optimization Targets**

### **🎯 Priority 1: Memory Leak Prevention & Cleanup (Week 1)**

#### **Step 1.1: Context Provider Memory Optimization**

**Critical Issue Identified:** Multiple context providers with potential memory leaks

```typescript
// src/providers/OptimizedProviders.tsx
import { memo, useRef, useEffect } from 'react';

// Memoized provider wrapper to prevent unnecessary re-renders
const MemoizedAuthProvider = memo(({ children }: { children: React.ReactNode }) => {
  const cleanupRef = useRef<(() => void)[]>([]);
  
  useEffect(() => {
    return () => {
      // Execute all cleanup functions
      cleanupRef.current.forEach(cleanup => cleanup());
      cleanupRef.current = [];
    };
  }, []);
  
  return <AuthProvider>{children}</AuthProvider>;
});

// Optimized provider tree with proper cleanup
export const OptimizedProviderTree = memo(({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MemoizedAuthProvider>
          <MembershipProvider>
            <ProfileImageProvider>
              <SpaceProvider>
                <UserProfileProvider>
                  <ChatProvider>
                    <GlobalPresenceProvider>
                      <ModalProvider>
                        {children}
                      </ModalProvider>
                    </GlobalPresenceProvider>
                  </ChatProvider>
                </UserProfileProvider>
              </SpaceProvider>
            </ProfileImageProvider>
          </MembershipProvider>
        </MemoizedAuthProvider>
      </Router>
    </HelmetProvider>
  </QueryClientProvider>
));
```

#### **Step 1.2: useEffect Cleanup Optimization**

**Issue:** Multiple uncleaned intervals and listeners across components

```typescript
// src/hooks/useCleanupTracker.ts
import { useRef, useEffect } from 'react';

export function useCleanupTracker(componentName: string) {
  const intervalIds = useRef<NodeJS.Timeout[]>([]);
  const timeoutIds = useRef<NodeJS.Timeout[]>([]);
  const eventListeners = useRef<{ element: Element | Window | Document; event: string; handler: EventListener }[]>([]);
  const subscriptions = useRef<{ unsubscribe: () => void }[]>([]);
  
  const addInterval = (id: NodeJS.Timeout) => {
    intervalIds.current.push(id);
    return id;
  };
  
  const addTimeout = (id: NodeJS.Timeout) => {
    timeoutIds.current.push(id);
    return id;
  };
  
  const addEventListener = (element: Element | Window | Document, event: string, handler: EventListener) => {
    element.addEventListener(event, handler);
    eventListeners.current.push({ element, event, handler });
  };
  
  const addSubscription = (subscription: { unsubscribe: () => void }) => {
    subscriptions.current.push(subscription);
    return subscription;
  };
  
  // Cleanup all on unmount
  useEffect(() => {
    return () => {
      console.log(`[${componentName}] Cleaning up all timers and listeners`);
      
      // Clear intervals
      intervalIds.current.forEach(clearInterval);
      
      // Clear timeouts
      timeoutIds.current.forEach(clearTimeout);
      
      // Remove event listeners
      eventListeners.current.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      
      // Unsubscribe from subscriptions
      subscriptions.current.forEach(sub => {
        try {
          sub.unsubscribe();
        } catch (err) {
          console.warn(`[${componentName}] Error unsubscribing:`, err);
        }
      });
      
      // Clear all arrays
      intervalIds.current = [];
      timeoutIds.current = [];
      eventListeners.current = [];
      subscriptions.current = [];
    };
  }, [componentName]);
  
  return {
    addInterval,
    addTimeout,
    addEventListener,
    addSubscription
  };
}
```

#### **Step 1.3: Context Value Stabilization**

**Issue:** Context values recreating unnecessarily causing provider re-renders

```typescript
// src/contexts/StableContexts.tsx
import { useMemo, useCallback, useRef } from 'react';

// Optimize SpaceContext with stable values
export function OptimizedSpaceProvider({ children }: { children: ReactNode }) {
  const { spaceData, loading, error } = useSpace();
  
  // Stable callbacks with useCallback
  const stableFetchSpaceData = useCallback(async (subdomain: string, force = false) => {
    // Implementation remains the same but wrapped in stable callback
  }, []); // Empty dependency array since this should be stable
  
  const stableClearCache = useCallback((subdomain?: string) => {
    // Implementation
  }, []);
  
  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    spaceData,
    loading,
    error,
    fetchSpaceData: stableFetchSpaceData,
    clearCache: stableClearCache,
    cachedSubdomains: [] // Compute this stably
  }), [spaceData, loading, error]); // Remove functions from deps
  
  return (
    <SpaceContext.Provider value={contextValue}>
      {children}
    </SpaceContext.Provider>
  );
}
```

### **🎯 Priority 2: Re-render Prevention & Optimization (Week 1-2)**

#### **Step 2.1: Component Memoization Strategy**

**Issue:** Heavy components re-rendering unnecessarily

```typescript
// src/components/performance/MemoizedComponents.tsx
import { memo, useMemo, useCallback } from 'react';

// Optimize PostCard with deep memoization
const OptimizedPostCard = memo(function OptimizedPostCard(props: PostCardProps) {
  // Memoize expensive calculations
  const processedContent = useMemo(() => {
    if (!props.content) return '';
    // Process content (markdown, mentions, etc.)
    return processMarkdownContent(props.content);
  }, [props.content]);
  
  const mediaConfig = useMemo(() => ({
    urls: props.media_urls || [],
    hasMedia: !!(props.media_urls?.length || props.content_gif_url),
    gifUrl: props.content_gif_url
  }), [props.media_urls, props.content_gif_url]);
  
  // Stable event handlers
  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    props.onLikeToggled?.(props.id);
  }, [props.id, props.onLikeToggled]);
  
  const handleClick = useCallback(() => {
    props.onPostClick?.(props.id);
  }, [props.id, props.onPostClick]);
  
  return (
    <PostCardLayout
      {...props}
      processedContent={processedContent}
      mediaConfig={mediaConfig}
      onLike={handleLike}
      onClick={handleClick}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.id === nextProps.id &&
    prevProps.likes === nextProps.likes &&
    prevProps.comments === nextProps.comments &&
    prevProps.content === nextProps.content &&
    JSON.stringify(prevProps.media_urls) === JSON.stringify(nextProps.media_urls)
  );
});
```

#### **Step 2.2: Hook Optimization**

**Issue:** Hooks with excessive dependencies causing re-renders

```typescript
// src/hooks/useOptimizedSpaceData.ts
import { useMemo, useRef } from 'react';

export function useOptimizedSpaceData(subdomain?: string) {
  const { spaceData, loading, error } = useSpace();
  const previousSpaceRef = useRef<SpaceData | null>(null);
  
  // Only update reference when data actually changes
  const stableSpaceData = useMemo(() => {
    if (!spaceData) return null;
    
    // Deep comparison to prevent unnecessary updates
    if (previousSpaceRef.current && 
        JSON.stringify(previousSpaceRef.current) === JSON.stringify(spaceData)) {
      return previousSpaceRef.current; // Return same reference
    }
    
    previousSpaceRef.current = spaceData;
    return spaceData;
  }, [spaceData]);
  
  // Memoize computed values
  const computedData = useMemo(() => {
    if (!stableSpaceData) return null;
    
    return {
      isPrivate: stableSpaceData.is_private,
      isPaid: stableSpaceData.pricing_type === 'paid',
      memberCount: stableSpaceData.member_count || 0,
      hasDescription: !!(stableSpaceData.description || stableSpaceData.about_description),
      displayName: stableSpaceData.name || stableSpaceData.subdomain
    };
  }, [stableSpaceData]);
  
  return {
    spaceData: stableSpaceData,
    computedData,
    loading,
    error
  };
}
```

### **🎯 Priority 3: Bundle Size & Code Splitting Enhancement (Week 2)**

#### **Step 3.1: Micro-Frontend Architecture**

**Target:** Further reduce main bundle to under 1,000kB

```typescript
// src/routes/MicroRoutes.tsx
import { lazy, Suspense } from 'react';

// Micro-split large components further
const SpaceAboutMicro = lazy(() => import('@/components/space/AboutTab').then(module => ({
  default: () => <module.default space={null} onSpaceUpdate={() => {}} />
})));

const SpaceFeedMicro = lazy(() => import('@/components/space/FeedTab').then(module => ({
  default: () => <module.default user={null} space={null} />
})));

// Component-level lazy loading with granular splitting
export const MicroComponentLoader = ({ component, ...props }: { component: string; [key: string]: any }) => {
  const ComponentMap = {
    'space-about': SpaceAboutMicro,
    'space-feed': SpaceFeedMicro,
    // Add more as needed
  };
  
  const Component = ComponentMap[component as keyof typeof ComponentMap];
  
  if (!Component) {
    return <div>Component not found</div>;
  }
  
  return (
    <Suspense fallback={<ComponentSkeleton type={component} />}>
      <Component {...props} />
    </Suspense>
  );
};
```

#### **Step 3.2: Dynamic Import Optimization**

```typescript
// src/utils/dynamicImports.ts
class ImportManager {
  private cache = new Map<string, Promise<any>>();
  private preloadQueue = new Set<string>();
  
  // Intelligent preloading based on user behavior
  preload(importPath: string, priority: 'high' | 'medium' | 'low' = 'medium') {
    if (this.cache.has(importPath)) return;
    
    const preloadPromise = import(importPath).then(module => {
      console.log(`[ImportManager] Preloaded ${importPath}`);
      return module;
    }).catch(err => {
      console.warn(`[ImportManager] Failed to preload ${importPath}:`, err);
    });
    
    this.cache.set(importPath, preloadPromise);
    
    if (priority === 'high') {
      // Start preloading immediately
      preloadPromise;
    } else {
      // Queue for idle time preloading
      this.preloadQueue.add(importPath);
      this.scheduleIdlePreload();
    }
  }
  
  private scheduleIdlePreload() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        if (this.preloadQueue.size > 0) {
          const next = this.preloadQueue.values().next().value;
          this.preloadQueue.delete(next);
          this.cache.get(next); // Trigger the cached promise
        }
      });
    }
  }
  
  async import<T>(importPath: string): Promise<T> {
    if (this.cache.has(importPath)) {
      return this.cache.get(importPath);
    }
    
    const importPromise = import(importPath);
    this.cache.set(importPath, importPromise);
    return importPromise;
  }
}

export const importManager = new ImportManager();
```

### **🎯 Priority 4: Database & Network Optimization (Week 2-3)**

#### **Step 4.1: Intelligent Request Batching**

```typescript
// src/utils/requestBatcher.ts
class RequestBatcher {
  private batches = new Map<string, { requests: any[]; timeout: NodeJS.Timeout }>();
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY = 50; // 50ms
  
  batch<T>(key: string, request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.batches.has(key)) {
        this.batches.set(key, {
          requests: [],
          timeout: setTimeout(() => this.executeBatch(key), this.BATCH_DELAY)
        });
      }
      
      const batch = this.batches.get(key)!;
      batch.requests.push({ request, resolve, reject });
      
      // Execute immediately if batch is full
      if (batch.requests.length >= this.BATCH_SIZE) {
        clearTimeout(batch.timeout);
        this.executeBatch(key);
      }
    });
  }
  
  private async executeBatch(key: string) {
    const batch = this.batches.get(key);
    if (!batch) return;
    
    this.batches.delete(key);
    
    try {
      // Execute all requests in parallel
      const results = await Promise.allSettled(
        batch.requests.map(({ request }) => request())
      );
      
      // Resolve/reject individual promises
      results.forEach((result, index) => {
        const { resolve, reject } = batch.requests[index];
        if (result.status === 'fulfilled') {
          resolve(result.value);
        } else {
          reject(result.reason);
        }
      });
    } catch (error) {
      // Reject all if batch fails
      batch.requests.forEach(({ reject }) => reject(error));
    }
  }
}

export const requestBatcher = new RequestBatcher();
```

#### **Step 4.2: Advanced Caching with IndexedDB**

```typescript
// src/utils/persistentCache.ts
import { openDB, DBSchema } from 'idb';

interface CacheDB extends DBSchema {
  spaces: {
    key: string;
    value: {
      id: string;
      data: any;
      timestamp: number;
      version: string;
    };
  };
  users: {
    key: string;
    value: {
      id: string;
      data: any;
      timestamp: number;
    };
  };
}

class PersistentCache {
  private db: any = null;
  private readonly VERSION = 1;
  
  async init() {
    this.db = await openDB<CacheDB>('lokaa-cache', this.VERSION, {
      upgrade(db) {
        // Create object stores
        if (!db.objectStoreNames.contains('spaces')) {
          const spaceStore = db.createObjectStore('spaces', { keyPath: 'id' });
          spaceStore.createIndex('timestamp', 'timestamp');
        }
        
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('timestamp', 'timestamp');
        }
      },
    });
  }
  
  async set(store: 'spaces' | 'users', key: string, data: any, ttl = 3600000) { // 1 hour default
    if (!this.db) await this.init();
    
    const entry = {
      id: key,
      data,
      timestamp: Date.now(),
      version: this.VERSION.toString()
    };
    
    await this.db.put(store, entry);
    
    // Schedule cleanup
    setTimeout(() => this.cleanup(store), ttl);
  }
  
  async get(store: 'spaces' | 'users', key: string, ttl = 3600000) {
    if (!this.db) await this.init();
    
    const entry = await this.db.get(store, key);
    if (!entry) return null;
    
    const age = Date.now() - entry.timestamp;
    if (age > ttl) {
      await this.db.delete(store, key);
      return null;
    }
    
    return entry.data;
  }
  
  private async cleanup(store: 'spaces' | 'users') {
    if (!this.db) return;
    
    const tx = this.db.transaction(store, 'readwrite');
    const cursor = await tx.store.index('timestamp').openCursor();
    
    const oneHourAgo = Date.now() - 3600000;
    
    while (cursor) {
      if (cursor.value.timestamp < oneHourAgo) {
        await cursor.delete();
      }
      await cursor.continue();
    }
  }
}

export const persistentCache = new PersistentCache();
```

### **🎯 Priority 5: Runtime Performance Monitoring (Week 3)**

#### **Step 5.1: Performance Metrics Dashboard**

```typescript
// src/utils/performanceMonitor.ts
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];
  
  init() {
    // Monitor Long Tasks
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.warn(`[Performance] Long task detected: ${entry.duration}ms`);
          this.recordMetric('longTask', entry.duration);
        }
      });
      
      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (e) {
        console.warn('Long task monitoring not supported');
      }
      
      // Monitor Layout Shifts
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.warn(`[Performance] Layout shift: ${(entry as any).value}`);
          this.recordMetric('layoutShift', (entry as any).value);
        }
      });
      
      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('Layout shift monitoring not supported');
      }
    }
  }
  
  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
    
    // Log performance warnings
    if (name === 'longTask' && value > 50) {
      console.warn(`[Performance] Critical long task: ${value}ms`);
    }
  }
  
  getMetrics() {
    const summary: Record<string, any> = {};
    
    for (const [name, values] of this.metrics) {
      if (values.length === 0) continue;
      
      summary[name] = {
        count: values.length,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        max: Math.max(...values),
        min: Math.min(...values),
        recent: values.slice(-10) // Last 10 values
      };
    }
    
    return summary;
  }
  
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Auto-initialize in development
if (process.env.NODE_ENV === 'development') {
  performanceMonitor.init();
  
  // Expose to window for debugging
  (window as any).performanceMonitor = performanceMonitor;
}
```

#### **Step 5.2: Real-time Performance Alerts**

```typescript
// src/utils/performanceAlerts.ts
interface PerformanceThresholds {
  longTask: number;
  memoryUsage: number;
  renderTime: number;
  bundleSize: number;
}

class PerformanceAlerts {
  private thresholds: PerformanceThresholds = {
    longTask: 50, // ms
    memoryUsage: 100, // MB
    renderTime: 16, // ms (60fps)
    bundleSize: 1000 // kB
  };
  
  private alertHistory = new Set<string>();
  
  checkPerformance() {
    // Check memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      
      if (usedMB > this.thresholds.memoryUsage) {
        this.alert('memory', `High memory usage: ${usedMB.toFixed(1)}MB`);
      }
    }
    
    // Check for long tasks
    const longTasks = performanceMonitor.getMetrics().longTask;
    if (longTasks && longTasks.recent.some((task: number) => task > this.thresholds.longTask)) {
      this.alert('longTask', `Long task detected: ${longTasks.max}ms`);
    }
  }
  
  private alert(type: string, message: string) {
    const alertKey = `${type}:${Date.now() - (Date.now() % 60000)}`; // One alert per minute per type
    
    if (this.alertHistory.has(alertKey)) return;
    this.alertHistory.add(alertKey);
    
    console.warn(`[Performance Alert] ${message}`);
    
    // In production, send to analytics
    if (process.env.NODE_ENV === 'production') {
      // analytics.track('performance_alert', { type, message });
    }
  }
  
  startMonitoring() {
    // Check performance every 30 seconds
    setInterval(() => this.checkPerformance(), 30000);
  }
}

export const performanceAlerts = new PerformanceAlerts();
```

---

## 📊 **Expected Phase 5B Performance Improvements**

### **Target Metrics:**
- **Main Bundle:** 1,437kB → 999kB (30% further reduction)
- **Memory Usage:** 50% reduction in memory leaks
- **Re-render Count:** 60% reduction in unnecessary re-renders
- **Time to Interactive:** 25% improvement on top of Phase 5A
- **Long Task Frequency:** 80% reduction in blocking tasks
- **Network Requests:** 40% reduction through batching

### **Key Performance Indicators:**
1. **Memory Stability:** No memory growth over 30-minute sessions
2. **Component Performance:** <5ms average render time
3. **Network Efficiency:** <10 simultaneous requests at any time
4. **Bundle Optimization:** All chunks under warning thresholds
5. **Real-time Monitoring:** Performance alerts under 1% of sessions

---

## ✅ **Implementation Timeline**

### **Week 1: Foundation & Memory Optimization**
- Implement cleanup tracker and memory leak prevention
- Optimize context providers and re-render prevention
- Add performance monitoring infrastructure

### **Week 2: Bundle & Network Optimization**
- Micro-frontend architecture implementation
- Advanced caching with IndexedDB
- Request batching and network optimization

### **Week 3: Monitoring & Polish**
- Performance metrics dashboard
- Real-time alerts and monitoring
- Production optimization and testing

---

## 🎯 **Success Criteria**

**Phase 5B will be considered successful when we achieve:**

1. ✅ **Sub-1MB main bundle** (999kB target)
2. ✅ **Zero detectable memory leaks** in 30-minute test sessions
3. ✅ **60% reduction in re-renders** compared to Phase 5A baseline
4. ✅ **25% additional TTI improvement** beyond Phase 5A gains
5. ✅ **Production-ready performance monitoring** with real-time alerts
6. ✅ **80% reduction in long tasks** (>50ms blocking operations)

---

**Ready to begin Phase 5B: Advanced Performance Optimization?** 
This phase will complete our performance transformation, achieving enterprise-grade optimization with monitoring and alerting capabilities. 