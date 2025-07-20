import { useState, useEffect, useRef } from 'react';
import { devLogger } from '@/utils/developmentLogger';

export function useDebounce<T>(value: T, delay: number, identifier?: string): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const valueRef = useRef<T>(value);
  const id = useRef(identifier || Math.random().toString(36).substring(2, 11));
  const mountedRef = useRef(true);

  // Progressive debouncing: faster for short queries, slower for long queries
  const getProgressiveDelay = (value: T): number => {
    if (typeof value === 'string') {
      const length = value.trim().length;
      if (length <= 3) return Math.min(delay * 0.5, 150); // 150ms for short queries
      if (length <= 10) return delay; // Normal delay for medium queries
      return Math.min(delay * 1.2, 400); // Slightly longer for complex queries
    }
    return delay;
  };

  useEffect(() => {
    const previousValue = valueRef.current;
    valueRef.current = value;
    
    // Only log in development to improve performance
    if (import.meta.env.DEV) {
      devLogger.log('useDebounce', `Value changed:`, { 
        id: id.current,
        value, 
        currentDebounced: debouncedValue,
        previousValue,
        valueRefNow: valueRef.current 
      });
    }
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Use progressive delay
    const progressiveDelay = getProgressiveDelay(value);
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      if (import.meta.env.DEV) {
        devLogger.log('useDebounce', `Timeout fired - checking values:`, {
          id: id.current,
          mounted: mountedRef.current,
          expectedValue: value,
          valueRefCurrent: valueRef.current,
          valuesMatch: valueRef.current === value,
          delay: progressiveDelay
        });
      }
      
      // Check if the component is still mounted
      if (mountedRef.current) {
        // Always use the current value from valueRef, not the parameter
        const currentValue = valueRef.current;
        if (import.meta.env.DEV) {
          devLogger.log('useDebounce', `Setting debounced value:`, { id: id.current, currentValue });
        }
        setDebouncedValue(currentValue);
      } else if (import.meta.env.DEV) {
        devLogger.log('useDebounce', `Skipping - component unmounted`, { id: id.current });
      }
    }, progressiveDelay);

    return () => {
      if (timeoutRef.current) {
        if (import.meta.env.DEV) {
          devLogger.log('useDebounce', `Cleanup - clearing timeout`, { id: id.current });
        }
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  // Cleanup effect on unmount
  useEffect(() => {
    return () => {
      if (import.meta.env.DEV) {
        devLogger.log('useDebounce', `Component unmounting - clearing timeout`, { id: id.current });
      }
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedValue;
}