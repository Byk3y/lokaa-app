/**
 * 🚦 Fast Path Coordinator - PHASE 11A: Duplicate Execution Prevention
 * 
 * Coordinates fast path executions between QuickSpaceRedirect and AuthContext
 * to prevent timing-related duplicate redirections.
 */

const COORDINATOR_KEYS = {
  EXECUTION_LOCK: 'fast_path_execution_lock',
  ACTIVE_COMPONENT: 'fast_path_active_component',
  EXECUTION_RESULT: 'fast_path_execution_result',
  EXECUTION_TIMESTAMP: 'fast_path_execution_timestamp'
} as const;

const EXECUTION_TIMEOUT = 5000; // 5 seconds max execution time
const COORDINATION_TTL = 10000; // 10 seconds coordination cache

export interface FastPathCoordinatorState {
  isLocked: boolean;
  activeComponent: 'QuickSpaceRedirect' | 'AuthContext' | null;
  executionId: string | null;
  timestamp: number;
  result?: {
    success: boolean;
    redirectedTo?: string;
    strategy?: string;
  };
}

/**
 * 🔒 ACQUISITION: Try to acquire fast path execution lock
 */
export function acquireFastPathLock(component: 'QuickSpaceRedirect' | 'AuthContext'): {
  acquired: boolean;
  executionId: string | null;
  conflictingComponent?: string;
} {
  try {
    const now = Date.now();
    const executionId = `${component}_${now}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if there's an existing lock
    const existingLock = sessionStorage.getItem(COORDINATOR_KEYS.EXECUTION_LOCK);
    const existingComponent = sessionStorage.getItem(COORDINATOR_KEYS.ACTIVE_COMPONENT);
    const existingTimestamp = sessionStorage.getItem(COORDINATOR_KEYS.EXECUTION_TIMESTAMP);
    
    if (existingLock && existingComponent && existingTimestamp) {
      const lockAge = now - parseInt(existingTimestamp, 10);
      
      // If lock is fresh (within timeout), deny acquisition
      if (lockAge < EXECUTION_TIMEOUT) {
        console.log(`🚦 [FastPathCoordinator] Lock acquisition DENIED for ${component}, active: ${existingComponent} (${lockAge}ms ago)`);
        return {
          acquired: false,
          executionId: null,
          conflictingComponent: existingComponent
        };
      } else {
        // Lock is stale, we can override it
        console.log(`🚦 [FastPathCoordinator] Overriding stale lock from ${existingComponent} (${lockAge}ms old)`);
      }
    }
    
    // Acquire the lock
    sessionStorage.setItem(COORDINATOR_KEYS.EXECUTION_LOCK, executionId);
    sessionStorage.setItem(COORDINATOR_KEYS.ACTIVE_COMPONENT, component);
    sessionStorage.setItem(COORDINATOR_KEYS.EXECUTION_TIMESTAMP, now.toString());
    
    console.log(`🚦 [FastPathCoordinator] Lock ACQUIRED by ${component} with ID: ${executionId.substr(-9)}`);
    
    return {
      acquired: true,
      executionId,
      conflictingComponent: undefined
    };
    
  } catch (error) {
    console.error('🚦 [FastPathCoordinator] Error acquiring lock:', error);
    return {
      acquired: false,
      executionId: null
    };
  }
}

/**
 * 🔓 RELEASE: Release the fast path execution lock
 */
export function releaseFastPathLock(
  executionId: string,
  result: { success: boolean; redirectedTo?: string; strategy?: string }
): boolean {
  try {
    const currentLock = sessionStorage.getItem(COORDINATOR_KEYS.EXECUTION_LOCK);
    
    // Verify we own this lock
    if (currentLock !== executionId) {
      console.warn(`🚦 [FastPathCoordinator] Cannot release lock - ID mismatch. Current: ${currentLock?.substr(-9)}, Provided: ${executionId.substr(-9)}`);
      return false;
    }
    
    // Store execution result for other components
    sessionStorage.setItem(COORDINATOR_KEYS.EXECUTION_RESULT, JSON.stringify({
      ...result,
      timestamp: Date.now(),
      executionId: executionId.substr(-9)
    }));
    
    // Clear lock
    sessionStorage.removeItem(COORDINATOR_KEYS.EXECUTION_LOCK);
    sessionStorage.removeItem(COORDINATOR_KEYS.ACTIVE_COMPONENT);
    sessionStorage.removeItem(COORDINATOR_KEYS.EXECUTION_TIMESTAMP);
    
    console.log(`🚦 [FastPathCoordinator] Lock RELEASED by ${executionId.substr(-9)}, result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    
    return true;
    
  } catch (error) {
    console.error('🚦 [FastPathCoordinator] Error releasing lock:', error);
    return false;
  }
}

/**
 * 📊 STATUS: Get current coordinator state
 */
