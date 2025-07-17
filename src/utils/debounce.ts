/**
 * 🚀 DEBOUNCE UTILITIES
 * 
 * Utility functions for debouncing expensive operations to reduce re-renders
 */

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function debouncePromise<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeout: NodeJS.Timeout | null = null;
  let resolveFunc: ((value: any) => void) | null = null;
  let rejectFunc: ((reason?: any) => void) | null = null;
  
  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise((resolve, reject) => {
      if (timeout) {
        clearTimeout(timeout);
        // Reject the previous promise
        if (rejectFunc) {
          rejectFunc(new Error('Debounced'));
        }
      }
      
      resolveFunc = resolve;
      rejectFunc = reject;
      
      timeout = setTimeout(async () => {
        try {
          const result = await func(...args);
          if (resolveFunc) {
            resolveFunc(result);
          }
        } catch (error) {
          if (rejectFunc) {
            rejectFunc(error);
          }
        } finally {
          timeout = null;
          resolveFunc = null;
          rejectFunc = null;
        }
      }, wait);
    });
  };
}