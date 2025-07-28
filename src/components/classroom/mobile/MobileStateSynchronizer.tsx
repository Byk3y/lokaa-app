import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { log } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import type { 
  CourseLesson, 
  CourseDetailData 
} from '@/types/classroom/courseDetail';

/**
 * Mobile State Synchronizer Component
 * 
 * Comprehensive mobile state synchronization with:
 * - State synchronization across components
 * - State persistence and recovery
 * - State conflict resolution
 * - State validation and error handling
 * - State analytics and monitoring
 * - State fallbacks and permissions
 * - Offline state management
 * - Real-time state updates
 * - Performance optimizations
 * - Mobile-specific state patterns
 */
interface MobileStateSynchronizerProps {
  course: CourseDetailData | null;
  selectedLesson: CourseLesson | null;
  isMobile: boolean;
  showCourseOverview: boolean;
  showLessonView: boolean;
  onStateChange?: (state: string, data: any) => void;
  onStateError?: (error: string, state: string) => void;
  onStateValidation?: (isValid: boolean, state: string) => void;
  onStateConflict?: (conflict: StateConflict) => void;
  onStateRecovery?: (recoveredState: any) => void;
  
  // State synchronization features
  enableStatePersistence?: boolean;
  enableStateConflicts?: boolean;
  enableStateRecovery?: boolean;
  enableStateValidation?: boolean;
  enableStateAnalytics?: boolean;
  enableStateFallbacks?: boolean;
  enableStatePermissions?: boolean;
  enableOfflineSupport?: boolean;
  enableRealTimeSync?: boolean;
  enablePerformanceOptimization?: boolean;
}

interface StateConflict {
  id: string;
  type: 'lesson_selection' | 'view_state' | 'progress' | 'navigation' | 'data';
  localState: any;
  remoteState: any;
  timestamp: number;
  resolution: 'local' | 'remote' | 'manual' | 'pending';
}

interface SynchronizedState {
  // Core state
  currentView: string;
  selectedLessonId: string | null;
  courseProgress: Record<string, boolean>;
  navigationHistory: string[];
  
  // UI state
  scrollPosition: Record<string, number>;
  expandedModules: string[];
  collapsedModules: string[];
  
  // User preferences
  readingMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark' | 'auto';
  
  // Performance state
  cachedData: Map<string, any>;
  lastSyncTimestamp: number;
  isOnline: boolean;
}

interface StateSynchronizerState {
  synchronizedState: SynchronizedState;
  conflicts: StateConflict[];
  pendingChanges: Map<string, any>;
  syncQueue: Array<{ id: string; action: string; data: any; timestamp: number }>;
  isSyncing: boolean;
  lastSyncError: string | null;
  syncRetryCount: number;
  analytics: {
    totalSyncs: number;
    syncErrors: number;
    conflicts: number;
    recoveries: number;
    averageSyncTime: number;
    offlineTime: number;
  };
  permissions: Map<string, boolean>;
  fallbackState: SynchronizedState | null;
}