export function getFastPathCoordinatorState(): FastPathCoordinatorState {
  try {
    const lock = sessionStorage.getItem(COORDINATOR_KEYS.EXECUTION_LOCK);
    const component = sessionStorage.getItem(COORDINATOR_KEYS.ACTIVE_COMPONENT) as 'QuickSpaceRedirect' | 'AuthContext' | null;
    const timestamp = sessionStorage.getItem(COORDINATOR_KEYS.EXECUTION_TIMESTAMP);
    const resultStr = sessionStorage.getItem(COORDINATOR_KEYS.EXECUTION_RESULT);
    
    let result;
    if (resultStr) {
      try {
        const parsed = JSON.parse(resultStr);
        // Only return recent results (within TTL)
        if (parsed.timestamp && Date.now() - parsed.timestamp < COORDINATION_TTL) {
          result = {
            success: parsed.success,
            redirectedTo: parsed.redirectedTo,
            strategy: parsed.strategy
          };
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
    
    return {
      isLocked: !!lock,
      activeComponent: component,
      executionId: lock,
      timestamp: timestamp ? parseInt(timestamp, 10) : 0,
      result
    };
    
  } catch (error) {
    console.error('🚦 [FastPathCoordinator] Error getting state:', error);
    return {
      isLocked: false,
      activeComponent: null,
      executionId: null,
      timestamp: 0
    };
  }
}

/**
 * 🧹 CLEANUP: Clear stale coordination data
 */
export function cleanupStaleCoordination(): void {
  try {
    const state = getFastPathCoordinatorState();
    const now = Date.now();
    
    // Clear stale locks
    if (state.isLocked && state.timestamp && (now - state.timestamp) > EXECUTION_TIMEOUT) {
      console.log(`🧹 [FastPathCoordinator] Cleaning up stale lock from ${state.activeComponent} (${now - state.timestamp}ms old)`);
      sessionStorage.removeItem(COORDINATOR_KEYS.EXECUTION_LOCK);
      sessionStorage.removeItem(COORDINATOR_KEYS.ACTIVE_COMPONENT);
      sessionStorage.removeItem(COORDINATOR_KEYS.EXECUTION_TIMESTAMP);
    }
    
    // Clear stale results - check sessionStorage directly for timestamp
    const resultStr = sessionStorage.getItem(COORDINATOR_KEYS.EXECUTION_RESULT);
    if (resultStr) {
      try {
        const parsed = JSON.parse(resultStr);
        if (parsed.timestamp && (now - parsed.timestamp) > COORDINATION_TTL) {
          console.log(`🧹 [FastPathCoordinator] Cleaning up stale execution result (${now - parsed.timestamp}ms old)`);
          sessionStorage.removeItem(COORDINATOR_KEYS.EXECUTION_RESULT);
        }
      } catch {
        // Invalid JSON, remove it
        sessionStorage.removeItem(COORDINATOR_KEYS.EXECUTION_RESULT);
      }
    }
    
  } catch (error) {
    console.error('🧹 [FastPathCoordinator] Error during cleanup:', error);
  }
}

/**
 * 🔍 CONVENIENCE: Check if fast path is currently executing
 */
export function isFastPathExecuting(): boolean {
  const state = getFastPathCoordinatorState();
  const now = Date.now();
  
  return state.isLocked && 
         state.timestamp && 
         (now - state.timestamp) < EXECUTION_TIMEOUT;
}

/**
 * 🔍 CONVENIENCE: Check if another component is handling fast path
 */
export function isOtherComponentHandlingFastPath(currentComponent: 'QuickSpaceRedirect' | 'AuthContext'): boolean {
  const state = getFastPathCoordinatorState();
  
  return state.isLocked && 
         state.activeComponent !== null && 
         state.activeComponent !== currentComponent &&
         isFastPathExecuting();
}

/**
 * 📈 DEBUGGING: Get coordination stats for debugging
 */
export function getFastPathCoordinatorStats(): {
  currentState: FastPathCoordinatorState;
  sessionStorageKeys: string[];
  coordinationKeys: Record<string, string | null>;
} {
  const state = getFastPathCoordinatorState();
  
  const coordinationKeys: Record<string, string | null> = {};
  Object.values(COORDINATOR_KEYS).forEach(key => {
    coordinationKeys[key] = sessionStorage.getItem(key);
  });
  
  const sessionStorageKeys = Object.keys(sessionStorage).filter(key => 
    key.startsWith('fast_path_')
  );
  
  return {
    currentState: state,
    sessionStorageKeys,
    coordinationKeys
  };
}

// 🔧 GLOBAL WINDOW DEBUGGING ACCESS
if (typeof window !== 'undefined') {
  (window as any).fastPathCoordinator = {
    getState: getFastPathCoordinatorState,
    getStats: getFastPathCoordinatorStats,
    cleanup: cleanupStaleCoordination,
    isExecuting: isFastPathExecuting
  };
} 