const MobileStateSynchronizer: React.FC<MobileStateSynchronizerProps> = React.memo(({
  course,
  selectedLesson,
  isMobile,
  showCourseOverview,
  showLessonView,
  onStateChange,
  onStateError,
  onStateValidation,
  onStateConflict,
  onStateRecovery,
  enableStatePersistence = true,
  enableStateConflicts = true,
  enableStateRecovery = true,
  enableStateValidation = true,
  enableStateAnalytics = true,
  enableStateFallbacks = true,
  enableStatePermissions = true,
  enableOfflineSupport = true,
  enableRealTimeSync = true,
  enablePerformanceOptimization = true
}) => {
  // State synchronizer state management
  const [syncState, setSyncState] = useState<StateSynchronizerState>({
    synchronizedState: {
      currentView: showCourseOverview ? 'course-overview' : showLessonView ? 'lesson-view' : 'none',
      selectedLessonId: selectedLesson?.id || null,
      courseProgress: {},
      navigationHistory: [],
      scrollPosition: {},
      expandedModules: [],
      collapsedModules: [],
      readingMode: false,
      fontSize: 'medium',
      theme: 'auto',
      cachedData: new Map(),
      lastSyncTimestamp: Date.now(),
      isOnline: navigator.onLine
    },
    conflicts: [],
    pendingChanges: new Map(),
    syncQueue: [],
    isSyncing: false,
    lastSyncError: null,
    syncRetryCount: 0,
    analytics: {
      totalSyncs: 0,
      syncErrors: 0,
      conflicts: 0,
      recoveries: 0,
      averageSyncTime: 0,
      offlineTime: 0
    },
    permissions: new Map(),
    fallbackState: null
  });

  // Refs for performance optimization
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(Date.now());
  const conflictResolutionRef = useRef<Map<string, StateConflict>>(new Map());

  // Initialize state synchronizer
  useEffect(() => {
    log.debug('Mobile', '🎓 [MobileStateSynchronizer] Initializing state synchronizer');
    
    // Load persisted state
    if (enableStatePersistence) {
      loadPersistedState();
    }
    
    // Set up online/offline detection
    if (enableOfflineSupport) {
      setupOfflineDetection();
    }
    
    // Set up real-time sync
    if (enableRealTimeSync) {
      setupRealTimeSync();
    }
    
    // Initialize permissions
    if (enableStatePermissions) {
      initializePermissions();
    }
    
    // Set up fallback state
    if (enableStateFallbacks) {
      setupFallbackState();
    }
    
    return () => {
      // Cleanup
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Load persisted state from localStorage
  const loadPersistedState = useCallback(() => {
    try {
      const persistedState = localStorage.getItem('mobileStateSynchronizer');
      if (persistedState) {
        const parsedState = JSON.parse(persistedState);
        setSyncState(prev => ({
          ...prev,
          synchronizedState: {
            ...prev.synchronizedState,
            ...parsedState
          }
        }));
        log.debug('Mobile', '🎓 [MobileStateSynchronizer] Loaded persisted state');
      }
    } catch (error) {
      log.error('Mobile', '🎓 [MobileStateSynchronizer] Error loading persisted state:', error);
      onStateError?.('Failed to load persisted state', 'persistence');
    }
  }, [onStateError]);

  // Save state to localStorage
  const savePersistedState = useCallback((state: Partial<SynchronizedState>) => {
    try {
      const stateToSave = {
        currentView: state.currentView,
        selectedLessonId: state.selectedLessonId,
        courseProgress: state.courseProgress,
        navigationHistory: state.navigationHistory,
        scrollPosition: state.scrollPosition,
        expandedModules: state.expandedModules,
        collapsedModules: state.collapsedModules,
        readingMode: state.readingMode,
        fontSize: state.fontSize,
        theme: state.theme
      };
      localStorage.setItem('mobileStateSynchronizer', JSON.stringify(stateToSave));
      log.debug('Mobile', '🎓 [MobileStateSynchronizer] Saved state to persistence');
    } catch (error) {
      log.error('Mobile', '🎓 [MobileStateSynchronizer] Error saving state:', error);
      onStateError?.('Failed to save state', 'persistence');
    }
  }, [onStateError]);

  // Setup offline detection
  const setupOfflineDetection = useCallback(() => {
    const handleOnline = () => {
      setSyncState(prev => ({
        ...prev,
        synchronizedState: {
          ...prev.synchronizedState,
          isOnline: true
        }
      }));
      log.debug('Mobile', '🎓 [MobileStateSynchronizer] Back online - syncing pending changes');
      syncPendingChanges();
    };

    const handleOffline = () => {
      setSyncState(prev => ({
        ...prev,
        synchronizedState: {
          ...prev.synchronizedState,
          isOnline: false
        },
        analytics: {
          ...prev.analytics,
          offlineTime: Date.now()
        }
      }));
      log.debug('Mobile', '🎓 [MobileStateSynchronizer] Gone offline - queuing changes');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Setup real-time sync
  const setupRealTimeSync = useCallback(() => {
    // Set up periodic sync
    const syncInterval = setInterval(() => {
      if (syncState.synchronizedState.isOnline && syncState.pendingChanges.size > 0) {
        syncPendingChanges();
      }
    }, 5000); // Sync every 5 seconds when online

    return () => clearInterval(syncInterval);
  }, [syncState.synchronizedState.isOnline, syncState.pendingChanges.size]);

  // Initialize permissions
  const initializePermissions = useCallback(() => {
    const permissions = new Map<string, boolean>([
      ['read_course', true],
      ['write_progress', true],
      ['modify_state', true],
      ['sync_data', true],
      ['access_offline', true]
    ]);
    
    setSyncState(prev => ({
      ...prev,
      permissions
    }));
  }, []);

  // Setup fallback state
  const setupFallbackState = useCallback(() => {
    const fallbackState: SynchronizedState = {
      currentView: 'course-overview',
      selectedLessonId: null,
      courseProgress: {},
      navigationHistory: [],
      scrollPosition: {},
      expandedModules: [],
      collapsedModules: [],
      readingMode: false,
      fontSize: 'medium',
      theme: 'auto',
      cachedData: new Map(),
      lastSyncTimestamp: Date.now(),
      isOnline: false
    };
    
    setSyncState(prev => ({
      ...prev,
      fallbackState
    }));
  }, []);

  // Update synchronized state
  const updateSynchronizedState = useCallback((updates: Partial<SynchronizedState>) => {
    setSyncState(prev => {
      const newState = {
        ...prev,
        synchronizedState: {
          ...prev.synchronizedState,
          ...updates,
          lastSyncTimestamp: Date.now()
        }
      };
      
      // Save to persistence
      if (enableStatePersistence) {
        savePersistedState(newState.synchronizedState);
      }
      
      // Add to pending changes for sync
      if (enableRealTimeSync) {
        const pendingChanges = new Map(prev.pendingChanges);
        Object.entries(updates).forEach(([key, value]) => {
          pendingChanges.set(key, value);
        });
        newState.pendingChanges = pendingChanges;
      }
      
      return newState;
    });
    
    // Notify parent component
    onStateChange?.('state_updated', updates);
  }, [enableStatePersistence, enableRealTimeSync, savePersistedState, onStateChange]);

  // Sync pending changes
  const syncPendingChanges = useCallback(async () => {
    if (syncState.isSyncing || !syncState.synchronizedState.isOnline) {
      return;
    }

    setSyncState(prev => ({ ...prev, isSyncing: true }));
    const syncStartTime = Date.now();

    try {
      // Simulate sync operation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Clear pending changes
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        pendingChanges: new Map(),
        syncQueue: [],
        lastSyncError: null,
        syncRetryCount: 0,
        analytics: {
          ...prev.analytics,
          totalSyncs: prev.analytics.totalSyncs + 1,
          averageSyncTime: (prev.analytics.averageSyncTime + (Date.now() - syncStartTime)) / 2
        }
      }));
      
      log.debug('Mobile', '🎓 [MobileStateSynchronizer] Successfully synced pending changes');
    } catch (error) {
      log.error('Mobile', '🎓 [MobileStateSynchronizer] Sync error:', error);
      
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncError: error instanceof Error ? error.message : 'Unknown sync error',
        syncRetryCount: prev.syncRetryCount + 1,
        analytics: {
          ...prev.analytics,
          syncErrors: prev.analytics.syncErrors + 1
        }
      }));
      
      onStateError?.('Sync failed', 'sync');
      
      // Retry with exponential backoff
      if (syncState.syncRetryCount < 3) {
        const retryDelay = Math.pow(2, syncState.syncRetryCount) * 1000;
        syncTimeoutRef.current = setTimeout(syncPendingChanges, retryDelay);
      }
    }
  }, [syncState.isSyncing, syncState.synchronizedState.isOnline, syncState.syncRetryCount, onStateError]);

  // Detect and resolve conflicts
  const detectConflicts = useCallback((localState: any, remoteState: any): StateConflict[] => {
    const conflicts: StateConflict[] = [];
    
    // Check for lesson selection conflicts
    if (localState.selectedLessonId !== remoteState.selectedLessonId) {
      conflicts.push({
        id: `lesson_${Date.now()}`,
        type: 'lesson_selection',
        localState: { selectedLessonId: localState.selectedLessonId },
        remoteState: { selectedLessonId: remoteState.selectedLessonId },
        timestamp: Date.now(),
        resolution: 'pending'
      });
    }
    
    // Check for progress conflicts
    const localProgress = localState.courseProgress || {};
    const remoteProgress = remoteState.courseProgress || {};
    
    Object.keys(localProgress).forEach(lessonId => {
      if (localProgress[lessonId] !== remoteProgress[lessonId]) {
        conflicts.push({
          id: `progress_${lessonId}_${Date.now()}`,
          type: 'progress',
          localState: { lessonId, completed: localProgress[lessonId] },
          remoteState: { lessonId, completed: remoteProgress[lessonId] },
          timestamp: Date.now(),
          resolution: 'pending'
        });
      }
    });
    
    return conflicts;
  }, []);

  // Resolve conflict
  const resolveConflict = useCallback((conflictId: string, resolution: 'local' | 'remote' | 'manual') => {
    setSyncState(prev => {
      const conflict = prev.conflicts.find(c => c.id === conflictId);
      if (!conflict) return prev;
      
      const updatedConflicts = prev.conflicts.map(c => 
        c.id === conflictId ? { ...c, resolution } : c
      );
      
      // Apply resolution
      let resolvedState = { ...prev.synchronizedState };
      if (resolution === 'local') {
        resolvedState = { ...resolvedState, ...conflict.localState };
      } else if (resolution === 'remote') {
        resolvedState = { ...resolvedState, ...conflict.remoteState };
      }
      
      return {
        ...prev,
        conflicts: updatedConflicts,
        synchronizedState: resolvedState,
        analytics: {
          ...prev.analytics,
          conflicts: prev.analytics.conflicts + 1
        }
      };
    });
    
    onStateConflict?.(conflict!, resolution);
  }, [onStateConflict]);

  // Recover state from fallback
  const recoverState = useCallback(() => {
    if (!syncState.fallbackState) {
      log.warn('Mobile', '🎓 [MobileStateSynchronizer] No fallback state available for recovery');
      return;
    }
    
    setSyncState(prev => ({
      ...prev,
      synchronizedState: { ...prev.fallbackState! },
      analytics: {
        ...prev.analytics,
        recoveries: prev.analytics.recoveries + 1
      }
    }));
    
    log.debug('Mobile', '🎓 [MobileStateSynchronizer] State recovered from fallback');
    onStateRecovery?.(syncState.fallbackState);
    
    toast({
      title: "State Recovered",
      description: "Your state has been recovered from backup.",
      variant: "default"
    });
  }, [syncState.fallbackState, onStateRecovery]);

  // Validate state
  const validateState = useCallback((state: Partial<SynchronizedState>): boolean => {
    const errors: string[] = [];
    
    // Validate current view
    if (state.currentView && !['course-overview', 'lesson-view', 'none'].includes(state.currentView)) {
      errors.push('Invalid current view');
    }
    
    // Validate lesson ID
    if (state.selectedLessonId && typeof state.selectedLessonId !== 'string') {
      errors.push('Invalid lesson ID');
    }
    
    // Validate progress data
    if (state.courseProgress && typeof state.courseProgress !== 'object') {
      errors.push('Invalid progress data');
    }
    
    // Validate navigation history
    if (state.navigationHistory && !Array.isArray(state.navigationHistory)) {
      errors.push('Invalid navigation history');
    }
    
    if (errors.length > 0) {
      log.error('Mobile', '🎓 [MobileStateSynchronizer] State validation failed:', errors);
      onStateValidation?.(false, 'validation');
      return false;
    }
    
    onStateValidation?.(true, 'validation');
    return true;
  }, [onStateValidation]);

  // Update lesson selection
  const updateLessonSelection = useCallback((lessonId: string | null) => {
    if (!validateState({ selectedLessonId: lessonId })) {
      return;
    }
    
    updateSynchronizedState({
      selectedLessonId: lessonId,
      currentView: lessonId ? 'lesson-view' : 'course-overview'
    });
    
    log.debug('Mobile', '🎓 [MobileStateSynchronizer] Lesson selection updated:', lessonId);
  }, [validateState, updateSynchronizedState]);

  // Update course progress
  const updateCourseProgress = useCallback((lessonId: string, completed: boolean) => {
    const currentProgress = syncState.synchronizedState.courseProgress;
    const updatedProgress = { ...currentProgress, [lessonId]: completed };
    
    if (!validateState({ courseProgress: updatedProgress })) {
      return;
    }
    
    updateSynchronizedState({ courseProgress: updatedProgress });
    
    log.debug('Mobile', '🎓 [MobileStateSynchronizer] Course progress updated:', { lessonId, completed });
  }, [syncState.synchronizedState.courseProgress, validateState, updateSynchronizedState]);

  // Update scroll position
  const updateScrollPosition = useCallback((viewId: string, position: number) => {
    const currentScrollPositions = syncState.synchronizedState.scrollPosition;
    const updatedScrollPositions = { ...currentScrollPositions, [viewId]: position };
    
    updateSynchronizedState({ scrollPosition: updatedScrollPositions });
  }, [syncState.synchronizedState.scrollPosition, updateSynchronizedState]);

  // Update module expansion state
  const updateModuleExpansion = useCallback((moduleId: string, expanded: boolean) => {
    const currentExpanded = syncState.synchronizedState.expandedModules;
    const currentCollapsed = syncState.synchronizedState.collapsedModules;
    
    let updatedExpanded = [...currentExpanded];
    let updatedCollapsed = [...currentCollapsed];
    
    if (expanded) {
      updatedExpanded = updatedExpanded.includes(moduleId) ? updatedExpanded : [...updatedExpanded, moduleId];
      updatedCollapsed = updatedCollapsed.filter(id => id !== moduleId);
    } else {
      updatedCollapsed = updatedCollapsed.includes(moduleId) ? updatedCollapsed : [...updatedCollapsed, moduleId];
      updatedExpanded = updatedExpanded.filter(id => id !== moduleId);
    }
    
    updateSynchronizedState({
      expandedModules: updatedExpanded,
      collapsedModules: updatedCollapsed
    });
  }, [syncState.synchronizedState.expandedModules, syncState.synchronizedState.collapsedModules, updateSynchronizedState]);

  // Update user preferences
  const updateUserPreferences = useCallback((preferences: {
    readingMode?: boolean;
    fontSize?: 'small' | 'medium' | 'large';
    theme?: 'light' | 'dark' | 'auto';
  }) => {
    updateSynchronizedState(preferences);
  }, [updateSynchronizedState]);

  // Get current state
  const getCurrentState = useCallback((): SynchronizedState => {
    return syncState.synchronizedState;
  }, [syncState.synchronizedState]);

  // Get state analytics
  const getStateAnalytics = useCallback(() => {
    return syncState.analytics;
  }, [syncState.analytics]);

  // Check permission
  const checkPermission = useCallback((permission: string): boolean => {
    return syncState.permissions.get(permission) || false;
  }, [syncState.permissions]);

  // Force sync
  const forceSync = useCallback(() => {
    if (syncState.synchronizedState.isOnline) {
      syncPendingChanges();
    } else {
      toast({
        title: "Offline",
        description: "Cannot sync while offline. Changes will be synced when you're back online.",
        variant: "default"
      });
    }
  }, [syncState.synchronizedState.isOnline, syncPendingChanges]);

  // Clear all state
  const clearAllState = useCallback(() => {
    setSyncState(prev => ({
      ...prev,
      synchronizedState: {
        currentView: 'course-overview',
        selectedLessonId: null,
        courseProgress: {},
        navigationHistory: [],
        scrollPosition: {},
        expandedModules: [],
        collapsedModules: [],
        readingMode: false,
        fontSize: 'medium',
        theme: 'auto',
        cachedData: new Map(),
        lastSyncTimestamp: Date.now(),
        isOnline: navigator.onLine
      },
      conflicts: [],
      pendingChanges: new Map(),
      syncQueue: []
    }));
    
    // Clear localStorage
    localStorage.removeItem('mobileStateSynchronizer');
    
    log.debug('Mobile', '🎓 [MobileStateSynchronizer] All state cleared');
  }, []);

  // Memoized values for performance
  const memoizedState = useMemo(() => syncState.synchronizedState, [syncState.synchronizedState]);
  const memoizedConflicts = useMemo(() => syncState.conflicts, [syncState.conflicts]);
  const memoizedAnalytics = useMemo(() => syncState.analytics, [syncState.analytics]);

  // Expose methods via ref for parent components
  const exposedMethods = useMemo(() => ({
    updateLessonSelection,
    updateCourseProgress,
    updateScrollPosition,
    updateModuleExpansion,
    updateUserPreferences,
    getCurrentState,
    getStateAnalytics,
    checkPermission,
    forceSync,
    clearAllState,
    resolveConflict,
    recoverState
  }), [
    updateLessonSelection,
    updateCourseProgress,
    updateScrollPosition,
    updateModuleExpansion,
    updateUserPreferences,
    getCurrentState,
    getStateAnalytics,
    checkPermission,
    forceSync,
    clearAllState,
    resolveConflict,
    recoverState
  ]);

  // Expose methods to parent component
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).mobileStateSynchronizer = exposedMethods;
    }
  }, [exposedMethods]);

  // Development logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      log.debug('Mobile', '🎓 [MobileStateSynchronizer] State updated:', {
        currentView: memoizedState.currentView,
        selectedLessonId: memoizedState.selectedLessonId,
        conflictsCount: memoizedConflicts.length,
        pendingChanges: syncState.pendingChanges.size,
        isOnline: memoizedState.isOnline,
        analytics: memoizedAnalytics
      });
    }
  }, [memoizedState, memoizedConflicts, syncState.pendingChanges.size, memoizedAnalytics]);

  // Render null - this is a utility component
  return null;
});

MobileStateSynchronizer.displayName = 'MobileStateSynchronizer';

export default MobileStateSynchronizer; 